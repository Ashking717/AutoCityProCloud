// lib/accounting/seedSystemAccounts.ts
import mongoose from "mongoose";
import Account from "@/lib/models/Account";

/**
 * System chart of accounts
 * MUST match existing DB format (CAPS, subType names, etc.)
 */
const SYSTEM_ACCOUNTS = [
  // ───────── ASSETS ─────────
  { code: "CASH-001", name: "Cash in Hand", type: "ASSET", subType: "CASH" },
  { code: "BANK-001", name: "Bank Account - Main", type: "ASSET", subType: "BANK" },
  { code: "AR-001", name: "Accounts Receivable", type: "ASSET", subType: "ACCOUNTS_RECEIVABLE" },
  { code: "INV-001", name: "Inventory", type: "ASSET", subType: "INVENTORY" },

  // ───────── LIABILITIES ─────────
  { code: "AP-001", name: "Accounts Payable", type: "LIABILITY", subType: "ACCOUNTS_PAYABLE" },

  // ───────── EQUITY ─────────
  { code: "EQ-001", name: "Owner Equity", type: "EQUITY", subType: "OWNER_EQUITY" },
  { code: "RE-001", name: "Retained Earnings", type: "EQUITY", subType: "RETAINED_EARNINGS" },

  // ───────── REVENUE ─────────
  { code: "REV-001", name: "Sales Revenue", type: "REVENUE", subType: "SALES_REVENUE" },
  { code: "REV-002", name: "Service Revenue", type: "REVENUE", subType: "SERVICE_REVENUE" },

  // ───────── EXPENSES ─────────
  { code: "EXP-001", name: "Cost of Goods Sold", type: "EXPENSE", subType: "COST_OF_GOODS_SOLD" },
  { code: "EXP-002", name: "Rent Expense", type: "EXPENSE", subType: "OPERATING_EXPENSE" },
  { code: "EXP-003", name: "Utilities", type: "EXPENSE", subType: "OPERATING_EXPENSE" },
  { code: "EXP-004", name: "Salaries", type: "EXPENSE", subType: "ADMINISTRATIVE_EXPENSE" },

  // ───────── OPENING BALANCE EQUITY ─────────
  { code: "OB-EQUITY", name: "Opening Balance Equity", type: "EQUITY", subType: "OWNER_EQUITY" },
];

/**
 * Seed system accounts for an outlet
 * Safe to call multiple times
 */
export async function seedSystemAccounts(
  outletId: mongoose.Types.ObjectId | string
): Promise<void> {
  if (!outletId) {
    throw new Error("seedSystemAccounts: outletId is required");
  }

  const outletObjectId =
    typeof outletId === "string"
      ? new mongoose.Types.ObjectId(outletId)
      : outletId;

  // Check if system accounts already exist
  const existing = await Account.countDocuments({
    outletId: outletObjectId,
    isSystem: true,
  });

  if (existing > 0) {
    console.log(`ℹ️ System accounts already exist for outlet ${outletObjectId}`);
    return;
  }

  const now = new Date();

  const docs = SYSTEM_ACCOUNTS.map((acc) => ({
    outletId: outletObjectId,
    code: acc.code,
    name: acc.name,
    type: acc.type,          // CAPS (matches DB)
    subType: acc.subType,    // CAPS (matches DB)
    parentId: null,
    isSystem: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  try {
    await Account.insertMany(docs, { ordered: false });

    console.log(
      `✅ Seeded ${docs.length} system accounts for outlet ${outletObjectId}`
    );
  } catch (error: any) {
    // Duplicate safety (race conditions)
    if (error.code === 11000) {
      console.warn("⚠️ Duplicate system accounts detected, skipping");
      return;
    }
    console.error("❌ Failed to seed system accounts:", error);
    throw error;
  }
}
