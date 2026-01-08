'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'UTILITY', label: 'Utility Bills' },
  { value: 'RENT', label: 'Rent' },
  { value: 'SALARY', label: 'Salaries & Wages' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'PROFESSIONAL_FEES', label: 'Professional Fees' },
  { value: 'OTHER', label: 'Other Expenses' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT', label: 'Credit (Pay Later)' },
];

export default function CreateExpenseForm({ onClose, onSuccess }: CreateExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    category: 'UTILITY',
    paymentMethod: 'CASH',
    paymentAccountId: '',
    vendorName: '',
    vendorPhone: '',
    vendorEmail: '',
    referenceNumber: '',
    taxAmount: 0,
    notes: '',
    isRecurring: false,
    recurringFrequency: 'MONTHLY',
  });
  
  const [items, setItems] = useState([
    { description: '', accountId: '', amount: 0, notes: '' }
  ]);
  
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  const fetchAccounts = async () => {
    try {
      // Fetch expense accounts
      const expRes = await fetch('/api/accounts?type=EXPENSE', { credentials: 'include' });
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenseAccounts(data.accounts || []);
      }
      
      // Fetch cash/bank accounts
      const payRes = await fetch('/api/accounts?type=ASSET', { credentials: 'include' });
      if (payRes.ok) {
        const data = await payRes.json();
        const cashBankAccounts = (data.accounts || []).filter((a: any) => {
          const subType = a.subType?.toString().toUpperCase();
          return subType === 'CASH' || subType === 'BANK';
        });
        setPaymentAccounts(cashBankAccounts);
        
        // Set default payment account (first cash account)
        if (cashBankAccounts.length > 0) {
          setFormData(prev => ({ ...prev, paymentAccountId: cashBankAccounts[0]._id }));
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };
  
  const addItem = () => {
    setItems([...items, { description: '', accountId: '', amount: 0, notes: '' }]);
  };
  
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
  
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  
  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const tax = Number(formData.taxAmount || 0);
    return subtotal + tax;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    
    if (items.length === 0 || !items[0].accountId) {
      toast.error('Please add at least one expense item');
      return;
    }
    
    const invalidItem = items.find(item => !item.description || !item.accountId || item.amount <= 0);
    if (invalidItem) {
      toast.error('Please fill all item details with valid amounts');
      return;
    }
    
    if (formData.paymentMethod !== 'CREDIT' && !formData.paymentAccountId) {
      toast.error('Please select a payment account');
      return;
    }
    
    setLoading(true);
    
    try {
      const grandTotal = calculateTotal();
      
      const payload = {
        ...formData,
        items,
        amountPaid: formData.paymentMethod === 'CREDIT' ? 0 : grandTotal,
      };
      
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Expense ${data.expense.expenseNumber} created successfully!`);
        onSuccess();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between z-10">
          <h3 className="text-xl font-semibold text-white">Record New Expense</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expense Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Payment Method <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Payment Account */}
          {formData.paymentMethod !== 'CREDIT' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Payment Account <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.paymentAccountId}
                onChange={(e) => setFormData({ ...formData, paymentAccountId: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              >
                <option value="">Select payment account</option>
                {paymentAccounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Vendor Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Vendor Name</label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="e.g., Kahramaa"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Reference #</label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Bill/Invoice number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.taxAmount}
                onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Expense Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">
                Expense Items <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            
            {items.map((item, index) => (
              <div key={index} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-slate-400">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 hover:bg-red-900/20 text-red-400 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Description (e.g., Electricity Bill - Dec 2024)"
                      required
                    />
                  </div>
                  
                  <div>
                    <select
                      value={item.accountId}
                      onChange={(e) => updateItem(index, 'accountId', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      required
                    >
                      <option value="">Select expense account</option>
                      {expenseAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Amount"
                      required
                    />
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Notes (optional)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Recurring Expense */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4 text-orange-600 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-slate-300">Recurring Expense</span>
            </label>
            
            {formData.isRecurring && (
              <select
                value={formData.recurringFrequency}
                onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value })}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            )}
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Additional notes or comments..."
            />
          </div>
          
          {/* Total */}
          <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span className="text-slate-300">Total Amount:</span>
              <span className="text-orange-400">
                QAR {calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}