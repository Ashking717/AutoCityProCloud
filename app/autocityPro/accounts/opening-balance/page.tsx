"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { 
  Wallet, 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  RotateCcw,
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  BarChart3,
  X,
  MoreVertical,
  ChevronLeft,
  FileDown,
  CheckCircle,
  AlertCircle,
  ChevronRight
} from "lucide-react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchAccounts();
    checkExistingOpeningBalance();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
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

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'liability': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'revenue': return <DollarSign className="h-4 w-4 text-blue-400" />;
      case 'expense': return <CreditCard className="h-4 w-4 text-orange-400" />;
      case 'equity': return <BarChart3 className="h-4 w-4 text-purple-400" />;
      default: return <Wallet className="h-4 w-4 text-gray-400" />;
    }
  };

  if (checking) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-16 w-16 animate-spin text-[#E84545] mx-auto mb-4" />
            <p className="text-gray-400">Checking opening balance status...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/autocityPro/accounts')}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Opening Balance</h1>
                  <p className="text-xs text-white/60">{entries.length} accounts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addEntry}
                  disabled={availableAccounts.length === 0}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">As of Date</label>
                <input
                  type="date"
                  value={balanceDate}
                  onChange={(e) => setBalanceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm hover:bg-white/20"
                >
                  Actions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/autocityPro/accounts')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="flex items-center space-x-3">
                  <Wallet className="h-8 w-8 text-white" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      Opening Balance Entry
                    </h1>
                    <p className="text-white/80 mt-1">
                      Enter opening balances for all accounts with existing balances
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                {existingStatus?.hasOpeningBalance && (
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-red-900/20 border border-red-800/50 text-red-400 rounded-lg hover:bg-red-900/30 hover:text-red-300 disabled:opacity-50 group"
                  >
                    <RotateCcw className={`h-4 w-4 ${resetting ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
                    <span>{resetting ? 'Resetting...' : 'Reset'}</span>
                  </button>
                )}
                <button
                  onClick={() => router.push("/autocityPro/accounts")}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>

            {/* Date Selection - Desktop */}
            <div className="mt-6 max-w-md">
              <label className="block text-sm font-medium text-white mb-2">
                As of Date
              </label>
              <input
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          <div className="max-w-6xl mx-auto">
            {/* Existing Opening Balance Warning */}
            {existingStatus?.hasOpeningBalance && (
              <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-800/50 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-400">
                      Opening Balance Already Posted
                    </h3>
                    <p className="text-sm text-yellow-300 mt-1">
                      Voucher <strong className="text-white">{existingStatus.voucherNumber}</strong> was posted on{' '}
                      {new Date(existingStatus.voucherDate || '').toLocaleDateString()}.
                    </p>
                    <p className="text-sm text-yellow-300 mt-2">
                      You can either <strong className="text-white">Reset</strong> to start over, or add entries below to update (will replace existing).
                    </p>
                    
                    {existingStatus.accountsWithBalance && existingStatus.accountsWithBalance.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-yellow-400">Current balances:</p>
                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                          {existingStatus.accountsWithBalance.map((acc: any) => (
                            <div key={acc._id} className="text-sm text-yellow-300 flex justify-between py-1 px-2 bg-yellow-900/20 rounded">
                              <span>{acc.code || acc.accountNumber} - {acc.name || acc.accountName}</span>
                              <span className="font-medium text-white">QAR {(acc.currentBalance || 0).toFixed(2)}</span>
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
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-blue-400 mb-3">
                📋 Instructions:
              </h3>
              <ul className="text-sm text-blue-300 space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span><strong>Add ALL accounts</strong> with existing balances at once (Cash, Bank, Inventory, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>Enter balances as <strong>positive numbers</strong> - the system will handle debits/credits automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>Assets and Expenses are recorded as Debits</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>Liabilities, Equity, and Revenue are recorded as Credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>If totals don't balance, an "Opening Balance Equity" account will be auto-created</span>
                </li>
              </ul>
            </div>

            {/* Entries */}
            <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Account Balances ({entries.length} accounts)
                </h2>
                <button
                  onClick={addEntry}
                  disabled={availableAccounts.length === 0}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                >
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                  <span>Add Account</span>
                </button>
              </div>

              <div className="space-y-3">
                {entries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-700" />
                    <p className="text-gray-400">No accounts added yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Click "Add Account" to start adding opening balances
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      {entries.map((entry, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl p-4 hover:border-[#E84545] transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 mr-2">
                              <label className="block text-xs text-white/60 mb-1">Select Account</label>
                              <select
                                value={entry.accountId}
                                onChange={(e) => updateEntry(index, "accountId", e.target.value)}
                                className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                              >
                                <option value="">Choose account...</option>
                                {availableAccounts.map((acc) => (
                                  <option key={acc._id} value={acc._id}>
                                    {acc.code || acc.accountNumber} - {acc.name || acc.accountName}
                                  </option>
                                ))}
                                {entry.accountId && (
                                  <option value={entry.accountId}>
                                    {entry.accountCode} - {entry.accountName}
                                  </option>
                                )}
                              </select>
                            </div>
                            <button
                              onClick={() => removeEntry(index)}
                              className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {entry.accountId && (
                            <>
                              <div className="flex items-center gap-2 mb-3">
                                {getAccountTypeIcon(entry.accountType)}
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                  entry.accountType === 'asset' ? 'bg-green-900/30 text-green-400 border border-green-800/50' :
                                  entry.accountType === 'liability' ? 'bg-red-900/30 text-red-400 border border-red-800/50' :
                                  entry.accountType === 'equity' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' :
                                  entry.accountType === 'revenue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' :
                                  'bg-orange-900/30 text-orange-400 border border-orange-800/50'
                                }`}>
                                  {entry.accountType}
                                </span>
                                <span className={`text-xs font-medium ${
                                  entry.accountType === "asset" || entry.accountType === "expense" 
                                    ? "text-green-400" 
                                    : "text-red-400"
                                }`}>
                                  {entry.accountType === "asset" || entry.accountType === "expense" ? "DEBIT" : "CREDIT"}
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs text-white/60 mb-1">Balance Amount</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">QAR</span>
                                  <input
                                    type="number"
                                    value={entry.balance || ''}
                                    onChange={(e) => updateEntry(index, "balance", parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                    className="w-full pl-14 pr-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead>
                          <tr className="bg-[#0A0A0A]">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Account</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Debit/Credit</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Balance</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-black divide-y divide-gray-800">
                          {entries.map((entry, index) => (
                            <tr key={index} className="hover:bg-gray-900 transition-colors">
                              <td className="px-6 py-4">
                                <select
                                  value={entry.accountId}
                                  onChange={(e) => updateEntry(index, "accountId", e.target.value)}
                                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                                >
                                  <option value="">Select account...</option>
                                  {availableAccounts.map((acc) => (
                                    <option key={acc._id} value={acc._id}>
                                      {acc.code || acc.accountNumber} - {acc.name || acc.accountName}
                                    </option>
                                  ))}
                                  {entry.accountId && (
                                    <option value={entry.accountId}>
                                      {entry.accountCode} - {entry.accountName}
                                    </option>
                                  )}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                {entry.accountType && (
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full capitalize ${
                                    entry.accountType === 'asset' ? 'bg-green-900/30 text-green-400 border border-green-800/50' :
                                    entry.accountType === 'liability' ? 'bg-red-900/30 text-red-400 border border-red-800/50' :
                                    entry.accountType === 'equity' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' :
                                    entry.accountType === 'revenue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' :
                                    'bg-orange-900/30 text-orange-400 border border-orange-800/50'
                                  }`}>
                                    {getAccountTypeIcon(entry.accountType)}
                                    <span>{entry.accountType}</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {entry.accountType && (
                                  <span className={`text-sm font-medium ${
                                    entry.accountType === "asset" || entry.accountType === "expense" 
                                      ? "text-green-400" 
                                      : "text-red-400"
                                  }`}>
                                    {entry.accountType === "asset" || entry.accountType === "expense" ? "DEBIT" : "CREDIT"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="relative max-w-xs">
                                  <span className="absolute left-3 top-2 text-gray-400">QAR</span>
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
                                    className="w-full pl-14 pr-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                                    placeholder="0.00"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => removeEntry(index)}
                                  className="p-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Summary */}
            {entries.length > 0 && (
              <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-6">
                  Balance Check (Debits = Credits)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Debits Column */}
                  <div className="p-4 bg-gradient-to-br from-green-900/20 to-black border border-green-800/50 rounded-xl">
                    <p className="text-sm text-green-400 font-medium mb-3">
                      DEBITS (Normal Balance)
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Assets:</span>
                        <span className="font-medium text-white">QAR {totals.assets.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Expenses:</span>
                        <span className="font-medium text-white">QAR {totals.expenses.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t border-green-800/50 mt-3 pt-3">
                      <div className="flex justify-between font-bold text-green-400">
                        <span>Total Debits:</span>
                        <span>QAR {totals.totalDebits.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Credits Column */}
                  <div className="p-4 bg-gradient-to-br from-red-900/20 to-black border border-red-800/50 rounded-xl">
                    <p className="text-sm text-red-400 font-medium mb-3">
                      CREDITS (Normal Balance)
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Liabilities:</span>
                        <span className="font-medium text-white">QAR {totals.liabilities.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Equity:</span>
                        <span className="font-medium text-white">QAR {totals.equity.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Revenue:</span>
                        <span className="font-medium text-white">QAR {totals.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t border-red-800/50 mt-3 pt-3">
                      <div className="flex justify-between font-bold text-red-400">
                        <span>Total Credits:</span>
                        <span>QAR {totals.totalCredits.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Difference */}
                  <div
                    className={`p-4 border rounded-xl ${
                      isBalanced
                        ? "bg-gradient-to-br from-emerald-900/20 to-black border-emerald-800/50"
                        : "bg-gradient-to-br from-orange-900/20 to-black border-orange-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {isBalanced ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-400" />
                      )}
                      <p
                        className={`text-sm font-medium ${
                          isBalanced ? "text-emerald-400" : "text-orange-400"
                        }`}
                      >
                        {isBalanced ? "✓ BALANCED" : "⚠ DIFFERENCE"}
                      </p>
                    </div>
                    <p
                      className={`text-3xl font-bold mt-2 ${
                        isBalanced ? "text-emerald-400" : "text-orange-400"
                      }`}
                    >
                      QAR {Math.abs(totals.difference).toFixed(2)}
                    </p>
                    {!isBalanced && (
                      <p className="text-xs text-orange-400 mt-2">
                        {totals.difference > 0 ? "Debits > Credits" : "Credits > Debits"}
                      </p>
                    )}
                  </div>
                </div>

                {!isBalanced && (
                  <div className="p-4 bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-800/50 rounded-xl">
                    <p className="text-sm text-yellow-400">
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
                    className="flex items-center space-x-2 px-6 py-3 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                  >
                    <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>
                      {loading ? "Posting..." : existingStatus?.hasOpeningBalance ? "Update Opening Balances" : "Post Opening Balances"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  addEntry();
                  setShowMobileMenu(false);
                }}
                disabled={availableAccounts.length === 0}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95 disabled:opacity-50"
              >
                <span>Add Account</span>
                <Plus className="h-5 w-5" />
              </button>
              {existingStatus?.hasOpeningBalance && (
                <button
                  onClick={() => {
                    handleReset();
                    setShowMobileMenu(false);
                  }}
                  disabled={resetting}
                  className="w-full p-4 bg-black border border-gray-800 rounded-xl text-red-400 font-semibold hover:bg-red-900/20 hover:border-red-800 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>{resetting ? 'Resetting...' : 'Reset Balance'}</span>
                  <RotateCcw className={`h-5 w-5 ${resetting ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={() => {
                  handleSubmit();
                  setShowMobileMenu(false);
                }}
                disabled={loading || entries.length === 0}
                className="w-full p-4 bg-[#E84545] text-white rounded-xl font-semibold hover:bg-[#cc3c3c] transition-all flex items-center justify-between active:scale-95"
              >
                <span>{loading ? 'Posting...' : 'Post Balances'}</span>
                <Save className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  router.push('/autocityPro/accounts');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Cancel</span>
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}