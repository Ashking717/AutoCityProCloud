'use client';

// File: components/expenses/CreateExpenseForm.tsx - WITH TIME-BASED LIGHT/DARK THEME

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

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
  const isDark = useTimeBasedTheme();
  const [loading, setLoading] = useState(false);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    category: 'UTILITY', paymentMethod: 'CASH', paymentAccountId: '',
    vendorName: '', vendorPhone: '', vendorEmail: '', referenceNumber: '',
    taxAmount: 0, notes: '', isRecurring: false, recurringFrequency: 'MONTHLY',
  });
  const [items, setItems] = useState([{ description: '', accountId: '', amount: 0, notes: '' }]);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    overlay:      isDark ? 'rgba(0,0,0,0.50)'                                              : 'rgba(0,0,0,0.40)',
    modalBg:      isDark ? '#1e293b'                                                        : '#ffffff',
    modalBorder:  isDark ? '#334155'                                                        : 'rgba(0,0,0,0.10)',
    headerBg:     isDark ? '#1e293b'                                                        : '#ffffff',
    headerBorder: isDark ? '#334155'                                                        : 'rgba(0,0,0,0.08)',
    title:        isDark ? '#ffffff'                                                        : '#111827',
    label:        isDark ? '#cbd5e1'                                                        : '#374151',
    // Inputs
    inputBg:      isDark ? '#334155'                                                        : '#ffffff',
    inputBorder:  isDark ? '#475569'                                                        : 'rgba(0,0,0,0.12)',
    inputText:    isDark ? '#f1f5f9'                                                        : '#111827',
    inputPH:      isDark ? '#94a3b8'                                                        : '#9ca3af',
    // Item card
    itemCardBg:   isDark ? 'rgba(51,65,85,0.30)'                                           : 'rgba(0,0,0,0.03)',
    itemCardBorder: isDark ? '#475569'                                                      : 'rgba(0,0,0,0.08)',
    itemLabel:    isDark ? '#94a3b8'                                                        : '#6b7280',
    // Total banner
    totalBg:      isDark ? 'rgba(234,88,12,0.20)'                                          : 'rgba(254,215,170,0.50)',
    totalBorder:  isDark ? 'rgba(194,65,12,0.50)'                                          : 'rgba(234,88,12,0.25)',
    totalLabel:   isDark ? '#cbd5e1'                                                        : '#92400e',
    totalValue:   isDark ? '#fb923c'                                                        : '#c2410c',
    // Footer
    footerBorder: isDark ? '#334155'                                                        : 'rgba(0,0,0,0.08)',
    cancelBg:     isDark ? '#334155'                                                        : '#f3f4f6',
    cancelHoverBg: isDark ? '#475569'                                                       : '#e5e7eb',
    cancelText:   isDark ? '#ffffff'                                                        : '#374151',
    // Close btn
    closeBg:      isDark ? 'rgba(255,255,255,0.05)'                                        : 'rgba(0,0,0,0.05)',
    closeText:    isDark ? '#94a3b8'                                                        : '#6b7280',
    // Checkbox
    checkboxBg:   isDark ? '#334155'                                                        : '#ffffff',
    checkboxBorder: isDark ? '#475569'                                                      : 'rgba(0,0,0,0.20)',
  };

  const inputStyle = {
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    color: th.inputText,
  };
  const inputClass = "w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#E84545] outline-none";

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const [expRes, payRes] = await Promise.all([
        fetch('/api/accounts?type=EXPENSE', { credentials: 'include' }),
        fetch('/api/accounts?type=asset', { credentials: 'include' }),
      ]);
      if (expRes.ok) setExpenseAccounts((await expRes.json()).accounts || []);
      if (payRes.ok) {
        const cashBank = ((await payRes.json()).accounts || []).filter((a: any) => {
          const s = a.subType?.toString().toUpperCase();
          return s === 'CASH' || s === 'BANK';
        });
        setPaymentAccounts(cashBank);
        if (cashBank.length > 0) setFormData(p => ({ ...p, paymentAccountId: cashBank[0]._id }));
      }
    } catch {}
  };

  const addItem = () => setItems([...items, { description: '', accountId: '', amount: 0, notes: '' }]);
  const removeItem = (i: number) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  const updateItem = (i: number, field: string, value: any) => {
    const n = [...items]; n[i] = { ...n[i], [field]: value }; setItems(n);
  };
  const calculateTotal = () => items.reduce((s, i) => s + Number(i.amount || 0), 0) + Number(formData.taxAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) { toast.error('Please select a category'); return; }
    if (items.length === 0 || !items[0].accountId) { toast.error('Please add at least one expense item'); return; }
    if (items.find(i => !i.description || !i.accountId || i.amount <= 0)) { toast.error('Please fill all item details with valid amounts'); return; }
    if (formData.paymentMethod !== 'CREDIT' && !formData.paymentAccountId) { toast.error('Please select a payment account'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...formData, items, amountPaid: formData.paymentMethod === 'CREDIT' ? 0 : calculateTotal() }),
      });
      if (r.ok) {
        const data = await r.json();
        toast.success(`Expense ${data.expense.expenseNumber} created successfully!`);
        onSuccess(); onClose();
      } else toast.error((await r.json()).error || 'Failed to create expense');
    } catch { toast.error('Failed to create expense'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors duration-500"
      style={{ background: th.overlay }}>
      <div className="rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border transition-colors duration-500"
        style={{ background: th.modalBg, borderColor: th.modalBorder }}>

        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b flex items-center justify-between z-10 transition-colors duration-500"
          style={{ background: th.headerBg, borderColor: th.headerBorder }}>
          <h3 className="text-xl font-semibold flex items-center gap-2" style={{ color: th.title }}>
            Record New Expense
            {isDark ? <Moon className="h-4 w-4 text-[#E84545]" /> : <Sun className="h-4 w-4 text-[#E84545]" />}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors"
            style={{ background: th.closeBg, color: th.closeText }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = th.closeBg)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: th.label }}>
                Expense Category <span className="text-red-400">*</span>
              </label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className={inputClass} style={inputStyle} required>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: th.label }}>
                Payment Method <span className="text-red-400">*</span>
              </label>
              <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                className={inputClass} style={inputStyle} required>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Payment Account */}
          {formData.paymentMethod !== 'CREDIT' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: th.label }}>
                Payment Account <span className="text-red-400">*</span>
              </label>
              <select value={formData.paymentAccountId} onChange={e => setFormData({ ...formData, paymentAccountId: e.target.value })}
                className={inputClass} style={inputStyle} required>
                <option value="">Select payment account</option>
                {paymentAccounts.map(a => <option key={a._id} value={a._id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
          )}

          {/* Vendor Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Vendor Name', key: 'vendorName', type: 'text', placeholder: 'e.g., Kahramaa' },
              { label: 'Reference #', key: 'referenceNumber', type: 'text', placeholder: 'Bill/Invoice number' },
              { label: 'Tax Amount', key: 'taxAmount', type: 'number', placeholder: '0.00' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium mb-2" style={{ color: th.label }}>{f.label}</label>
                <input type={f.type} value={(formData as any)[f.key]}
                  onChange={e => setFormData({ ...formData, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                  className={inputClass} style={inputStyle} placeholder={f.placeholder}
                  step={f.type === 'number' ? '0.01' : undefined} />
              </div>
            ))}
          </div>

          {/* Expense Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" style={{ color: th.label }}>
                Expense Items <span className="text-red-400">*</span>
              </label>
              <button type="button" onClick={addItem}
                className="px-3 py-1.5 bg-[#E84545] hover:bg-[#cc3c3c] text-white rounded-lg text-sm flex items-center space-x-1 transition-colors">
                <Plus className="w-4 h-4" /><span>Add Item</span>
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="rounded-lg p-4 space-y-3 border"
                style={{ background: th.itemCardBg, borderColor: th.itemCardBorder }}>
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium" style={{ color: th.itemLabel }}>Item {index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)}
                      className="p-1 hover:bg-red-900/20 text-red-400 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] outline-none"
                    style={inputStyle} placeholder="Description (e.g., Electricity Bill - Dec 2024)" required />
                  <select value={item.accountId} onChange={e => updateItem(index, 'accountId', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] outline-none"
                    style={inputStyle} required>
                    <option value="">Select expense account</option>
                    {expenseAccounts.map(a => <option key={a._id} value={a._id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={item.amount}
                    onChange={e => updateItem(index, 'amount', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] outline-none"
                    style={inputStyle} placeholder="Amount" required />
                  <input type="text" value={item.notes}
                    onChange={e => updateItem(index, 'notes', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] outline-none"
                    style={inputStyle} placeholder="Notes (optional)" />
                </div>
              </div>
            ))}
          </div>

          {/* Recurring */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={formData.isRecurring}
                onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4 text-[#E84545] rounded focus:ring-[#E84545]"
                style={{ background: th.checkboxBg, borderColor: th.checkboxBorder }} />
              <span className="text-sm" style={{ color: th.label }}>Recurring Expense</span>
            </label>
            {formData.isRecurring && (
              <select value={formData.recurringFrequency}
                onChange={e => setFormData({ ...formData, recurringFrequency: e.target.value })}
                className="px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] outline-none"
                style={inputStyle}>
                {['WEEKLY','MONTHLY','QUARTERLY','YEARLY'].map(f => <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: th.label }}>Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3} className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#E84545] outline-none resize-none"
              style={inputStyle} placeholder="Additional notes or comments..." />
          </div>

          {/* Total */}
          <div className="rounded-lg p-4 border" style={{ background: th.totalBg, borderColor: th.totalBorder }}>
            <div className="flex items-center justify-between text-lg font-semibold">
              <span style={{ color: th.totalLabel }}>Total Amount:</span>
              <span style={{ color: th.totalValue }}>QAR {calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t" style={{ borderColor: th.footerBorder }}>
            <button type="button" onClick={onClose} disabled={loading}
              className="px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
              style={{ background: th.cancelBg, color: th.cancelText }}
              onMouseEnter={e => (e.currentTarget.style.background = th.cancelHoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = th.cancelBg)}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-[#E84545] hover:bg-[#cc3c3c] text-white rounded-lg font-medium disabled:opacity-50 flex items-center space-x-2 transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}