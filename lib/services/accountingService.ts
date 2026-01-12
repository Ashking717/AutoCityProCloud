//app/lib/services/accountingService.ts
import mongoose from "mongoose";
import Account, { IAccount } from "../models/Account";
import Voucher from "../models/Voucher";
import LedgerEntry from "../models/LedgerEntry";
import InventoryMovement, { MovementType } from "../models/InventoryMovement";
import Outlet from "../models/Outlet";
import { Product } from "../models";
import { applyVoucherBalances } from "./balanceEngine";

/* ───────────────── TYPES ───────────────── */

export interface SystemAccounts {
  cashAccount: mongoose.Types.ObjectId;
  bankAccount: mongoose.Types.ObjectId;
  arAccount: mongoose.Types.ObjectId;
  apAccount?: mongoose.Types.ObjectId;
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
  const accounts = (await Account.find({
    outletId,
    isSystem: true,
    isActive: true,
  }).lean()) as any[];

  const map: Record<string, mongoose.Types.ObjectId> = {};

  for (const acc of accounts) {
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
    apAccount: map.accounts_payable,
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

  const prefix =
    voucherType === "receipt" ? "RE" : voucherType === "payment" ? "PY" : "JO";
  const yearMonth = `${year}${month}`;

  const latestVoucherDoc = await Voucher.findOne({
    outletId,
    voucherType,
    voucherNumber: { $regex: `^${prefix}-${yearMonth}-` },
  })
    .sort({ voucherNumber: -1 })
    .select("voucherNumber")
    .lean();

  const latestVoucher = latestVoucherDoc as any;

  let nextNumber = 1;

  if (latestVoucher && latestVoucher.voucherNumber) {
    const match = latestVoucher.voucherNumber.match(/-(\d{5})$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const voucherNumber = `${prefix}-${yearMonth}-${String(nextNumber).padStart(5, "0")}`;

    const exists = await Voucher.exists({ voucherNumber });

    if (!exists) {
      return voucherNumber;
    }

    nextNumber++;
  }

  const timestamp = Date.now().toString().slice(-5);
  return `${prefix}-${yearMonth}-${timestamp}`;
}

/* ───────────────── HELPER: FETCH ACCOUNT DETAILS ───────────────── */

async function getAccountDetails(accountId: mongoose.Types.ObjectId) {
  const account = (await Account.findById(accountId).lean()) as any;
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
}

/* ───────────────── SALE POSTING ───────────────── */

export async function postSaleToLedger(
  sale: any,
  userId: mongoose.Types.ObjectId
) {
  const outlet = await Outlet.findById(sale.outletId).lean();
  if (!outlet) throw new Error("Outlet not found");

  const sys = await getSystemAccounts(sale.outletId);

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

// NET amounts (after ALL discounts)
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
      credit: sale.grandTotal - laborRevenue,

    });
  }

  // Credit Service Revenue for labor
  if (laborRevenue > 0) {
    if (!sys.serviceRevenueAccount) {
      throw new Error(
        "Service Revenue account not configured. Please add SERVICE_REVENUE system account."
      );
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

  // ✅ Apply balance changes
  await applyVoucherBalances(receiptVoucher);

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

  const items = sale.items.filter((i: any) => !i.isLabor && i.costPrice > 0);

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

  // ✅ Apply balance changes for COGS voucher
  await applyVoucherBalances(cogsVoucher);

  // Create COGS ledger entries
  const cogsLedgerDocs = cogsEntries.map((e) => ({
    voucherId: cogsVoucher._id,
    voucherNumber: cogsVoucher.voucherNumber,
    voucherType: "journal",
    accountId: e.accountId,
    accountNumber: e.accountNumber,
    accountName: e.accountName,
    debit: e.debit,
    credit: e.credit,
    narration: cogsVoucher.narration,
    date: sale.saleDate,
    referenceType: "SALE",
    referenceId: sale._id,
    outletId: sale.outletId,
    createdBy: userId,
  }));

  await LedgerEntry.insertMany(cogsLedgerDocs);

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

  if (
    purchase.paymentMethod === "BANK_TRANSFER" ||
    purchase.paymentMethod === "CARD"
  ) {
    paymentAccountId = sys.bankAccount;
  }

  if (purchase.paymentMethod === "CREDIT") {
    const apAccountId = sys.apAccount || sys.arAccount;
    if (!sys.apAccount) {
      console.warn(
        "Warning: Accounts Payable system account not configured. Using AR as fallback."
      );
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

  // ✅ Apply balance changes
  await applyVoucherBalances(paymentVoucher);

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
   PURCHASE PAYMENT POSTING
   
   Used when recording payments against purchases on credit.
   
   Payment Voucher Entry:
   DR: Accounts Payable (Liability decreases - we owe less)
   CR: Cash/Bank (Asset decreases - money paid out)
   ═══════════════════════════════════════════════════════════ */

export async function postPurchasePaymentToLedger(
  payment: {
    purchaseId: mongoose.Types.ObjectId;
    purchaseNumber: string;
    supplierName: string;
    amount: number;
    paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER";
    paymentDate: Date;
    referenceNumber?: string;
    notes?: string;
    outletId: mongoose.Types.ObjectId;
  },
  userId: mongoose.Types.ObjectId
) {
  try {
    console.log('\n💰 Posting purchase payment to ledger...');
    
    const outlet = await Outlet.findById(payment.outletId).lean();
    if (!outlet) throw new Error("Outlet not found");

    const sys = await getSystemAccounts(payment.outletId);

    /* ───────── DETERMINE PAYMENT ACCOUNT ───────── */

    let paymentAccountId: mongoose.Types.ObjectId;

    if (payment.paymentMethod === "BANK_TRANSFER" || payment.paymentMethod === "CARD") {
      paymentAccountId = sys.bankAccount;
    } else {
      paymentAccountId = sys.cashAccount;
    }

    const apAccountId = sys.apAccount || sys.arAccount;

    /* ───────── GET ACCOUNT DETAILS ───────── */

    const paymentDetails = await getAccountDetails(paymentAccountId);
    const apDetails = await getAccountDetails(apAccountId);

    /* ───────── BUILD PAYMENT VOUCHER ENTRIES ───────── */

    const paymentEntries: Array<{
      accountId: mongoose.Types.ObjectId;
      accountNumber: string;
      accountName: string;
      debit: number;
      credit: number;
    }> = [
      {
        ...apDetails,
        debit: payment.amount,
        credit: 0,
      },
      {
        ...paymentDetails,
        debit: 0,
        credit: payment.amount,
      },
    ];

    /* ───────── CREATE PAYMENT VOUCHER ───────── */

    const voucherNumber = await generateVoucherNumber("payment", payment.outletId);

    const narration = payment.notes || 
      `Payment for Purchase ${payment.purchaseNumber} - ${payment.supplierName}${
        payment.referenceNumber ? ` (Ref: ${payment.referenceNumber})` : ""
      }`;

    const paymentVoucher = await Voucher.create([
      {
        voucherNumber,
        voucherType: "payment",
        date: payment.paymentDate,
        narration,
        entries: paymentEntries,
        totalDebit: payment.amount,
        totalCredit: payment.amount,
        status: "posted",
        referenceType: "PURCHASE_PAYMENT",
        referenceId: payment.purchaseId,
        outletId: payment.outletId,
        createdBy: userId,
        metadata: {
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          purchaseNumber: payment.purchaseNumber,
          supplierName: payment.supplierName,
        },
      },
    ]);

    console.log(`  ✓ Payment voucher created: ${paymentVoucher[0].voucherNumber}`);

    // ✅ Apply balance changes
    await applyVoucherBalances(paymentVoucher[0]);

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
      date: payment.paymentDate,
      referenceType: "PURCHASE_PAYMENT",
      referenceId: payment.purchaseId,
      referenceNumber: payment.purchaseNumber,
      isReversal: false,
      outletId: payment.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(`  ✓ Created ${ledgerDocs.length} ledger entries`);
    console.log(`✓ Purchase payment posted successfully\n`);

    return {
      voucherId: paymentVoucher[0]._id,
      voucherNumber: paymentVoucher[0].voucherNumber,
      ledgerEntriesCount: ledgerDocs.length,
    };
  } catch (error) {
    console.error("Error posting purchase payment to ledger:", error);
    throw error;
  }
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
    if (expense.paymentMethod === "CREDIT") {
      paymentAccountId = sys.apAccount || sys.arAccount;
      if (!sys.apAccount) {
        console.warn(
          "Warning: Using AR account for AP. Please configure AP system account."
        );
      }
    } else if (
      expense.paymentMethod === "BANK_TRANSFER" ||
      expense.paymentMethod === "CARD"
    ) {
      paymentAccountId = sys.bankAccount;
    } else {
      paymentAccountId = sys.cashAccount;
    }

    // Override with specific payment account if provided
    if (expense.paymentAccount) {
      paymentAccountId = expense.paymentAccount;
    }

    // Credit the payment account(s)
    if (expense.paymentMethod === "CREDIT") {
      const payableDetails = await getAccountDetails(paymentAccountId);
      paymentEntries.push({
        ...payableDetails,
        debit: 0,
        credit: expense.grandTotal,
      });
    } else {
      if (expense.amountPaid > 0) {
        const paymentDetails = await getAccountDetails(paymentAccountId);
        paymentEntries.push({
          ...paymentDetails,
          debit: 0,
          credit: expense.amountPaid,
        });
      }

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

    const voucherNumber = await generateVoucherNumber(
      "payment",
      expense.outletId
    );

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
        referenceType: "PAYMENT",
        referenceId: expense._id,
        outletId: expense.outletId,
        createdBy: userId,
      },
    ]);

    // ✅ Apply balance changes
    await applyVoucherBalances(paymentVoucher[0]);

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
      referenceType: "PAYMENT",
      referenceId: expense._id,
      referenceNumber: expense.expenseNumber,
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
    console.error("Error posting expense to ledger:", error);
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
      throw new Error("Expense has no voucher to reverse");
    }

    // Get original voucher
    const originalVoucherDoc = await Voucher.findById(expense.voucherId).lean();
    if (!originalVoucherDoc) {
      throw new Error("Original voucher not found");
    }

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
    const voucherNumber = await generateVoucherNumber(
      "payment",
      expense.outletId
    );

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
        referenceType: "REVERSAL",
        referenceId: expense._id,
        outletId: expense.outletId,
        createdBy: userId,
      },
    ]);

    // ✅ Apply balance changes for reversal
    await applyVoucherBalances(reversalVoucher[0]);

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
      referenceType: "REVERSAL",
      referenceId: expense._id,
      referenceNumber: (expense as any).expenseNumber,
      isReversal: true,
      reversalReason: reason,
      outletId: expense.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(
      `✓ Reversal voucher created: ${reversalVoucher[0].voucherNumber}`
    );

    return {
      reversalVoucherId: reversalVoucher[0]._id,
      reversalVoucherNumber: reversalVoucher[0].voucherNumber,
    };
  } catch (error) {
    console.error("Error reversing expense voucher:", error);
    throw error;
  }
}

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

    /* ───────── CALCULATE ADJUSTMENT VALUE ───────── */

    const quantity = Number(adjustment.quantity) || 0;
    const costPrice = Number(adjustment.costPrice) || 0;
    const totalValue = quantity * costPrice;

    if (totalValue <= 0) {
      console.warn(
        "⚠️ Inventory adjustment has zero value, skipping ledger entry"
      );
      return { voucherId: null, voucherNumber: null };
    }

    /* ───────── GET INVENTORY ADJUSTMENT ACCOUNT ───────── */

    let adjustmentAccountId = null;

    const equityAccount = (await Account.findOne({
      outletId: adjustment.outletId,
      $or: [
        { code: "EQ-001" },
        { subType: "OWNER_EQUITY" },
        { name: { $regex: /owner.*equity|capital/i } },
      ],
      isActive: true,
    }).lean()) as any;

    if (equityAccount) {
      adjustmentAccountId = equityAccount._id;
      console.log(
        `✓ Using account: ${equityAccount.code} - ${equityAccount.name}`
      );
    } else {
      throw new Error(
        "Owner Equity account (EQ-001) not found. Please ensure the Owner Equity system account exists."
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

    const isIncrease = quantity > 0;

    if (isIncrease) {
      // INCREASE: Add to inventory
      journalEntries.push({
        ...inventoryDetails,
        debit: totalValue,
        credit: 0,
      });

      journalEntries.push({
        ...adjustmentDetails,
        debit: 0,
        credit: totalValue,
      });
    } else {
      // DECREASE: Remove from inventory
      journalEntries.push({
        ...adjustmentDetails,
        debit: Math.abs(totalValue),
        credit: 0,
      });

      journalEntries.push({
        ...inventoryDetails,
        debit: 0,
        credit: Math.abs(totalValue),
      });
    }

    /* ───────── CREATE JOURNAL VOUCHER ───────── */

    const voucherNumber = await generateVoucherNumber(
      "journal",
      adjustment.outletId
    );

    const adjustmentType = adjustment.adjustmentType || "ADJUSTMENT";
    const reason = adjustment.reason || "Inventory adjustment";

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

    // ✅ Apply balance changes
    await applyVoucherBalances(journalVoucher[0]);

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

    console.log(
      `✓ Inventory adjustment voucher created: ${journalVoucher[0].voucherNumber}`
    );
    console.log(
      `✓ ${isIncrease ? "Increased" : "Decreased"} inventory by QAR ${totalValue.toFixed(2)}`
    );

    return {
      voucherId: journalVoucher[0]._id,
      voucherNumber: journalVoucher[0].voucherNumber,
      ledgerEntriesCount: ledgerDocs.length,
    };
  } catch (error) {
    console.error("Error posting inventory adjustment to ledger:", error);
    throw error;
  }
}

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
    console.log("\n📝 Posting return to ledger...");

    const outlet = await Outlet.findById(returnData.outletId).lean();
    if (!outlet) throw new Error("Outlet not found");

    const sys = await getSystemAccounts(returnData.outletId);

    /* ───────── CALCULATE RETURN VALUES ───────── */

    const returnAmount = Number(returnData.totalAmount);

    // Calculate COGS value for returned items
    let cogsValue = 0;

    for (const item of returnData.items) {
      if (!item.productId) continue;

      const product = (await Product.findById(item.productId).lean()) as any;
      if (product) {
        const costPrice = product.costPrice || 0;
        cogsValue += costPrice * item.quantity;
      }
    }

    console.log(`  Return Amount: QAR ${returnAmount.toFixed(2)}`);
    console.log(`  COGS Value: QAR ${cogsValue.toFixed(2)}`);

    /* ───────── GET SALES RETURNS ACCOUNT ───────── */

    let salesReturnsAccountId = null;

    const salesReturnsAccount = (await Account.findOne({
      outletId: returnData.outletId,
      $or: [
        { code: "REV-001" },
        { name: { $regex: /sales.*return|return.*sale/i } },
        { subType: "SALES_RETURNS" },
      ],
      isActive: true,
    }).lean()) as any;

    if (salesReturnsAccount) {
      salesReturnsAccountId = salesReturnsAccount._id;
      console.log(
        `  ✓ Using Sales Returns account: ${salesReturnsAccount.code}`
      );
    } else {
      salesReturnsAccountId = sys.salesRevenueAccount;
      console.log(
        `  ⚠️ Sales Returns account not found, using Sales Revenue`
      );
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

    if (returnData.paymentMethod === "CREDIT") {
      refundAccountId = sys.arAccount;
    } else if (
      returnData.paymentMethod === "BANK_TRANSFER" ||
      returnData.paymentMethod === "CARD"
    ) {
      refundAccountId = sys.bankAccount;
    } else {
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

    console.log(
      `  ✓ Journal entries balanced: DR=${totalDebit.toFixed(2)}, CR=${totalCredit.toFixed(2)}`
    );

    /* ───────── CREATE JOURNAL VOUCHER ───────── */

    const voucherNumber = await generateVoucherNumber(
      "journal",
      returnData.outletId
    );

    const narration = `Return ${returnData.returnNumber} for ${returnData.invoiceNumber} - ${returnData.customerName}`;

    const journalVoucher = await Voucher.create([
      {
        voucherNumber,
        voucherType: "journal",
        date: returnData.returnDate || new Date(),
        narration,
        entries: journalEntries,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        status: "posted",
        referenceType: "ADJUSTMENT",
        referenceId: returnData._id || returnData.saleId,
        outletId: returnData.outletId,
        createdBy: userId,
      },
    ]);

    console.log(`  ✓ Created voucher: ${journalVoucher[0].voucherNumber}`);

    // ✅ Apply balance changes
    await applyVoucherBalances(journalVoucher[0]);

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
      date: returnData.returnDate || new Date(),
      referenceType: "ADJUSTMENT",
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
    console.error("Error posting return to ledger:", error);
    throw error;
  }
}

