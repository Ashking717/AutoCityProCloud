'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PurchaseCorrectionDocument() {
  const params = useParams();
  const [purchase, setPurchase] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/purchases/${params.id}`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load purchase');
      setPurchase(data.purchase);
    }).catch(error => setError(error.message));
  }, [params.id]);
  if (error) return <p className="p-8">{error}</p>;
  if (!purchase) return <p className="p-8">Loading document…</p>;
  const correction = purchase.corrections?.find((row: any) => row.key === params.key);
  if (!correction) return <p className="p-8">Correction not found</p>;
  const money = (value: number) => `QAR ${Number(value || 0).toFixed(2)}`;
  const title = correction.action === 'supplier' ? 'Purchase Supplier Correction' : correction.action === 'return' ? 'Purchase Return Voucher' : correction.action === 'cancel' ? 'Purchase Cancellation' : 'Purchase Amount Correction';
  return <main className="min-h-screen bg-white text-black p-6 md:p-12">
    <style>{'@media print { .document-actions { display:none!important; } @page { margin:15mm; } }'}</style>
    <div className="document-actions flex gap-4 mb-8"><a className="underline" href={`/autocityPro/purchases/${purchase._id}`}>Back to purchase</a><button className="border rounded px-4 py-1" onClick={() => window.print()}>Print / Save PDF</button></div>
    <article className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3">{correction.referenceNumber}</p>
      <p>{new Date(correction.date).toLocaleString()}</p>
      <div className="my-6"><p>Supplier: {purchase.supplierName}</p><p>Original purchase: {purchase.purchaseNumber}</p>{purchase.supplierBillNumber && <p>Supplier bill: {purchase.supplierBillNumber}</p>}<p>Reason: {correction.reason}</p></div>
      {correction.action === 'supplier' && <div className="my-6"><p>Previous supplier: {correction.before.supplierName}</p><p>Corrected supplier: {correction.supplierName}</p><p>Purchase amounts and stock quantities unchanged.</p></div>}
      {correction.action !== 'supplier' && <><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b"><th className="p-2">Item / SKU</th><th className="p-2">Quantity</th><th className="p-2">Unit price</th><th className="p-2">Amount / change</th></tr></thead>
        <tbody>{correction.changes.map((change: any) => {
          const item = correction.before.items[change.index];
          return <tr key={change.index} className="border-b"><td className="p-2">{item.name}<br />{item.sku}<br />{item.vehicle}</td><td className="p-2">{change.quantity ?? item.quantity} {item.unit}</td><td className="p-2">{money(change.unitPrice ?? item.unitPrice)}</td><td className="p-2">{money(change.amount ?? (item.quantity * (change.unitPrice - item.unitPrice)))}</td></tr>;
        })}</tbody>
      </table>
      {correction.changes.some((change: any) => change.returnedDiscount > 0) && <p className="mt-4">Settlement discount deducted from returned goods: {money(correction.changes.reduce((sum: number, change: any) => sum + Number(change.returnedDiscount || 0), 0))}</p>}
      <p className="mt-6 text-lg font-semibold">{correction.action === 'edit' ? 'Total change (including tax)' : 'Total (including tax, after settlement discount)'}: {money(correction.amount)}</p>
      </>}
      {correction.refund > 0 && <p className="mt-2">{correction.refundMethod === 'CREDIT' ? 'Supplier credit' : `Refund received (${correction.refundMethod})`}: {money(correction.refund)}</p>}
      {correction.action === 'return' && <p>Bill payable reduced by: {money(correction.amount - correction.refund)}</p>}
    </article>
  </main>;
}
