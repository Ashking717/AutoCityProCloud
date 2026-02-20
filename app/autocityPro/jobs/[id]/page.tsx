"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ChevronLeft, Edit, Trash2, User, Car, Calendar, FileText,
  Wrench, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight,
  Package, UserCog, RefreshCw, Sun, Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import VoiceNoteRecorder, { type VoiceNoteEntry } from "@/components/ui/Voicenoterecorder";

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

interface IJob {
  _id: string; jobNumber: string; customerId: any; customerName: string;
  vehicleRegistrationNumber?: string; vehicleMake?: string; vehicleModel?: string;
  vehicleYear?: number; vehicleColor?: string; vehicleVIN?: string; vehicleMileage?: number;
  title: string; description?: string; items: any[]; status: string; priority: string;
  assignedTo?: any; estimatedStartDate?: string; estimatedCompletionDate?: string;
  actualStartDate?: string; actualCompletionDate?: string; internalNotes?: string;
  customerNotes?: string; voiceNotes: VoiceNoteEntry[];
  convertedToSale: boolean; saleId?: string; saleInvoiceNumber?: string;
  createdAt: string; updatedAt: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:            isDark ? "#050505"                                               : "#f3f4f6",
    // Desktop header
    headerBgFrom:      isDark ? "#932222"                                               : "#fef2f2",
    headerBgVia:       isDark ? "#411010"                                               : "#fee2e2",
    headerBgTo:        isDark ? "#a20c0c"                                               : "#fecaca",
    headerBorder:      isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    headerTitle:       isDark ? "#ffffff"                                               : "#7f1d1d",
    headerSub:         isDark ? "rgba(255,255,255,0.80)"                                : "#991b1b",
    headerBtnBg:       isDark ? "rgba(255,255,255,0.10)"                                : "rgba(127,29,29,0.10)",
    headerBtnText:     isDark ? "#ffffff"                                               : "#7f1d1d",
    headerBtnHover:    isDark ? "rgba(255,255,255,0.20)"                                : "rgba(127,29,29,0.20)",
    headerDeleteBg:    isDark ? "rgba(239,68,68,0.20)"                                  : "rgba(239,68,68,0.10)",
    headerDeleteText:  isDark ? "#fca5a5"                                               : "#dc2626",
    // Mobile header
    mobileHeaderBg:    isDark ? "linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)"      : "linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)",
    mobileHeaderBorder:isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    mobileHeaderTitle: isDark ? "#ffffff"                                               : "#111827",
    mobileHeaderSub:   isDark ? "rgba(255,255,255,0.60)"                                : "#6b7280",
    mobileBtnBg:       isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.05)",
    mobileBtnText:     isDark ? "rgba(255,255,255,0.80)"                                : "#374151",
    // Cards / panels
    cardBg:            isDark ? "#0A0A0A"                                               : "#ffffff",
    cardBorder:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    cardTitle:         isDark ? "#ffffff"                                               : "#111827",
    cardSubtext:       isDark ? "#9ca3af"                                               : "#6b7280",
    cardMuted:         isDark ? "#6b7280"                                               : "#9ca3af",
    innerBg:           isDark ? "#111111"                                               : "#f3f4f6",
    innerBorder:       isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    innerText:         isDark ? "#ffffff"                                               : "#111827",
    innerMuted:        isDark ? "#9ca3af"                                               : "#6b7280",
    // Status change buttons
    statusBtnBg:       isDark ? "#111111"                                               : "#f3f4f6",
    statusBtnBorder:   isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    statusBtnText:     isDark ? "#ffffff"                                               : "#111827",
    // Blue staff card
    staffBg:           isDark ? "rgba(59,130,246,0.10)"                                 : "rgba(59,130,246,0.06)",
    staffBorder:       isDark ? "rgba(59,130,246,0.20)"                                 : "rgba(59,130,246,0.15)",
    staffText:         isDark ? "#93c5fd"                                               : "#1d4ed8",
    staffSubText:      isDark ? "#60a5fa"                                               : "#3b82f6",
    // Green converted banner
    convertedBg:       isDark ? "rgba(34,197,94,0.10)"                                  : "rgba(34,197,94,0.06)",
    convertedBorder:   isDark ? "rgba(34,197,94,0.30)"                                  : "rgba(34,197,94,0.20)",
    convertedText:     isDark ? "#86efac"                                               : "#15803d",
    // Item cards
    itemBg:            isDark ? "#111111"                                               : "#f9fafb",
    itemBorder:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    itemTitle:         isDark ? "#ffffff"                                               : "#111827",
    itemMuted:         isDark ? "#9ca3af"                                               : "#6b7280",
  };

  useEffect(() => { fetchUser(); if (jobId) fetchJob(); }, [jobId]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setUser(data.user); }
    } catch {}
  };

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setJob(data.job); }
      else { toast.error("Job not found"); router.push("/autocityPro/jobs"); }
    } catch { toast.error("Failed to load job"); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { toast.success(`Status updated to ${newStatus}`); fetchJob(); }
      else { const error = await res.json(); toast.error(error.error || "Failed to update status"); }
    } catch { toast.error("Failed to update status"); }
    finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Job cancelled"); router.push("/autocityPro/jobs"); }
      else { const error = await res.json(); toast.error(error.error || "Failed to cancel job"); }
    } catch { toast.error("Failed to cancel job"); }
    finally { setUpdating(false); }
  };

  const handleConvertToSale = () => { if (job) router.push(`/autocityPro/sales/new?jobId=${job._id}`); };

  const getStatusBadge = (status: string) => {
    if (isDark) {
      switch (status) {
        case "DRAFT":       return "bg-gray-500/20 text-gray-300 border-gray-500/30";
        case "PENDING":     return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
        case "IN_PROGRESS": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
        case "COMPLETED":   return "bg-green-500/20 text-green-300 border-green-500/30";
        case "CANCELLED":   return "bg-red-500/20 text-red-300 border-red-500/30";
        default:            return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      }
    } else {
      switch (status) {
        case "DRAFT":       return "bg-gray-100 text-gray-600 border-gray-200";
        case "PENDING":     return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "IN_PROGRESS": return "bg-blue-50 text-blue-700 border-blue-200";
        case "COMPLETED":   return "bg-green-50 text-green-700 border-green-200";
        case "CANCELLED":   return "bg-red-50 text-red-600 border-red-200";
        default:            return "bg-gray-100 text-gray-600 border-gray-200";
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (isDark) {
      switch (priority) {
        case "LOW":    return "bg-gray-500/20 text-gray-300";
        case "MEDIUM": return "bg-blue-500/20 text-blue-300";
        case "HIGH":   return "bg-orange-500/20 text-orange-300";
        case "URGENT": return "bg-red-500/20 text-red-300";
        default:       return "bg-gray-500/20 text-gray-300";
      }
    } else {
      switch (priority) {
        case "LOW":    return "bg-gray-100 text-gray-600";
        case "MEDIUM": return "bg-blue-50 text-blue-700";
        case "HIGH":   return "bg-orange-50 text-orange-700";
        case "URGENT": return "bg-red-50 text-red-600";
        default:       return "bg-gray-100 text-gray-600";
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DRAFT":       return <FileText className="h-4 w-4" />;
      case "PENDING":     return <Clock className="h-4 w-4" />;
      case "IN_PROGRESS": return <RefreshCw className="h-4 w-4" />;
      case "COMPLETED":   return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":   return <XCircle className="h-4 w-4" />;
      default:            return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getNextStatuses = (s: string) => {
    switch (s) {
      case "DRAFT":       return ["PENDING"];
      case "PENDING":     return ["IN_PROGRESS", "DRAFT"];
      case "IN_PROGRESS": return ["COMPLETED", "PENDING"];
      default:            return [];
    }
  };

  const normalisedVoiceNotes: VoiceNoteEntry[] = (job?.voiceNotes ?? []).map((v: any) =>
    typeof v === "string"
      ? { url: v, recordedByName: "Unknown", recordedAt: new Date().toISOString() }
      : { url: v.url, recordedByName: v.recordedByName ?? "Unknown", recordedAt: typeof v.recordedAt === "string" ? v.recordedAt : new Date(v.recordedAt).toISOString() }
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  if (loading) return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="flex items-center justify-center min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-[#E84545] animate-spin mx-auto mb-3" />
          <p style={{ color: th.cardSubtext }}>Loading job...</p>
        </div>
      </div>
    </MainLayout>
  );

  if (!job) return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="flex items-center justify-center min-h-screen" style={{ background: th.pageBg }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg" style={{ color: th.cardTitle }}>Job not found</p>
        </div>
      </div>
    </MainLayout>
  );

  const nextStatuses = getNextStatuses(job.status);

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: th.mobileHeaderTitle }}>{job.jobNumber}</h1>
                  <p className="text-xs truncate max-w-[180px]" style={{ color: th.mobileHeaderSub }}>{job.title}</p>
                </div>
              </div>
              {job.status !== "CANCELLED" && !job.convertedToSale && (
                <button
                  onClick={() => router.push(`/autocityPro/jobs/${jobId}/edit`)}
                  className="p-2 rounded-xl active:scale-95 transition-all text-white"
                  style={{ background: "#E84545" }}>
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 rounded-lg transition-all"
                  style={{ background: th.headerBtnBg, color: th.headerBtnText }}
                  onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>{job.jobNumber}</h1>
                    
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>{job.title}</p>
                </div>
              </div>
              <div className="flex gap-3">
                {job.status !== "CANCELLED" && !job.convertedToSale && (
                  <>
                    <button onClick={() => router.push(`/autocityPro/jobs/${jobId}/edit`)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                      style={{ background: th.headerBtnBg, color: th.headerBtnText }}
                      onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                      <Edit className="h-4 w-4" />Edit Job
                    </button>
                    <button onClick={handleDelete} disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                      style={{ background: th.headerDeleteBg, color: th.headerDeleteText }}>
                      <Trash2 className="h-4 w-4" />Cancel Job
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-6 pt-[100px] md:pt-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status & Actions */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2 ${getStatusBadge(job.status)}`}>
                    {getStatusIcon(job.status)}{job.status}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getPriorityBadge(job.priority)}`}>
                    {job.priority}
                  </span>
                  {job.convertedToSale && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2"
                      style={{ background: th.convertedBg, borderColor: th.convertedBorder, color: th.convertedText }}>
                      <CheckCircle className="h-4 w-4" />Converted to Sale
                    </span>
                  )}
                </div>
                {nextStatuses.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm mb-2" style={{ color: th.cardSubtext }}>Change Status:</p>
                    <div className="flex flex-wrap gap-2">
                      {nextStatuses.map(s => (
                        <button key={s} onClick={() => handleStatusChange(s)} disabled={updating}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50 active:scale-95"
                          style={{ background: th.statusBtnBg, border: `1px solid ${th.statusBtnBorder}`, color: th.statusBtnText }}>
                          {getStatusIcon(s)}{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {job.status === "COMPLETED" && !job.convertedToSale && (
                  <button onClick={handleConvertToSale}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg font-semibold">
                    <ArrowRight className="h-5 w-5" />Convert to Sale
                  </button>
                )}
                {job.convertedToSale && job.saleInvoiceNumber && (
                  <div className="p-3 rounded-lg" style={{ background: th.convertedBg, border: `1px solid ${th.convertedBorder}` }}>
                    <p className="text-sm" style={{ color: th.convertedText }}>
                      Converted to sale: <span className="font-mono font-bold">{job.saleInvoiceNumber}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {job.description && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: th.cardTitle }}>
                    <FileText className="h-5 w-5 text-[#E84545]" />Description
                  </h2>
                  <p className="whitespace-pre-wrap" style={{ color: th.cardSubtext }}>{job.description}</p>
                </div>
              )}

              {/* Items */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.cardTitle }}>
                  <Package className="h-5 w-5 text-[#E84545]" />Items ({job.items.length})
                </h2>
                <div className="space-y-3">
                  {job.items.map((item) => (
                    <div key={`${item.sku}-${item.name}`} className="rounded-lg p-3 md:p-4" style={{ background: th.itemBg, border: `1px solid ${th.itemBorder}` }}>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm md:text-base flex items-center gap-2" style={{ color: th.itemTitle }}>
                          {item.isLabor && <Wrench className="h-4 w-4 text-[#E84545]" />}
                          {item.name}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: th.itemMuted }}>SKU: {item.sku}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <p style={{ color: th.itemMuted }}>Quantity:</p>
                          <p className="font-medium" style={{ color: th.itemTitle }}>{item.quantity} {item.unit}</p>
                        </div>
                        {item.notes && (
                          <div className="col-span-2">
                            <p style={{ color: th.itemMuted }}>Notes:</p>
                            <p style={{ color: th.itemTitle }}>{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {(job.internalNotes || job.customerNotes) && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: th.cardTitle }}>Notes</h2>
                  {job.internalNotes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1" style={{ color: th.cardMuted }}>Internal Notes:</p>
                      <p className="whitespace-pre-wrap" style={{ color: th.cardSubtext }}>{job.internalNotes}</p>
                    </div>
                  )}
                  {job.customerNotes && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: th.cardMuted }}>Customer Notes:</p>
                      <p className="whitespace-pre-wrap" style={{ color: th.cardSubtext }}>{job.customerNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Voice Notes */}
              {normalisedVoiceNotes.length > 0 && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <VoiceNoteRecorder voiceNotes={normalisedVoiceNotes} onChange={() => {}} recordedByName="" readOnly
                    label={`Voice Notes (${normalisedVoiceNotes.length})`} maxNotes={10} />
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Customer */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.cardTitle }}>
                  <User className="h-5 w-5 text-[#E84545]" />Customer
                </h2>
                <div>
                  <p className="text-sm" style={{ color: th.cardMuted }}>Name:</p>
                  <p className="font-medium" style={{ color: th.cardTitle }}>{job.customerName}</p>
                </div>
              </div>

              {/* Vehicle */}
              {job.vehicleRegistrationNumber && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.cardTitle }}>
                    <Car className="h-5 w-5 text-[#E84545]" />Vehicle
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div><p style={{ color: th.cardMuted }}>Registration:</p><p className="font-mono font-bold text-[#E84545]">{job.vehicleRegistrationNumber}</p></div>
                    {job.vehicleMake && <div><p style={{ color: th.cardMuted }}>Make & Model:</p><p style={{ color: th.cardTitle }}>{job.vehicleMake} {job.vehicleModel}</p></div>}
                    {job.vehicleYear && <div><p style={{ color: th.cardMuted }}>Year:</p><p style={{ color: th.cardTitle }}>{job.vehicleYear}</p></div>}
                    {job.vehicleColor && <div><p style={{ color: th.cardMuted }}>Color:</p><p style={{ color: th.cardTitle }}>{job.vehicleColor}</p></div>}
                    {job.vehicleMileage && <div><p style={{ color: th.cardMuted }}>Mileage:</p><p style={{ color: th.cardTitle }}>{job.vehicleMileage} km</p></div>}
                  </div>
                </div>
              )}

              {/* Staff */}
              {job.assignedTo && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500"
                  style={{ background: th.cardBg, border: `1px solid ${th.staffBorder}` }}>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.cardTitle }}>
                    <UserCog className="h-5 w-5 text-blue-400" />Assigned Staff
                  </h2>
                  <div className="p-3 rounded-lg" style={{ background: th.staffBg, border: `1px solid ${th.staffBorder}` }}>
                    <p className="font-semibold" style={{ color: th.staffText }}>{job.assignedTo.firstName} {job.assignedTo.lastName}</p>
                    <p className="text-xs mt-1" style={{ color: th.staffSubText }}>{job.assignedTo.role}</p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.cardTitle }}>
                  <Calendar className="h-5 w-5 text-[#E84545]" />Dates
                </h2>
                <div className="space-y-3 text-sm">
                  <div><p style={{ color: th.cardMuted }}>Created:</p><p style={{ color: th.cardTitle }}>{new Date(job.createdAt).toLocaleString()}</p></div>
                  {job.estimatedStartDate && <div><p style={{ color: th.cardMuted }}>Estimated Start:</p><p style={{ color: th.cardTitle }}>{new Date(job.estimatedStartDate).toLocaleDateString()}</p></div>}
                  {job.estimatedCompletionDate && <div><p style={{ color: th.cardMuted }}>Estimated Completion:</p><p style={{ color: th.cardTitle }}>{new Date(job.estimatedCompletionDate).toLocaleDateString()}</p></div>}
                  {job.actualStartDate && <div><p style={{ color: th.cardMuted }}>Actual Start:</p><p style={{ color: th.convertedText }}>{new Date(job.actualStartDate).toLocaleDateString()}</p></div>}
                  {job.actualCompletionDate && <div><p style={{ color: th.cardMuted }}>Actual Completion:</p><p style={{ color: th.convertedText }}>{new Date(job.actualCompletionDate).toLocaleDateString()}</p></div>}
                  <div><p style={{ color: th.cardMuted }}>Last Updated:</p><p style={{ color: th.cardTitle }}>{new Date(job.updatedAt).toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}