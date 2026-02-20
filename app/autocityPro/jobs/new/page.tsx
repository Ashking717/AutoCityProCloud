"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search, Plus, Trash2, Car, User, Wrench, X, Calendar, FileText,
  ChevronLeft, MoreVertical, UserCog, Clock, Sun, Moon,
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

interface ICustomer {
  _id: string; name: string; phone: string; email: string;
  vehicleRegistrationNumber?: string; vehicleMake?: string; vehicleModel?: string;
  vehicleYear?: number; vehicleColor?: string; vehicleVIN?: string;
}
interface JobItem {
  productId?: string; productName: string; sku: string; isLabor?: boolean; unit: string;
  quantity: number; estimatedPrice: number; actualPrice?: number; discount: number;
  discountType: "percentage" | "fixed"; taxRate: number; notes?: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [items, setItems] = useState<JobItem[]>([]);
  const [priority, setPriority] = useState<"LOW"|"MEDIUM"|"HIGH"|"URGENT">("MEDIUM");
  const [status, setStatus] = useState<"DRAFT"|"PENDING">("DRAFT");
  const [assignedTo, setAssignedTo] = useState("");
  const [estimatedStartDate, setEstimatedStartDate] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteEntry[]>([]);
  const [isVoiceUploading, setIsVoiceUploading] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState({ registrationNumber:"", make:"", model:"", year:"", color:"", vin:"", mileage:"" });
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name:"", phone:"", email:"", address:"", vehicleRegistrationNumber:"", vehicleMake:"", vehicleModel:"", vehicleYear:"", vehicleColor:"", vehicleVIN:"" });
  const [laborCharge, setLaborCharge] = useState({ description:"", hours:1, notes:"" });

  const displayName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "Unknown";
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const availableCarMakes = Object.keys(carMakesModels);

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
    headerStatBg:       isDark ? "rgba(255,255,255,0.20)"                                : "rgba(127,29,29,0.10)",
    headerStatBorder:   isDark ? "rgba(255,255,255,0.10)"                                : "rgba(127,29,29,0.15)",
    headerStatText:     isDark ? "#ffffff"                                               : "#7f1d1d",
    headerStatLabel:    isDark ? "rgba(255,255,255,0.80)"                                : "#991b1b",
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
    // Product search cards
    productCardBg:      isDark ? "#111111"                                               : "#f9fafb",
    productCardBorder:  isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    productCardHover:   isDark ? "rgba(232,69,69,0.50)"                                  : "rgba(232,69,69,0.40)",
    productTitle:       isDark ? "#ffffff"                                               : "#111827",
    productMuted:       isDark ? "#9ca3af"                                               : "#6b7280",
    // Item list
    itemBg:             isDark ? "#111111"                                               : "#f9fafb",
    itemBorder:         isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    itemTitle:          isDark ? "#ffffff"                                               : "#111827",
    itemMuted:          isDark ? "#9ca3af"                                               : "#6b7280",
    // Priority buttons
    priorityUnselBg:    isDark ? "transparent"                                           : "transparent",
    priorityUnselBorder:isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    priorityUnselText:  isDark ? "#9ca3af"                                               : "#6b7280",
    // Modal backgrounds
    modalOverlay:       "rgba(0,0,0,0.70)",
    modalBg:            isDark ? "#0A0A0A"                                               : "#ffffff",
    modalBorder:        isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    modalBorderTop:     isDark ? "rgba(255,255,255,0.10)"                                : "rgba(0,0,0,0.08)",
    modalTitle:         isDark ? "#ffffff"                                               : "#111827",
    modalCloseBg:       isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.05)",
    modalCloseText:     isDark ? "#9ca3af"                                               : "#6b7280",
    modalLabel:         isDark ? "#ffffff"                                               : "#374151",
    modalItemBg:        isDark ? "#0A0A0A"                                               : "rgba(0,0,0,0.04)",
    modalItemBorder:    isDark ? "rgba(255,255,255,0.10)"                                : "rgba(0,0,0,0.08)",
    modalItemText:      isDark ? "#d1d5db"                                               : "#374151",
    modalCancelBg:      isDark ? "transparent"                                           : "transparent",
    modalCancelBorder:  isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    modalCancelText:    isDark ? "#d1d5db"                                               : "#374151",
    // Customer info box
    customerInfoBg:     isDark ? "#111111"                                               : "#f3f4f6",
    customerInfoBorder: isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.08)",
    customerInfoText:   isDark ? "#ffffff"                                               : "#111827",
    customerInfoMuted:  isDark ? "#9ca3af"                                               : "#6b7280",
    // Mobile bottom sheet
    sheetBg:            isDark ? "linear-gradient(180deg,#0A0A0A,#050505)"              : "linear-gradient(180deg,#ffffff,#f9fafb)",
    sheetBorder:        isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.08)",
    // Staff panel border
    staffPanelBorder:   isDark ? "rgba(232,69,69,0.20)"                                 : "rgba(232,69,69,0.15)",
    // Section divider
    divider:            isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    emptyIcon:          isDark ? "#374151"                                               : "#d1d5db",
    emptyText:          isDark ? "#9ca3af"                                               : "#6b7280",
    subText:            isDark ? "#6b7280"                                               : "#9ca3af",
  };

  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };
  const selectStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };

  useEffect(() => { fetchUser(); fetchCustomers(); fetchStaff(); }, []);
  useEffect(() => {
    const delay = setTimeout(() => { if (searchTerm) fetchProducts(searchTerm); }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => { searchInputRef.current?.focus(); }, []);
  const handleSelectCustomer = (customer: ICustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setVehicleInfo({ registrationNumber: customer.vehicleRegistrationNumber || "", make: customer.vehicleMake || "", model: customer.vehicleModel || "", year: customer.vehicleYear?.toString() || "", color: customer.vehicleColor || "", vin: customer.vehicleVIN || "", mileage: "" });
    }
  };

  const fetchUser = async () => {
    try { const res = await fetch("/api/auth/me", { credentials: "include" }); if (res.ok) { const d = await res.json(); setUser(d.user); } } catch {}
  };
  const fetchProducts = async (search = "") => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.append("search", search);
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setProducts(d.products || []); }
    } catch {}
  };
  const fetchCustomers = async () => {
    try { const res = await fetch("/api/customers", { credentials: "include" }); if (res.ok) { const d = await res.json(); setCustomers(d.customers || []); } } catch {}
  };
  const fetchStaff = async () => {
    try { const res = await fetch("/api/users", { credentials: "include" }); if (res.ok) { const d = await res.json(); setStaff(d.users || []); } } catch {}
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) { toast.error("Name and phone are required"); return; }
    try {
      const code = newCustomer.name.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 10) + Date.now().toString().slice(-4);
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: newCustomer.name, code, phone: newCustomer.phone, email: newCustomer.email, address: { street: newCustomer.address, city: "", state: "", country: "Qatar", postalCode: "" }, vehicleRegistrationNumber: newCustomer.vehicleRegistrationNumber, vehicleMake: newCustomer.vehicleMake, vehicleModel: newCustomer.vehicleModel, vehicleYear: newCustomer.vehicleYear ? parseInt(newCustomer.vehicleYear) : undefined, vehicleColor: newCustomer.vehicleColor, vehicleVIN: newCustomer.vehicleVIN }),
      });
      if (res.ok) {
        const d = await res.json(); toast.success("Customer added!");
        setCustomers([...customers, d.customer]); handleSelectCustomer(d.customer); setShowAddCustomer(false);
        setNewCustomer({ name:"", phone:"", email:"", address:"", vehicleRegistrationNumber:"", vehicleMake:"", vehicleModel:"", vehicleYear:"", vehicleColor:"", vehicleVIN:"" });
      } else { const e = await res.json(); toast.error(e.error || "Failed to add customer"); }
    } catch { toast.error("Failed to add customer"); }
  };

  const handleAddLabor = () => {
    if (!laborCharge.description) { toast.error("Labor description is required"); return; }
    setItems([...items, { productName: `Labor: ${laborCharge.description}`, sku: "LABOR", isLabor: true, unit: "hours", quantity: laborCharge.hours, estimatedPrice: 0, discount: 0, discountType: "percentage", taxRate: 0, notes: laborCharge.notes }]);
    setShowAddLabor(false); setLaborCharge({ description: "", hours: 1, notes: "" });
    toast.success("Labor charge added!");
  };

  const addToItems = (product: any) => {
    const existing = items.find(i => i.productId === product._id);
    if (existing) { updateItem(items.indexOf(existing), "quantity", existing.quantity + 1); }
    else { setItems([...items, { productId: product._id, productName: product.name, sku: product.sku, isLabor: false, unit: product.unit || "pcs", quantity: 1, estimatedPrice: product.sellingPrice, discount: 0, discountType: "percentage", taxRate: product.taxRate || 0 }]); }
    toast.success("Added to job");
  };

  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); toast.success("Removed from job"); };
  const updateItem = (index: number, field: string, value: any) => { setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item)); };

  const handleSubmit = async () => {
    if (!selectedCustomer) { toast.error("Please select a customer"); return; }
    if (!jobTitle.trim()) { toast.error("Please enter a job title"); return; }
    if (isVoiceUploading) { toast.error("Please wait — voice note is still uploading"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ customerId: selectedCustomer._id, customerName: selectedCustomer.name, vehicleInfo: { registrationNumber: vehicleInfo.registrationNumber || undefined, make: vehicleInfo.make || undefined, model: vehicleInfo.model || undefined, year: vehicleInfo.year ? parseInt(vehicleInfo.year) : undefined, color: vehicleInfo.color || undefined, vin: vehicleInfo.vin || undefined, mileage: vehicleInfo.mileage ? parseInt(vehicleInfo.mileage) : undefined }, title: jobTitle, description: jobDescription || undefined, items: items.map(i => ({ productId: i.productId || undefined, name: i.productName, sku: i.sku, quantity: i.quantity, unit: i.unit, estimatedPrice: i.estimatedPrice, discount: i.discount, discountType: i.discountType, taxRate: i.taxRate, isLabor: i.isLabor || false, notes: i.notes || undefined })), priority, status, assignedTo: assignedTo || undefined, estimatedStartDate: estimatedStartDate || undefined, estimatedCompletionDate: estimatedCompletionDate || undefined, internalNotes: internalNotes || undefined, customerNotes: customerNotes || undefined, voiceNotes }),
      });
      if (res.ok) { const d = await res.json(); toast.success(`Job ${d.job.jobNumber} created!`); router.push("/autocityPro/jobs"); }
      else { const e = await res.json(); toast.error(e.error || "Failed to create job"); }
    } catch { toast.error("Failed to create job"); }
    finally { setLoading(false); }
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.partNumber?.toLowerCase().includes(term);
  });

  function isValidCarMake(make: any): make is CarMake { return Object.keys(carMakesModels).includes(make); }

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
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>New Job</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{items.length} item{items.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><MoreVertical className="h-4 w-4" /></button>
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
        <div className="hidden md:block py-8 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: th.headerTitle }}>
                    <Wrench className="h-7 w-7" />Create New Job
                  </h1>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: isDark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.60)", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(127,29,29,0.20)"}`, color: isDark ? "rgba(255,255,255,0.70)" : "#7f1d1d" }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>Create a new service job or work order</p>
              </div>
              <div className="flex gap-4">
                {[{ label:"Items", value: items.length }, { label:"Priority", value: priority }].map(s => (
                  <div key={s.label} className="rounded-lg px-4 py-2 text-center" style={{ background: th.headerStatBg, border: `1px solid ${th.headerStatBorder}` }}>
                    <p className="text-sm" style={{ color: th.headerStatLabel }}>{s.label}</p>
                    <p className="text-lg font-semibold" style={{ color: th.headerStatText }}>{s.value}</p>
                  </div>
                ))}
              </div>
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
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Job Title *
                    <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Enter job title..."
                      className="w-full px-3 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      style={inputStyle} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Description (Optional)
                    <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Additional details..." rows={3}
                      className="w-full px-3 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent resize-none"
                      style={inputStyle} />
                    </label>
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
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      style={inputStyle} />
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
                        <div key={p._id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') addToItems(p); }} onClick={() => addToItems(p)} className="p-4 rounded-lg cursor-pointer transition-all"
                          style={{ background: th.productCardBg, border: `1px solid ${th.productCardBorder}` }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = th.productCardHover)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = th.productCardBorder)}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold" style={{ color: th.productTitle }}>{p.name}</h3>
                              <p className="text-xs mt-1" style={{ color: th.productMuted }}>SKU: {p.sku}{p.partNumber && ` | Part#: ${p.partNumber}`}</p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-bold text-[#E84545]">QAR {p.sellingPrice}</p>
                              <p className="text-xs" style={{ color: th.productMuted }}>Stock: {p.currentStock}</p>
                            </div>
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
                    <div key={item.productId || `${item.sku}-${index}`} className="rounded-lg p-3 md:p-4" style={{ background: th.itemBg, border: `1px solid ${th.itemBorder}` }}>
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
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Customer */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: th.panelTitle }}>Customer *</h2>
                <select value={selectedCustomer?._id || ""} onChange={e => handleSelectCustomer(customers.find(c => c._id === e.target.value) || null)}
                  className="w-full px-3 py-2 mb-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-sm"
                  style={selectStyle}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}{c.vehicleRegistrationNumber && ` - ${c.vehicleRegistrationNumber}`}</option>)}
                </select>
                {selectedCustomer && (
                  <div className="mb-3 p-3 rounded-lg" style={{ background: th.customerInfoBg, border: `1px solid ${th.customerInfoBorder}` }}>
                    <p className="font-medium" style={{ color: th.customerInfoText }}>{selectedCustomer.name}</p>
                    <p className="text-sm" style={{ color: th.customerInfoMuted }}>{selectedCustomer.phone}</p>
                    {selectedCustomer.vehicleRegistrationNumber && <p className="text-xs mt-1" style={{ color: th.customerInfoMuted }}>Vehicle: {selectedCustomer.vehicleRegistrationNumber}</p>}
                  </div>
                )}
                <button onClick={() => setShowAddCustomer(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-[#E84545]/50 text-[#E84545] rounded-lg hover:border-[#E84545] hover:bg-[#E84545]/10 transition-colors text-sm">
                  <Plus className="h-4 w-4" />Quick Add Customer
                </button>
              </div>

              {/* Vehicle Info */}
              {selectedCustomer && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: th.panelTitle }}>
                    <Car className="h-5 w-5 text-[#E84545]" />Vehicle Info
                  </h2>
                  <div className="space-y-3">
                    <input type="text" value={vehicleInfo.registrationNumber} onChange={e => setVehicleInfo({ ...vehicleInfo, registrationNumber: e.target.value.toUpperCase() })} placeholder="Registration Number"
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] uppercase text-sm" style={inputStyle} />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={vehicleInfo.make} onChange={e => setVehicleInfo({ ...vehicleInfo, make: e.target.value, model: "" })} className="px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={selectStyle}>
                        <option value="">Make</option>
                        {availableCarMakes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={vehicleInfo.model} onChange={e => setVehicleInfo({ ...vehicleInfo, model: e.target.value })} disabled={!vehicleInfo.make} className="px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] disabled:opacity-50 text-sm" style={selectStyle}>
                        <option value="">Model</option>
                        {isValidCarMake(vehicleInfo.make) && carMakesModels[vehicleInfo.make].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select value={vehicleInfo.year} onChange={e => setVehicleInfo({ ...vehicleInfo, year: e.target.value })} className="px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={selectStyle}>
                        <option value="">Year</option>
                        {carYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <input type="number" value={vehicleInfo.mileage} onChange={e => setVehicleInfo({ ...vehicleInfo, mileage: e.target.value })} placeholder="Mileage (km)" className="px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}

              {/* Priority & Status */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: th.panelTitle }}>Priority & Status</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Priority
                    <div className="grid grid-cols-2 gap-2">
                      {(["LOW","MEDIUM","HIGH","URGENT"] as const).map(p => (
                        <button key={p} onClick={() => setPriority(p)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${priority === p ? getPriorityColor(p) : ""}`}
                          style={priority !== p ? { background: th.priorityUnselBg, border: `1px solid ${th.priorityUnselBorder}`, color: th.priorityUnselText } : {}}>
                          {p}
                        </button>
                      ))}
                    </div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Status
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: "DRAFT" as const, icon: <FileText className="h-4 w-4" />, sel: isDark ? "bg-gray-500/20 text-gray-300 border-gray-500/30" : "bg-gray-100 text-gray-600 border-gray-200" },
                        { val: "PENDING" as const, icon: <Clock className="h-4 w-4" />, sel: isDark ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-yellow-50 text-yellow-700 border-yellow-200" },
                      ].map(s => (
                        <button key={s.val} onClick={() => setStatus(s.val)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${status === s.val ? s.sel : ""}`}
                          style={status !== s.val ? { background: th.priorityUnselBg, border: `1px solid ${th.priorityUnselBorder}`, color: th.priorityUnselText } : {}}>
                          {s.icon}{s.val}
                        </button>
                      ))}
                    </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Assign Staff */}
              {isAdmin && (
                <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.staffPanelBorder}` }}>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: th.panelTitle }}>
                    <UserCog className="h-5 w-5 text-[#E84545]" />Assign Staff
                  </h2>
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
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Estimated Start
                    <input type="datetime-local" value={estimatedStartDate} onChange={e => setEstimatedStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={inputStyle} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.panelTitle }}>Estimated Completion
                    <input type="datetime-local" value={estimatedCompletionDate} onChange={e => setEstimatedCompletionDate(e.target.value)} className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] text-sm" style={inputStyle} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="rounded-xl p-4 md:p-6 transition-colors duration-500" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
                <button onClick={handleSubmit} disabled={loading || isVoiceUploading || !selectedCustomer || !jobTitle.trim()}
                  className="w-full py-3 text-white rounded-lg font-semibold disabled:opacity-50 transition-all shadow-lg"
                  style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Job...
                    </span>
                  ) : "Create Job"}
                </button>
                <p className="text-xs text-center mt-3" style={{ color: th.subText }}>
                  Job will be created with {items.length} item{items.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.sheetBg, borderColor: th.sheetBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Quick Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl" style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label:"Add Labor Charge", icon:<Wrench className="h-5 w-5"/>, action:() => { setShowAddLabor(true); setShowMobileMenu(false); } },
                { label:"Add New Customer", icon:<User className="h-5 w-5"/>, action:() => { setShowAddCustomer(true); setShowMobileMenu(false); } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}>
                  <span>{btn.label}</span>{btn.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ background: th.modalOverlay }}>
          <div className="rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="sticky top-0 flex justify-between items-center px-6 py-4 z-10" style={{ background: th.modalBg, borderBottom: `1px solid ${th.modalBorder}` }}>
              <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>Quick Add Customer</h2>
              <button onClick={() => setShowAddCustomer(false)} style={{ color: th.modalCloseText }}><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Name *
                  <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Phone *
                  <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Email
                  <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
                  </label>
                </div>
              </div>
              <div className="pt-4" style={{ borderTop: `1px solid ${th.divider}` }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: th.modalLabel }}>
                  <Car className="h-4 w-4 text-[#E84545]" />Vehicle Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={newCustomer.vehicleRegistrationNumber} onChange={e => setNewCustomer({ ...newCustomer, vehicleRegistrationNumber: e.target.value.toUpperCase() })} placeholder="Registration Number" className="w-full px-3 py-2 rounded-lg uppercase md:col-span-2" style={inputStyle} />
                  <select value={newCustomer.vehicleMake} onChange={e => setNewCustomer({ ...newCustomer, vehicleMake: e.target.value, vehicleModel: "" })} className="px-3 py-2 rounded-lg" style={selectStyle}>
                    <option value="">Select Make</option>
                    {availableCarMakes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={newCustomer.vehicleModel} onChange={e => setNewCustomer({ ...newCustomer, vehicleModel: e.target.value })} disabled={!newCustomer.vehicleMake} className="px-3 py-2 rounded-lg disabled:opacity-50" style={selectStyle}>
                    <option value="">Select Model</option>
                    {isValidCarMake(newCustomer.vehicleMake) && carMakesModels[newCustomer.vehicleMake].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowAddCustomer(false)} className="px-4 py-2 rounded-lg" style={{ background: th.modalCancelBg, border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Cancel</button>
                <button onClick={handleAddCustomer} className="px-4 py-2 text-white rounded-lg" style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>Add Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {[
                { label:"Description *", type:"text", value:laborCharge.description, onChange:(v:string)=>setLaborCharge({...laborCharge,description:v}), placeholder:"e.g., Engine repair, Oil change" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e=>f.onChange(e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Hours/Quantity
                <input type="number" value={laborCharge.hours} onChange={e=>setLaborCharge({...laborCharge,hours:parseFloat(e.target.value)||1})} min="0.5" step="0.5" className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Notes
                <textarea value={laborCharge.notes} onChange={e=>setLaborCharge({...laborCharge,notes:e.target.value})} rows={2} placeholder="Additional details..." className="w-full px-3 py-2 rounded-lg resize-none" style={inputStyle} />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowAddLabor(false)} className="px-4 py-2 rounded-lg" style={{ background: th.modalCancelBg, border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Cancel</button>
                <button onClick={handleAddLabor} className="px-4 py-2 text-white rounded-lg" style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>Add Labor</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}