// app/autocityPro/purchases/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Package,
  CreditCard,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ChevronRight,
  Plus,
  Receipt,
  History,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: any;
  supplierName: string;
  items: any[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  createdBy?: any;
  createdAt: string;
}

interface Payment {
  _id: string;
  voucherNumber: string;
  date: string;
  totalCredit: number;
  narration: string;
  metadata?: {
    paymentMethod: string;
    referenceNumber?: string;
  };
  createdBy?: any;
}

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    fetchUser();
    fetchPurchase();
    fetchPayments();
  }, [purchaseId]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    }
  };

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      
      // FIXED: Use the [id] route directly
      const res = await fetch(`/api/purchases/${purchaseId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setPurchase(data.purchase);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to fetch purchase details");
        router.push("/autocityPro/purchases");
      }
    } catch (error) {
      console.error("Failed to fetch purchase:", error);
      toast.error("Failed to fetch purchase details");
      router.push("/autocityPro/purchases");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments");
    }
  };

  const handlePayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (Number(paymentForm.amount) > (purchase?.balanceDue || 0)) {
      toast.error("Payment amount exceeds outstanding balance");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          paymentDate: paymentForm.paymentDate,
          referenceNumber: paymentForm.referenceNumber,
          notes: paymentForm.notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Payment recorded successfully");
        setShowPaymentModal(false);
        setPaymentForm({
          amount: "",
          paymentMethod: "CASH",
          paymentDate: new Date().toISOString().split("T")[0],
          referenceNumber: "",
          notes: "",
        });
        fetchPurchase();
        fetchPayments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/autocityPro/login";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "PAID":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "DRAFT":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "CANCELLED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "PAID":
        return <CheckCircle className="h-4 w-4" />;
      case "DRAFT":
        return <Clock className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center bg-[#050505]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/10 border-t-[#E84545] mx-auto"></div>
            <p className="mt-4 text-white text-lg font-medium">
              Loading purchase details...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!purchase) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center bg-[#050505]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Purchase not found</p>
            <button
              onClick={() => router.push("/autocityPro/purchases")}
              className="mt-4 px-6 py-2 bg-[#E84545] text-white rounded-xl hover:opacity-90"
            >
              Back to Purchases
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Header */}
        <div className="py-8 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-4 md:px-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back to Purchases</span>
              </button>

              <div className="flex items-center gap-3">
                {purchase.balanceDue > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="hidden md:inline">Record Payment</span>
                  </button>
                )}
                <button
                  onClick={() => toast.success("Downloading invoice...")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A]/50 border border-white/10 text-white rounded-xl font-semibold hover:bg-[#0A0A0A] hover:border-[#E84545]/30 transition-all backdrop-blur-sm"
                >
                  <Download className="h-5 w-5" />
                  <span className="hidden md:inline">Download</span>
                </button>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {purchase.purchaseNumber}
                </h1>
                <p className="text-white/60">
                  {new Date(purchase.purchaseDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(
                    purchase.status
                  )}`}
                >
                  {getStatusIcon(purchase.status)}
                  {purchase.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - FIXED WIDTH */}
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Purchase Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Supplier Information */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[#E84545]" />
                  Supplier Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Supplier Name</p>
                    <p className="text-white font-semibold text-lg">
                      {purchase.supplierName}
                    </p>
                  </div>
                  {purchase.supplierId?.phone && (
                    <div>
                      <p className="text-gray-400 text-sm">Phone</p>
                      <p className="text-white">{purchase.supplierId.phone}</p>
                    </div>
                  )}
                  {purchase.supplierId?.email && (
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white">{purchase.supplierId.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-[#E84545]" />
                  Purchase Items ({purchase.items.length})
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                          Tax
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {purchase.items.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-white/5">
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-white font-medium">
                                {item.name}
                              </p>
                              <p className="text-gray-400 text-sm">
                                SKU: {item.sku}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-white">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-4 text-right text-white">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-400">
                            {item.taxRate > 0
                              ? `${formatCurrency(item.taxAmount)} (${item.taxRate}%)`
                              : "-"}
                          </td>
                          <td className="px-4 py-4 text-right text-white font-semibold">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History */}
              {payments.length > 0 && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center">
                      <History className="h-5 w-5 mr-2 text-[#E84545]" />
                      Payment History ({payments.length})
                    </h2>
                    {payments.length > 3 && (
                      <button
                        onClick={() => setShowPaymentHistory(true)}
                        className="text-[#E84545] hover:text-[#cc3c3c] text-sm font-medium flex items-center gap-1"
                      >
                        View All
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {payments.slice(0, 3).map((payment) => (
                      <div
                        key={payment._id}
                        className="p-4 bg-white/5 rounded-xl border border-white/10"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Receipt className="h-4 w-4 text-green-400" />
                              <p className="text-white font-semibold">
                                {payment.voucherNumber}
                              </p>
                            </div>
                            <p className="text-gray-400 text-sm">
                              {new Date(payment.date).toLocaleDateString()} •{" "}
                              {payment.metadata?.paymentMethod?.replace("_", " ")}
                              {payment.metadata?.referenceNumber &&
                                ` • Ref: ${payment.metadata.referenceNumber}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-lg">
                              {formatCurrency(payment.totalCredit)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {purchase.notes && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                  <h2 className="text-lg font-bold text-white mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-[#E84545]" />
                    Notes
                  </h2>
                  <p className="text-gray-300">{purchase.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-[#E84545]" />
                  Financial Summary
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(purchase.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">Tax:</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(purchase.taxAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-t border-white/10">
                    <span className="text-white font-bold text-lg">
                      Grand Total:
                    </span>
                    <span className="text-[#E84545] font-bold text-xl">
                      {formatCurrency(purchase.grandTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-white/5 pt-4">
                    <span className="text-gray-400">Amount Paid:</span>
                    <span className="text-green-400 font-semibold">
                      {formatCurrency(purchase.amountPaid)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-white font-semibold">
                      Balance Due:
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        purchase.balanceDue > 0
                          ? "text-orange-400"
                          : "text-green-400"
                      }`}
                    >
                      {formatCurrency(purchase.balanceDue)}
                    </span>
                  </div>

                  {purchase.balanceDue > 0 && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <DollarSign className="h-5 w-5" />
                      Record Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-[#E84545]" />
                  Payment Method
                </h2>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-white font-medium">
                    {purchase.paymentMethod?.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-[#E84545]" />
                  Details
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-400">Created By</p>
                    <p className="text-white">
                      {purchase.createdBy?.name ||
                        purchase.createdBy?.username ||
                        "System"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Created At</p>
                    <p className="text-white">
                      {new Date(purchase.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Record Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Outstanding Balance */}
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <p className="text-orange-400 text-sm mb-1">
                    Outstanding Balance
                  </p>
                  <p className="text-white font-bold text-2xl">
                    {formatCurrency(purchase.balanceDue)}
                  </p>
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Payment Amount <span className="text-[#E84545]">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    placeholder="0.00"
                    max={purchase.balanceDue}
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  />
                  <button
                    onClick={() =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: purchase.balanceDue.toString(),
                      })
                    }
                    className="mt-2 text-[#E84545] text-sm hover:text-[#cc3c3c]"
                  >
                    Pay full amount
                  </button>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Payment Method <span className="text-[#E84545]">*</span>
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        paymentMethod: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        paymentDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        referenceNumber: e.target.value,
                      })
                    }
                    placeholder="Check #, Transaction ID, etc."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {paymentLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Record Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentHistory && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">
                  Payment History
                </h2>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-3 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment._id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Receipt className="h-4 w-4 text-green-400" />
                          <p className="text-white font-semibold">
                            {payment.voucherNumber}
                          </p>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {new Date(payment.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-lg">
                          {formatCurrency(payment.totalCredit)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Method</p>
                        <p className="text-white text-sm">
                          {payment.metadata?.paymentMethod?.replace("_", " ")}
                        </p>
                      </div>
                      {payment.metadata?.referenceNumber && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">
                            Reference
                          </p>
                          <p className="text-white text-sm">
                            {payment.metadata.referenceNumber}
                          </p>
                        </div>
                      )}
                    </div>

                    {payment.narration && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-gray-400 text-sm">
                          {payment.narration}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {payments.length === 0 && (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No payments recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}