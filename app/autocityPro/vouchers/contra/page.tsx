'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Plus, Trash2, ArrowLeftRight, Save, Send } from 'lucide-react';
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
      toast.error('At least 2 entries required');
      return;
    }
    setEntries(entries.filter((_, i) => i !== index));
  };
  
  const calculateTotals = () => {
    const totalDebit = entries.reduce((sum, e) => sum + (parseFloat(e.debit as any) || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (parseFloat(e.credit as any) || 0), 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  };
  
  const handleSubmit = async (status: 'draft' | 'posted') => {
    const totals = calculateTotals();
    
    if (Math.abs(totals.difference) > 0.01) {
      toast.error('Debit and Credit must be equal!');
      return;
    }
    
    if (!formData.narration) {
      toast.error('Narration is required');
      return;
    }
    
    const invalidEntries = entries.filter(e => !e.accountId || (e.debit === 0 && e.credit === 0));
    if (invalidEntries.length > 0) {
      toast.error('All entries must have an account and amount');
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
            debit: parseFloat(e.debit as any) || 0,
            credit: parseFloat(e.credit as any) || 0,
            narration: e.narration,
          })),
          narration: formData.narration,
          referenceNumber: formData.referenceNumber,
          status,
        }),
      });
      
      if (res.ok) {
        toast.success(`Contra voucher ${status === 'draft' ? 'saved' : 'posted'} successfully!`);
        router.push('/autocityPro/vouchers');
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
  
  const totals = calculateTotals();
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ArrowLeftRight className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contra Voucher</h1>
              <p className="text-gray-600 mt-1">Transfer between cash & bank accounts</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Contra vouchers are used for transfers between cash and bank accounts only.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narration *</label>
              <input
                type="text"
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                placeholder="Transfer description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Entries (Cash/Bank Accounts Only)</h2>
            <button
              onClick={addEntry}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Entry</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narration</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <select
                        value={entry.accountId}
                        onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="">Select Account</option>
                        {cashBankAccounts.map(acc => (
                          <option key={acc._id} value={acc._id}>
                            {acc.accountCode} - {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={entry.narration}
                        onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                        placeholder="Entry description"
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={entry.debit}
                        onChange={(e) => updateEntry(index, 'debit', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 border rounded text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={entry.credit}
                        onChange={(e) => updateEntry(index, 'credit', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 border rounded text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeEntry(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-right">Total:</td>
                  <td className="px-4 py-3 text-right">QAR {totals.totalDebit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">QAR {totals.totalCredit.toFixed(2)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
                <tr className={`font-semibold ${Math.abs(totals.difference) < 0.01 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <td colSpan={2} className="px-4 py-3 text-right">Difference:</td>
                  <td colSpan={2} className={`px-4 py-3 text-right ${Math.abs(totals.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    QAR {Math.abs(totals.difference).toFixed(2)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            <span>Save as Draft</span>
          </button>
          <button
            onClick={() => handleSubmit('posted')}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            <span>Post Voucher</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
