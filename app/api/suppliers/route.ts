// app/api/suppliers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Account from "@/lib/models/Account";
import Supplier from "@/lib/models/Supplier";
import Purchase from "@/lib/models/Purchase";
import Voucher from "@/lib/models/Voucher";
import LedgerEntry from "@/lib/models/LedgerEntry";
import ActivityLog from "@/lib/models/ActivityLog";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { generateVoucherNumber } from "@/lib/services/accountingService";
import {
  getPaymentVouchersByPurchase,
  getSupplierBalancePaymentMap,
  getSupplierOpeningBalanceMap,
  toAmount,
} from "@/lib/services/supplierBalanceService";

async function getAccountDetails(account: any) {
  return {
    accountId: account._id,
    accountNumber: account.code || account.accountNumber || "N/A",
    accountName: account.name || account.accountName || "Unknown Account",
  };
}

async function getAccountsPayableAccount(outletId: string) {
  const account = await Account.findOne({
    outletId,
    isActive: { $ne: false },
    $or: [
      { subType: "accounts_payable" },
      { accountSubType: "accounts_payable" },
      { name: /^accounts payable$/i },
      { accountName: /^accounts payable$/i },
      { code: "L1000" },
    ],
  });

  if (!account) {
    throw new Error("Accounts Payable account is missing. Create the AP system account before adding supplier opening balances.");
  }

  return account;
}

async function getOrCreateOpeningBalanceAccount(outletId: string) {
  let account = await Account.findOne({
    outletId,
    code: "OB-EQUITY",
  });

  if (!account) {
    account = await Account.create({
      code: "OB-EQUITY",
      name: "Opening Balance Equity",
      type: "equity",
      subType: "owner_equity",
      accountGroup: "Owner Equity",
      openingBalance: 0,
      currentBalance: 0,
      isSystem: true,
      isActive: true,
      outletId,
    });
  }

  return account;
}

async function postSupplierOpeningBalance({
  supplier,
  amount,
  date,
  outletId,
  userId,
}: {
  supplier: any;
  amount: number;
  date?: string;
  outletId: string;
  userId: string;
}) {
  if (amount <= 0) return null;

  const apAccount = await getAccountsPayableAccount(outletId);
  const openingBalanceAccount = await getOrCreateOpeningBalanceAccount(outletId);
  const apDetails = await getAccountDetails(apAccount);
  const obDetails = await getAccountDetails(openingBalanceAccount);
  const voucherDate = date ? new Date(date) : new Date();
  const voucherNumber = await generateVoucherNumber("journal", supplier.outletId);
  const narration = `Supplier opening balance - ${supplier.name}`;

  const entries = [
    {
      ...obDetails,
      debit: amount,
      credit: 0,
      narration,
    },
    {
      ...apDetails,
      debit: 0,
      credit: amount,
      narration,
    },
  ];

  const voucher = await Voucher.create({
    voucherNumber,
    voucherType: "journal",
    date: voucherDate,
    narration,
    entries,
    totalDebit: amount,
    totalCredit: amount,
    status: "posted",
    referenceType: "OPENING_BALANCE",
    referenceId: supplier._id,
    referenceNumber: supplier.code,
    outletId,
    createdBy: userId,
    metadata: {
      source: "SUPPLIER_OPENING_BALANCE",
      supplierId: supplier._id.toString(),
      supplierCode: supplier.code,
      supplierName: supplier.name,
    },
  });

  await LedgerEntry.insertMany(
    entries.map((entry) => ({
      voucherId: voucher._id,
      voucherNumber: voucher.voucherNumber,
      voucherType: "journal",
      accountId: entry.accountId,
      accountNumber: entry.accountNumber,
      accountName: entry.accountName,
      debit: entry.debit,
      credit: entry.credit,
      narration,
      date: voucherDate,
      referenceType: "OPENING_BALANCE",
      referenceId: supplier._id,
      referenceNumber: supplier.code,
      isReversal: false,
      outletId,
      createdBy: userId,
    }))
  );

  return voucher;
}

// GET /api/suppliers  ✅ LIST
export async function GET() {
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

    const suppliers = await Supplier.find({
      outletId: user.outletId,
      isActive: { $ne: false },
    })
      .sort({ name: 1 })
      .lean();

    const purchases = await Purchase.find({
      outletId: user.outletId,
      status: { $ne: "CANCELLED" },
    })
      .select("_id supplierId supplierName grandTotal amountPaid")
      .lean();

    const paymentVouchers = await getPaymentVouchersByPurchase(
      user.outletId,
      (purchases as any[]).map((purchase) => purchase._id)
    );
    const openingBySupplier = await getSupplierOpeningBalanceMap(user.outletId);
    const directPaidBySupplier = await getSupplierBalancePaymentMap(user.outletId);

    const suppliersWithBalances = (suppliers as any[]).map((supplier) => {
      const supplierId = supplier._id.toString();
      const supplierPurchases = (purchases as any[]).filter((purchase) => (
        purchase.supplierId?.toString() === supplierId ||
        purchase.supplierName === supplier.name
      ));

      const openingBalance = openingBySupplier.get(supplierId) || 0;
      const totalPurchases = supplierPurchases.reduce(
        (sum, purchase) => sum + (Number(purchase.grandTotal) || 0),
        0
      );
      const purchasePaid = supplierPurchases.reduce((sum, purchase) => {
        const payments = paymentVouchers.get(purchase._id.toString()) || [];
        const voucherPaid = payments.reduce(
          (paymentSum, payment) =>
            paymentSum + (Number(payment.totalDebit || payment.totalCredit) || 0),
          0
        );
        const initialPaid = Math.max(0, (Number(purchase.amountPaid) || 0) - voucherPaid);
        return sum + initialPaid + voucherPaid;
      }, 0);
      const totalPaid = purchasePaid + (directPaidBySupplier.get(supplierId) || 0);

      return {
        ...supplier,
        openingBalance: toAmount(openingBalance),
        totalPurchases: toAmount(totalPurchases),
        totalPaid: toAmount(totalPaid),
        currentBalance: toAmount(openingBalance + totalPurchases - totalPaid),
      };
    });

    return NextResponse.json({ suppliers: suppliersWithBalances });
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

// POST /api/suppliers ✅ CREATE
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const {
      code,
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      creditLimit,
      paymentTerms,
      openingBalance,
      openingBalanceDate,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const openingPayable = Math.abs(Number(openingBalance) || 0);

    if (openingPayable > 0) {
      await getAccountsPayableAccount(user.outletId);
      await getOrCreateOpeningBalanceAccount(user.outletId);
    }

    const supplier = await Supplier.create({
      code,
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      creditLimit: creditLimit || 0,
      paymentTerms,
      currentBalance: openingPayable,
      outletId: user.outletId,
    });

    const openingVoucher = await postSupplierOpeningBalance({
      supplier,
      amount: openingPayable,
      date: openingBalanceDate,
      outletId: user.outletId,
      userId: user.userId,
    });

    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: "create",
      module: "suppliers",
      description: openingPayable > 0
        ? `Created supplier: ${name} with opening payable QAR ${openingPayable.toFixed(2)}`
        : `Created supplier: ${name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ supplier, openingVoucher }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
