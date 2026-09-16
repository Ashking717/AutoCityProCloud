import mongoose from 'mongoose';

import Account, { AccountSubType } from '@/lib/models/Account';
import { seedSystemAccounts, SYSTEM_ACCOUNTS } from '@/lib/accounting/seedSystemAccounts';
import { PaymentMethod } from '@/lib/models/Sale';
import { ReferenceType, VoucherType } from '@/lib/models/Voucher';
import {
  createPostedVoucher,
  PostingEntryInput,
  reversePostedVoucher,
} from '@/lib/services/voucherPostingService';

type AccountMap = Partial<Record<AccountSubType, mongoose.Types.ObjectId>>;

async function loadSystemAccounts(
  outletId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  let accounts = await Account.find({ outletId, isSystem: true, isActive: true })
    .session(session)
    .lean();
  const configuredCodes = new Set(accounts.map((account) => account.code));
  if (SYSTEM_ACCOUNTS.some((account) => !configuredCodes.has(account.code))) {
    await seedSystemAccounts(outletId, session);
    accounts = await Account.find({ outletId, isSystem: true, isActive: true })
      .session(session)
      .lean();
  }
  const result: AccountMap = {};
  for (const account of accounts) {
    if (account.subType) {
      result[account.subType as AccountSubType] = account._id as mongoose.Types.ObjectId;
    }
  }
  return result;
}

