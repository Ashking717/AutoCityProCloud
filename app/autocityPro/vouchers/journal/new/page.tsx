'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  ChevronLeft,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  BookOpen,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface JournalEntry {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  narration: string;
}

export default function NewJournalVoucherPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: '1',
      accountId: '',
      accountNumber: '',
      accountName: '',
      debit: 0,
      credit: 0,
      narration: '',
    },
    {
      id: '2',
      accountId: '',
      accountNumber: '',
      accountName: '',
      debit: 0,
      credit: 0,
      narration: '',
    },
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
      setLoadingAccounts(true);
      const res = await fetch('/api/accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts');
      toast.error('Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const addEntry = () => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      accountId: '',
      accountNumber: '',
      accountName: '',
      debit: 0,
      credit: 0,
      narration: '',
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 2) {
      toast.error('Journal must have at least 2 entries');
      return;
    }
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: string, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };
        
        // If account is selected, populate account details
        if (field === 'accountId' && value) {
          const account = accounts.find(a => a._id === value);
          if (account) {
            updated.accountNumber = account.code || account.accountNumber || '';
            updated.accountName = account.name || account.accountName || '';
          }
        }
        
        return updated;
      }
      return entry;
    }));
  };

  const calculateTotals = () => {
    const totalDebit = entries.reduce((sum, e) => sum + (parseFloat(e.debit.toString()) || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (parseFloat(e.credit.toString()) || 0), 0);
    const difference = totalDebit - totalCredit;
    return { totalDebit, totalCredit, difference };
  };

  const validateForm = () => {
    if (!date) {
      toast.error('Please select a date');
      return false;
    }

    if (!narration.trim()) {
      toast.error('Please enter a narration');
      return false;
    }

    const validEntries = entries.filter(e => e.accountId && (e.debit > 0 || e.credit > 0));
    
    if (validEntries.length < 2) {
      toast.error('Journal must have at least 2 valid entries');
      return false;
    }

    const { totalDebit, totalCredit, difference } = calculateTotals();
    
    if (Math.abs(difference) > 0.01) {
      toast.error(`Debits and Credits must balance. Difference: QAR ${difference.toFixed(2)}`);
      return false;
    }

    // Check for entries with both debit and credit
    const invalidEntries = validEntries.filter(e => e.debit > 0 && e.credit > 0);
    if (invalidEntries.length > 0) {
      toast.error('An entry cannot have both debit and credit amounts');
      return false;
    }

    return true;
  };

  const handleSubmit = async (status: 'draft' | 'posted') => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const validEntries = entries.filter(e => e.accountId && (e.debit > 0 || e.credit > 0));
      
      const payload = {
        voucherType: 'journal',
        date,
        narration,
        referenceNumber: referenceNumber || undefined,
        referenceType: 'ADJUSTMENT',
        entries: validEntries.map(e => ({
          accountId: e.accountId,
          debit: parseFloat(e.debit.toString()) || 0,
          credit: parseFloat(e.credit.toString()) || 0,
          narration: e.narration || narration,
        })),
        status,
      };

      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          status === 'draft' 
            ? 'Journal voucher saved as draft' 
            : 'Journal voucher posted successfully'
        );
        router.push('/autocityPro/vouchers/journal');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create voucher');
      }
    } catch (error) {
      toast.error('Failed to create voucher');
    } finally {
      setLoading(false);
    }
  };

  const { totalDebit, totalCredit, difference } = calculateTotals();
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-4 md:px-8 py-6 md:py-12">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">New Journal Voucher</h1>
                <p className="text-white/80 mt-1">Create a new journal entry</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
          {/* Voucher Details Card */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-[#E84545]" />
              <h2 className="text-xl font-bold text-white">Voucher Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="journal-date" className="block text-sm font-medium text-slate-300 mb-2">
                  Date <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="journal-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="journal-ref" className="block text-sm font-medium text-slate-300 mb-2">
                  Reference Number
                </label>
                <input
                  id="journal-ref"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Optional reference"
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="journal-type" className="block text-sm font-medium text-slate-300 mb-2">
                  Voucher Type
                </label>
                <input
                  id="journal-type"
                  type="text"
                  value="Journal Entry"
                  disabled
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="journal-narration" className="block text-sm font-medium text-slate-300 mb-2">
                Narration <span className="text-red-400">*</span>
              </label>
              <textarea
                id="journal-narration"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Enter voucher narration..."
                rows={3}
                className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Journal Entries Card */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#E84545]" />
                <h2 className="text-xl font-bold text-white">Journal Entries</h2>
              </div>
              <button
                onClick={addEntry}
                className="flex items-center gap-2 px-4 py-2 bg-[#E84545] hover:bg-[#cc3c3c] text-white rounded-lg transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">Add Entry</span>
              </button>
            </div>

            {loadingAccounts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#E84545]" />
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="bg-[#050505] border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-slate-400">
                        Entry {index + 1}
                      </span>
                      {entries.length > 2 && (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-1.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="lg:col-span-2">
                        <label htmlFor={`journal-account-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-2">
                          Account <span className="text-red-400">*</span>
                        </label>
                        <select
                          id={`journal-account-${entry.id}`}
                          value={entry.accountId}
                          onChange={(e) => updateEntry(entry.id, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        >
                          <option value="">Select account...</option>
                          {accounts.map((account) => (
                            <option key={account._id} value={account._id}>
                              {account.code || account.accountNumber} - {account.name || account.accountName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`journal-debit-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-2">
                          Debit (QAR)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
                          <input
                            id={`journal-debit-${entry.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.debit || ''}
                            onChange={(e) => updateEntry(entry.id, 'debit', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`journal-credit-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-2">
                          Credit (QAR)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
                          <input
                            id={`journal-credit-${entry.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.credit || ''}
                            onChange={(e) => updateEntry(entry.id, 'credit', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`journal-entry-narration-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-2">
                          Entry Narration
                        </label>
                        <input
                          id={`journal-entry-narration-${entry.id}`}
                          type="text"
                          value={entry.narration}
                          onChange={(e) => updateEntry(entry.id, 'narration', e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-[#050505] rounded-xl border border-white/5">
                <p className="text-sm text-slate-400 mb-2">Total Debit</p>
                <p className="text-2xl font-bold text-green-400">
                  QAR {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="text-center p-4 bg-[#050505] rounded-xl border border-white/5">
                <p className="text-sm text-slate-400 mb-2">Total Credit</p>
                <p className="text-2xl font-bold text-blue-400">
                  QAR {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className={`text-center p-4 rounded-xl border ${isBalanced ? 'bg-green-900/20 border-green-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
                <p className="text-sm text-slate-400 mb-2">Difference</p>
                <div className="flex items-center justify-center gap-2">
                  {isBalanced ? (
                    <AlertCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  <p className={`text-2xl font-bold ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                    QAR {Math.abs(difference).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {isBalanced && (
                  <p className="text-xs text-green-400 mt-1">✓ Balanced</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3 justify-end">
            <button
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 py-3 bg-[#0A0A0A] border border-white/10 text-white rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
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
              className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:from-[#cc3c3c] hover:to-[#E84545] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
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