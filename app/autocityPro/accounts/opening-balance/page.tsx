// app/autocityPro/accounts/opening-balance/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { Wallet, Save, Plus, Trash2, AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

interface BalanceEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

interface OpeningBalanceStatus {
  hasOpeningBalance: boolean;
  voucherNumber: string | null;
  voucherDate: string | null;
  accountsWithBalance: any[];
}

export default function OpeningBalancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<OpeningBalanceStatus | null>(null);
  const [balanceDate, setBalanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchUser();
    fetchAccounts();
    checkExistingOpeningBalance();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts");
    }
  };

  const checkExistingOpeningBalance = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/accounts/opening-balance", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExistingStatus(data);
      }
    } catch (error) {
      console.error("Failed to check opening balance status");
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset the opening balance? This will clear all account balances and delete the opening balance voucher.")) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch("/api/accounts/opening-balance/reset", {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Opening balance reset successfully!");
        setExistingStatus(null);
        setEntries([]);
        fetchAccounts();
        checkExistingOpeningBalance();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to reset opening balance");
      }
    } catch (error) {
      console.error("Error resetting opening balance:", error);
      toast.error("Failed to reset opening balance");
    } finally {
      setResetting(false);
    }
  };

  const addEntry = () => {
    setEntries([
      ...entries,
      { accountId: "", accountCode: "", accountName: "", accountType: "", balance: 0 },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: string, value: any) => {
    const updated = [...entries];
    if (field === "accountId") {
      const account = accounts.find((a) => a._id === value);
      if (account) {
        // Handle both old and new field names
        const accountType = account.type || account.accountType || '';
        const accountCode = account.code || account.accountNumber || '';
        const accountName = account.name || account.accountName || '';
        
        updated[index] = {
          ...updated[index],
          accountId: value,
          accountCode: accountCode,
          accountName: accountName,
          accountType: accountType,
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEntries(updated);
  };

  const calculateTotals = () => {
    const assets = entries
      .filter((e) => e.accountType === "asset")
      .reduce((sum, e) => sum + (e.balance || 0), 0);
    const expenses = entries
      .filter((e) => e.accountType === "expense")
      .reduce((sum, e) => sum + (e.balance || 0), 0);
    const liabilities = entries
      .filter((e) => e.accountType === "liability")
      .reduce((sum, e) => sum + (e.balance || 0), 0);
    const equity = entries
      .filter((e) => e.accountType === "equity")
      .reduce((sum, e) => sum + (e.balance || 0), 0);
    const revenue = entries
      .filter((e) => e.accountType === "revenue")
      .reduce((sum, e) => sum + (e.balance || 0), 0);

    // Debits (Assets + Expenses) should equal Credits (Liabilities + Equity + Revenue)
    const totalDebits = assets + expenses;
    const totalCredits = liabilities + equity + revenue;
    const difference = totalDebits - totalCredits;

    return { assets, expenses, liabilities, equity, revenue, totalDebits, totalCredits, difference };
  };

  const handleSubmit = async () => {
    if (entries.length === 0) {
      toast.error("Please add at least one account");
      return;
    }

    const invalidEntries = entries.filter(
      (e) => !e.accountId || e.balance === 0
    );
    if (invalidEntries.length > 0) {
      toast.error("Please fill all entries with valid balances (non-zero)");
      return;
    }

    // Check for duplicate accounts
    const accountIds = entries.map(e => e.accountId);
    const uniqueIds = new Set(accountIds);
    if (accountIds.length !== uniqueIds.size) {
      toast.error("Duplicate accounts detected. Each account can only appear once.");
      return;
    }

    const totals = calculateTotals();
    if (Math.abs(totals.difference) > 0.01) {
      toast.success(`An Opening Balance Equity account will be created with QAR ${Math.abs(totals.difference).toFixed(2)}`);
    }

    setLoading(true);

    try {
      const res = await fetch("/api/accounts/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entries: entries.map((e) => ({
            accountId: e.accountId,
            balance: e.balance,
          })),
          date: balanceDate,
          allowUpdate: existingStatus?.hasOpeningBalance || false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Opening balances posted successfully! Voucher: ${data.voucherNumber}`);
        router.push("/autocityPro/accounts");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to post opening balances");
      }
    } catch (error) {
      console.error("Error posting opening balances:", error);
      toast.error("Failed to post opening balances");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/autocityPro/login";
  };

  // Get accounts not already added
  const availableAccounts = accounts.filter(
    (a) => !entries.some((e) => e.accountId === a._id) && a.code !== 'OB-EQUITY'
  );

  const totals = calculateTotals();
  const isBalanced = Math.abs(totals.difference) < 0.01;

  if (checking) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Checking opening balance status...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wallet className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Opening Balance Entry
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Enter opening balances for all accounts with existing balances
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                {existingStatus?.hasOpeningBalance && (
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <RotateCcw className={`h-5 w-5 ${resetting ? 'animate-spin' : ''}`} />
                    <span>{resetting ? 'Resetting...' : 'Reset'}</span>
                  </button>
                )}
                <button
                  onClick={() => router.push("/autocityPro/accounts")}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Date Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                As of Date
              </label>
              <input
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Existing Opening Balance Warning */}
          {existingStatus?.hasOpeningBalance && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    Opening Balance Already Posted
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    Voucher <strong>{existingStatus.voucherNumber}</strong> was posted on{' '}
                    {new Date(existingStatus.voucherDate || '').toLocaleDateString()}.
                  </p>
                  <p className="text-sm text-yellow-800 mt-2">
                    You can either <strong>Reset</strong> to start over, or add entries below to update (will replace existing).
                  </p>
                  
                  {existingStatus.accountsWithBalance && existingStatus.accountsWithBalance.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-yellow-900">Current balances:</p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {existingStatus.accountsWithBalance.map((acc: any) => (
                          <div key={acc._id} className="text-sm text-yellow-800 flex justify-between py-1">
                            <span>{acc.code || acc.accountNumber} - {acc.name || acc.accountName}</span>
                            <span className="font-medium">QAR {(acc.currentBalance || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Instructions:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>Add ALL accounts</strong> with existing balances at once (Cash, Bank, Inventory, etc.)
              </li>
              <li>
                • Enter balances as <strong>positive numbers</strong> - the system will handle debits/credits automatically
              </li>
              <li>
                • Assets and Expenses are recorded as Debits
              </li>
              <li>
                • Liabilities, Equity, and Revenue are recorded as Credits
              </li>
              <li>
                • If totals don't balance, an "Opening Balance Equity" account will be auto-created
              </li>
            </ul>
          </div>

          {/* Entries */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Account Balances ({entries.length} accounts)
              </h2>
              <button
                onClick={addEntry}
                disabled={availableAccounts.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Add Account</span>
              </button>
            </div>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No accounts added yet</p>
                  <p className="text-sm mt-1">
                    Click "Add Account" to start adding opening balances
                  </p>
                </div>
              ) : (
                entries.map((entry, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="col-span-5">
                      <select
                        value={entry.accountId}
                        onChange={(e) =>
                          updateEntry(index, "accountId", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      >
                        <option value="">Select Account</option>
                        {accounts
                          .filter((a) => a._id === entry.accountId || !entries.some((e) => e.accountId === a._id))
                          .filter((a) => a.code !== 'OB-EQUITY')
                          .map((account) => {
                            const code = account.code || account.accountNumber;
                            const name = account.name || account.accountName;
                            const type = account.type || account.accountType;
                            return (
                              <option key={account._id} value={account._id}>
                                {code} - {name} ({type})
                                {account.isSystem ? " [System]" : ""}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          entry.accountType === "asset"
                            ? "bg-green-100 text-green-800"
                            : entry.accountType === "liability"
                            ? "bg-red-100 text-red-800"
                            : entry.accountType === "equity"
                            ? "bg-purple-100 text-purple-800"
                            : entry.accountType === "revenue"
                            ? "bg-blue-100 text-blue-800"
                            : entry.accountType === "expense"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {entry.accountType || "N/A"}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {entry.accountType === "asset" || entry.accountType === "expense" ? "(DR)" : "(CR)"}
                      </span>
                    </div>

                    <div className="col-span-4">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">
                          QAR
                        </span>
                        <input
                          type="number"
                          value={entry.balance || ''}
                          onChange={(e) =>
                            updateEntry(
                              index,
                              "balance",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          step="0.01"
                          min="0"
                          className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <button
                        onClick={() => removeEntry(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          {entries.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Balance Check (Debits = Credits)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Debits Column */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600 font-medium mb-2">
                    DEBITS (Normal Balance)
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Assets:</span>
                      <span className="font-medium">QAR {totals.assets.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expenses:</span>
                      <span className="font-medium">QAR {totals.expenses.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-green-300 mt-2 pt-2">
                    <div className="flex justify-between font-bold text-green-700">
                      <span>Total Debits:</span>
                      <span>QAR {totals.totalDebits.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Credits Column */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium mb-2">
                    CREDITS (Normal Balance)
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Liabilities:</span>
                      <span className="font-medium">QAR {totals.liabilities.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Equity:</span>
                      <span className="font-medium">QAR {totals.equity.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">QAR {totals.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-red-300 mt-2 pt-2">
                    <div className="flex justify-between font-bold text-red-700">
                      <span>Total Credits:</span>
                      <span>QAR {totals.totalCredits.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Difference */}
                <div
                  className={`p-4 border rounded-lg ${
                    isBalanced
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      isBalanced ? "text-emerald-600" : "text-orange-600"
                    }`}
                  >
                    {isBalanced ? "✓ BALANCED" : "⚠ DIFFERENCE"}
                  </p>
                  <p
                    className={`text-3xl font-bold mt-2 ${
                      isBalanced ? "text-emerald-700" : "text-orange-700"
                    }`}
                  >
                    QAR {Math.abs(totals.difference).toFixed(2)}
                  </p>
                  {!isBalanced && (
                    <p className="text-xs text-orange-600 mt-2">
                      {totals.difference > 0 ? "Debits > Credits" : "Credits > Debits"}
                    </p>
                  )}
                </div>
              </div>

              {!isBalanced && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> An "Opening Balance Equity" account will be
                    automatically created with QAR{" "}
                    {Math.abs(totals.difference).toFixed(2)} to balance the journal entry.
                    This is normal for opening balances.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={loading || entries.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Save className="h-5 w-5" />
                  <span>
                    {loading ? "Posting..." : existingStatus?.hasOpeningBalance ? "Update Opening Balances" : "Post Opening Balances"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}