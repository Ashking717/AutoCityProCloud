// components/InvoicePrint.tsx
'use client';

import React from 'react';

interface InvoiceItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  total: number;
  isLabor?: boolean;
}

interface InvoiceData {
  invoiceNumber: string;
  saleDate: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  notes?: string;
}

interface InvoicePrintProps {
  invoice: InvoiceData;
  outletName?: string;
  outletAddress?: string;
  outletPhone?: string;
  outletEmail?: string;
  taxNumber?: string;
  onClose: () => void;
}

export default function InvoicePrint({
  invoice,
  outletName = 'AutoCity Accounting Pro',
  outletAddress = 'Doha, Qatar',
  outletPhone = '+974-XXXXXXXX',
  outletEmail = 'info@autocity.com',
  taxNumber = 'TAX123456',
  onClose,
}: InvoicePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Print buttons - hidden in print */}
        <div className="flex justify-end gap-2 p-4 border-b print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Print Invoice
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* Invoice content - printable */}
        <div className="p-8 print:p-6" id="invoice-content">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{outletName}</h1>
              <p className="text-gray-600 mt-2">{outletAddress}</p>
              <p className="text-gray-600">{outletPhone}</p>
              <p className="text-gray-600">{outletEmail}</p>
              <p className="text-gray-600">Tax No: {taxNumber}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-indigo-600">INVOICE</h2>
              <p className="text-lg font-semibold mt-2">{invoice.invoiceNumber}</p>
              <p className="text-gray-600">
                Date: {new Date(invoice.saleDate).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border-t border-b py-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
            <p className="font-medium">{invoice.customerName}</p>
            {invoice.customerPhone && (
              <p className="text-gray-600">{invoice.customerPhone}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-gray-600">{invoice.customerAddress}</p>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 font-semibold">#</th>
                <th className="text-left p-2 font-semibold">Item</th>
                <th className="text-right p-2 font-semibold">Qty</th>
                <th className="text-right p-2 font-semibold">Price</th>
                <th className="text-right p-2 font-semibold">Discount</th>
                <th className="text-right p-2 font-semibold">Tax</th>
                <th className="text-right p-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.isLabor ? '⚙️ Labor' : `SKU: ${item.sku}`}
                      </p>
                    </div>
                  </td>
                  <td className="text-right p-2">{item.quantity}</td>
                  <td className="text-right p-2">
                    QAR {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="text-right p-2 text-red-600">
                    {item.discount > 0 ? `-QAR ${item.discount.toFixed(2)}` : '-'}
                  </td>
                  <td className="text-right p-2">
                    QAR {item.taxAmount.toFixed(2)}
                  </td>
                  <td className="text-right p-2 font-semibold">
                    QAR {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">QAR {invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between py-2 text-red-600">
                  <span>Total Discount:</span>
                  <span className="font-medium">
                    -QAR {invoice.totalDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Total Tax:</span>
                <span className="font-medium">QAR {invoice.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-300 text-lg font-bold">
                <span>Grand Total:</span>
                <span className="text-indigo-600">
                  QAR {invoice.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-green-600">
                  QAR {invoice.amountPaid.toFixed(2)}
                </span>
              </div>
              {invoice.balanceDue > 0 && (
                <div className="flex justify-between py-2 text-red-600 font-semibold">
                  <span>Balance Due:</span>
                  <span>QAR {invoice.balanceDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-gray-600">
              <span className="font-semibold">Payment Method:</span>{' '}
              {invoice.paymentMethod}
            </p>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Notes:</span> {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-2">This is a computer-generated invoice.</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content,
          #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}