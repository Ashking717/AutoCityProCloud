//app/lib/services/accountingService.ts
import mongoose from "mongoose";
import Account, { IAccount } from "../models/Account";
import Voucher from "../models/Voucher";
import LedgerEntry from "../models/LedgerEntry";
import InventoryMovement, { MovementType } from "../models/InventoryMovement";
import Outlet from "../models/Outlet";
import { Product } from "../models";

/* ───────────────── TYPES ───────────────── */

export interface SystemAccounts {
  cashAccount: mongoose.Types.ObjectId;
  bankAccount: mongoose.Types.ObjectId;
  arAccount: mongoose.Types.ObjectId;
  apAccount?: mongoose.Types.ObjectId; // Added: Accounts Payable
  inventoryAccount: mongoose.Types.ObjectId;
  salesRevenueAccount: mongoose.Types.ObjectId;
  serviceRevenueAccount?: mongoose.Types.ObjectId;
  cogsAccount: mongoose.Types.ObjectId;
  vatPayableAccount?: mongoose.Types.ObjectId;
  vatReceivableAccount?: mongoose.Types.ObjectId;
}

/* ───────────────── SYSTEM ACCOUNTS ───────────────── */

export async function getSystemAccounts(
  outletId: mongoose.Types.ObjectId
): Promise<SystemAccounts> {

  const accounts = await Account.find({
    outletId,
    isSystem: true,
    isActive: true,
  }).lean() as any[];

  const map: Record<string, mongoose.Types.ObjectId> = {};

  for (const acc of accounts) {
    // Your database uses 'subType' field, not 'accountSubType'
    const raw = acc.subType || acc.accountSubType;
    if (!raw) continue;

    let key = raw.toString().toLowerCase();

    if (
      key === "cost_of_goods_sold" ||
      key === "costofgoodssold" ||
      key === "cost of goods sold"
    ) {
      key = "cogs";
    }

    // Normalize other account types
    if (key === "accounts payable" || key === "accountspayable") {
      key = "accounts_payable";
    }

    map[key] = acc._id as mongoose.Types.ObjectId;
  }

  const required = [
    "cash",
    "bank",
    "accounts_receivable",
    "inventory",
    "sales_revenue",
    "cogs",
  ];

  for (const r of required) {
    if (!map[r]) {
      throw new Error(`System account missing for outlet: ${r}`);
    }
  }

  return {
    cashAccount: map.cash,
    bankAccount: map.bank,
    arAccount: map.accounts_receivable,
    apAccount: map.accounts_payable, // Optional for now
    inventoryAccount: map.inventory,
    salesRevenueAccount: map.sales_revenue,
    serviceRevenueAccount: map.service_revenue,
    cogsAccount: map.cogs,
    vatPayableAccount: map.vat_payable,
    vatReceivableAccount: map.vat_receivable,
  };
}

/* ───────────────── VOUCHER NUMBER ───────────────── */

