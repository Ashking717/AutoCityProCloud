// app/autocityPro/purchases/[id]/page.tsx - WITH TIME-BASED LIGHT/DARK THEME
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ArrowLeft, Download, DollarSign, Calendar, Package, CreditCard,
  Users, FileText, CheckCircle, AlertCircle, XCircle, Clock,
  ChevronRight, Receipt, History, X, Sun, Moon,
} from "lucide-react";
import toast from "react-hot-toast";

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

interface User { id: string; firstName: string; lastName: string; email: string; role: string; }
interface Purchase {
  _id: string; purchaseNumber: string; purchaseDate: string;
  supplierId: any; supplierName: string; items: any[];
  subtotal: number; taxAmount: number; grandTotal: number;
  amountPaid: number; balanceDue: number; paymentMethod: string;
  status: string; notes?: string; createdBy?: any; createdAt: string;
}
interface Payment {
  _id: string; voucherNumber: string; date: string; totalCredit: number;
  narration: string; metadata?: { paymentMethod: string; referenceNumber?: string; };
  createdBy?: any;
}

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params.id as string;
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<User | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "", paymentMethod: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "", notes: "",
  });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:           isDark ? '#050505'                                                    : '#f3f4f6',
    // Header
    headerBg:         isDark ? 'linear-gradient(135deg,#932222,#411010,#a20c0c)'           : 'linear-gradient(135deg,#fef2f2,#fee2e2,#fecaca)',
    headerBorder:     isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.08)',
    headerTitle:      isDark ? '#ffffff'                                                    : '#7f1d1d',
    headerSub:        isDark ? 'rgba(255,255,255,0.60)'                                    : '#991b1b',
    headerBackText:   isDark ? 'rgba(255,255,255,0.80)'                                    : '#991b1b',
    headerBtnBg:      isDark ? 'rgba(10,10,10,0.50)'                                       : 'rgba(255,255,255,0.60)',
    headerBtnBorder:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(127,29,29,0.20)',
    headerBtnText:    isDark ? '#ffffff'                                                    : '#7f1d1d',
    // Cards
    cardBg:           isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    // Inner items
    itemBg:           isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.04)',
    itemBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    // Text
    textPrimary:      isDark ? '#ffffff'                                                    : '#111827',
    textSecondary:    isDark ? '#9ca3af'                                                    : '#6b7280',
    textMuted:        isDark ? '#6b7280'                                                    : '#9ca3af',
    // Table
    tableHeadBorder:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    tableHeadText:    isDark ? '#9ca3af'                                                    : '#6b7280',
    tableRowDivider:  isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    tableRowHover:    isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.02)',
    // Summary dividers
    summaryDivider:   isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.06)',
    summaryTopBorder: isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.10)',
    // Inputs
    inputBg:          isDark ? 'rgba(255,255,255,0.05)'                                    : '#ffffff',
    inputBorder:      isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.12)',
    inputText:        isDark ? '#ffffff'                                                    : '#111827',
    inputPH:          isDark ? '#6b7280'                                                    : '#9ca3af',
    // Modals
    modalOverlay:     isDark ? 'rgba(0,0,0,0.80)'                                          : 'rgba(0,0,0,0.50)',
    modalBg:          isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    modalBorder:      isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    modalTitle:       isDark ? '#ffffff'                                                    : '#111827',
    modalCloseBg:     isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    modalCloseText:   isDark ? '#9ca3af'                                                    : '#6b7280',
    // Payment method pill
    pillBg:           isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    pillBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.10)',
    // Loading / not found screens
    loadingText:      isDark ? '#ffffff'                                                    : '#111827',
    emptyIcon:        isDark ? '#4b5563'                                                    : '#d1d5db',
  };

  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };
  const inputClass = "focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50";

  useEffect(() => { fetchUser(); fetchPurchase(); fetchPayments(); }, [purchaseId]);

  const fetchUser = async () => {
    try { const r = await fetch("/api/auth/me", { credentials: "include" }); if (r.ok) setUser((await r.json()).user); } catch {}
  };

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/purchases/${purchaseId}`, { credentials: "include" });
      if (r.ok) setPurchase((await r.json()).purchase);
      else { toast.error((await r.json()).error || "Failed to fetch purchase"); router.push("/autocityPro/purchases"); }
    } catch { toast.error("Failed to fetch purchase details"); router.push("/autocityPro/purchases"); }
    finally { setLoading(false); }
  };

  const fetchPayments = async () => {
    try {
      const r = await fetch(`/api/purchases/${purchaseId}/payments`, { credentials: "include" });
      if (r.ok) setPayments((await r.json()).payments || []);
    } catch {}
  };

  const handlePayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) { toast.error("Please enter a valid payment amount"); return; }
    if (Number(paymentForm.amount) > (purchase?.balanceDue || 0)) { toast.error("Payment amount exceeds outstanding balance"); return; }
    setPaymentLoading(true);
    try {
      const r = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ amount: Number(paymentForm.amount), paymentMethod: paymentForm.paymentMethod, paymentDate: paymentForm.paymentDate, referenceNumber: paymentForm.referenceNumber, notes: paymentForm.notes }),
      });
      if (r.ok) {
        toast.success((await r.json()).message || "Payment recorded successfully");
        setShowPaymentModal(false);
        setPaymentForm({ amount: "", paymentMethod: "CASH", paymentDate: new Date().toISOString().split("T")[0], referenceNumber: "", notes: "" });
        fetchPurchase(); fetchPayments();
      } else toast.error((await r.json()).error || "Failed to record payment");
    } catch { toast.error("Failed to record payment"); }
    finally { setPaymentLoading(false); }
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/autocityPro/login"; };
  const formatCurrency = (n: number) => new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED": case "PAID":
        return isDark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-700 border-green-200";
      case "DRAFT":
        return isDark ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "CANCELLED":
        return isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-700 border-red-200";
      default:
        return isDark ? "bg-gray-500/10 text-gray-400 border-gray-500/20" : "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED": case "PAID": return <CheckCircle className="h-4 w-4" />;
      case "DRAFT":     return <Clock className="h-4 w-4" />;
      case "CANCELLED": return <XCircle className="h-4 w-4" />;
      default:          return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-[#E84545] mx-auto" style={{ borderColor: `${th.summaryDivider} ${th.summaryDivider} ${th.summaryDivider} #E84545` }} />
            <p className="mt-4 text-lg font-medium" style={{ color: th.loadingText }}>Loading purchase details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!purchase) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium" style={{ color: th.textPrimary }}>Purchase not found</p>
            <button onClick={() => router.push("/autocityPro/purchases")}
              className="mt-4 px-6 py-2 bg-[#E84545] text-white rounded-xl hover:opacity-90 transition-all">
              Back to Purchases
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Header */}
        <div className="py-8 border-b shadow-xl transition-colors duration-500"
          style={{ background: th.headerBg, borderColor: th.headerBorder }}>
          <div className="px-4 md:px-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => router.back()}
                className="flex items-center gap-2 transition-all hover:opacity-80"
                style={{ color: th.headerBackText }}>
                <ArrowLeft className="h-5 w-5" /><span className="font-medium">Back to Purchases</span>
              </button>
              <div className="flex items-center gap-3">
                {/* Sun/Moon indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm border"
                  style={{ background: th.headerBtnBg, borderColor: th.headerBtnBorder }}>
                  {isDark ? <Moon className="h-3.5 w-3.5 text-[#E84545]" /> : <Sun className="h-3.5 w-3.5 text-[#E84545]" />}
                </div>
                {purchase.balanceDue > 0 && (
                  <button onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg">
                    <DollarSign className="h-5 w-5" /><span className="hidden md:inline">Record Payment</span>
                  </button>
                )}
                <button onClick={() => toast.success("Downloading invoice...")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all backdrop-blur-sm border hover:border-[#E84545]/30"
                  style={{ background: th.headerBtnBg, borderColor: th.headerBtnBorder, color: th.headerBtnText }}>
                  <Download className="h-5 w-5" /><span className="hidden md:inline">Download</span>
                </button>
              </div>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: th.headerTitle }}>{purchase.purchaseNumber}</h1>
                <p style={{ color: th.headerSub }}>
                  {new Date(purchase.purchaseDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(purchase.status)}`}>
                {getStatusIcon(purchase.status)}{purchase.status}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Supplier */}
              <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <Users className="h-5 w-5 mr-2 text-[#E84545]" />Supplier Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm" style={{ color: th.textSecondary }}>Supplier Name</p>
                    <p className="font-semibold text-lg" style={{ color: th.textPrimary }}>{purchase.supplierName}</p>
                  </div>
                  {purchase.supplierId?.phone && (
                    <div>
                      <p className="text-sm" style={{ color: th.textSecondary }}>Phone</p>
                      <p style={{ color: th.textPrimary }}>{purchase.supplierId.phone}</p>
                    </div>
                  )}
                  {purchase.supplierId?.email && (
                    <div>
                      <p className="text-sm" style={{ color: th.textSecondary }}>Email</p>
                      <p style={{ color: th.textPrimary }}>{purchase.supplierId.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <Package className="h-5 w-5 mr-2 text-[#E84545]" />Purchase Items ({purchase.items.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ borderBottom: `1px solid ${th.tableHeadBorder}` }}>
                      <tr>
                        {['Item', 'Qty', 'Unit Price', 'Tax', 'Total'].map((h, i) => (
                          <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase ${i === 0 ? 'text-left' : i === 1 ? 'text-center' : 'text-right'}`}
                            style={{ color: th.tableHeadText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.items.map((item: any, index: number) => (
                        <tr key={index} style={{ borderTop: `1px solid ${th.tableRowDivider}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-4">
                            <p className="font-medium" style={{ color: th.textPrimary }}>{item.name}</p>
                            <p className="text-sm" style={{ color: th.textSecondary }}>SKU: {item.sku}</p>
                          </td>
                          <td className="px-4 py-4 text-center" style={{ color: th.textPrimary }}>{item.quantity} {item.unit}</td>
                          <td className="px-4 py-4 text-right" style={{ color: th.textPrimary }}>{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-4 text-right" style={{ color: th.textSecondary }}>
                            {Number(item.taxRate) > 0 && Number(item.taxAmount) > 0
                              ? `${formatCurrency(Number(item.taxAmount))} (${Number(item.taxRate)}%)`
                              : "-"}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold" style={{ color: th.textPrimary }}>{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History */}
              {payments.length > 0 && (
                <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center" style={{ color: th.textPrimary }}>
                      <History className="h-5 w-5 mr-2 text-[#E84545]" />Payment History ({payments.length})
                    </h2>
                    {payments.length > 3 && (
                      <button onClick={() => setShowPaymentHistory(true)}
                        className="text-[#E84545] hover:text-[#cc3c3c] text-sm font-medium flex items-center gap-1 transition-colors">
                        View All<ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {payments.slice(0, 3).map(payment => (
                      <div key={payment._id} className="p-4 rounded-xl border transition-colors" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Receipt className="h-4 w-4 text-green-400" />
                              <p className="font-semibold" style={{ color: th.textPrimary }}>{payment.voucherNumber}</p>
                            </div>
                            <p className="text-sm" style={{ color: th.textSecondary }}>
                              {new Date(payment.date).toLocaleDateString()} • {payment.metadata?.paymentMethod?.replace("_", " ")}
                              {payment.metadata?.referenceNumber && ` • Ref: ${payment.metadata.referenceNumber}`}
                            </p>
                          </div>
                          <p className="text-green-400 font-bold text-lg">{formatCurrency(payment.totalCredit)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {purchase.notes && (
                <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <h2 className="text-lg font-bold mb-3 flex items-center" style={{ color: th.textPrimary }}>
                    <FileText className="h-5 w-5 mr-2 text-[#E84545]" />Notes
                  </h2>
                  <p style={{ color: th.textSecondary }}>{purchase.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Financial Summary */}
              <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <DollarSign className="h-5 w-5 mr-2 text-[#E84545]" />Financial Summary
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Subtotal:', value: formatCurrency(purchase.subtotal) },
                    { label: 'Tax:', value: formatCurrency(Number(purchase.taxAmount || 0)) },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: th.summaryDivider }}>
                      <span style={{ color: th.textSecondary }}>{row.label}</span>
                      <span className="font-semibold" style={{ color: th.textPrimary }}>{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 border-t" style={{ borderColor: th.summaryTopBorder }}>
                    <span className="font-bold text-lg" style={{ color: th.textPrimary }}>Grand Total:</span>
                    <span className="text-[#E84545] font-bold text-xl">{formatCurrency(purchase.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t pt-4" style={{ borderColor: th.summaryDivider }}>
                    <span style={{ color: th.textSecondary }}>Amount Paid:</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(purchase.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-semibold" style={{ color: th.textPrimary }}>Balance Due:</span>
                    <span className={`font-bold text-lg ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {formatCurrency(purchase.balanceDue)}
                    </span>
                  </div>
                  {purchase.balanceDue > 0 && (
                    <button onClick={() => setShowPaymentModal(true)}
                      className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                      <DollarSign className="h-5 w-5" />Record Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <CreditCard className="h-5 w-5 mr-2 text-[#E84545]" />Payment Method
                </h2>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
                  style={{ background: th.pillBg, borderColor: th.pillBorder }}>
                  <CreditCard className="h-4 w-4" style={{ color: th.textSecondary }} />
                  <span className="font-medium" style={{ color: th.textPrimary }}>{purchase.paymentMethod?.replace("_", " ")}</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <Calendar className="h-5 w-5 mr-2 text-[#E84545]" />Details
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p style={{ color: th.textSecondary }}>Created By</p>
                    <p style={{ color: th.textPrimary }}>{purchase.createdBy?.name || purchase.createdBy?.username || "System"}</p>
                  </div>
                  <div>
                    <p style={{ color: th.textSecondary }}>Created At</p>
                    <p style={{ color: th.textPrimary }}>{new Date(purchase.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ background: th.modalOverlay }}>
            <div className="rounded-2xl shadow-2xl max-w-md w-full border transition-colors duration-500" style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: th.summaryDivider }}>
                <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>Record Payment</h2>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                {/* Outstanding Balance */}
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <p className="text-orange-400 text-sm mb-1">Outstanding Balance</p>
                  <p className="font-bold text-2xl" style={{ color: th.textPrimary }}>{formatCurrency(purchase.balanceDue)}</p>
                </div>
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>
                    Payment Amount <span className="text-[#E84545]">*</span>
                  </label>
                  <input type="number" value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00" max={purchase.balanceDue} step="0.01"
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle} />
                  <button onClick={() => setPaymentForm({ ...paymentForm, amount: purchase.balanceDue.toString() })}
                    className="mt-2 text-[#E84545] text-sm hover:text-[#cc3c3c] transition-colors">
                    Pay full amount
                  </button>
                </div>
                {/* Method */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>
                    Payment Method <span className="text-[#E84545]">*</span>
                  </label>
                  <select value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>Payment Date</label>
                  <input type="date" value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle} />
                </div>
                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>Reference Number (Optional)</label>
                  <input type="text" value={paymentForm.referenceNumber}
                    onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    placeholder="Check #, Transaction ID, etc."
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`}
                    style={{ ...inputStyle, '::placeholder': { color: th.inputPH } } as any} />
                </div>
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>Notes (Optional)</label>
                  <textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={3} placeholder="Additional notes..."
                    className={`w-full px-4 py-3 rounded-xl resize-none ${inputClass}`} style={inputStyle} />
                </div>
                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-3 rounded-xl font-medium transition-all border"
                    style={{ borderColor: th.modalBorder, color: th.textSecondary }}>Cancel</button>
                  <button onClick={handlePayment} disabled={paymentLoading}
                    className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2">
                    {paymentLoading
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />Processing...</>
                      : <><CheckCircle className="h-4 w-4" />Record Payment</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentHistory && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ background: th.modalOverlay }}>
            <div className="rounded-2xl shadow-2xl max-w-2xl w-full border max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-500"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: th.summaryDivider }}>
                <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>Payment History</h2>
                <button onClick={() => setShowPaymentHistory(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-3 overflow-y-auto">
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                    <p style={{ color: th.textSecondary }}>No payments recorded yet</p>
                  </div>
                ) : (
                  payments.map(payment => (
                    <div key={payment._id} className="p-4 rounded-xl border transition-colors" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Receipt className="h-4 w-4 text-green-400" />
                            <p className="font-semibold" style={{ color: th.textPrimary }}>{payment.voucherNumber}</p>
                          </div>
                          <p className="text-sm" style={{ color: th.textSecondary }}>{new Date(payment.date).toLocaleString()}</p>
                        </div>
                        <p className="text-green-400 font-bold text-lg">{formatCurrency(payment.totalCredit)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: th.summaryDivider }}>
                        <div>
                          <p className="text-xs mb-1" style={{ color: th.textMuted }}>Method</p>
                          <p className="text-sm" style={{ color: th.textPrimary }}>{payment.metadata?.paymentMethod?.replace("_", " ")}</p>
                        </div>
                        {payment.metadata?.referenceNumber && (
                          <div>
                            <p className="text-xs mb-1" style={{ color: th.textMuted }}>Reference</p>
                            <p className="text-sm" style={{ color: th.textPrimary }}>{payment.metadata.referenceNumber}</p>
                          </div>
                        )}
                      </div>
                      {payment.narration && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: th.summaryDivider }}>
                          <p className="text-sm" style={{ color: th.textSecondary }}>{payment.narration}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}