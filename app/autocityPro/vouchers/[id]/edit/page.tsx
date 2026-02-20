// app/autocityPro/vouchers/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, Save, Plus, Trash2, X, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoucherEditPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [voucher, setVoucher] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: '',
    narration: '',
    referenceNumber: '',
    entries: [{ accountId: '', debit: 0, credit: 0, narration: '' }],
  });
  
  useEffect(() => {
    fetchUser();
    fetchAccounts();
    fetchVoucher();
  }, [params.id]);
  
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
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts');
    }
  };
  
  const fetchVoucher = async () => {
    try {
      const res = await fetch(`/api/vouchers/${params.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const voucherData = data.voucher;
        setVoucher(voucherData);
        
        setFormData({
          date: new Date(voucherData.date).toISOString().split('T')[0],
          narration: voucherData.narration || '',
          referenceNumber: voucherData.referenceNumber || '',
          entries: voucherData.entries.map((entry: any) => ({
            id: entry._id || crypto.randomUUID(),
            accountId: entry.accountId,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            narration: entry.narration || '',
          })),
        });
      } else {
        toast.error('Failed to fetch voucher');
        router.push('/autocityPro/vouchers');
      }
    } catch (error) {
      console.error('Error fetching voucher:', error);
      toast.error('Failed to fetch voucher');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddEntry = () => {
    setFormData({
      ...formData,
      entries: [
        ...formData.entries,
        { id: crypto.randomUUID(), accountId: '', debit: 0, credit: 0, narration: '' },
      ],
    });
  };
  
  const handleRemoveEntry = (index: number) => {
    if (formData.entries.length <= 1) {
      toast.error('At least one entry is required');
      return;
    }
    
    setFormData({
      ...formData,
      entries: formData.entries.filter((_, i) => i !== index),
    });
  };
  
  const handleEntryChange = (index: number, field: string, value: any) => {
    const newEntries = [...formData.entries];
    
    // If updating debit, set credit to 0 and vice versa
    if (field === 'debit' && parseFloat(value) > 0) {
      newEntries[index] = { ...newEntries[index], [field]: parseFloat(value), credit: 0 };
    } else if (field === 'credit' && parseFloat(value) > 0) {
      newEntries[index] = { ...newEntries[index], [field]: parseFloat(value), debit: 0 };
    } else {
      newEntries[index] = { ...newEntries[index], [field]: value };
    }
    
    setFormData({ ...formData, entries: newEntries });
  };
  
  const calculateTotals = () => {
    const totalDebit = formData.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = formData.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    return { totalDebit, totalCredit };
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { totalDebit, totalCredit } = calculateTotals();
    
    // Validate double-entry
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error('Total debits must equal total credits');
      return;
    }
    
    // Validate all entries have accounts
    for (const entry of formData.entries) {
      if (!entry.accountId) {
        toast.error('Please select an account for all entries');
        return;
      }
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/vouchers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date),
          totalDebit,
          totalCredit,
        }),
      });
      
      if (res.ok) {
        toast.success('Voucher updated successfully!');
        router.push(`/autocityPro/vouchers/${params.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update voucher');
      }
    } catch (error) {
      toast.error('Failed to update voucher');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-slate-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
        </div>
      </MainLayout>
    );
  }
  
  if (!voucher) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 bg-slate-800 min-h-screen">
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-8 text-center">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Voucher Not Found</h2>
            <button
              onClick={() => router.push('/autocityPro/vouchers')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90"
            >
              Back to Vouchers
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const { totalDebit, totalCredit } = calculateTotals();
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/autocityPro/vouchers/${params.id}`)}
                className="text-white hover:text-slate-200"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Edit Voucher</h1>
                <p className="text-purple-100">{voucher.voucherNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="edit-voucher-date" className="block text-sm font-medium text-slate-300 mb-1">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      id="edit-voucher-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full pl-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="edit-voucher-ref" className="block text-sm font-medium text-slate-300 mb-1">Reference Number</label>
                  <input
                    id="edit-voucher-ref"
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="Optional reference number"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="edit-voucher-narration" className="block text-sm font-medium text-slate-300 mb-1">
                  Narration <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="edit-voucher-narration"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                  placeholder="Enter voucher narration"
                />
              </div>
            </div>
            
            {/* Entries */}
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Entries</h2>
                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Entry</span>
                </button>
              </div>
              
              {/* Entries Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Narration</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Debit (QAR)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Credit (QAR)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900 divide-y divide-slate-800">
                    {formData.entries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <select
                            value={entry.accountId}
                            onChange={(e) => handleEntryChange(index, 'accountId', e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                          >
                            <option value="" className="text-slate-800">Select Account</option>
                            {accounts.map((account) => (
                              <option key={account._id} value={account._id} className="text-slate-800">
                                {account.accountName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={entry.narration}
                            onChange={(e) => handleEntryChange(index, 'narration', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                            placeholder="Entry narration"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.debit || ''}
                            onChange={(e) => handleEntryChange(index, 'debit', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.credit || ''}
                            onChange={(e) => handleEntryChange(index, 'credit', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveEntry(index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                            disabled={formData.entries.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-800">
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                        Totals:
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-bold text-slate-100">
                          QAR {totalDebit.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-bold text-slate-100">
                          QAR {totalCredit.toFixed(2)}
                        </p>
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                        Difference:
                      </td>
                      <td colSpan={2} className="px-4 py-4 text-right">
                        <p className={`text-sm font-bold ${
                          Math.abs(totalDebit - totalCredit) > 0.01
                            ? 'text-red-400'
                            : 'text-green-400'
                        }`}>
                          QAR {(totalDebit - totalCredit).toFixed(2)}
                          {Math.abs(totalDebit - totalCredit) > 0.01 && ' (Must be zero)'}
                        </p>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/autocityPro/vouchers/${params.id}`)}
                className="px-6 py-3 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || Math.abs(totalDebit - totalCredit) > 0.01}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center space-x-2"
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}