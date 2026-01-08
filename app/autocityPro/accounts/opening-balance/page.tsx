// app/autocityPro/accounts/opening-balance/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { Wallet, Save, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface BalanceEntry {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
}

export default function OpeningBalancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceDate, setBalanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchUser();
    fetchAccounts();
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

  const addEntry = () => {
    setEntries([
      ...entries,
      { accountId: "", accountName: "", accountType: "", balance: 0 },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: string, value: any) => {
    const updated = [...entries];
    if (field === "accountId") {
      const account = accounts.find((a) => a._id === value);
      updated[index] = {
        ...updated[index],
        accountId: value,
        accountName: account?.accountName || "",
        accountType: account?.accountType || "",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEntries(updated);
  };

  const calculateTotals = () => {
    const assets = entries
      .filter((e) => e.accountType === "asset")
      .reduce((sum, e) => sum + (e.balance || 0), 0);
    const liabilities = entries
      .filter((e) => e.accountType === "liability")
      .reduce((sum, e) => sum + (e.balance || 0), 0);
    const equity = entries
      .filter((e) => e.accountType === "equity")
      .reduce((sum, e) => sum + (e.balance || 0), 0);

    const difference = assets - (liabilities + equity);

    return { assets, liabilities, equity, difference };
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
      toast.error("Please fill all entries with valid balances");
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
        }),
      });

      if (res.ok) {
        toast.success("Opening balances posted successfully!");
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

  const totals = calculateTotals();
  const isBalanced = Math.abs(totals.difference) < 0.01;

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
                    Enter opening balances for your existing shop
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/autocityPro/accounts")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
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

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Instructions:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Select accounts and enter their current balances as of today
              </li>
              <li>
                • The accounting equation must balance: Assets = Liabilities +
                Equity
              </li>
              <li>
                • If the equation doesn't balance, the system will create an
                "Opening Balance Equity" account to balance it
              </li>
              <li>• All entries will be posted as a journal voucher</li>
            </ul>
          </div>

          {/* Entries */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Account Balances
              </h2>
              <button
                onClick={addEntry}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
                    Click "Add Account" to start
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
                        {accounts.map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.accountNumber} - {account.accountName} (
                            {account.accountType})
                            {account.isSystem ? " [System]" : ""}
                          </option>
                        ))}
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
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {entry.accountType || "N/A"}
                      </span>
                    </div>

                    <div className="col-span-4">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">
                          QAR
                        </span>
                        <input
                          type="number"
                          value={entry.balance}
                          onChange={(e) =>
                            updateEntry(
                              index,
                              "balance",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          step="0.01"
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
                Accounting Equation Check
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">
                    Total Assets
                  </p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    QAR {totals.assets.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">
                    Total Liabilities
                  </p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    QAR {totals.liabilities.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">
                    Total Equity
                  </p>
                  <p className="text-2xl font-bold text-purple-700 mt-1">
                    QAR {totals.equity.toFixed(2)}
                  </p>
                </div>

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
                    {isBalanced ? "✓ Balanced" : "⚠ Difference"}
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      isBalanced ? "text-emerald-700" : "text-orange-700"
                    }`}
                  >
                    QAR {totals.difference.toFixed(2)}
                  </p>
                </div>
              </div>

              {!isBalanced && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The accounting equation is not
                    balanced. An "Opening Balance Equity" account will be
                    automatically created with QAR{" "}
                    {Math.abs(totals.difference).toFixed(2)} to balance the
                    books.
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
                    {loading ? "Posting..." : "Post Opening Balances"}
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