function requireAccount(accounts: AccountMap, subType: AccountSubType) {
  const account = accounts[subType];
  if (!account) throw new Error(`System account missing: ${subType}`);
  return account;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function paymentAccount(
  accounts: AccountMap,
  method: string
) {
  if (method === PaymentMethod.CARD || method === PaymentMethod.BANK_TRANSFER || method === PaymentMethod.CHEQUE) {
    return requireAccount(accounts, AccountSubType.BANK);
  }
  if (method === PaymentMethod.CASH) return requireAccount(accounts, AccountSubType.CASH);
  throw new Error(`Unsupported tender payment method: ${method}`);
}

function groupTenderPayments(
  accounts: AccountMap,
  payments: Array<{ method: string; amount: number }>
) {
  const grouped = new Map<string, { accountId: mongoose.Types.ObjectId; amount: number }>();
  for (const payment of payments) {
    const amount = round(Number(payment.amount || 0));
    if (amount <= 0) continue;
    const accountId = paymentAccount(accounts, payment.method);
    const key = String(accountId);
    const current = grouped.get(key);
    grouped.set(key, { accountId, amount: round((current?.amount || 0) + amount) });
  }
  return [...grouped.values()];
}

export async function postSaleAccounting(
  sale: any,
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
  options?: { skipCOGS?: boolean; postingSuffix?: string }
) {
  const outletId = new mongoose.Types.ObjectId(sale.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const groupedPayments = groupTenderPayments(accounts, payments);
  const tenderTotal = round(groupedPayments.reduce((sum, payment) => sum + payment.amount, 0));
  const balanceDue = round(Number(sale.balanceDue || 0));
  const grandTotal = round(Number(sale.grandTotal || 0));

  if (Math.abs(tenderTotal - Number(sale.amountPaid || 0)) > 0.01) {
    throw new Error('Sale payment details do not equal amount paid');
  }
  if (Math.abs(tenderTotal + balanceDue - grandTotal) > 0.01) {
    throw new Error('Sale paid amount plus balance due must equal grand total');
  }

  const receiptEntries: PostingEntryInput[] = groupedPayments.map((payment) => ({
    accountId: payment.accountId,
    debit: payment.amount,
  }));
  if (balanceDue > 0) {
    receiptEntries.push({
      accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_RECEIVABLE),
      debit: balanceDue,
    });
  }

  const productRevenue = round(sale.items
    .filter((item: any) => !item.isLabor)
    .reduce((sum: number, item: any) => sum + Number(item.total || 0), 0));
  const serviceRevenue = round(sale.items
    .filter((item: any) => item.isLabor)
    .reduce((sum: number, item: any) => sum + Number(item.total || 0), 0));
  const vat = round(Number(sale.totalVAT || 0));

  if (productRevenue > 0) {
    receiptEntries.push({
      accountId: requireAccount(accounts, AccountSubType.SALES_REVENUE),
      credit: productRevenue,
    });
  }
  if (serviceRevenue > 0) {
    receiptEntries.push({
      accountId: requireAccount(accounts, AccountSubType.SERVICE_REVENUE),
      credit: serviceRevenue,
    });
  }
  if (vat > 0) {
    receiptEntries.push({
      accountId: requireAccount(accounts, AccountSubType.VAT_PAYABLE),
      credit: vat,
    });
  }

  const receipt = await createPostedVoucher({
    voucherType: VoucherType.RECEIPT,
    date: sale.saleDate,
    narration: `Sale ${sale.invoiceNumber}`,
    entries: receiptEntries,
    referenceType: ReferenceType.SALE,
    referenceId: sale._id,
    referenceNumber: sale.invoiceNumber,
    postingKey: `sale:${sale._id}:receipt${options?.postingSuffix ? `:${options.postingSuffix}` : ''}`,
    outletId,
    createdBy: userId,
  }, session);

  if (options?.skipCOGS) {
    return {
      voucherId: receipt.voucher._id as mongoose.Types.ObjectId,
      cogsVoucherId: undefined,
    };
  }

  const totalCOGS = round(sale.items
    .filter((item: any) => !item.isLabor)
    .reduce(
      (sum: number, item: any) => sum + Number(item.costPrice || 0) * Number(item.quantity || 0),
      0
    ));

  let cogsVoucherId: mongoose.Types.ObjectId | undefined;
  if (totalCOGS > 0) {
    const cogs = await createPostedVoucher({
      voucherType: VoucherType.JOURNAL,
      date: sale.saleDate,
      narration: `COGS for ${sale.invoiceNumber}`,
      entries: [
        { accountId: requireAccount(accounts, AccountSubType.COGS), debit: totalCOGS },
        { accountId: requireAccount(accounts, AccountSubType.INVENTORY), credit: totalCOGS },
      ],
      referenceType: ReferenceType.SALE,
      referenceId: sale._id,
      referenceNumber: sale.invoiceNumber,
      postingKey: `sale:${sale._id}:cogs`,
      outletId,
      createdBy: userId,
    }, session);
    cogsVoucherId = cogs.voucher._id as mongoose.Types.ObjectId;
  }

  return {
    voucherId: receipt.voucher._id as mongoose.Types.ObjectId,
    cogsVoucherId,
  };
}

export async function postPurchaseAccounting(
  purchase: any,
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const outletId = new mongoose.Types.ObjectId(purchase.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const subtotal = round(Number(purchase.subtotal || 0));
  const vat = round(Number(purchase.totalTax || 0));
  const paid = round(Number(purchase.amountPaid || 0));
  const due = round(Number(purchase.balanceDue || 0));
  const total = round(Number(purchase.grandTotal || 0));
  if (Math.abs(subtotal + vat - total) > 0.01 || Math.abs(paid + due - total) > 0.01) {
    throw new Error('Purchase totals are inconsistent');
  }

  const entries: PostingEntryInput[] = [
    { accountId: requireAccount(accounts, AccountSubType.INVENTORY), debit: subtotal },
  ];
  if (vat > 0) {
    entries.push({
      accountId: requireAccount(accounts, AccountSubType.VAT_RECEIVABLE),
      debit: vat,
    });
  }
  if (paid > 0) {
    entries.push({
      accountId: paymentAccount(accounts, purchase.paymentMethod),
      credit: paid,
    });
  }
  if (due > 0) {
    entries.push({
      accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_PAYABLE),
      credit: due,
    });
  }

  const result = await createPostedVoucher({
    voucherType: VoucherType.PAYMENT,
    date: purchase.purchaseDate,
    narration: `Purchase ${purchase.purchaseNumber} from ${purchase.supplierName}`,
    entries,
    referenceType: ReferenceType.PURCHASE,
    referenceId: purchase._id,
    referenceNumber: purchase.purchaseNumber,
    postingKey: `purchase:${purchase._id}:initial`,
    outletId,
    createdBy: userId,
  }, session);

  return { voucherId: result.voucher._id as mongoose.Types.ObjectId };
}

export async function postPurchasePaymentAccounting(
  purchase: any,
  payment: { amount: number; method: string; date: Date; reference?: string; paymentKey: string },
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const outletId = new mongoose.Types.ObjectId(purchase.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const amount = round(Number(payment.amount || 0));
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');

  const result = await createPostedVoucher({
    voucherType: VoucherType.PAYMENT,
    date: payment.date,
    narration: `Payment for purchase ${purchase.purchaseNumber}`,
    entries: [
      { accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_PAYABLE), debit: amount },
      { accountId: paymentAccount(accounts, payment.method), credit: amount },
    ],
    referenceType: ReferenceType.PURCHASE_PAYMENT,
    referenceId: purchase._id,
    referenceNumber: payment.reference || purchase.purchaseNumber,
    postingKey: payment.paymentKey,
    outletId,
    createdBy: userId,
  }, session);
  return {
    voucherId: result.voucher._id as mongoose.Types.ObjectId,
    voucherNumber: result.voucher.voucherNumber,
  };
}

export async function postSupplierBalancePaymentAccounting(
  supplier: any,
  payment: { amount: number; method: string; date: Date; reference?: string; notes?: string; paymentKey: string },
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const outletId = new mongoose.Types.ObjectId(supplier.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const amount = round(Number(payment.amount || 0));
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');
  const result = await createPostedVoucher({
    voucherType: VoucherType.PAYMENT,
    date: payment.date,
    narration: payment.notes || `Supplier balance payment - ${supplier.name}`,
    entries: [
      { accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_PAYABLE), debit: amount },
      { accountId: paymentAccount(accounts, payment.method), credit: amount },
    ],
    referenceType: ReferenceType.SUPPLIER_PAYMENT,
    referenceId: supplier._id,
    referenceNumber: payment.reference || supplier.code,
    postingKey: payment.paymentKey,
    outletId,
    createdBy: userId,
    metadata: {
      source: 'SUPPLIER_BALANCE_PAYMENT',
      supplierId: String(supplier._id),
      supplierCode: supplier.code,
      supplierName: supplier.name,
      paymentMethod: payment.method,
      paymentAmount: amount,
    },
  }, session);
  return { voucherId: result.voucher._id as mongoose.Types.ObjectId, voucherNumber: result.voucher.voucherNumber };
}

export async function postExpenseAccounting(
  expense: any,
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const outletId = new mongoose.Types.ObjectId(expense.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const subtotal = round(Number(expense.subtotal || 0));
  const tax = round(Number(expense.taxAmount || 0));
  const total = round(Number(expense.grandTotal || 0));
  const paid = round(Number(expense.amountPaid || 0));
  const due = round(Number(expense.balanceDue || 0));
  if (Math.abs(subtotal + tax - total) > 0.01 || Math.abs(paid + due - total) > 0.01) {
    throw new Error('Expense totals are inconsistent');
  }
  const entries: PostingEntryInput[] = expense.items.map((item: any) => ({
    accountId: item.accountId,
    debit: round(Number(item.amount || 0)),
  }));
  if (tax > 0) entries.push({ accountId: requireAccount(accounts, AccountSubType.VAT_RECEIVABLE), debit: tax });
  if (paid > 0) {
    entries.push({
      accountId: expense.paymentAccount || paymentAccount(accounts, expense.paymentMethod),
      credit: paid,
    });
  }
  if (due > 0) entries.push({ accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_PAYABLE), credit: due });
  const result = await createPostedVoucher({
    voucherType: VoucherType.PAYMENT,
    date: expense.expenseDate,
    narration: expense.vendorName
      ? `Expense ${expense.expenseNumber} - ${expense.vendorName}`
      : `Expense ${expense.expenseNumber}`,
    entries,
    referenceType: ReferenceType.EXPENSE,
    referenceId: expense._id,
    referenceNumber: expense.expenseNumber,
    postingKey: `expense:${expense._id}:initial`,
    outletId,
    createdBy: userId,
  }, session);
  return { voucherId: result.voucher._id as mongoose.Types.ObjectId, voucherNumber: result.voucher.voucherNumber };
}

export async function postExpensePaymentAccounting(
  expense: any,
  payment: { amount: number; method: string; accountId?: mongoose.Types.ObjectId; date: Date; reference?: string; paymentKey: string },
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const outletId = new mongoose.Types.ObjectId(expense.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const amount = round(Number(payment.amount || 0));
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');
  const result = await createPostedVoucher({
    voucherType: VoucherType.PAYMENT,
    date: payment.date,
    narration: `Payment for expense ${expense.expenseNumber}`,
    entries: [
      { accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_PAYABLE), debit: amount },
      { accountId: payment.accountId || paymentAccount(accounts, payment.method), credit: amount },
    ],
    referenceType: ReferenceType.EXPENSE_PAYMENT,
    referenceId: expense._id,
    referenceNumber: payment.reference || expense.expenseNumber,
    postingKey: payment.paymentKey,
    outletId,
    createdBy: userId,
  }, session);
  return { voucherId: result.voucher._id as mongoose.Types.ObjectId, voucherNumber: result.voucher.voucherNumber };
}

export interface ReturnAccountingInput {
  sale: any;
  returnNumber: string;
  returnDate: Date;
  revenueAmount: number;
  vatAmount: number;
  cogsAmount: number;
  receivableReduction: number;
  refundAllocations: Array<{ method: string; amount: number }>;
}

export async function postReturnAccounting(
  input: ReturnAccountingInput,
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const sale = input.sale;
  const outletId = new mongoose.Types.ObjectId(sale.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const entries: PostingEntryInput[] = [];

  const returnsAccount = accounts[AccountSubType.SALES_RETURNS]
    || requireAccount(accounts, AccountSubType.SALES_REVENUE);
  if (input.revenueAmount > 0) entries.push({ accountId: returnsAccount, debit: round(input.revenueAmount) });
  if (input.vatAmount > 0) {
    entries.push({
      accountId: requireAccount(accounts, AccountSubType.VAT_PAYABLE),
      debit: round(input.vatAmount),
    });
  }
  if (input.cogsAmount > 0) {
    entries.push({
      accountId: requireAccount(accounts, AccountSubType.INVENTORY),
      debit: round(input.cogsAmount),
    });
  }
  if (input.receivableReduction > 0) {
    entries.push({
      accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_RECEIVABLE),
      credit: round(input.receivableReduction),
    });
  }
  for (const refund of groupTenderPayments(accounts, input.refundAllocations)) {
    entries.push({ accountId: refund.accountId, credit: refund.amount });
  }
  if (input.cogsAmount > 0) {
    entries.push({
      accountId: requireAccount(accounts, AccountSubType.COGS),
      credit: round(input.cogsAmount),
    });
  }

  const result = await createPostedVoucher({
    voucherType: VoucherType.JOURNAL,
    date: input.returnDate,
    narration: `Return ${input.returnNumber} for ${sale.invoiceNumber}`,
    entries,
    referenceType: ReferenceType.RETURN,
    referenceId: sale._id,
    referenceNumber: input.returnNumber,
    postingKey: `sale:${sale._id}:return:${input.returnNumber}`,
    outletId,
    createdBy: userId,
    metadata: { operation: 'SALE_RETURN' },
  }, session);
  return { voucherId: result.voucher._id as mongoose.Types.ObjectId };
}

export async function postCustomerRefundAccounting(
  sale: any,
  refund: { amount: number; method: string; reference?: string; refundKey: string },
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const outletId = new mongoose.Types.ObjectId(sale.outletId);
  const accounts = await loadSystemAccounts(outletId, session);
  const amount = round(refund.amount);
  const result = await createPostedVoucher({
    voucherType: VoucherType.PAYMENT,
    date: new Date(),
    narration: `Customer overpayment refund for ${sale.invoiceNumber}`,
    entries: [
      { accountId: requireAccount(accounts, AccountSubType.ACCOUNTS_RECEIVABLE), debit: amount },
      { accountId: paymentAccount(accounts, refund.method), credit: amount },
    ],
    referenceType: ReferenceType.PAYMENT,
    referenceId: sale._id,
    referenceNumber: refund.reference || sale.invoiceNumber,
    postingKey: refund.refundKey,
    outletId,
    createdBy: userId,
  }, session);
  return { voucherId: result.voucher._id as mongoose.Types.ObjectId };
}

export async function postInventoryAdjustmentAccounting(
  adjustment: {
    referenceId: mongoose.Types.ObjectId;
    referenceNumber: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    date: Date;
    reason: string;
    outletId: mongoose.Types.ObjectId;
    postingKey: string;
    isOpening?: boolean;
  },
  userId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const value = round(Math.abs(adjustment.quantity * adjustment.unitCost));
  if (value === 0) return { voucherId: undefined };
  const accounts = await loadSystemAccounts(adjustment.outletId, session);
  const inventory = requireAccount(accounts, AccountSubType.INVENTORY);
  const offsetAccount = requireAccount(
    accounts,
    adjustment.isOpening ? AccountSubType.OWNER_EQUITY : AccountSubType.INVENTORY_ADJUSTMENT
  );
  const increasing = adjustment.quantity > 0;
  const result = await createPostedVoucher({
    voucherType: VoucherType.JOURNAL,
    date: adjustment.date,
    narration: `Inventory adjustment: ${adjustment.productName} (${adjustment.sku}) - ${adjustment.reason}`,
    entries: increasing
      ? [{ accountId: inventory, debit: value }, { accountId: offsetAccount, credit: value }]
      : [{ accountId: offsetAccount, debit: value }, { accountId: inventory, credit: value }],
    referenceType: ReferenceType.ADJUSTMENT,
    referenceId: adjustment.referenceId,
    referenceNumber: adjustment.referenceNumber,
    postingKey: adjustment.postingKey,
    outletId: adjustment.outletId,
    createdBy: userId,
  }, session);
  return { voucherId: result.voucher._id as mongoose.Types.ObjectId };
}

export async function reverseSaleAccounting(
  sale: any,
  userId: mongoose.Types.ObjectId,
  reason: string,
  session: mongoose.ClientSession
) {
  let receiptReversalId: mongoose.Types.ObjectId | undefined;
  let cogsReversalId: mongoose.Types.ObjectId | undefined;
  if (sale.voucherId) {
    const result = await reversePostedVoucher(sale.voucherId, sale.outletId, userId, reason, session);
    receiptReversalId = result.reversal?._id as mongoose.Types.ObjectId | undefined;
  }
  if (sale.cogsVoucherId) {
    const result = await reversePostedVoucher(sale.cogsVoucherId, sale.outletId, userId, reason, session);
    cogsReversalId = result.reversal?._id as mongoose.Types.ObjectId | undefined;
  }
  return { receiptReversalId, cogsReversalId };
}