/* ═══════════════════════════════════════════════════════════
   REVERSE SALE VOUCHER - for sale cancellations
   ═══════════════════════════════════════════════════════════ */

export async function reverseSaleVoucher(
  sale: any,
  userId: mongoose.Types.ObjectId,
  reason: string
) {
  try {
    const reversalResults: any[] = [];

    // Reverse receipt voucher if exists
    if (sale.voucherId) {
      const originalVoucherDoc = await Voucher.findById(sale.voucherId).lean();
      if (originalVoucherDoc) {
        const originalVoucher = originalVoucherDoc as any;

        const reversedEntries = originalVoucher.entries.map((e: any) => ({
          accountId: e.accountId,
          accountNumber: e.accountNumber,
          accountName: e.accountName,
          debit: e.credit,
          credit: e.debit,
        }));

        const voucherNumber = await generateVoucherNumber(
          "receipt",
          sale.outletId
        );

        const reversalVoucher = await Voucher.create([
          {
            voucherNumber,
            voucherType: "receipt",
            date: new Date(),
            narration: `REVERSAL: ${originalVoucher.narration} - ${reason}`,
            entries: reversedEntries,
            totalDebit: originalVoucher.totalCredit,
            totalCredit: originalVoucher.totalDebit,
            status: "posted",
            referenceType: "REVERSAL",
            referenceId: sale._id,
            outletId: sale.outletId,
            createdBy: userId,
          },
        ]);

        await applyVoucherBalances(reversalVoucher[0]);

        const ledgerDocs = reversedEntries.map((e: any) => ({
          voucherId: reversalVoucher[0]._id,
          voucherNumber: reversalVoucher[0].voucherNumber,
          voucherType: "receipt",
          accountId: e.accountId,
          accountNumber: e.accountNumber,
          accountName: e.accountName,
          debit: e.debit,
          credit: e.credit,
          narration: reversalVoucher[0].narration,
          date: new Date(),
          referenceType: "REVERSAL",
          referenceId: sale._id,
          referenceNumber: sale.invoiceNumber,
          isReversal: true,
          reversalReason: reason,
          outletId: sale.outletId,
          createdBy: userId,
        }));

        await LedgerEntry.insertMany(ledgerDocs);

        reversalResults.push({
          type: "receipt",
          reversalVoucherId: reversalVoucher[0]._id,
          reversalVoucherNumber: reversalVoucher[0].voucherNumber,
        });
      }
    }

    // Reverse COGS voucher if exists
    if (sale.cogsVoucherId) {
      const cogsVoucherDoc = await Voucher.findById(sale.cogsVoucherId).lean();
      if (cogsVoucherDoc) {
        const cogsVoucher = cogsVoucherDoc as any;

        const reversedCogsEntries = cogsVoucher.entries.map((e: any) => ({
          accountId: e.accountId,
          accountNumber: e.accountNumber,
          accountName: e.accountName,
          debit: e.credit,
          credit: e.debit,
        }));

        const cogsReversalNumber = await generateVoucherNumber(
          "journal",
          sale.outletId
        );

        const cogsReversalVoucher = await Voucher.create([
          {
            voucherNumber: cogsReversalNumber,
            voucherType: "journal",
            date: new Date(),
            narration: `REVERSAL: ${cogsVoucher.narration} - ${reason}`,
            entries: reversedCogsEntries,
            totalDebit: cogsVoucher.totalCredit,
            totalCredit: cogsVoucher.totalDebit,
            status: "posted",
            referenceType: "REVERSAL",
            referenceId: sale._id,
            outletId: sale.outletId,
            createdBy: userId,
          },
        ]);

        await applyVoucherBalances(cogsReversalVoucher[0]);

        const cogsLedgerDocs = reversedCogsEntries.map((e: any) => ({
          voucherId: cogsReversalVoucher[0]._id,
          voucherNumber: cogsReversalVoucher[0].voucherNumber,
          voucherType: "journal",
          accountId: e.accountId,
          accountNumber: e.accountNumber,
          accountName: e.accountName,
          debit: e.debit,
          credit: e.credit,
          narration: cogsReversalVoucher[0].narration,
          date: new Date(),
          referenceType: "REVERSAL",
          referenceId: sale._id,
          referenceNumber: sale.invoiceNumber,
          isReversal: true,
          reversalReason: reason,
          outletId: sale.outletId,
          createdBy: userId,
        }));

        await LedgerEntry.insertMany(cogsLedgerDocs);

        reversalResults.push({
          type: "cogs",
          reversalVoucherId: cogsReversalVoucher[0]._id,
          reversalVoucherNumber: cogsReversalVoucher[0].voucherNumber,
        });
      }
    }

    console.log(`✓ Sale vouchers reversed: ${reversalResults.length} vouchers`);

    return { reversals: reversalResults };
  } catch (error) {
    console.error("Error reversing sale voucher:", error);
    throw error;
  }
}