export async function generateVoucherNumber(
  voucherType: "receipt" | "journal" | "payment",
  outletId: mongoose.Types.ObjectId
): Promise<string> {

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  const prefix = voucherType === "receipt" ? "RE" : voucherType === "payment" ? "PY" : "JO";
  const yearMonth = `${year}${month}`;

  // Find the highest existing voucher number for this type, outlet, and period
  const latestVoucherDoc = await Voucher.findOne({
    outletId,
    voucherType,
    voucherNumber: { $regex: `^${prefix}-${yearMonth}-` }
  })
    .sort({ voucherNumber: -1 })
    .select('voucherNumber')
    .lean();

  // Type assertion to handle lean() return type
  const latestVoucher = latestVoucherDoc as any;

  let nextNumber = 1;

  if (latestVoucher && latestVoucher.voucherNumber) {
    // Extract the sequence number from the last voucher
    const match = latestVoucher.voucherNumber.match(/-(\d{5})$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Generate voucher number with retry logic for race conditions
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const voucherNumber = `${prefix}-${yearMonth}-${String(nextNumber).padStart(5, "0")}`;

    // Check if this number already exists
    const exists = await Voucher.exists({ voucherNumber });
    
    if (!exists) {
      return voucherNumber;
    }

    // If exists, increment and try again
    nextNumber++;
  }

  // Fallback: use timestamp-based unique number
  const timestamp = Date.now().toString().slice(-5);
  return `${prefix}-${yearMonth}-${timestamp}`;
}

/* ───────────────── SALE POSTING ───────────────── */

export async function postSaleToLedger(
  sale: any,
  userId: mongoose.Types.ObjectId
) {

  const outlet = await Outlet.findById(sale.outletId).lean();
  if (!outlet) throw new Error("Outlet not found");

  const sys = await getSystemAccounts(sale.outletId);

  /* ───────── HELPER: Fetch Account Details ───────── */
  const getAccountDetails = async (accountId: mongoose.Types.ObjectId) => {
    const account = await Account.findById(accountId).lean() as any;
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    const accountNumber = account.code || account.accountNumber || "N/A";
    const accountName = account.name || account.accountName || "Unknown Account";
    
    return {
      accountId: account._id as mongoose.Types.ObjectId,
      accountNumber,
      accountName,
    };
  };

  /* ───────── RECEIPT VOUCHER ───────── */

  const receiptEntries: Array<{
    accountId: mongoose.Types.ObjectId;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
  }> = [];

  let paymentAccountId = sys.cashAccount;

  if (sale.paymentMethod === "BANK_TRANSFER" || sale.paymentMethod === "CARD") {
    paymentAccountId = sys.bankAccount;
  }

  // Build receipt entries with full account details
  if (sale.paymentMethod === "CREDIT") {
    const arDetails = await getAccountDetails(sys.arAccount);
    receiptEntries.push({
      ...arDetails,
      debit: sale.grandTotal,
      credit: 0,
    });
  } else {
    if (sale.amountPaid > 0) {
      const paymentDetails = await getAccountDetails(paymentAccountId);
      receiptEntries.push({
        ...paymentDetails,
        debit: sale.amountPaid,
        credit: 0,
      });
    }

    if (sale.balanceDue > 0) {
      const arDetails = await getAccountDetails(sys.arAccount);
      receiptEntries.push({
        ...arDetails,
        debit: sale.balanceDue,
        credit: 0,
      });
    }
  }

  // Separate product sales and labor/service revenue
  const productItems = sale.items.filter((i: any) => !i.isLabor);
  const laborItems = sale.items.filter((i: any) => i.isLabor);

  const productRevenue = productItems.reduce(
    (sum: number, item: any) => sum + (item.total || 0),
    0
  );
  const laborRevenue = laborItems.reduce(
    (sum: number, item: any) => sum + (item.total || 0),
    0
  );

  // Credit Sales Revenue for products
  if (productRevenue > 0) {
    const salesDetails = await getAccountDetails(sys.salesRevenueAccount);
    receiptEntries.push({
      ...salesDetails,
      debit: 0,
      credit: productRevenue,
    });
  }

  // Credit Service Revenue for labor
  if (laborRevenue > 0) {
    if (!sys.serviceRevenueAccount) {
      throw new Error("Service Revenue account not configured. Please add SERVICE_REVENUE system account.");
    }
    const serviceDetails = await getAccountDetails(sys.serviceRevenueAccount);
    receiptEntries.push({
      ...serviceDetails,
      debit: 0,
      credit: laborRevenue,
    });
  }

  const receiptNo = await generateVoucherNumber("receipt", sale.outletId);

  const receiptVoucher = await Voucher.create({
    voucherNumber: receiptNo,
    voucherType: "receipt",
    date: sale.saleDate,
    narration: `Sale ${sale.invoiceNumber}`,
    entries: receiptEntries,
    totalDebit: sale.grandTotal,
    totalCredit: sale.grandTotal,
    status: "posted",
    referenceType: "SALE",
    referenceId: sale._id,
    outletId: sale.outletId,
    createdBy: userId,
  });

  /* ───────── LEDGER ENTRIES ───────── */

  const ledgerDocs = receiptEntries.map((e) => ({
    voucherId: receiptVoucher._id,
    voucherNumber: receiptVoucher.voucherNumber,
    voucherType: "receipt",
    accountId: e.accountId,
    accountNumber: e.accountNumber,
    accountName: e.accountName,
    debit: e.debit,
    credit: e.credit,
    narration: receiptVoucher.narration,
    date: sale.saleDate,
    referenceType: "SALE",
    referenceId: sale._id,
    outletId: sale.outletId,
    createdBy: userId,
  }));

  await LedgerEntry.insertMany(ledgerDocs);

  /* ───────── COGS ───────── */

  const items = sale.items.filter(
    (i: any) => !i.isLabor && i.costPrice > 0
  );

  if (!items.length) {
    return { voucherId: receiptVoucher._id, cogsVoucherId: null };
  }

  const totalCOGS = items.reduce(
    (sum: number, i: any) => sum + i.costPrice * i.quantity,
    0
  );

  const cogsDetails = await getAccountDetails(sys.cogsAccount);
  const inventoryDetails = await getAccountDetails(sys.inventoryAccount);

  const cogsEntries = [
    { ...cogsDetails, debit: totalCOGS, credit: 0 },
    { ...inventoryDetails, debit: 0, credit: totalCOGS },
  ];

  const cogsNo = await generateVoucherNumber("journal", sale.outletId);

  const cogsVoucher = await Voucher.create({
    voucherNumber: cogsNo,
    voucherType: "journal",
    date: sale.saleDate,
    narration: `COGS for ${sale.invoiceNumber}`,
    entries: cogsEntries,
    totalDebit: totalCOGS,
    totalCredit: totalCOGS,
    status: "posted",
    referenceType: "SALE",
    referenceId: sale._id,
    outletId: sale.outletId,
    createdBy: userId,
  });

  return {
    voucherId: receiptVoucher._id,
    cogsVoucherId: cogsVoucher._id,
  };
}

/* ───────────────── PURCHASE POSTING ───────────────── */

export async function postPurchaseToLedger(
  purchase: any,
  userId: mongoose.Types.ObjectId
) {

  const outlet = await Outlet.findById(purchase.outletId).lean();
  if (!outlet) throw new Error("Outlet not found");

  const sys = await getSystemAccounts(purchase.outletId);

  /* ───────── HELPER: Fetch Account Details ───────── */
  const getAccountDetails = async (accountId: mongoose.Types.ObjectId) => {
    const account = await Account.findById(accountId).lean() as any;
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    const accountNumber = account.code || account.accountNumber || "N/A";
    const accountName = account.name || account.accountName || "Unknown Account";
    
    return {
      accountId: account._id as mongoose.Types.ObjectId,
      accountNumber,
      accountName,
    };
  };

  /* ───────── PAYMENT VOUCHER ───────── */

  const paymentEntries: Array<{
    accountId: mongoose.Types.ObjectId;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
  }> = [];

  // Debit: Inventory (increase asset)
  const inventoryDetails = await getAccountDetails(sys.inventoryAccount);
  paymentEntries.push({
    ...inventoryDetails,
    debit: purchase.grandTotal,
    credit: 0,
  });

  // Credit: Cash/Bank/Accounts Payable (decrease asset or increase liability)
  let paymentAccountId = sys.cashAccount;

  if (purchase.paymentMethod === "BANK_TRANSFER" || purchase.paymentMethod === "CARD") {
    paymentAccountId = sys.bankAccount;
  }

  if (purchase.paymentMethod === "CREDIT") {
    // Use Accounts Payable if available, otherwise use AR as fallback
    const apAccountId = sys.apAccount || sys.arAccount;
    if (!sys.apAccount) {
      console.warn('Warning: Accounts Payable system account not configured. Using AR as fallback.');
    }
    const apDetails = await getAccountDetails(apAccountId);
    paymentEntries.push({
      ...apDetails,
      debit: 0,
      credit: purchase.grandTotal,
    });
  } else {
    if (purchase.amountPaid > 0) {
      const paymentDetails = await getAccountDetails(paymentAccountId);
      paymentEntries.push({
        ...paymentDetails,
        debit: 0,
        credit: purchase.amountPaid,
      });
    }

    if (purchase.balanceDue > 0) {
      const apAccountId = sys.apAccount || sys.arAccount;
      const apDetails = await getAccountDetails(apAccountId);
      paymentEntries.push({
        ...apDetails,
        debit: 0,
        credit: purchase.balanceDue,
      });
    }
  }

  const paymentNo = await generateVoucherNumber("payment", purchase.outletId);

  const paymentVoucher = await Voucher.create({
    voucherNumber: paymentNo,
    voucherType: "payment",
    date: purchase.purchaseDate,
    narration: `Purchase ${purchase.purchaseNumber} from ${purchase.supplierName}`,
    entries: paymentEntries,
    totalDebit: purchase.grandTotal,
    totalCredit: purchase.grandTotal,
    status: "posted",
    referenceType: "PURCHASE",
    referenceId: purchase._id,
    outletId: purchase.outletId,
    createdBy: userId,
  });

  /* ───────── LEDGER ENTRIES ───────── */

  const ledgerDocs = paymentEntries.map((e) => ({
    voucherId: paymentVoucher._id,
    voucherNumber: paymentVoucher.voucherNumber,
    voucherType: "payment",
    accountId: e.accountId,
    accountNumber: e.accountNumber,
    accountName: e.accountName,
    debit: e.debit,
    credit: e.credit,
    narration: paymentVoucher.narration,
    date: purchase.purchaseDate,
    referenceType: "PURCHASE",
    referenceId: purchase._id,
    outletId: purchase.outletId,
    createdBy: userId,
  }));

  await LedgerEntry.insertMany(ledgerDocs);

  return {
    voucherId: paymentVoucher._id,
  };
}

/* ═══════════════════════════════════════════════════════════
   EXPENSE POSTING
   
   Creates a Payment Voucher for expense transactions:
   DR: Expense Account(s) (increase expense)
   CR: Cash/Bank/AP (decrease asset or increase liability)
   ═══════════════════════════════════════════════════════════ */

export async function postExpenseToLedger(
  expense: any,
  userId: mongoose.Types.ObjectId
) {
  try {
    const outlet = await Outlet.findById(expense.outletId).lean();
    if (!outlet) throw new Error("Outlet not found");

    const sys = await getSystemAccounts(expense.outletId);

    /* ───────── HELPER: Fetch Account Details ───────── */
    const getAccountDetails = async (accountId: mongoose.Types.ObjectId) => {
      const account = await Account.findById(accountId).lean() as any;
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accountNumber = account.code || account.accountNumber || "N/A";
      const accountName = account.name || account.accountName || "Unknown Account";

      return {
        accountId: account._id as mongoose.Types.ObjectId,
        accountNumber,
        accountName,
      };
    };

    /* ───────── BUILD PAYMENT VOUCHER ENTRIES ───────── */

    const paymentEntries: Array<{
      accountId: mongoose.Types.ObjectId;
      accountNumber: string;
      accountName: string;
      debit: number;
      credit: number;
    }> = [];

    // DEBIT: Expense Account(s) - one entry per item
    for (const item of expense.items) {
      const expenseAccountDetails = await getAccountDetails(item.accountId);
      
      paymentEntries.push({
        ...expenseAccountDetails,
        debit: Number(item.amount),
        credit: 0,
      });
    }

    // If there's tax, add it as a separate debit
    if (expense.taxAmount > 0) {
      if (sys.vatReceivableAccount) {
        const taxDetails = await getAccountDetails(sys.vatReceivableAccount);
        paymentEntries.push({
          ...taxDetails,
          debit: Number(expense.taxAmount),
          credit: 0,
        });
      } else {
        // Add to first expense item if no tax account configured
        paymentEntries[0].debit += Number(expense.taxAmount);
      }
    }

    /* ───────── CREDIT: Payment Account or Liability ───────── */

    let paymentAccountId: mongoose.Types.ObjectId;

    // Determine payment account based on payment method
    if (expense.paymentMethod === 'CREDIT') {
      // Use Accounts Payable if available, fallback to AR
      paymentAccountId = sys.apAccount || sys.arAccount;
      if (!sys.apAccount) {
        console.warn('Warning: Using AR account for AP. Please configure AP system account.');
      }
    } else if (expense.paymentMethod === 'BANK_TRANSFER' || expense.paymentMethod === 'CARD') {
      paymentAccountId = sys.bankAccount;
    } else {
      paymentAccountId = sys.cashAccount;
    }

    // Override with specific payment account if provided
    if (expense.paymentAccount) {
      paymentAccountId = expense.paymentAccount;
    }

    // Credit the payment account(s)
    if (expense.paymentMethod === 'CREDIT') {
      // Full amount to payable
      const payableDetails = await getAccountDetails(paymentAccountId);
      paymentEntries.push({
        ...payableDetails,
        debit: 0,
        credit: expense.grandTotal,
      });
    } else {
      // Paid amount
      if (expense.amountPaid > 0) {
        const paymentDetails = await getAccountDetails(paymentAccountId);
        paymentEntries.push({
          ...paymentDetails,
          debit: 0,
          credit: expense.amountPaid,
        });
      }

      // Balance due (if partially paid)
      if (expense.balanceDue > 0) {
        const apAccountId = sys.apAccount || sys.arAccount;
        const apDetails = await getAccountDetails(apAccountId);
        paymentEntries.push({
          ...apDetails,
          debit: 0,
          credit: expense.balanceDue,
        });
      }
    }

    // Verify balanced entries
    const totalDebit = paymentEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = paymentEntries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Unbalanced voucher entries: DR=${totalDebit}, CR=${totalCredit}`
      );
    }

    /* ───────── CREATE PAYMENT VOUCHER ───────── */

    const voucherNumber = await generateVoucherNumber("payment", expense.outletId);

    const narration = expense.vendorName
      ? `Expense payment to ${expense.vendorName} - ${expense.expenseNumber}`
      : `Expense payment - ${expense.expenseNumber}`;

    const paymentVoucher = await Voucher.create([
      {
        voucherNumber,
        voucherType: "payment",
        date: expense.expenseDate,
        narration,
        entries: paymentEntries,
        totalDebit: expense.grandTotal,
        totalCredit: expense.grandTotal,
        status: "posted",
        referenceType: "PAYMENT", // Valid enum value
        referenceId: expense._id,
        outletId: expense.outletId,
        createdBy: userId,
      },
    ]);

    /* ───────── CREATE LEDGER ENTRIES ───────── */

    const ledgerDocs = paymentEntries.map((e) => ({
      voucherId: paymentVoucher[0]._id,
      voucherNumber: paymentVoucher[0].voucherNumber,
      voucherType: "payment",
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
      narration: paymentVoucher[0].narration,
      date: expense.expenseDate,
      referenceType: "PAYMENT", // Valid enum value
      referenceId: expense._id,
      referenceNumber: expense.expenseNumber, // Added reference number
      isReversal: false,
      outletId: expense.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(`✓ Expense voucher created: ${paymentVoucher[0].voucherNumber}`);
    console.log(`✓ Ledger entries created: ${ledgerDocs.length} entries`);

    return {
      voucherId: paymentVoucher[0]._id,
      voucherNumber: paymentVoucher[0].voucherNumber,
      ledgerEntriesCount: ledgerDocs.length,
    };
  } catch (error) {
    console.error('Error posting expense to ledger:', error);
    throw error;
  }
}

/* ═══════════════════════════════════════════════════════════
   REVERSE EXPENSE VOUCHER - for cancellations
   ═══════════════════════════════════════════════════════════ */

export async function reverseExpenseVoucher(
  expense: any,
  userId: mongoose.Types.ObjectId,
  reason: string
) {
  try {
    if (!expense.voucherId) {
      throw new Error('Expense has no voucher to reverse');
    }

    // Get original voucher
    const originalVoucherDoc = await Voucher.findById(expense.voucherId).lean();
    if (!originalVoucherDoc) {
      throw new Error('Original voucher not found');
    }

    // Type assertion to handle the lean() return type
    const originalVoucher = originalVoucherDoc as any;

    // Create reversed entries (swap debit and credit)
    const reversedEntries = originalVoucher.entries.map((e: any) => ({
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.credit,
      credit: e.debit,
    }));

    // Generate new voucher number
    const voucherNumber = await generateVoucherNumber("payment", expense.outletId);

    // Create reversal voucher
    const reversalVoucher = await Voucher.create([
      {
        voucherNumber,
        voucherType: "payment",
        date: new Date(),
        narration: `REVERSAL: ${originalVoucher.narration} - ${reason}`,
        entries: reversedEntries,
        totalDebit: originalVoucher.totalCredit,
        totalCredit: originalVoucher.totalDebit,
        status: "posted",
        referenceType: "REVERSAL", // Valid enum value for reversals
        referenceId: expense._id,
        outletId: expense.outletId,
        createdBy: userId,
      },
    ]);

    // Create reversed ledger entries
    const ledgerDocs = reversedEntries.map((e: any) => ({
      voucherId: reversalVoucher[0]._id,
      voucherNumber: reversalVoucher[0].voucherNumber,
      voucherType: "payment",
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
      narration: reversalVoucher[0].narration,
      date: new Date(),
      referenceType: "REVERSAL", // Valid enum value for reversals
      referenceId: expense._id,
      referenceNumber: (expense as any).expenseNumber,
      isReversal: true, // Mark as reversal entry
      reversalReason: reason, // Track why it was reversed
      outletId: expense.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(`✓ Reversal voucher created: ${reversalVoucher[0].voucherNumber}`);

    return {
      reversalVoucherId: reversalVoucher[0]._id,
      reversalVoucherNumber: reversalVoucher[0].voucherNumber,
    };
  } catch (error) {
    console.error('Error reversing expense voucher:', error);
    throw error;
  }
}


// Add this to your existing accountingService.ts file

/* ═══════════════════════════════════════════════════════════
   INVENTORY ADJUSTMENT POSTING
   
   Used when:
   - Adding new product with opening stock
   - Stock adjustments (increase/decrease)
   - Stock corrections
   
   Journal Entry:
   DR: Inventory (Asset) - Increase inventory value
   CR: Owner's Equity / Inventory Adjustments - Source of inventory
   ═══════════════════════════════════════════════════════════ */

export async function postInventoryAdjustmentToLedger(
  adjustment: any,
  userId: mongoose.Types.ObjectId
) {
  try {
    const outlet = await Outlet.findById(adjustment.outletId).lean();
    if (!outlet) throw new Error("Outlet not found");

    const sys = await getSystemAccounts(adjustment.outletId);

    /* ───────── HELPER: Fetch Account Details ───────── */
    const getAccountDetails = async (accountId: mongoose.Types.ObjectId) => {
      const account = await Account.findById(accountId).lean() as any;
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accountNumber = account.code || account.accountNumber || "N/A";
      const accountName = account.name || account.accountName || "Unknown Account";

      return {
        accountId: account._id as mongoose.Types.ObjectId,
        accountNumber,
        accountName,
      };
    };

    /* ───────── CALCULATE ADJUSTMENT VALUE ───────── */
    
    const quantity = Number(adjustment.quantity) || 0;
    const costPrice = Number(adjustment.costPrice) || 0;
    const totalValue = quantity * costPrice;

    if (totalValue <= 0) {
      console.warn('⚠️ Inventory adjustment has zero value, skipping ledger entry');
      return { voucherId: null, voucherNumber: null };
    }

    /* ───────── GET INVENTORY ADJUSTMENT ACCOUNT ───────── */
    
    // Use the Owner Equity account (EQ-001) for inventory adjustments
    // This is where the inventory value will be credited to
    
    let adjustmentAccountId = null;
    
    // Look for Owner Equity account (EQ-001)
    const equityAccount = await Account.findOne({
      outletId: adjustment.outletId,
      $or: [
        { code: 'EQ-001' },
        { subType: 'OWNER_EQUITY' },
        { name: { $regex: /owner.*equity|capital/i } },
      ],
      isActive: true,
    }).lean() as any;

    if (equityAccount) {
      adjustmentAccountId = equityAccount._id;
      console.log(`✓ Using account: ${equityAccount.code} - ${equityAccount.name}`);
    } else {
      throw new Error(
        'Owner Equity account (EQ-001) not found. Please ensure the Owner Equity system account exists.'
      );
    }

    /* ───────── BUILD JOURNAL ENTRIES ───────── */

    const inventoryDetails = await getAccountDetails(sys.inventoryAccount);
    const adjustmentDetails = await getAccountDetails(adjustmentAccountId);

    const journalEntries: Array<{
      accountId: mongoose.Types.ObjectId;
      accountNumber: string;
      accountName: string;
      debit: number;
      credit: number;
    }> = [];

    // Determine if it's an increase or decrease
    const isIncrease = quantity > 0;

    if (isIncrease) {
      // INCREASE: Add to inventory
      // DR: Inventory (Asset)
      journalEntries.push({
        ...inventoryDetails,
        debit: totalValue,
        credit: 0,
      });

      // CR: Inventory Adjustments / Owner's Equity
      journalEntries.push({
        ...adjustmentDetails,
        debit: 0,
        credit: totalValue,
      });
    } else {
      // DECREASE: Remove from inventory
      // DR: Inventory Adjustments (or COGS)
      journalEntries.push({
        ...adjustmentDetails,
        debit: Math.abs(totalValue),
        credit: 0,
      });

      // CR: Inventory (Asset)
      journalEntries.push({
        ...inventoryDetails,
        debit: 0,
        credit: Math.abs(totalValue),
      });
    }

    /* ───────── CREATE JOURNAL VOUCHER ───────── */

    const voucherNumber = await generateVoucherNumber("journal", adjustment.outletId);

    const adjustmentType = adjustment.adjustmentType || 'ADJUSTMENT';
    const reason = adjustment.reason || 'Inventory adjustment';
    
    const narration = adjustment.productName 
      ? `${adjustmentType}: ${adjustment.productName} (${adjustment.sku}) - ${reason}`
      : `${adjustmentType} - ${reason}`;

    const journalVoucher = await Voucher.create([
      {
        voucherNumber,
        voucherType: "journal",
        date: adjustment.date || new Date(),
        narration,
        entries: journalEntries,
        totalDebit: Math.abs(totalValue),
        totalCredit: Math.abs(totalValue),
        status: "posted",
        referenceType: "ADJUSTMENT",
        referenceId: adjustment._id || adjustment.productId,
        outletId: adjustment.outletId,
        createdBy: userId,
      },
    ]);

    /* ───────── CREATE LEDGER ENTRIES ───────── */

    const ledgerDocs = journalEntries.map((e) => ({
      voucherId: journalVoucher[0]._id,
      voucherNumber: journalVoucher[0].voucherNumber,
      voucherType: "journal",
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
      narration: journalVoucher[0].narration,
      date: adjustment.date || new Date(),
      referenceType: "ADJUSTMENT",
      referenceId: adjustment._id || adjustment.productId,
      referenceNumber: adjustment.sku,
      isReversal: false,
      outletId: adjustment.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(`✓ Inventory adjustment voucher created: ${journalVoucher[0].voucherNumber}`);
    console.log(`✓ ${isIncrease ? 'Increased' : 'Decreased'} inventory by QAR ${totalValue.toFixed(2)}`);

    return {
      voucherId: journalVoucher[0]._id,
      voucherNumber: journalVoucher[0].voucherNumber,
      ledgerEntriesCount: ledgerDocs.length,
    };
  } catch (error) {
    console.error('Error posting inventory adjustment to ledger:', error);
    throw error;
  }
}


// ADD THIS TO: lib/services/accountingService.ts

/* ═══════════════════════════════════════════════════════════
   RETURN POSTING TO LEDGER
   
   Creates a Journal Voucher for sales returns:
   
   DR: Sales Returns (Contra-Revenue) - Reduce revenue
   DR: Inventory (Asset) - Restore inventory value
   
   CR: Accounts Receivable (if credit sale) - Reduce customer debt
   CR: Cash/Bank (if cash sale) - Refund payment
   CR: COGS (Contra-Expense) - Reverse cost of goods sold
   ═══════════════════════════════════════════════════════════ */

export async function postReturnToLedger(
  returnData: any,
  userId: mongoose.Types.ObjectId
) {
  try {
    console.log('\n📝 Posting return to ledger...');
    
    const outlet = await Outlet.findById(returnData.outletId).lean();
    if (!outlet) throw new Error('Outlet not found');

    const sys = await getSystemAccounts(returnData.outletId);

    /* ───────── HELPER: Fetch Account Details ───────── */
    const getAccountDetails = async (accountId: mongoose.Types.ObjectId) => {
      const account = await Account.findById(accountId).lean() as any;
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accountNumber = account.code || account.accountNumber || 'N/A';
      const accountName = account.name || account.accountName || 'Unknown Account';

      return {
        accountId: account._id as mongoose.Types.ObjectId,
        accountNumber,
        accountName,
      };
    };

    /* ───────── CALCULATE RETURN VALUES ───────── */
    
    const returnAmount = Number(returnData.totalAmount);
    
    // Calculate COGS value for returned items
    let cogsValue = 0;
    
    for (const item of returnData.items) {
      if (!item.productId) continue; // Skip labor items
      
      // Get product cost price
      const product = await Product.findById(item.productId).lean() as any;
      if (product) {
        const costPrice = product.costPrice || 0;
        cogsValue += costPrice * item.quantity;
      }
    }
    
    console.log(`  Return Amount: QAR ${returnAmount.toFixed(2)}`);
    console.log(`  COGS Value: QAR ${cogsValue.toFixed(2)}`);

    /* ───────── GET SALES RETURNS ACCOUNT ───────── */
    
    // Look for Sales Returns account (contra-revenue)
    let salesReturnsAccountId = null;
    
    const salesReturnsAccount = await Account.findOne({
      outletId: returnData.outletId,
      $or: [
        { code: 'REV-002' },
        { name: { $regex: /sales.*return|return.*sale/i } },
        { subType: 'SALES_RETURNS' },
      ],
      isActive: true,
    }).lean() as any;
    
    if (salesReturnsAccount) {
      salesReturnsAccountId = salesReturnsAccount._id;
      console.log(`  ✓ Using Sales Returns account: ${salesReturnsAccount.code}`);
    } else {
      // Use Sales Revenue account (will reduce revenue)
      salesReturnsAccountId = sys.salesRevenueAccount;
      console.log(`  ⚠️ Sales Returns account not found, using Sales Revenue`);
    }

    /* ───────── BUILD JOURNAL ENTRIES ───────── */

    const journalEntries: Array<{
      accountId: mongoose.Types.ObjectId;
      accountNumber: string;
      accountName: string;
      debit: number;
      credit: number;
    }> = [];

    // Entry 1: DR Sales Returns (Contra-Revenue)
    const salesReturnsDetails = await getAccountDetails(salesReturnsAccountId);
    journalEntries.push({
      ...salesReturnsDetails,
      debit: returnAmount,
      credit: 0,
    });

    // Entry 2: DR Inventory (restore stock value)
    if (cogsValue > 0) {
      const inventoryDetails = await getAccountDetails(sys.inventoryAccount);
      journalEntries.push({
        ...inventoryDetails,
        debit: cogsValue,
        credit: 0,
      });
    }

    // Entry 3: CR Cash/Bank/AR (refund or reduce receivable)
    let refundAccountId: mongoose.Types.ObjectId;
    
    if (returnData.paymentMethod === 'CREDIT') {
      // Credit sale - reduce accounts receivable
      refundAccountId = sys.arAccount;
    } else if (returnData.paymentMethod === 'BANK_TRANSFER' || returnData.paymentMethod === 'CARD') {
      // Bank refund
      refundAccountId = sys.bankAccount;
    } else {
      // Cash refund
      refundAccountId = sys.cashAccount;
    }
    
    const refundDetails = await getAccountDetails(refundAccountId);
    journalEntries.push({
      ...refundDetails,
      debit: 0,
      credit: returnAmount,
    });

    // Entry 4: CR COGS (reverse cost of goods sold)
    if (cogsValue > 0) {
      const cogsDetails = await getAccountDetails(sys.cogsAccount);
      journalEntries.push({
        ...cogsDetails,
        debit: 0,
        credit: cogsValue,
      });
    }

    // Verify balanced entries
    const totalDebit = journalEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = journalEntries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Unbalanced return voucher: DR=${totalDebit.toFixed(2)}, CR=${totalCredit.toFixed(2)}`
      );
    }

    console.log(`  ✓ Journal entries balanced: DR=${totalDebit.toFixed(2)}, CR=${totalCredit.toFixed(2)}`);

    /* ───────── CREATE JOURNAL VOUCHER ───────── */

    const voucherNumber = await generateVoucherNumber('journal', returnData.outletId);

    const narration = `Return ${returnData.returnNumber} for ${returnData.invoiceNumber} - ${returnData.customerName}`;

    const journalVoucher = await Voucher.create([
      {
        voucherNumber,
        voucherType: 'journal',
        date: returnData.returnDate || new Date(),
        narration,
        entries: journalEntries,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        status: 'posted',
        referenceType: 'ADJUSTMENT', // Using ADJUSTMENT as it's a valid enum value
        referenceId: returnData._id || returnData.saleId,
        outletId: returnData.outletId,
        createdBy: userId,
      },
    ]);

    console.log(`  ✓ Created voucher: ${journalVoucher[0].voucherNumber}`);

    /* ───────── CREATE LEDGER ENTRIES ───────── */

    const ledgerDocs = journalEntries.map((e) => ({
      voucherId: journalVoucher[0]._id,
      voucherNumber: journalVoucher[0].voucherNumber,
      voucherType: 'journal',
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
      narration: journalVoucher[0].narration,
      date: returnData.returnDate || new Date(),
      referenceType: 'ADJUSTMENT',
      referenceId: returnData._id || returnData.saleId,
      referenceNumber: returnData.returnNumber,
      isReversal: false,
      outletId: returnData.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(`  ✓ Created ${ledgerDocs.length} ledger entries`);
    console.log(`✓ Return posted to ledger successfully\n`);

    return {
      voucherId: journalVoucher[0]._id,
      voucherNumber: journalVoucher[0].voucherNumber,
      ledgerEntriesCount: ledgerDocs.length,
      totalDebit,
      totalCredit,
    };
  } catch (error) {
    console.error('Error posting return to ledger:', error);
    throw error;
  }
}

// ADD TO EXPORTS at bottom of file:
export default {
  getSystemAccounts,
  generateVoucherNumber,
  postSaleToLedger,
  postPurchaseToLedger,
  postExpenseToLedger,
  reverseExpenseVoucher,
  postInventoryAdjustmentToLedger,
  postReturnToLedger, // ← ADD THIS
};