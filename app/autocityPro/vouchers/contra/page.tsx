'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  ArrowLeftRight, 
  AlertCircle, 
  DollarSign,
  Zap,
  Building2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VoucherEntry {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  narration: string;
}

export default function ContraVoucherPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showQuickVoucher, setShowQuickVoucher] = useState(true);
  
  // Quick Voucher State
  const [quickVoucherType, setQuickVoucherType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [quickAmount, setQuickAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [selectedCashAccount, setSelectedCashAccount] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    narration: '',
    referenceNumber: '',
  });
  
  const [entries, setEntries] = useState<VoucherEntry[]>([
    { accountId: '', accountName: '', debit: 0, credit: 0, narration: '' },
    { accountId: '', accountName: '', debit: 0, credit: 0, narration: '' },
  ]);
  
  useEffect(() => {
    fetchUser();
    fetchAccounts();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };
  
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user');
    }
  };
  
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const allAccounts = data.accounts || [];
        setAccounts(allAccounts);
        
        // Filter cash/bank accounts for contra vouchers
        const cashBank = allAccounts.filter((a: any) => 
          a.accountGroup === 'Cash & Bank' || 
          a.accountName.toLowerCase().includes('cash') ||
          a.accountName.toLowerCase().includes('bank')
        );
        setCashBankAccounts(cashBank);
        
        // Auto-select first bank and cash account
        const bankAcc = cashBank.find((a: any) => a.accountName.toLowerCase().includes('bank'));
        const cashAcc = cashBank.find((a: any) => a.accountName.toLowerCase().includes('cash') && !a.accountName.toLowerCase().includes('bank'));
        
        if (bankAcc) setSelectedBankAccount(bankAcc._id);
        if (cashAcc) setSelectedCashAccount(cashAcc._id);
      }
    } catch (error) {
      console.error('Failed to fetch accounts');
      toast.error('Failed to load accounts');
    }
  };
  
  const handleQuickVoucher = () => {
    if (!quickAmount || parseFloat(quickAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!selectedBankAccount || !selectedCashAccount) {
      toast.error('Please select both bank and cash accounts');
      return;
    }
    
    const amount = parseFloat(quickAmount);
    const bankAccount = cashBankAccounts.find(a => a._id === selectedBankAccount);
    const cashAccount = cashBankAccounts.find(a => a._id === selectedCashAccount);
    
    if (!bankAccount || !cashAccount) {
      toast.error('Invalid accounts selected');
      return;
    }
    
    let newEntries: VoucherEntry[];
    let narration: string;
    
    if (quickVoucherType === 'withdrawal') {
      // Withdrawal from bank = Cash debit, Bank credit
      narration = 'Withdrawal from bank';
      newEntries = [
        {
          accountId: cashAccount._id,
          accountName: cashAccount.accountName,
          debit: amount,
          credit: 0,
          narration: narration,
        },
        {
          accountId: bankAccount._id,
          accountName: bankAccount.accountName,
          debit: 0,
          credit: amount,
          narration: narration,
        },
      ];
    } else {
      // Deposit to bank = Bank debit, Cash credit
      narration = 'Deposit to bank';
      newEntries = [
        {
          accountId: bankAccount._id,
          accountName: bankAccount.accountName,
          debit: amount,
          credit: 0,
          narration: narration,
        },
        {
          accountId: cashAccount._id,
          accountName: cashAccount.accountName,
          debit: 0,
          credit: amount,
          narration: narration,
        },
      ];
    }
    
    setEntries(newEntries);
    setFormData({ ...formData, narration });
    setShowQuickVoucher(false);
    toast.success('Quick Entry created! Review and post.');
  };
  
  const updateEntry = (index: number, field: keyof VoucherEntry, value: any) => {
    const newEntries = [...entries];
    
    if (field === 'accountId') {
      const account = cashBankAccounts.find(a => a._id === value);
      if (account) {
        newEntries[index].accountId = value;
        newEntries[index].accountName = account.accountName;
      }
    } else if (field === 'debit' || field === 'credit') {
      const numValue = parseFloat(value) || 0;
      newEntries[index][field] = numValue as never;
      
      // If setting debit, set credit to 0 and vice versa
      if (field === 'debit' && numValue > 0) {
        newEntries[index].credit = 0;
      } else if (field === 'credit' && numValue > 0) {
        newEntries[index].debit = 0;
      }
    } else {
      newEntries[index][field] = value as never;
    }
    
    setEntries(newEntries);
  };
  
  const addEntry = () => {
    setEntries([...entries, { accountId: '', accountName: '', debit: 0, credit: 0, narration: '' }]);
  };
  
  const removeEntry = (index: number) => {
    if (entries.length <= 2) {
      toast.error('At least 2 entries required for contra voucher');
      return;
    }
    setEntries(entries.filter((_, i) => i !== index));
  };
  
  const calculateTotals = () => {
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  };
  
  const validateForm = () => {
    const totals = calculateTotals();
    
    if (Math.abs(totals.difference) > 0.01) {
      toast.error('Total debits must equal total credits');
      return false;
    }
    
    if (!formData.narration.trim()) {
      toast.error('Narration is required');
      return false;
    }
    
    // Check for cash/bank accounts
    const invalidAccounts = entries.filter(e => {
      const account = cashBankAccounts.find(a => a._id === e.accountId);
      return !account;
    });
    
    if (invalidAccounts.length > 0) {
      toast.error('Only cash and bank accounts can be used in contra vouchers');
      return false;
    }
    
    // Check for empty accounts
    const emptyAccounts = entries.filter(e => !e.accountId);
    if (emptyAccounts.length > 0) {
      toast.error('Please select an account for all entries');
      return false;
    }
    
    // Check for amounts
    const zeroAmounts = entries.filter(e => e.debit === 0 && e.credit === 0);
    if (zeroAmounts.length > 0) {
      toast.error('All entries must have an amount');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (status: 'draft' | 'posted') => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          voucherType: 'contra',
          date: formData.date,
          entries: entries.map(e => ({
            accountId: e.accountId,
            debit: e.debit,
            credit: e.credit,
            narration: e.narration,
          })),
          narration: formData.narration,
          referenceNumber: formData.referenceNumber,
          status,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Voucher ${status === 'draft' ? 'saved' : 'posted'} successfully!`);
        router.push(`/autocityPro/vouchers/${data.voucher._id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create voucher');
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      toast.error('Failed to create voucher');
    } finally {
      setLoading(false);
    }
  };
  
  const totals = calculateTotals();
  const isBalanced = Math.abs(totals.difference) <= 0.01;
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">Contra</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{entries.length} entries</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  {isBalanced ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-green-400 text-xs font-medium">Balanced</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-[#E84545]" />
                      <span className="text-[#E84545] text-xs font-medium">Unbalanced</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Contra Voucher</h1>
                  <p className="text-xs text-white/60">Cash & Bank Transfer</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div>
                <p className="text-xs text-white/60 mb-1">Total Amount</p>
                <p className="text-sm font-semibold text-[#E84545]">
                  {formatCompactCurrency(totals.totalDebit)}
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                isBalanced 
                  ? 'bg-green-900/20 text-green-400 border border-green-800/50'
                  : 'bg-red-900/20 text-red-400 border border-red-800/50'
              }`}>
                {isBalanced ? 'Balanced' : 'Unbalanced'}
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
                  onClick={() => router.push('/autocityPro/vouchers')}
                  className="text-white hover:text-slate-200 p-2 rounded-xl hover:bg-white/10 transition-all"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex items-center space-x-3">
                  <ArrowLeftRight className="h-8 w-8 text-white" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">Contra Voucher</h1>
                    <p className="text-white/80 mt-1">Transfer between cash & bank accounts</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {isBalanced ? (
                  <div className="flex items-center text-green-300 bg-green-900/30 px-4 py-2 rounded-full border border-green-800/50">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm">Balanced</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-300 bg-red-900/30 px-4 py-2 rounded-full border border-red-800/50">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">Unbalanced</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <ArrowLeftRight className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Entries</p>
              <p className="text-lg md:text-xl font-bold text-white">{entries.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Debit</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545] truncate">
                {formatCompactCurrency(totals.totalDebit)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Credit</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545] truncate">
                {formatCompactCurrency(totals.totalCredit)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  {isBalanced ? (
                    <div className="h-4 w-4 md:h-5 md:w-5 rounded-full bg-green-500"></div>
                  ) : (
                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <p className={`text-lg md:text-xl font-bold ${
                isBalanced ? 'text-green-400' : 'text-red-400'
              }`}>
                {isBalanced ? '✓ OK' : '✗ Error'}
              </p>
            </div>
          </div>

          {/* Quick Voucher Section */}
          {showQuickVoucher && (
            <div className="bg-gradient-to-br from-[#E84545]/10 via-[#0A0A0A] to-[#050505] border border-[#E84545]/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#E84545] rounded-xl">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Quick Voucher</h2>
                    <p className="text-xs text-slate-400">Fast cash/bank transfer</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Selection */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setQuickVoucherType('withdrawal')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        quickVoucherType === 'withdrawal'
                          ? 'border-[#E84545] bg-[#E84545]/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Wallet className="h-5 w-5 text-[#E84545]" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">Withdrawal</p>
                        <p className="text-xs text-slate-400">From Bank</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setQuickVoucherType('deposit')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        quickVoucherType === 'deposit'
                          ? 'border-[#E84545] bg-[#E84545]/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Building2 className="h-5 w-5 text-[#E84545]" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">Deposit</p>
                        <p className="text-xs text-slate-400">To Bank</p>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Bank Account */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Bank Account</label>
                  <select
                    value={selectedBankAccount}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                  >
                    <option value="" className="text-slate-800">Select Bank Account</option>
                    {cashBankAccounts
                      .filter(a => a.accountName.toLowerCase().includes('bank'))
                      .map(acc => (
                        <option key={acc._id} value={acc._id} className="text-slate-800">
                          {acc.accountCode} - {acc.accountName}
                        </option>
                      ))}
                  </select>
                </div>
                
                {/* Cash Account */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cash Account</label>
                  <select
                    value={selectedCashAccount}
                    onChange={(e) => setSelectedCashAccount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                  >
                    <option value="" className="text-slate-800">Select Cash Account</option>
                    {cashBankAccounts
                      .filter(a => a.accountName.toLowerCase().includes('cash') && !a.accountName.toLowerCase().includes('bank'))
                      .map(acc => (
                        <option key={acc._id} value={acc._id} className="text-slate-800">
                          {acc.accountCode} - {acc.accountName}
                        </option>
                      ))}
                  </select>
                </div>
                
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Amount (QAR)</label>
                  <input
                    type="number"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white text-right text-lg font-semibold"
                  />
                </div>
                
                {/* Create Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleQuickVoucher}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-all active:scale-95 font-semibold"
                  >
                    Create Quick Voucher
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showQuickVoucher && (
            <button
              onClick={() => setShowQuickVoucher(true)}
              className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-[#E84545]/20 to-[#cc3c3c]/20 border border-[#E84545]/30 text-white rounded-xl hover:from-[#E84545]/30 hover:to-[#cc3c3c]/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap className="h-5 w-5" />
              <span className="font-semibold">Show Quick Voucher</span>
            </button>
          )}
          
          {/* Basic Information */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Voucher Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Date <span className="text-[#E84545]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Narration <span className="text-[#E84545]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  placeholder="e.g., Withdrawal from bank"
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Entries - Mobile */}
          <div className="md:hidden bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl overflow-hidden mb-6">
            <div className="px-4 py-4 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Entries</h2>
                <p className="text-xs text-slate-400 mt-1">Cash & Bank Only</p>
              </div>
              <button
                onClick={addEntry}
                className="p-2 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="divide-y divide-white/10 p-4 space-y-4">
              {entries.map((entry, index) => (
                <div key={index} className="pb-4 pt-4 first:pt-0 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-white">Entry #{index + 1}</h3>
                    <button
                      onClick={() => removeEntry(index)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      disabled={entries.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Account</label>
                      <select
                        value={entry.accountId}
                        onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm"
                      >
                        <option value="" className="text-slate-800">Select Account</option>
                        {cashBankAccounts.map(acc => (
                          <option key={acc._id} value={acc._id} className="text-slate-800">
                            {acc.accountCode} - {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Narration</label>
                      <input
                        type="text"
                        value={entry.narration}
                        onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                        placeholder="Entry description"
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Debit (QAR)</label>
                        <input
                          type="number"
                          value={entry.debit || ''}
                          onChange={(e) => updateEntry(index, 'debit', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm text-right"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Credit (QAR)</label>
                        <input
                          type="number"
                          value={entry.credit || ''}
                          onChange={(e) => updateEntry(index, 'credit', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm text-right"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Totals */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Total Debit:</span>
                  <span className="text-sm font-semibold text-white">QAR {totals.totalDebit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Total Credit:</span>
                  <span className="text-sm font-semibold text-white">QAR {totals.totalCredit.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between items-center pt-3 border-t border-white/10 ${
                  isBalanced ? 'text-green-400' : 'text-red-400'
                }`}>
                  <span className="text-sm font-medium">Difference:</span>
                  <span className="text-sm font-bold">
                    QAR {Math.abs(totals.difference).toFixed(2)}
                    {!isBalanced && ' (Must be zero)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Entries - Desktop */}
          <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Entries</h2>
                <p className="text-sm text-slate-400 mt-1">Cash & Bank Accounts Only</p>
              </div>
              <button
                onClick={addEntry}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity active:scale-95"
              >
                <Plus className="h-5 w-5" />
                <span>Add Entry</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-[#050505]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Narration</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Debit (QAR)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Credit (QAR)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {entries.map((entry, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <select
                          value={entry.accountId}
                          onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        >
                          <option value="" className="text-slate-800">Select Account</option>
                          {cashBankAccounts.map(acc => (
                            <option key={acc._id} value={acc._id} className="text-slate-800">
                              {acc.accountCode} - {acc.accountName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={entry.narration}
                          onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                          placeholder="Entry description"
                          className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={entry.debit || ''}
                          onChange={(e) => updateEntry(index, 'debit', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={entry.credit || ''}
                          onChange={(e) => updateEntry(index, 'credit', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => removeEntry(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={entries.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#050505]">
                    <td colSpan={2} className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                      Total:
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-white">
                        QAR {totals.totalDebit.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-white">
                        QAR {totals.totalCredit.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                  <tr className={`${isBalanced ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                    <td colSpan={2} className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                      Difference:
                    </td>
                    <td colSpan={2} className="px-4 py-4 text-right">
                      <p className={`text-sm font-bold ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                        QAR {Math.abs(totals.difference).toFixed(2)}
                        {!isBalanced && ' (Must be zero)'}
                      </p>
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3">
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 bg-[#050505] border border-white/10 text-white rounded-xl hover:bg-white/5 disabled:opacity-50 transition-colors active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Save as Draft</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleSubmit('posted')}
              disabled={loading || !isBalanced}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Post Voucher</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>
    </MainLayout>
  );
}