/* ═══════════════════════════════════════════════════════════
   REVERSE PURCHASE VOUCHER - for purchase cancellations
   ═══════════════════════════════════════════════════════════ */

export async function reversePurchaseVoucher(
  purchase: any,
  userId: mongoose.Types.ObjectId,
  reason: string
) {
  try {
    if (!purchase.voucherId) {
      throw new Error("Purchase has no voucher to reverse");
    }

    const originalVoucherDoc = await Voucher.findById(
      purchase.voucherId
    ).lean();
    if (!originalVoucherDoc) {
      throw new Error("Original voucher not found");
    }

    const originalVoucher = originalVoucherDoc as any;

    const reversedEntries = originalVoucher.entries.map((e: any) => ({
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.credit,
      credit: e.debit,
    }));

    const voucherNumber = await generateVoucherNumber(
      "payment",
      purchase.outletId
    );

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
        referenceType: "REVERSAL",
        referenceId: purchase._id,
        outletId: purchase.outletId,
        createdBy: userId,
      },
    ]);

    await applyVoucherBalances(reversalVoucher[0]);

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
      referenceType: "REVERSAL",
      referenceId: purchase._id,
      referenceNumber: purchase.purchaseNumber,
      isReversal: true,
      reversalReason: reason,
      outletId: purchase.outletId,
      createdBy: userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);

    console.log(
      `✓ Purchase reversal voucher created: ${reversalVoucher[0].voucherNumber}`
    );

    return {
      reversalVoucherId: reversalVoucher[0]._id,
      reversalVoucherNumber: reversalVoucher[0].voucherNumber,
    };
  } catch (error) {
    console.error("Error reversing purchase voucher:", error);
    throw error;
  }
}

// Export all functions
export default {
  getSystemAccounts,
  generateVoucherNumber,
  postSaleToLedger,
  postPurchaseToLedger,
  postPurchasePaymentToLedger,
  postExpenseToLedger,
  reverseExpenseVoucher,
  postInventoryAdjustmentToLedger,
  postReturnToLedger,
  reverseSaleVoucher,
  reversePurchaseVoucher,
};