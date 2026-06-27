import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/jwt";
import Supplier from "@/lib/models/Supplier";
import Purchase from "@/lib/models/Purchase";
import Voucher from "@/lib/models/Voucher";

function toAmount(value: unknown) {
  const amount = Number(value) || 0;
  return Number(amount.toFixed(2));
}

function getVoucherSupplierId(voucher: any) {
  return voucher.metadata?.supplierId || voucher.referenceId?.toString();
}

async function getSupplierOpeningBalances(outletId: mongoose.Types.ObjectId) {
  const vouchers = await Voucher.find({
    outletId,
    referenceType: "OPENING_BALANCE",
    status: "posted",
    "metadata.source": "SUPPLIER_OPENING_BALANCE",
  })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const balances = new Map<string, any[]>();

  for (const voucher of vouchers as any[]) {
    const supplierId = getVoucherSupplierId(voucher);
    if (!supplierId) continue;

    const amount = toAmount(voucher.totalCredit || voucher.totalDebit);
    if (!balances.has(supplierId)) balances.set(supplierId, []);

    balances.get(supplierId)!.push({
      date: voucher.date,
      type: "opening_balance",
      reference: voucher.voucherNumber,
      description: "Opening payable balance",
      debit: 0,
      credit: amount,
      balance: 0,
    });
  }

  return balances;
}

async function getPaymentVouchersByPurchase(
  outletId: mongoose.Types.ObjectId,
  purchaseIds: mongoose.Types.ObjectId[]
) {
  if (purchaseIds.length === 0) return new Map<string, any[]>();

  const payments = await Voucher.find({
    outletId,
    status: "posted",
    referenceType: "PURCHASE_PAYMENT",
    referenceId: { $in: purchaseIds },
  })
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

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user.outletId) {
      return NextResponse.json({ error: "Invalid token: outletId missing" }, { status: 401 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const fromDate = new Date(
      searchParams.get("fromDate") || new Date(new Date().getFullYear(), 0, 1)
    );
    const toDate = new Date(searchParams.get("toDate") || new Date());
    toDate.setHours(23, 59, 59, 999);

    const openingBalances = await getSupplierOpeningBalances(outletId);

    if (!supplierId) {
      const suppliers = await Supplier.find({
        outletId,
        isActive: { $ne: false },
      })
        .sort({ name: 1 })
        .lean();

      const purchases = await Purchase.find({
        outletId,
        status: { $ne: "CANCELLED" },
      })
        .select("_id supplierId grandTotal amountPaid")
        .lean();

      const paymentVouchers = await getPaymentVouchersByPurchase(
        outletId,
        (purchases as any[]).map((purchase) => purchase._id)
      );

      const suppliersWithBalance = (suppliers as any[]).map((supplier) => {
        const id = supplier._id.toString();
        const supplierPurchases = (purchases as any[]).filter(
          (purchase) => purchase.supplierId?.toString() === id
        );
        const openingBalance = toAmount(
          (openingBalances.get(id) || []).reduce((sum, entry) => sum + entry.credit, 0)
        );

        const totalPurchases = toAmount(
          supplierPurchases.reduce((sum, purchase) => sum + (purchase.grandTotal || 0), 0)
        );

        const totalPaid = toAmount(
          supplierPurchases.reduce((sum, purchase) => {
            const payments = paymentVouchers.get(purchase._id.toString()) || [];
            const voucherPaid = payments.reduce(
              (paymentSum, payment) => paymentSum + (payment.totalDebit || payment.totalCredit || 0),
              0
            );
            const initialPaid = Math.max(0, (purchase.amountPaid || 0) - voucherPaid);
            return sum + initialPaid + voucherPaid;
          }, 0)
        );

        return {
          ...supplier,
          openingBalance,
          totalPurchases,
          totalPaid,
          balance: toAmount(openingBalance + totalPurchases - totalPaid),
          purchasesCount: supplierPurchases.length,
        };
      });

      return NextResponse.json({ suppliers: suppliersWithBalance });
    }

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    const supplier = await Supplier.findOne({
      _id: supplierId,
      outletId,
    }).lean();

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const purchases = await Purchase.find({
      outletId,
      supplierId: new mongoose.Types.ObjectId(supplierId),
      status: { $ne: "CANCELLED" },
    })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .lean();

    const paymentVouchers = await getPaymentVouchersByPurchase(
      outletId,
      (purchases as any[]).map((purchase) => purchase._id)
    );

    const allEntries: any[] = [...(openingBalances.get(supplierId) || [])];

    for (const purchase of purchases as any[]) {
      allEntries.push({
        date: purchase.purchaseDate,
        type: "purchase",
        reference: purchase.purchaseNumber || "N/A",
        description: `Purchase - ${purchase.items?.length || 0} items`,
        debit: 0,
        credit: toAmount(purchase.grandTotal),
        balance: 0,
      });

      const payments = paymentVouchers.get(purchase._id.toString()) || [];
      const voucherPaid = payments.reduce(
        (sum, payment) => sum + (payment.totalDebit || payment.totalCredit || 0),
        0
      );
      const initialPaid = toAmount(Math.max(0, (purchase.amountPaid || 0) - voucherPaid));

      if (initialPaid > 0) {
        allEntries.push({
          date: purchase.purchaseDate,
          type: "purchase_payment",
          reference: purchase.purchaseNumber || "N/A",
          description: "Payment at purchase",
          debit: initialPaid,
          credit: 0,
          balance: 0,
        });
      }

      for (const payment of payments) {
        allEntries.push({
          date: payment.date,
          type: "purchase_payment",
          reference: payment.voucherNumber,
          description: payment.narration || `Payment for ${purchase.purchaseNumber}`,
          debit: toAmount(payment.totalDebit || payment.totalCredit),
          credit: 0,
          balance: 0,
        });
      }
    }

    const ledgerEntries = allEntries
      .filter((entry) => {
        const date = new Date(entry.date);
        return date >= fromDate && date <= toDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    ledgerEntries.forEach((entry) => {
      runningBalance += (entry.credit || 0) - (entry.debit || 0);
      entry.balance = toAmount(runningBalance);
    });

    const totalDebit = toAmount(ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0));
    const totalCredit = toAmount(ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0));

    return NextResponse.json({
      supplier,
      ledgerEntries,
      summary: {
        totalDebit,
        totalCredit,
        closingBalance: toAmount(runningBalance),
        purchasesCount: (purchases as any[]).length,
        transactionsCount: ledgerEntries.length,
      },
    });
  } catch (error: any) {
    console.error("Error generating supplier ledger:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
