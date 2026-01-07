'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, Save, Send, Plus, Trash2, BookOpen, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoucherEntry {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  narration: string;
}

export default function JournalEntryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
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
      const res = await fetch('/api/accounts?active=true', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts');
      toast.error('Failed to load accounts');
    }
  };
  
  const updateEntry = (index: number, field: keyof VoucherEntry, value: any) => {
    const newEntries = [...entries];
    
    if (field === 'accountId') {
      const account = accounts.find(a => a._id === value);
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
      toast.error('At least 2 entries required for journal entry');
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
          voucherType: 'journal',
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
        toast.success(`Journal entry ${status === 'draft' ? 'saved' : 'posted'} successfully!`);
        router.push(`/autocityPro/vouchers/${data.voucher._id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create journal entry');
      }
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast.error('Failed to create journal entry');
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
      description: 'Depreciation entry for equipment',
      debit: 'Depreciation Expense',
      credit: 'Accumulated Depreciation',
      amount: 'QAR 1,000'
    },
    {
      description: 'Accrued expense recognition',
      debit: 'Utilities Expense',
      credit: 'Accrued Liabilities',
      amount: 'QAR 500'
    },
    {
      description: 'Bad debt write-off',
      debit: 'Bad Debt Expense',
      credit: 'Accounts Receivable',
      amount: 'QAR 2,000'
    },
    {
      description: 'Prepaid expense adjustment',
      debit: 'Insurance Expense',
      credit: 'Prepaid Insurance',
      amount: 'QAR 300'
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
                <BookOpen className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Journal Entry</h1>
                  <p className="text-purple-100">Record adjusting and correcting entries</p>
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
                <Info className="h-5 w-5 text-blue-400" />
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
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Journal Entry Basics</h3>
                    <p className="text-slate-300 mb-4">
                      A <strong>Journal Entry</strong> is the primary method for recording transactions in accounting. 
                      It follows the double-entry system where every transaction affects at least two accounts - 
                      one account is debited and another is credited.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-900/30 p-2 rounded-lg">
                          <BookOpen className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-100">When to Use Journal Entries?</h4>
                          <ul className="text-sm text-slate-400 space-y-1 mt-1">
                            <li>• Adjusting entries (depreciation, accruals)</li>
                            <li>• Corrections and error fixes</li>
                            <li>• Closing entries at period end</li>
                            <li>• Non-cash transactions</li>
                            <li>• Reclassifications between accounts</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-slate-800/50 p-2 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-100">Important Rule</h4>
                          <p className="text-sm text-slate-400">
                            <strong>Total Debits MUST equal Total Credits</strong> - This is the fundamental principle of double-entry accounting
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-800/30 rounded-lg border border-blue-700">
                      <p className="text-sm text-blue-300 italic">
                        <strong>Accounting Equation:</strong> Assets = Liabilities + Equity
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Common Journal Entry Types</h3>
                    <div className="space-y-3">
                      {exampleTransactions.map((example, index) => (
                        <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                          <p className="text-sm text-slate-200 mb-1">{example.description}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-blue-400">
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
                    
                    <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
                      <p className="text-sm text-blue-300">
                        <strong>Tip:</strong> Start with the account that needs adjustment, then find the corresponding account
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-100 mb-2">Golden Rules of Accounting:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <h5 className="text-sm font-medium text-slate-100 mb-1">Personal Accounts</h5>
                      <p className="text-xs text-slate-400">Debit the receiver, Credit the giver</p>
                    </div>
                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <h5 className="text-sm font-medium text-slate-100 mb-1">Real Accounts</h5>
                      <p className="text-xs text-slate-400">Debit what comes in, Credit what goes out</p>
                    </div>
                    <div className="p-3 bg-slate-800/30 rounded-lg">
                      <h5 className="text-sm font-medium text-slate-100 mb-1">Nominal Accounts</h5>
                      <p className="text-xs text-slate-400">Debit expenses/losses, Credit incomes/gains</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-100 mb-2">Quick Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                    <li>Determine which accounts are affected</li>
                    <li>Apply debit/credit rules for each account</li>
                    <li>Enter amounts ensuring debits = credits</li>
                    <li>Add clear narration for each entry</li>
                    <li>Verify total debits equal total credits</li>
                    <li>Save as draft or post immediately</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
          
          {/* Information Banner */}
          <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 rounded-lg border border-blue-800/30">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-300">
                  <strong>Journal Entries</strong> are used for adjusting entries, corrections, depreciation, 
                  accruals, and other non-cash transactions.
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
                  placeholder="Journal entry description"
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
                <p className="text-sm text-slate-400 mt-1">At least one debit and one credit required</p>
              </div>
              <button
                onClick={addEntry}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
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
                          {accounts.map(acc => (
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
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Post Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}