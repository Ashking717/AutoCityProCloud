"use client";

import React, { useEffect, useCallback, useState } from "react";
import Image from "next/image";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  saleDate: string;
  poNumber?: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount?: number;
  totalTax: number;
  grandTotal: number;
}

interface OutletUI {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  taxInfo?: {
    taxId?: string;
  };
  settings?: {
    currency: string;
    taxRate?: number;
  };
}

interface CustomerUI {
  name: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
}

interface InvoicePrintProps {
  invoice: InvoiceData;
  outletId: string;
  customerId: string;
  onClose: () => void;
}

export default function InvoicePrint({
  invoice,
  outletId,
  customerId,
  onClose,
}: InvoicePrintProps) {
  const [outlet, setOutlet] = useState<OutletUI | null>(null);
  const [customer, setCustomer] = useState<CustomerUI | null>(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = () => window.print();

  const fetchData = useCallback(async () => {
    try {
      const [outletRes, customerRes] = await Promise.all([
        fetch(`/api/outlets/${outletId}`, { credentials: "include" }),
        fetch(`/api/customers/${customerId}`, { credentials: "include" }),
      ]);

      if (outletRes.ok) {
        const data = await outletRes.json();
        setOutlet(data.outlet);
      }

      if (customerRes.ok) {
        const data = await customerRes.json();
        setCustomer(data.customer);
      }
    } catch (err) {
      console.error("Failed to load invoice data", err);
    } finally {
      setLoading(false);
    }
  }, [outletId, customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white text-black px-6 py-4 rounded-md">Loading invoice…</div>
      </div>
    );
  }

  if (!outlet || !customer) return null;

  const currency = outlet.settings?.currency || "QAR";
  const taxRate = outlet.settings?.taxRate || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 print:p-0 print:bg-transparent">
      <div 
        id="print-section"
        className="bg-white text-black w-full max-w-4xl shadow-lg overflow-auto max-h-[90vh] print:max-h-none print:overflow-visible print:shadow-none"
      >
        {/* Actions */}
        <div className="flex justify-end gap-2 p-4 print:hidden border-b border-gray-200">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors rounded"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors rounded"
          >
            Close
          </button>
        </div>

        {/* Invoice Content */}
        <div
          className="p-12 print:p-8"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-xs font-bold tracking-tighter text-gray-700 mb-1">
                ///////////////////////////////////////////////////////////////////
              </div>
              <h1
                className="text-5xl font-bold tracking-wider"
                style={{ fontWeight: "bolder" }}
              >
                invoice
              </h1>
            </div>

            <div className="relative w-32 h-32 rounded-full bg-gray-400 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          </div>

          {/* FROM and Invoice Details */}
          <div className="flex justify-between mb-12">
            <div className="text-sm leading-relaxed">
              <p className="font-bold">{outlet.name}</p>
              {outlet.address?.street && <p>{outlet.address.street}</p>}
              {outlet.address?.city && (
                <p>
                  {outlet.address.city}, {outlet.address.state}{" "}
                  {outlet.address.postalCode}
                </p>
              )}
              {outlet.contact?.phone && <p>Phone: {outlet.contact.phone}</p>}
              {outlet.contact?.email && <p>Email: {outlet.contact.email}</p>}
            </div>

            <div className="text-sm text-right leading-relaxed">
              <div className="flex justify-end gap-8 mb-1">
                <span className="font-bold">INVOICE #</span>
                <span>{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-end gap-8 mb-1">
                <span className="font-bold">INVOICE DATE</span>
                <span>
                  {new Date(invoice.saleDate)
                    .toLocaleDateString("en-GB")
                    .replace(/\//g, "/")}
                </span>
              </div>
              {invoice.poNumber && (
                <div className="flex justify-end gap-8 mb-1">
                  <span className="font-bold">P.O.#</span>
                  <span>{invoice.poNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* BILL TO */}
          <div className="flex justify-between mb-12">
            <div className="text-sm leading-relaxed">
              <p className="font-bold mb-2">BILL TO</p>
              <p>{customer.name}</p>
              {customer.phone && <p>Phone: {customer.phone}</p>}
              {customer.address?.street && <p>{customer.address.street}</p>}
              {customer.address?.city && (
                <p>
                  {customer.address.city}, {customer.address.state}{" "}
                  {customer.address.postalCode}
                </p>
              )}
              {customer.vehicleRegistrationNumber && (
                <p>Vehicle: {customer.vehicleRegistrationNumber}</p>
              )}
              {(customer.vehicleMake ||
                customer.vehicleModel ||
                customer.vehicleYear ||
                customer.vehicleColor) && (
                <p>
                  {[
                    customer.vehicleMake,
                    customer.vehicleModel,
                    customer.vehicleYear,
                    customer.vehicleColor,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm mb-8 border-collapse border-2 border-black">
            <thead>
              <tr className="border-b-2 border-black">
                <th
                  className="text-left py-3 px-3 border-r border-black"
                  style={{ width: "80px" }}
                >
                  QTY
                </th>
                <th className="text-left py-3 px-3 border-r border-black">
                  DESCRIPTION
                </th>
                <th
                  className="text-right py-3 px-3 border-r border-black"
                  style={{ width: "150px" }}
                >
                  UNIT PRICE
                </th>
                <th className="text-right py-3 px-3" style={{ width: "150px" }}>
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={`${item.name}-${item.quantity}-${item.unitPrice}`} className="border-b border-black">
                  <td className="py-3 px-3 border-r border-black">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 border-r border-black">
                    {item.name}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-black">
                    {currency} {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {currency} {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="text-sm" style={{ width: "300px" }}>
              <div className="flex justify-between py-2">
                <span>Subtotal</span>
                <span>
                  {currency} {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              {invoice.totalDiscount && invoice.totalDiscount > 0 && (
                <div className="flex justify-between py-2">
                  <span>Discount</span>
                  <span>
                    - {currency} {invoice.totalDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between py-2">
                  <span>Tax ({taxRate}%)</span>
                  <span>
                    {currency} {invoice.totalTax.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b-2 border-black">
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-end mb-12">
            <div
              className="border-4 border-black px-6 py-4 text-2xl font-bold flex justify-between"
              style={{ width: "400px" }}
            >
              <span>TOTAL</span>
              <span>
                {currency}.{invoice.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Signature */}
          <div className="flex justify-end mr-30 mb-12">
            <Image src="/seal.png" alt="Seal" width={160} height={160} className="rotate-[15deg] opacity-80" />
          </div>

          {/* Footer */}
          <div className="text-sm leading-relaxed">
            <p>Thank you for your business!</p>
            <p className="text-gray-600 mt-4">
              For any queries, contact us at {outlet.contact?.phone || "N/A"} or{" "}
              {outlet.contact?.email || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section,
          #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          /* Removes browser default scrollbars when printing */
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}