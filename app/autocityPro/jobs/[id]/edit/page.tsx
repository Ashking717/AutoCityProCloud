"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search, Plus, Trash2, Wrench, X, Calendar, FileText,
  ChevronLeft, Save, UserCog, Sun, Moon,
} from "lucide-react";
import { carMakesModels, carYears, CarMake } from "@/lib/data/carData";
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

interface JobItem {
  productId?: string; productName: string; sku: string; isLabor?: boolean; unit: string;
  quantity: number; estimatedPrice: number; actualPrice?: number; discount: number;
  discountType: "percentage" | "fixed"; taxRate: number; notes?: string;
}

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [items, setItems] = useState<JobItem[]>([]);
  const [priority, setPriority] = useState<"LOW"|"MEDIUM"|"HIGH"|"URGENT">("MEDIUM");
  const [status, setStatus] = useState<"DRAFT"|"PENDING"|"IN_PROGRESS"|"COMPLETED">("DRAFT");
  const [assignedTo, setAssignedTo] = useState("");
  const [estimatedStartDate, setEstimatedStartDate] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteEntry[]>([]);
  const [isVoiceUploading, setIsVoiceUploading] = useState(false);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [laborCharge, setLaborCharge] = useState({ description: "", hours: 1, notes: "" });

  const displayName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "Unknown";
  const isAdmin = user?.role === "admin" || user?.role === "manager";

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:             isDark ? "#050505"                                               : "#f3f4f6",
    // Desktop header
    headerBgFrom:       isDark ? "#932222"                                               : "#fef2f2",
    headerBgVia:        isDark ? "#411010"                                               : "#fee2e2",
    headerBgTo:         isDark ? "#a20c0c"                                               : "#fecaca",
    headerBorder:       isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    headerTitle:        isDark ? "#ffffff"                                               : "#7f1d1d",
    headerSub:          isDark ? "rgba(255,255,255,0.80)"                                : "#991b1b",
    headerBtnBg:        isDark ? "linear-gradient(to right,#E84545,#cc3c3c)"            : "linear-gradient(to right,#E84545,#cc3c3c)",
    headerBackBg:       isDark ? "rgba(255,255,255,0.10)"                                : "rgba(127,29,29,0.10)",
    headerBackText:     isDark ? "#ffffff"                                               : "#7f1d1d",
    headerBackHover:    isDark ? "rgba(255,255,255,0.20)"                                : "rgba(127,29,29,0.20)",
    // Mobile header
    mobileHeaderBg:     isDark ? "linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)"      : "linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)",
    mobileHeaderBorder: isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    mobileHeaderTitle:  isDark ? "#ffffff"                                               : "#111827",
    mobileHeaderSub:    isDark ? "rgba(255,255,255,0.60)"                                : "#6b7280",
    mobileBtnBg:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.05)",
    mobileBtnText:      isDark ? "rgba(255,255,255,0.80)"                                : "#374151",
    mobileStatBg:       isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.04)",
    mobileStatBorder:   isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    mobileStatLabel:    isDark ? "rgba(255,255,255,0.60)"                                : "#9ca3af",
    mobileStatText:     isDark ? "#ffffff"                                               : "#111827",
    // Panels
    panelBg:            isDark ? "#0A0A0A"                                               : "#ffffff",
    panelBorder:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    panelTitle:         isDark ? "#ffffff"                                               : "#111827",
    // Inputs
    inputBg:            isDark ? "#111111"                                               : "#f9fafb",
    inputBorder:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.10)",
    inputText:          isDark ? "#ffffff"                                               : "#111827",
    inputPH:            isDark ? "#6b7280"                                               : "#9ca3af",
    // Products
    productCardBg:      isDark ? "#111111"                                               : "#f9fafb",
    productCardBorder:  isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    productCardHover:   isDark ? "rgba(232,69,69,0.50)"                                  : "rgba(232,69,69,0.40)",
    productTitle:       isDark ? "#ffffff"                                               : "#111827",
    productMuted:       isDark ? "#9ca3af"                                               : "#6b7280",
    // Items
    itemBg:             isDark ? "#111111"                                               : "#f9fafb",
    itemBorder:         isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    itemTitle:          isDark ? "#ffffff"                                               : "#111827",
    itemMuted:          isDark ? "#9ca3af"                                               : "#6b7280",
    // Priority unselected
    priorUnselBorder:   isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    priorUnselText:     isDark ? "#9ca3af"                                               : "#6b7280",
    // Staff panel
    staffPanelBorder:   isDark ? "rgba(232,69,69,0.20)"                                 : "rgba(232,69,69,0.15)",
    // Modals
    modalOverlay:       "rgba(0,0,0,0.70)",
    modalBg:            isDark ? "#0A0A0A"                                               : "#ffffff",
    modalBorder:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    modalTitle:         isDark ? "#ffffff"                                               : "#111827",
    modalCloseText:     isDark ? "#9ca3af"                                               : "#6b7280",
    modalLabel:         isDark ? "#ffffff"                                               : "#374151",
    modalCancelBorder:  isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    modalCancelText:    isDark ? "#d1d5db"                                               : "#374151",
    // Misc
    divider:            isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    emptyIcon:          isDark ? "#374151"                                               : "#d1d5db",
    emptyText:          isDark ? "#9ca3af"                                               : "#6b7280",
    subText:            isDark ? "#6b7280"                                               : "#9ca3af",
  };

  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };
  const selectStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };

  useEffect(() => { fetchUser(); fetchProducts(); fetchStaff(); if (jobId) fetchJob(); }, [jobId]);

  const fetchUser = async () => {
    try { const res = await fetch("/api/auth/me", { credentials: "include" }); if (res.ok) { const d = await res.json(); setUser(d.user); } } catch {}
  };

  const fetchJob = async () => {
    setInitialLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        const job = d.job;
        setJobTitle(job.title);
        setJobDescription(job.description || "");
        setItems(job.items.map((item: any) => ({
          productId: item.productId || undefined, productName: item.productName, sku: item.sku,
          isLabor: item.isLabor || false, unit: item.unit, quantity: item.quantity,
          estimatedPrice: item.estimatedPrice || 0, actualPrice: item.actualPrice,
          discount: item.discount || 0, discountType: item.discountType || "percentage",
          taxRate: item.taxRate || 0, notes: item.notes,
        })));
        setPriority(job.priority);
        setStatus(job.status);
        setAssignedTo(job.assignedTo?._id || "");
        setEstimatedStartDate(job.estimatedStartDate ? new Date(job.estimatedStartDate).toISOString().split("T")[0] : "");
        setEstimatedCompletionDate(job.estimatedCompletionDate ? new Date(job.estimatedCompletionDate).toISOString().split("T")[0] : "");
        setInternalNotes(job.internalNotes || "");
        setCustomerNotes(job.customerNotes || "");
        const rawNotes = job.voiceNotes ?? [];
        setVoiceNotes(rawNotes.map((v: any) =>
          typeof v === "string"
            ? { url: v, recordedByName: "Unknown", recordedAt: new Date().toISOString() }
            : { url: v.url, recordedByName: v.recordedByName, recordedAt: typeof v.recordedAt === "string" ? v.recordedAt : new Date(v.recordedAt).toISOString() }
        ));
      } else { toast.error("Job not found"); router.push("/autocityPro/jobs"); }
    } catch { toast.error("Failed to load job"); }
    finally { setInitialLoading(false); }
  };

  const fetchProducts = async () => {
    try { const res = await fetch("/api/products?limit=100", { credentials: "include" }); if (res.ok) { const d = await res.json(); setProducts(d.products || []); } } catch {}
  };
  const fetchStaff = async () => {
    try { const res = await fetch("/api/users", { credentials: "include" }); if (res.ok) { const d = await res.json(); setStaff(d.users || []); } } catch {}
  };

  const handleAddLabor = () => {
    if (!laborCharge.description) { toast.error("Labor description is required"); return; }
    setItems([...items, { productName: `Labor: ${laborCharge.description}`, sku: "LABOR", isLabor: true, unit: "hours", quantity: laborCharge.hours, estimatedPrice: 0, discount: 0, discountType: "percentage", taxRate: 0, notes: laborCharge.notes }]);
    setShowAddLabor(false); setLaborCharge({ description: "", hours: 1, notes: "" });
    toast.success("Labor charge added!");
  };

  const addToItems = (product: any) => {
    const existing = items.find(i => i.productId === product._id);
    if (existing) updateItem(items.indexOf(existing), "quantity", existing.quantity + 1);
    else setItems([...items, { productId: product._id, productName: product.name, sku: product.sku, isLabor: false, unit: product.unit || "pcs", quantity: 1, estimatedPrice: product.sellingPrice, discount: 0, discountType: "percentage", taxRate: product.taxRate || 0 }]);
    toast.success("Added to job");
  };

  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); toast.success("Removed from job"); };
  const updateItem = (index: number, field: string, value: any) => { setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item)); };

  const handleSubmit = async () => {
    if (!jobTitle.trim()) { toast.error("Please enter a job title"); return; }
    if (items.length === 0) { toast.error("Please add at least one item or labor charge"); return; }
    if (isVoiceUploading) { toast.error("Please wait — voice note is still uploading"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          title: jobTitle, description: jobDescription || undefined,
          items: items.map(item => {
            const product = products.find(p => p._id === item.productId);
            return { productId: item.productId || undefined, productName: item.productName || product?.name || (item.isLabor ? item.productName : "Unnamed Item"), sku: item.sku, quantity: item.quantity, unit: item.unit, estimatedPrice: item.estimatedPrice, discount: item.discount, discountType: item.discountType, taxRate: item.taxRate, isLabor: item.isLabor || false, notes: item.notes || undefined };
          }),
          priority, status, assignedTo: assignedTo || undefined,
          estimatedStartDate: estimatedStartDate || undefined, estimatedCompletionDate: estimatedCompletionDate || undefined,
          internalNotes: internalNotes || undefined, customerNotes: customerNotes || undefined, voiceNotes,
        }),
      });
      if (res.ok) { toast.success("Job updated successfully!"); router.push(`/autocityPro/jobs/${jobId}`); }
      else { const e = await res.json(); toast.error(e.error || "Failed to update job"); }
    } catch { toast.error("Failed to update job"); }
    finally { setLoading(false); }
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.partNumber?.toLowerCase().includes(term);
  });

  const getPriorityColor = (p: string) => {
    if (isDark) {
      switch (p) {
        case "LOW":    return "bg-gray-500/20 text-gray-300 border-gray-500/30";
        case "MEDIUM": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
        case "HIGH":   return "bg-orange-500/20 text-orange-300 border-orange-500/30";
        case "URGENT": return "bg-red-500/20 text-red-300 border-red-500/30";
        default:       return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      }
    } else {
      switch (p) {
        case "LOW":    return "bg-gray-100 text-gray-600 border-gray-200";
        case "MEDIUM": return "bg-blue-50 text-blue-700 border-blue-200";
        case "HIGH":   return "bg-orange-50 text-orange-700 border-orange-200";
        case "URGENT": return "bg-red-50 text-red-600 border-red-200";
        default:       return "bg-gray-100 text-gray-600 border-gray-200";
      }
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  if (initialLoading) return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="flex items-center justify-center min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545] mb-3" />
          <p style={{ color: th.emptyText }}>Loading job...</p>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><ChevronLeft className="h-5 w-5" /></button>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Edit Job</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{items.length} item{items.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={loading || isVoiceUploading}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold active:scale-95 transition-all shadow-lg disabled:opacity-50"
                style={{ background: th.headerBtnBg }}>
                <Save className="h-4 w-4" />Save
              </button>
            </div>
            {items.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {[{ label:"Items", value: items.length }, { label:"Priority", value: priority }].map(s => (
                  <div key={s.label} className="rounded-lg px-3 py-2" style={{ background: th.mobileStatBg, border: `1px solid ${th.mobileStatBorder}` }}>
                    <p className="text-[10px] uppercase" style={{ color: th.mobileStatLabel }}>{s.label}</p>
                    <p className="text-sm font-bold" style={{ color: th.mobileStatText }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 rounded-lg transition-all"
                  style={{ background: th.headerBackBg, color: th.headerBackText }}
                  onMouseEnter={e => (e.currentTarget.style.background = th.headerBackHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = th.headerBackBg)}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: th.headerTitle }}>
                      <Wrench className="h-7 w-7" />Edit Job
                    </h1>
                    
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>{jobTitle || "Untitled Job"}</p>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={loading || isVoiceUploading}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50"
                style={{ background: th.headerBtnBg }}>
                <Save className="h-5 w-5" />{loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-6 pt-[180px] md:pt-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Details */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.panelTitle }}>
                  <FileText className="h-5 w-5 text-[#E84545]" />Job Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Job Title *</label>
                    <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g., Oil Change & Brake Inspection"
                      className="w-full px-3 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Description (Optional)</label>
                    <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Additional details..." rows={3}
                      className="w-full px-3 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent resize-none" style={inputStyle} />
                  </div>
                  <div className="pt-4" style={{ borderTop: `1px solid ${th.divider}` }}>
                    <VoiceNoteRecorder voiceNotes={voiceNotes} onChange={setVoiceNotes} onUploadingChange={setIsVoiceUploading}
                      recordedByName={displayName} label="Voice Notes (optional)" />
                    {isVoiceUploading && (
                      <p className="text-xs text-yellow-400 flex items-center gap-1.5 mt-2">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Voice note uploading — please wait before saving…
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Search */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5" style={{ color: th.inputPH }} />
                    <input ref={searchInputRef} type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search parts by name, SKU..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent" style={inputStyle} />
                  </div>
                  <button onClick={() => setShowAddLabor(true)}
                    className="flex items-center gap-2 px-4 py-3 text-white rounded-lg transition-all shadow-lg whitespace-nowrap"
                    style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                    <Wrench className="h-5 w-5" /><span className="hidden md:inline">Add Labor</span>
                  </button>
                </div>
                {searchTerm && (
                  <div className="mt-4">
                    <p className="text-sm mb-3" style={{ color: th.productMuted }}>{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found</p>
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-8"><Search className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} /><p style={{ color: th.emptyText }}>No products found</p></div>
                      ) : filteredProducts.map(p => (
                        <div key={p._id} onClick={() => addToItems(p)} className="p-4 rounded-lg cursor-pointer transition-all"
                          style={{ background: th.productCardBg, border: `1px solid ${th.productCardBorder}` }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = th.productCardHover)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = th.productCardBorder)}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold" style={{ color: th.productTitle }}>{p.name}</h3>
                              <p className="text-xs mt-1" style={{ color: th.productMuted }}>SKU: {p.sku}{p.partNumber && ` | Part#: ${p.partNumber}`}</p>
                            </div>
                            <p className="text-xs ml-3" style={{ color: th.productMuted }}>Stock: {p.currentStock}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.panelTitle }}>
                  <Wrench className="h-5 w-5 text-[#E84545]" />Job Items ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="text-center py-8">
                      <Wrench className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                      <p style={{ color: th.emptyText }}>No items added yet</p>
                      <p className="text-sm mt-2" style={{ color: th.subText }}>Search for parts or add labor charges</p>
                    </div>
                  ) : items.map((item, index) => (
                    <div key={index} className="rounded-lg p-3 md:p-4" style={{ background: th.itemBg, border: `1px solid ${th.itemBorder}` }}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: th.itemTitle }}>
                          {item.isLabor && <Wrench className="h-4 w-4 text-[#E84545]" />}{item.productName}
                        </h3>
                        <button onClick={() => removeItem(index)} className="text-[#E84545] p-1 active:scale-95 transition-all"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <p className="text-xs mb-3" style={{ color: th.itemMuted }}>SKU: {item.sku}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={item.quantity} onChange={e => updateItem(index, "quantity", parseFloat(e.target.value) || 1)}
                          placeholder="Qty" min="1" className="px-3 py-2 rounded text-sm focus:ring-1 focus:ring-[#E84545]" style={inputStyle} />
                        <input type="text" value={item.notes || ""} onChange={e => updateItem(index, "notes", e.target.value)}
                          placeholder="Notes (optional)" className="px-3 py-2 rounded text-sm focus:ring-1 focus:ring-[#E84545]" style={inputStyle} />
                      </div>
                      <div className="mt-2 flex justify-between items-center text-sm">
                        <span style={{ color: th.itemMuted }}>Qty: {item.quantity} {item.unit}</span>
                        {item.notes && <span className="text-xs italic truncate max-w-[200px]" style={{ color: th.subText }}>{item.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: th.panelTitle }}>Notes</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Internal Notes</label>
                    <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Notes for internal use only..." rows={3}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] resize-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Customer Notes</label>
                    <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Notes visible to customer..." rows={3}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] resize-none" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Priority & Status */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: th.panelTitle }}>Priority & Status</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Priority</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["LOW","MEDIUM","HIGH","URGENT"] as const).map(p => (
                        <button key={p} onClick={() => setPriority(p)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${priority === p ? getPriorityColor(p) : ""}`}
                          style={priority !== p ? { background: "transparent", border: `1px solid ${th.priorUnselBorder}`, color: th.priorUnselText } : {}}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545]" style={selectStyle}>
                      <option value="DRAFT">DRAFT</option>
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Assign Staff */}
              {isAdmin && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.staffPanelBorder}` }}>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: th.panelTitle }}>
                    <UserCog className="h-5 w-5 text-[#E84545]" />Assign Staff
                  </h2>
                  <p className="text-xs text-yellow-400 mb-3">💡 Admin/Manager feature</p>
                  <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={selectStyle}>
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.role})</option>)}
                  </select>
                  {staff.length === 0 && <p className="text-xs text-yellow-400 mt-2">⚠️ No staff members found</p>}
                </div>
              )}

              {/* Schedule */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.panelTitle }}>
                  <Calendar className="h-5 w-5 text-[#E84545]" />Schedule
                </h2>
                <div className="space-y-3">
                  {[
                    { label:"Estimated Start", value:estimatedStartDate, onChange:setEstimatedStartDate },
                    { label:"Estimated Completion", value:estimatedCompletionDate, onChange:setEstimatedCompletionDate },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>{f.label}</label>
                      <input type="date" value={f.value} onChange={e => f.onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={inputStyle} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Save Button */}
              <div className="md:hidden rounded-xl p-4 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <button onClick={handleSubmit} disabled={loading || isVoiceUploading || !jobTitle.trim() || items.length === 0}
                  className="w-full py-3 text-white rounded-lg font-semibold disabled:opacity-50 transition-all shadow-lg"
                  style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <p className="text-xs text-center mt-3" style={{ color: th.subText }}>
                  {items.length} item{items.length !== 1 ? "s" : ""} will be saved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Labor Modal */}
      {showAddLabor && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ background: th.modalOverlay }}>
          <div className="rounded-xl shadow-2xl max-w-md w-full" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: `1px solid ${th.modalBorder}` }}>
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                <Wrench className="h-5 w-5 text-[#E84545]" />Add Labor Charge
              </h2>
              <button onClick={() => setShowAddLabor(false)} style={{ color: th.modalCloseText }}><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Description *</label>
                <input type="text" value={laborCharge.description} onChange={e => setLaborCharge({ ...laborCharge, description: e.target.value })}
                  placeholder="e.g., Engine repair, Oil change" className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Hours/Quantity</label>
                <input type="number" value={laborCharge.hours} onChange={e => setLaborCharge({ ...laborCharge, hours: parseFloat(e.target.value) || 1 })}
                  min="0.5" step="0.5" className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Notes</label>
                <textarea value={laborCharge.notes} onChange={e => setLaborCharge({ ...laborCharge, notes: e.target.value })}
                  rows={2} placeholder="Additional details..." className="w-full px-3 py-2 rounded-lg resize-none" style={inputStyle} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowAddLabor(false)} className="px-4 py-2 rounded-lg"
                  style={{ background: "transparent", border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Cancel</button>
                <button onClick={handleAddLabor} className="px-4 py-2 text-white rounded-lg"
                  style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>Add Labor</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}