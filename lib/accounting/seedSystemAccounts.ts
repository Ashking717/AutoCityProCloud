// lib/accounting/seedSystemAccounts.ts
import mongoose from "mongoose";
import Account from "@/lib/models/Account";
import { AccountType, AccountSubType } from "@/lib/models/Account";

/**
 * System chart of accounts (schema-aligned)
 */
const SYSTEM_ACCOUNTS = [
  // ───────── ASSETS ─────────
  { code: "CASH-001", name: "Cash in Hand", type: AccountType.ASSET, subType: AccountSubType.CASH },
  { code: "BANK-001", name: "Bank Account - Main", type: AccountType.ASSET, subType: AccountSubType.BANK },
  { code: "AR-001", name: "Accounts Receivable", type: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE },
  { code: "INV-001", name: "Inventory", type: AccountType.ASSET, subType: AccountSubType.INVENTORY },

  // ───────── LIABILITIES ─────────
  { code: "AP-001", name: "Accounts Payable", type: AccountType.LIABILITY, subType: AccountSubType.ACCOUNTS_PAYABLE },

  // ───────── EQUITY ─────────
  { code: "EQ-001", name: "Owner Equity", type: AccountType.EQUITY, subType: AccountSubType.OWNER_EQUITY },
  { code: "RE-001", name: "Retained Earnings", type: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS },

  // ───────── REVENUE ─────────
  { code: "REV-001", name: "Sales Revenue", type: AccountType.REVENUE, subType: AccountSubType.SALES_REVENUE },
  { code: "REV-002", name: "Service Revenue", type: AccountType.REVENUE, subType: AccountSubType.SERVICE_REVENUE },

  // ───────── EXPENSES ─────────
  { code: "EXP-001", name: "Cost of Goods Sold", type: AccountType.EXPENSE, subType: AccountSubType.COGS },
  { code: "EXP-002", name: "Rent Expense", type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
  { code: "EXP-003", name: "Utilities", type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
  { code: "EXP-004", name: "Salaries", type: AccountType.EXPENSE, subType: AccountSubType.ADMIN_EXPENSE },
];

/**
 * Seed system accounts (idempotent)
 */
export async function seedSystemAccounts(
  outletId: mongoose.Types.ObjectId | string
): Promise<void> {
  const outletObjectId =
    typeof outletId === "string"
      ? new mongoose.Types.ObjectId(outletId)
      : outletId;

  const existing = await Account.find(
    { outletId: outletObjectId },
    { code: 1 }
  ).lean();

  const existingCodes = new Set(existing.map(a => a.code));

  const missingAccounts = SYSTEM_ACCOUNTS.filter(
    acc => !existingCodes.has(acc.code)
  );

  if (missingAccounts.length === 0) {
    console.log("ℹ️ All system accounts already exist");
    return;
  }

  const docs = missingAccounts.map(acc => ({
    ...acc,
    outletId: outletObjectId,
    isSystem: true,
    isActive: true,
  }));

  await Account.insertMany(docs, { ordered: false });

  console.log(`✅ Inserted ${docs.length} system accounts`);
}
