'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function PurchaseCorrections({ purchase, onSaved }: { purchase: any; onSaved: () => void }) {
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CREDIT');
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  useEffect(() => { fetch('/api/stock-locations').then(r => r.json()).then(data => setLocations(data.locations || [])).catch(() => {}); }, []);
  useEffect(() => { fetch('/api/suppliers').then(r => r.json()).then(data => setSuppliers(data.suppliers || [])).catch(() => toast.error('Unable to load suppliers')); }, []);
  const open = (value: string) => {
    setAction(value); setReason(''); setKey(crypto.randomUUID());
    setBillNumber(purchase.supplierBillNumber || ''); setNotes(purchase.notes || '');
    setSupplierId(String(purchase.supplierId?._id || purchase.supplierId));
    setItems(purchase.items.map((item: any, index: number) => ({ index, quantity: 0, unitPrice: item.unitPrice, taxRate: item.taxRate, locationId: item.locationId || '' })));
  };
  const update = (index: number, field: string, value: any) => setItems(rows => rows.map(row => row.index === index ? { ...row, [field]: value } : row));
  const submit = async () => {
    if (busy) return;
    if (!reason.trim()) return void toast.error('Enter a reason');
    setBusy(true);
    try {
      const response = await fetch(`/api/purchases/${purchase._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ action, reason, refundMethod, supplierId, supplierBillNumber: billNumber, notes, expectedUpdatedAt: purchase.updatedAt, items: action === 'return' ? items.filter(row => row.quantity > 0) : items }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success('Purchase updated'); setAction(''); onSaved();
    } catch (error: any) { toast.error(error.message || 'Correction failed'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-gray-500/30 p-4 my-4 text-gray-500">
    <h2 className="font-semibold">Purchase corrections</h2>
    {purchase.supplierBillNumber && <p>Supplier bill: {purchase.supplierBillNumber}</p>}
    {Number(purchase.returnedTotal || 0) > 0 && <p>Returned: QAR {purchase.returnedTotal.toFixed(2)}</p>}
    {purchase.status !== 'CANCELLED' && !action && <div className="flex flex-wrap gap-3 mt-3">
      <button className="border rounded px-3 py-2" onClick={() => open('edit')}>Edit prices / amounts</button>
      <button className="border rounded px-3 py-2" onClick={() => open('supplier')}>Change supplier</button>
      <button className="border rounded px-3 py-2" onClick={() => open('return')}>Purchase return</button>
      <button className="border border-red-500 text-red-500 rounded px-3 py-2" onClick={() => open('cancel')}>Cancel duplicate / incorrect purchase</button>
    </div>}
    {action && <div className="mt-4 space-y-3">
      {action === 'supplier' && <div className="space-y-2">
        <p>Current supplier: {purchase.supplierName}</p>
        <label className="block">New supplier<select className="block w-full p-2 border rounded bg-transparent" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">Select supplier</option>
          {suppliers.map(supplier => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.code}</option>)}
        </select></label>
        <label className="block">Supplier bill number<input className="block w-full p-2 border rounded bg-transparent" value={billNumber} onChange={e => setBillNumber(e.target.value)} /></label>
        <p>This corrects the supplier assigned to this bill and its payments, including allocated supplier payments. Cash, stock quantities and purchase amounts stay the same. The previous supplier remains in the correction history.</p>
      </div>}
      {action === 'edit' && <div className="space-y-2"><label className="block">Supplier bill number<input className="block w-full p-2 border rounded bg-transparent" value={billNumber} onChange={e => setBillNumber(e.target.value)} /></label><label className="block">Narration<input className="block w-full p-2 border rounded bg-transparent" value={notes} onChange={e => setNotes(e.target.value)} /></label></div>}
      {action !== 'supplier' && <p>{action === 'cancel' ? 'Cancel an incorrectly recorded purchase. This reverses its stock and accounting, including recorded payments. Use a return for goods actually sent back to a supplier.' : action === 'return' ? 'Choose quantities and the locations the goods are leaving. Any paid portion can be refunded or retained as supplier credit.' : 'Correct unit prices or tax rates. Stock quantities stay the same; inventory value and the supplier balance are adjusted.'}</p>}
      {['edit', 'return'].includes(action) && items.map(row => <div key={row.index} className="border rounded p-3 space-y-2">
        <p>{purchase.items[row.index].name} · {purchase.items[row.index].sku} · {purchase.items[row.index].vehicle}</p>
        {action === 'edit' ? <div className="flex gap-3">
          <label>Unit price<input className="block w-32 p-2 border rounded bg-transparent" type="number" min="0" step="0.01" value={row.unitPrice} onChange={e => update(row.index, 'unitPrice', Number(e.target.value))} /></label>
          <label>Tax %<input className="block w-24 p-2 border rounded bg-transparent" type="number" min="0" max="100" step="0.01" value={row.taxRate} onChange={e => update(row.index, 'taxRate', Number(e.target.value))} /></label>
        </div> : <div className="flex flex-wrap gap-3">
          <label>Return quantity (remaining {purchase.items[row.index].quantity - (purchase.items[row.index].returnedQuantity || 0)})<input className="block w-32 p-2 border rounded bg-transparent" type="number" min="0" step="0.001" value={row.quantity} onChange={e => update(row.index, 'quantity', Number(e.target.value))} /></label>
          <label>From location<select className="block p-2 border rounded bg-transparent" value={row.locationId} onChange={e => update(row.index, 'locationId', e.target.value)}><option value="">Original purchase location</option>{locations.map(location => <option key={location._id} value={location._id}>{location.name}</option>)}</select></label>
        </div>}
      </div>)}
      {['edit', 'return'].includes(action) && <label className="block">Settlement of any excess paid amount<select className="block p-2 border rounded bg-transparent" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}><option value="CREDIT">Supplier credit</option><option value="CASH">Cash refund received</option><option value="PETTY_CASH">Petty cash refund received</option><option value="BANK_TRANSFER">Bank refund received</option><option value="CARD">Card refund received</option></select></label>}
      <label className="block">Reason<textarea className="block w-full p-2 border rounded bg-transparent" value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button disabled={busy} className="bg-red-600 text-white rounded px-4 py-2 disabled:opacity-50" onClick={submit}>{busy ? 'Saving…' : 'Confirm correction'}</button>
      <button disabled={busy} className="ml-3 border rounded px-4 py-2" onClick={() => setAction('')}>Back</button>
    </div>}
    {(purchase.corrections || []).map((correction: any) => <div key={correction.key} className="border-t mt-3 pt-3"><p>{correction.referenceNumber} · {new Date(correction.date).toLocaleString()} · QAR {Number(correction.amount || 0).toFixed(2)}</p><p>{correction.reason}</p><a className="underline mr-4" href={`/autocityPro/purchases/${purchase._id}/corrections/${encodeURIComponent(correction.key)}`}>View / print document</a>{correction.voucherId && <a className="underline" href={`/autocityPro/vouchers/${correction.voucherId}`}>View accounting voucher</a>}</div>)}
  </section>;
}
