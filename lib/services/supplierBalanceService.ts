import mongoose from "mongoose";

import Purchase from "@/lib/models/Purchase";
import Voucher from "@/lib/models/Voucher";

type OutletId = string | mongoose.Types.ObjectId;
type SupplierId = string | mongoose.Types.ObjectId;

export function toAmount(value: unknown) {
  const amount = Number(value) || 0;
  return Number(amount.toFixed(2));
}

function getSupplierIdFromVoucher(voucher: any) {
  return voucher.metadata?.supplierId || voucher.referenceId?.toString();
}

export async function getPaymentVouchersByPurchase(
  outletId: OutletId,
  purchaseIds: mongoose.Types.ObjectId[]
) {
  if (purchaseIds.length === 0) return new Map<string, any[]>();

  const payments = await Voucher.find({
    outletId,
    status: "posted",
    referenceType: "PURCHASE_PAYMENT",
    referenceId: { $in: purchaseIds },
  })
    .select("referenceId totalDebit totalCredit date voucherNumber narration metadata createdAt")
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const byPurchase = new Map<string, any[]>();

  for (const payment of payments as any[]) {
    const purchaseId = payment.referenceId?.toString();
    if (!purchaseId) continue;

    if (!byPurchase.has(purchaseId)) byPurchase.set(purchaseId, []);
    byPurchase.get(purchaseId)!.push(payment);
  }

  return byPurchase;
}

export async function getSupplierOpeningBalanceMap(outletId: OutletId) {
  const openingVouchers = await Voucher.find({
    outletId,
    referenceType: "OPENING_BALANCE",
    status: "posted",
    "metadata.source": "SUPPLIER_OPENING_BALANCE",
  })
    .select("referenceId totalDebit totalCredit metadata")
    .lean();

  const openingBySupplier = new Map<string, number>();

  for (const voucher of openingVouchers as any[]) {
    const supplierId = getSupplierIdFromVoucher(voucher);
    if (!supplierId) continue;

    const amount = Number(voucher.totalCredit || voucher.totalDebit) || 0;
    openingBySupplier.set(
      supplierId,
      (openingBySupplier.get(supplierId) || 0) + amount
    );
  }

  return openingBySupplier;
}

export async function getSupplierOpeningBalanceEntries(outletId: OutletId) {
  const openingVouchers = await Voucher.find({
    outletId,
    referenceType: "OPENING_BALANCE",
    status: "posted",
    "metadata.source": "SUPPLIER_OPENING_BALANCE",
  })
    .select("referenceId totalDebit totalCredit metadata date voucherNumber createdAt")
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const entriesBySupplier = new Map<string, any[]>();

  for (const voucher of openingVouchers as any[]) {
    const supplierId = getSupplierIdFromVoucher(voucher);
    if (!supplierId) continue;

    const amount = toAmount(voucher.totalCredit || voucher.totalDebit);
    if (!entriesBySupplier.has(supplierId)) entriesBySupplier.set(supplierId, []);

    entriesBySupplier.get(supplierId)!.push({
      date: voucher.date,
      type: "opening_balance",
      reference: voucher.voucherNumber,
      description: "Opening payable balance",
      debit: 0,
      credit: amount,
      balance: 0,
    });
  }

  return entriesBySupplier;
}

export async function getSupplierBalancePaymentMap(outletId: OutletId) {
  const paymentVouchers = await Voucher.find({
    outletId,
    status: "posted",
    referenceType: "PAYMENT",
    "metadata.source": "SUPPLIER_BALANCE_PAYMENT",
  })
    .select("referenceId totalDebit totalCredit metadata")
    .lean();

  const paidBySupplier = new Map<string, number>();

  for (const voucher of paymentVouchers as any[]) {
    const supplierId = getSupplierIdFromVoucher(voucher);
    if (!supplierId) continue;

    const amount = Number(voucher.totalDebit || voucher.totalCredit) || 0;
    paidBySupplier.set(
      supplierId,
      (paidBySupplier.get(supplierId) || 0) + amount
    );
  }

  return paidBySupplier;
}

export async function getSupplierBalancePaymentEntries(outletId: OutletId) {
  const paymentVouchers = await Voucher.find({
    outletId,
    status: "posted",
    referenceType: "PAYMENT",
    "metadata.source": "SUPPLIER_BALANCE_PAYMENT",
  })
    .select("referenceId totalDebit totalCredit metadata date voucherNumber narration createdAt")
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const entriesBySupplier = new Map<string, any[]>();

  for (const voucher of paymentVouchers as any[]) {
    const supplierId = getSupplierIdFromVoucher(voucher);
    if (!supplierId) continue;

    const amount = toAmount(voucher.totalDebit || voucher.totalCredit);
    if (!entriesBySupplier.has(supplierId)) entriesBySupplier.set(supplierId, []);

    entriesBySupplier.get(supplierId)!.push({
      date: voucher.date,
      type: "supplier_payment",
      reference: voucher.voucherNumber,
      description: voucher.narration || "Supplier balance payment",
      debit: amount,
      credit: 0,
      balance: 0,
    });
  }

  return entriesBySupplier;
}

export async function getSupplierOutstandingBalance(params: {
  outletId: OutletId;
  supplierId: SupplierId;
}) {
  const supplierObjectId =
    typeof params.supplierId === "string"
      ? new mongoose.Types.ObjectId(params.supplierId)
      : params.supplierId;
  const supplierKey = supplierObjectId.toString();

  const purchases = await Purchase.find({
    outletId: params.outletId,
    supplierId: supplierObjectId,
    status: { $ne: "CANCELLED" },
  })
    .select("_id grandTotal amountPaid")
    .lean();

  const purchasePaymentVouchers = await getPaymentVouchersByPurchase(
    params.outletId,
    (purchases as any[]).map((purchase) => purchase._id)
  );
  const openingBySupplier = await getSupplierOpeningBalanceMap(params.outletId);
  const supplierPaymentsBySupplier = await getSupplierBalancePaymentMap(
    params.outletId
  );

  const openingBalance = toAmount(openingBySupplier.get(supplierKey) || 0);
  const totalPurchases = toAmount(
    (purchases as any[]).reduce(
      (sum, purchase) => sum + (Number(purchase.grandTotal) || 0),
      0
    )
  );
  const purchasePaymentsTotal = toAmount(
    (purchases as any[]).reduce((sum, purchase) => {
      const payments = purchasePaymentVouchers.get(purchase._id.toString()) || [];
      const voucherPaid = payments.reduce(
        (paymentSum, payment) =>
          paymentSum + (Number(payment.totalDebit || payment.totalCredit) || 0),
        0
      );
      const initialPaid = Math.max(
        0,
        (Number(purchase.amountPaid) || 0) - voucherPaid
      );
      return sum + initialPaid + voucherPaid;
    }, 0)
  );
  const directPaymentsTotal = toAmount(
    supplierPaymentsBySupplier.get(supplierKey) || 0
  );
  const totalPaid = toAmount(purchasePaymentsTotal + directPaymentsTotal);
  const balance = toAmount(openingBalance + totalPurchases - totalPaid);

  return {
    openingBalance,
    totalPurchases,
    purchasePaymentsTotal,
    directPaymentsTotal,
    totalPaid,
    balance,
    purchasesCount: (purchases as any[]).length,
  };
}
