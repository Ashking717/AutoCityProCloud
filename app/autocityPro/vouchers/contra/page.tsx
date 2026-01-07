'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, Save, Send, Plus, Trash2, ArrowLeftRight, AlertCircle, Info, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
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
  const [showHelp, setShowHelp] = useState(false);
  
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
  }, []);
  
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
      }
    } catch (error) {
      console.error('Failed to fetch accounts');
      toast.error('Failed to load accounts');
    }
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
        toast.success(`Contra voucher ${status === 'draft' ? 'saved' : 'posted'} successfully!`);
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
  
  // Example transactions for the help section
  const exampleTransactions = [
    {
      description: 'Cash deposited to bank account',
      debit: 'Bank Account',
      credit: 'Cash Account',
      amount: 'QAR 5,000'
    },
    {
      description: 'Withdrawal from bank to cash',
      debit: 'Cash Account',
      credit: 'Bank Account',
      amount: 'QAR 2,000'
    },
    {
      description: 'Transfer between bank accounts',
      debit: 'New Bank Account',
      credit: 'Old Bank Account',
      amount: 'QAR 10,000'
    },
    {
      description: 'Petty cash replenishment',
      debit: 'Petty Cash',
      credit: 'Main Cash',
      amount: 'QAR 500'
    }
  ];
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/autocityPro/vouchers')}
                className="text-white hover:text-slate-200"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <ArrowLeftRight className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Contra Voucher</h1>
                  <p className="text-purple-100">Transfer between cash & bank accounts</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {isBalanced ? (
                <div className="flex items-center text-green-300 bg-green-900/30 px-3 py-1.5 rounded-full border border-green-800/50">
                  <span className="text-sm">Balanced</span>
                </div>
              ) : (
                <div className="flex items-center text-red-300 bg-red-900/30 px-3 py-1.5 rounded-full border border-red-800/50">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Unbalanced</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* How it works section */}
          <div className="mb-6">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Info className="h-5 w-5 text-purple-400" />
                <span className="text-slate-200 font-medium">How it works?</span>
              </div>
              {showHelp ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>
            
            {showHelp && (
              <div className="mt-2 bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Contra Voucher Basics</h3>
                    <p className="text-slate-300 mb-4">
                      A <strong>Contra Voucher</strong> is used exclusively for transfers between cash and bank accounts. 
                      It helps track money movement within your liquid assets without affecting your overall financial position.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="bg-purple-900/30 p-2 rounded-lg">
                          <ArrowLeftRight className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-100">When to Use Contra Vouchers?</h4>
                          <ul className="text-sm text-slate-400 space-y-1 mt-1">
                            <li>• Cash deposits to bank</li>
                            <li>• Bank withdrawals for cash</li>
                            <li>• Transfers between bank accounts</li>
                            <li>• Petty cash replenishment</li>
                            <li>• Cash movement between locations</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-slate-800/50 p-2 rounded-lg">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-100">Important Rule</h4>
                          <p className="text-sm text-slate-400">
                            <strong>Only Cash & Bank Accounts</strong> - Contra vouchers should not include any income, expense, or other accounts
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-purple-800/30 rounded-lg border border-purple-700">
                      <p className="text-sm text-purple-300 italic">
                        <strong>Financial Impact:</strong> No change in total assets - only changes the composition of current assets
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Common Contra Transactions</h3>
                    <div className="space-y-3">
                      {exampleTransactions.map((example, index) => (
                        <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                          <p className="text-sm text-slate-200 mb-1">{example.description}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-purple-400">
                              Debit: {example.debit}
                            </div>
                            <div className="text-slate-400">
                              Credit: {example.credit}
                            </div>
                            <div className="text-slate-300 text-right">
                              {example.amount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-800/50">
                      <p className="text-sm text-purple-300">
                        <strong>Tip:</strong> Debit the account receiving money, Credit the account giving money
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-100 mb-2">Golden Rule for Contra Entries:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <h5 className="text-sm font-medium text-slate-100 mb-1">When Money Moves TO Account</h5>
                      <p className="text-xs text-slate-400">Debit that account (money coming in)</p>
                    </div>
                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <h5 className="text-sm font-medium text-slate-100 mb-1">When Money Moves FROM Account</h5>
                      <p className="text-xs text-slate-400">Credit that account (money going out)</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-100 mb-2">Quick Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                    <li>Select transaction date and add transfer description</li>
                    <li>Add at least 2 entries (both must be cash/bank accounts)</li>
                    <li>Debit the account receiving the money</li>
                    <li>Credit the account giving the money</li>
                    <li>Ensure debit amount = credit amount</li>
                    <li>Save as draft or post immediately</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
          
          {/* Information Banner */}
          <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 mb-6 rounded-lg border border-purple-800/30">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-purple-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-purple-300">
                  <strong>Note:</strong> Contra vouchers are used for transfers between cash and bank accounts only.
                </p>
                <p className="text-sm text-purple-400/90 mt-1">
                  Debits must equal credits. Example: Transfer from Bank to Cash (Bank credit, Cash debit).
                </p>
              </div>
            </div>
          </div>
          
          {/* Basic Information */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Narration <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  placeholder="Transfer description"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                />
              </div>
            </div>
          </div>
          
          {/* Entries */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Entries</h2>
                <p className="text-sm text-slate-400 mt-1">Cash & Bank Accounts Only</p>
              </div>
              <button
                onClick={addEntry}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="h-5 w-5" />
                <span>Add Entry</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Narration</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Debit (QAR)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Credit (QAR)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-800">
                  {entries.map((entry, index) => (
                    <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <select
                          value={entry.accountId}
                          onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
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
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={entry.debit || ''}
                          onChange={(e) => updateEntry(index, 'debit', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 text-right"
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
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => removeEntry(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={entries.length <= 2}
                          title={entries.length <= 2 ? "At least 2 entries required" : "Remove entry"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800">
                    <td colSpan={2} className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                      Total:
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-slate-100">
                        QAR {totals.totalDebit.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-slate-100">
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
          
          {/* Common Contra Types */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Common Contra Transactions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-100 mb-1">Cash to Bank Deposit</h4>
                <p className="text-xs text-slate-400">Debit: Bank Account, Credit: Cash Account</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-100 mb-1">Bank to Cash Withdrawal</h4>
                <p className="text-xs text-slate-400">Debit: Cash Account, Credit: Bank Account</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-100 mb-1">Inter-Bank Transfer</h4>
                <p className="text-xs text-slate-400">Debit: Receiving Bank, Credit: Sending Bank</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-100 mb-1">Petty Cash Replenishment</h4>
                <p className="text-xs text-slate-400">Debit: Petty Cash, Credit: Main Cash</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-100 mb-1">Cash Safe Transfer</h4>
                <p className="text-xs text-slate-400">Debit: Branch Cash, Credit: Main Office Cash</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-100 mb-1">Bank Account Change</h4>
                <p className="text-xs text-slate-400">Debit: New Bank Account, Credit: Old Bank Account</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-300"></div>
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
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
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
      </div>
    </MainLayout>
  );
}