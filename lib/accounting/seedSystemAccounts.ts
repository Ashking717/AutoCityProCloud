// lib/accounting/seedSystemAccounts.ts
import mongoose from "mongoose";
import Account from "@/lib/models/Account";
import { AccountType, AccountSubType } from "@/lib/models/Account";

/**
 * System chart of accounts (schema-aligned)
 */
export const SYSTEM_ACCOUNTS = [
  // ───────── ASSETS ─────────
  { code: "CASH-001", name: "Cash in Hand", type: AccountType.ASSET, subType: AccountSubType.CASH },
  { code: "BANK-001", name: "Bank Account - Main", type: AccountType.ASSET, subType: AccountSubType.BANK },
  { code: "AR-001", name: "Accounts Receivable", type: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE },
  { code: "INV-001", name: "Inventory", type: AccountType.ASSET, subType: AccountSubType.INVENTORY },
  { code: "VAT-IN-001", name: "VAT Receivable", type: AccountType.ASSET, subType: AccountSubType.VAT_RECEIVABLE },

  // ───────── LIABILITIES ─────────
  { code: "AP-001", name: "Accounts Payable", type: AccountType.LIABILITY, subType: AccountSubType.ACCOUNTS_PAYABLE },
  { code: "VAT-OUT-001", name: "VAT Payable", type: AccountType.LIABILITY, subType: AccountSubType.VAT_PAYABLE },

  // ───────── EQUITY ─────────
  { code: "EQ-001", name: "Owner Equity", type: AccountType.EQUITY, subType: AccountSubType.OWNER_EQUITY },
  { code: "RE-001", name: "Retained Earnings", type: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS },

  // ───────── REVENUE ─────────
  { code: "REV-001", name: "Sales Revenue", type: AccountType.REVENUE, subType: AccountSubType.SALES_REVENUE },
  { code: "REV-002", name: "Service Revenue", type: AccountType.REVENUE, subType: AccountSubType.SERVICE_REVENUE },
  { code: "REV-003", name: "Sales Returns", type: AccountType.REVENUE, subType: AccountSubType.SALES_RETURNS },

  // ───────── EXPENSES ─────────
  { code: "EXP-001", name: "Cost of Goods Sold", type: AccountType.EXPENSE, subType: AccountSubType.COGS },
  { code: "EXP-002", name: "Rent Expense", type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
  { code: "EXP-003", name: "Utilities", type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
  { code: "EXP-004", name: "Salaries", type: AccountType.EXPENSE, subType: AccountSubType.ADMIN_EXPENSE },
  { code: "EXP-005", name: "Inventory Adjustments", type: AccountType.EXPENSE, subType: AccountSubType.INVENTORY_ADJUSTMENT },
];

/**
 * Seed system accounts (idempotent)
 */
export async function seedSystemAccounts(
  outletId: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession
): Promise<void> {
  const outletObjectId =
    typeof outletId === "string"
      ? new mongoose.Types.ObjectId(outletId)
      : outletId;

  await Account.bulkWrite(SYSTEM_ACCOUNTS.map((account) => ({
    updateOne: {
      filter: { outletId: outletObjectId, code: account.code },
      update: {
        $set: {
          name: account.name,
          type: account.type,
          subType: account.subType,
          isSystem: true,
          isActive: true,
        },
        $setOnInsert: {
          outletId: outletObjectId,
          code: account.code,
          openingBalance: 0,
          currentBalance: 0,
        },
      },
      upsert: true,
    },
  })), { ordered: true, session });
}
