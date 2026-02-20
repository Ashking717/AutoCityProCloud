"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Wrench,
  User,
  Calendar,
  X,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

interface IJob {
  _id: string;
  jobNumber: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
    vehicleRegistrationNumber?: string;
  };
  customerName: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "DRAFT" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  estimatedGrandTotal: number;
  actualGrandTotal?: number;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  convertedToSale: boolean;
  saleInvoiceNumber?: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  createdAt: string;
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}

export default function JobsPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<IJob[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [convertedFilter, setConvertedFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:              isDark ? "#050505"                                                  : "#f3f4f6",
    // Desktop header
    headerBgFrom:        isDark ? "#932222"                                                  : "#fef2f2",
    headerBgVia:         isDark ? "#411010"                                                  : "#fee2e2",
    headerBgTo:          isDark ? "#a20c0c"                                                  : "#fecaca",
    headerBorder:        isDark ? "rgba(255,255,255,0.05)"                                   : "rgba(0,0,0,0.06)",
    headerTitle:         isDark ? "#ffffff"                                                  : "#7f1d1d",
    headerSub:           isDark ? "rgba(255,255,255,0.80)"                                   : "#991b1b",
    headerBtnBg:         isDark ? "#ffffff"                                                  : "#7f1d1d",
    headerBtnText:       isDark ? "#E84545"                                                  : "#ffffff",
    // Mobile header
    mobileHeaderBg:      isDark ? "linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)"         : "linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)",
    mobileHeaderBorder:  isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.08)",
    mobileHeaderTitle:   isDark ? "#ffffff"                                                  : "#111827",
    mobileHeaderSub:     isDark ? "rgba(255,255,255,0.60)"                                  : "#6b7280",
    mobileBtnBg:         isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.05)",
    mobileBtnText:       isDark ? "rgba(255,255,255,0.80)"                                  : "#374151",
    mobileSearchBg:      isDark ? "rgba(255,255,255,0.08)"                                  : "#ffffff",
    mobileSearchBorder:  isDark ? "rgba(255,255,255,0.12)"                                  : "rgba(0,0,0,0.12)",
    mobileSearchText:    isDark ? "#ffffff"                                                  : "#111827",
    mobileSearchPH:      isDark ? "rgba(255,255,255,0.40)"                                  : "#9ca3af",
    // Filter panel
    filterPanelBg:       isDark ? "#0A0A0A"                                                  : "#ffffff",
    filterPanelBorder:   isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.08)",
    filterInputBg:       isDark ? "#111111"                                                  : "#ffffff",
    filterInputBorder:   isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.10)",
    filterInputText:     isDark ? "#ffffff"                                                  : "#111827",
    filterInputPH:       isDark ? "#6b7280"                                                  : "#9ca3af",
    filterIcon:          isDark ? "#6b7280"                                                  : "#9ca3af",
    // Job cards
    cardBg:              isDark ? "#0A0A0A"                                                  : "#ffffff",
    cardBorder:          isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.08)",
    cardHoverBorder:     isDark ? "rgba(232,69,69,0.30)"                                    : "rgba(232,69,69,0.40)",
    cardTitle:           isDark ? "#ffffff"                                                  : "#111827",
    cardSubtext:         isDark ? "#9ca3af"                                                  : "#6b7280",
    cardMuted:           isDark ? "#6b7280"                                                  : "#9ca3af",
    // Action buttons
    actionBtnBg:         isDark ? "#111111"                                                  : "#f3f4f6",
    actionBtnBorder:     isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.08)",
    actionBtnText:       isDark ? "#9ca3af"                                                  : "#6b7280",
    actionBtnHover:      isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.05)",
    // Pagination
    pagBtnBg:            isDark ? "#111111"                                                  : "#ffffff",
    pagBtnBorder:        isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.08)",
    pagBtnText:          isDark ? "#ffffff"                                                  : "#111827",
    pagText:             isDark ? "#ffffff"                                                  : "#374151",
    // Empty state
    emptyIcon:           isDark ? "#374151"                                                  : "#d1d5db",
    emptyText:           isDark ? "#9ca3af"                                                  : "#6b7280",
    // Mobile modal
    modalBg:             isDark ? "linear-gradient(180deg,#0A0A0A,#050505)"                 : "linear-gradient(180deg,#ffffff,#f9fafb)",
    modalBorder:         isDark ? "rgba(255,255,255,0.10)"                                  : "rgba(0,0,0,0.08)",
    modalTitle:          isDark ? "#ffffff"                                                  : "#111827",
    modalCloseBg:        isDark ? "rgba(255,255,255,0.05)"                                  : "rgba(0,0,0,0.05)",
    modalCloseText:      isDark ? "#9ca3af"                                                  : "#6b7280",
    modalSelectBg:       isDark ? "#111111"                                                  : "#ffffff",
    modalSelectBorder:   isDark ? "rgba(255,255,255,0.10)"                                  : "rgba(0,0,0,0.10)",
    modalSelectText:     isDark ? "#ffffff"                                                  : "#111827",
    modalLabel:          isDark ? "#d1d5db"                                                  : "#374151",
    modalSectionBorder:  isDark ? "rgba(255,255,255,0.10)"                                  : "rgba(0,0,0,0.08)",
    clearBtnBg:          isDark ? "#111111"                                                  : "rgba(0,0,0,0.04)",
    clearBtnBorder:      isDark ? "rgba(255,255,255,0.10)"                                  : "rgba(0,0,0,0.08)",
    clearBtnText:        isDark ? "#d1d5db"                                                  : "#374151",
  };

  const selectStyle = {
    background: th.filterInputBg,
    border: `1px solid ${th.filterInputBorder}`,
    color: th.filterInputText,
  };

  useEffect(() => { fetchUser(); fetchJobs(); }, [page, statusFilter, priorityFilter, convertedFilter]);
  useEffect(() => { filterJobs(); }, [jobs, searchTerm]);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setUser(data.user); }
    } catch { console.error("Failed to fetch user"); }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (convertedFilter !== "all") params.append("convertedToSale", convertedFilter);
      const res = await fetch(`/api/jobs?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  };

  const filterJobs = () => {
    if (!searchTerm) { setFilteredJobs(jobs); return; }
    const term = searchTerm.toLowerCase();
    setFilteredJobs(jobs.filter(job =>
      job.jobNumber.toLowerCase().includes(term) ||
      job.customerName.toLowerCase().includes(term) ||
      job.title.toLowerCase().includes(term) ||
      job.vehicleRegistrationNumber?.toLowerCase().includes(term) ||
      job.customerId?.phone?.includes(term)
    ));
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Job cancelled successfully"); fetchJobs(); }
      else { const error = await res.json(); toast.error(error.error || "Failed to cancel job"); }
    } catch { toast.error("Failed to cancel job"); }
  };

  const getStatusColor = (status: string) => {
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

  const getPriorityColor = (priority: string) => {
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
      case "PENDING":     return <Clock className="h-3 w-3" />;
      case "IN_PROGRESS": return <Wrench className="h-3 w-3" />;
      case "COMPLETED":   return <CheckCircle className="h-3 w-3" />;
      case "CANCELLED":   return <XCircle className="h-3 w-3" />;
      default:            return <AlertCircle className="h-3 w-3" />;
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const activeFilterCount = [
    statusFilter !== "all",
    priorityFilter !== "all",
    convertedFilter !== "all",
  ].filter(Boolean).length;

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: th.mobileHeaderTitle }}>
                  <Wrench className="h-5 w-5 text-[#E84545]" />
                  Jobs
                </h1>
                <p className="text-xs" style={{ color: th.mobileHeaderSub }}>
                  {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
                  {isDark ? <Moon className="h-3 w-3 inline ml-1 text-[#E84545]" /> : <Sun className="h-3 w-3 inline ml-1 text-[#E84545]" />}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="relative p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#E84545] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </button>
                <button
                  onClick={() => router.push("/autocityPro/jobs/new")}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold active:scale-95 transition-all shadow-lg"
                  style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                  <Plus className="h-4 w-4" />
                  New
                </button>
              </div>
            </div>
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPH }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search jobs..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: th.headerTitle }}>
                    <Wrench className="h-7 w-7" />
                    Jobs & Work Orders
                  </h1>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: isDark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.60)", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(127,29,29,0.20)"}`, color: isDark ? "rgba(255,255,255,0.70)" : "#7f1d1d" }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>Manage service jobs and work orders</p>
              </div>
              <button
                onClick={() => router.push("/autocityPro/jobs/new")}
                className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
                style={{ background: th.headerBtnBg, color: th.headerBtnText }}>
                <Plus className="h-5 w-5" />
                New Job
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Content */}
        <div className="px-4 md:px-6 pt-[160px] md:pt-6 pb-8">

          {/* Desktop Filters */}
          <div className="hidden md:block rounded-xl p-4 mb-6 shadow transition-colors duration-500"
            style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search jobs..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  style={selectStyle}
                />
              </div>
              {[
                { value: statusFilter, onChange: (v: string) => { setStatusFilter(v); setPage(1); }, opts: [["all","All Statuses"],["DRAFT","Draft"],["PENDING","Pending"],["IN_PROGRESS","In Progress"],["COMPLETED","Completed"],["CANCELLED","Cancelled"]] },
                { value: priorityFilter, onChange: (v: string) => { setPriorityFilter(v); setPage(1); }, opts: [["all","All Priorities"],["LOW","Low"],["MEDIUM","Medium"],["HIGH","High"],["URGENT","Urgent"]] },
                { value: convertedFilter, onChange: (v: string) => { setConvertedFilter(v); setPage(1); }, opts: [["all","All Jobs"],["false","Not Converted"],["true","Converted to Sale"]] },
              ].map((s, i) => (
                <select key={s.opts[0][1]} value={s.value} onChange={e => s.onChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent appearance-none"
                  style={selectStyle}>
                  {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>
          </div>

          {/* Jobs List */}
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545] mb-4" />
              <p style={{ color: th.emptyText }}>Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <Wrench className="h-14 w-14 mx-auto mb-4" style={{ color: th.emptyIcon }} />
              <p className="text-lg font-medium" style={{ color: th.emptyText }}>No jobs found</p>
              <p className="text-sm mt-2" style={{ color: th.cardMuted }}>Create a new job to get started</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {filteredJobs.map(job => (
                  <div
                    key={job._id}
                    className="rounded-xl p-4 md:p-6 transition-all duration-300 group"
                    style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-bold" style={{ color: th.cardTitle }}>{job.jobNumber}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="hidden sm:inline">{job.status}</span>
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
                            {job.priority}
                          </span>
                          {job.convertedToSale && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${isDark ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-green-50 text-green-700 border-green-200"}`}>
                              ✓ Converted
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm md:text-base font-semibold mb-1" style={{ color: th.cardTitle }}>{job.title}</h4>
                        {job.description && (
                          <p className="text-xs md:text-sm mb-2 line-clamp-2" style={{ color: th.cardSubtext }}>{job.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs md:text-sm" style={{ color: th.cardSubtext }}>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{job.customerName}</span>
                          </div>
                          {job.vehicleRegistrationNumber && (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[#E84545]">{job.vehicleRegistrationNumber}</span>
                              {job.vehicleMake && <span className="hidden sm:inline">• {job.vehicleMake} {job.vehicleModel}</span>}
                            </div>
                          )}
                          {job.assignedTo && isAdmin && (
                            <div className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span className="hidden sm:inline">{job.assignedTo.firstName} {job.assignedTo.lastName}</span>
                              <span className="sm:hidden">Assigned</span>
                            </div>
                          )}
                        </div>
                        {job.estimatedCompletionDate && (
                          <div className="flex items-center gap-1 text-xs mt-2" style={{ color: th.cardMuted }}>
                            <Calendar className="h-3 w-3" />
                            <span>Due: {new Date(job.estimatedCompletionDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {job.convertedToSale && job.saleInvoiceNumber && (
                          <div className="mt-2 text-xs text-green-400">→ {job.saleInvoiceNumber}</div>
                        )}
                      </div>

                      {/* Right */}
                      <div className="flex md:flex-col items-center md:items-end gap-3 justify-between md:justify-start">
                        <div className="text-left md:text-right flex-1 md:flex-none">
                          <p className="text-xs" style={{ color: th.cardSubtext }}>{job.actualGrandTotal ? "Actual" : "Estimate"}</p>
                          <p className="text-lg md:text-xl font-bold" style={{ color: th.cardTitle }}>
                            QAR {(job.actualGrandTotal || job.estimatedGrandTotal).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/autocityPro/jobs/${job._id}`)}
                            className="p-2 rounded-lg transition-colors active:scale-95"
                            style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}
                            title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                          {job.status !== "CANCELLED" && !job.convertedToSale && (
                            <>
                              <button
                                onClick={() => router.push(`/autocityPro/jobs/${job._id}/edit`)}
                                className="p-2 rounded-lg transition-colors active:scale-95"
                                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}
                                title="Edit Job">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job._id)}
                                className="p-2 rounded-lg transition-colors active:scale-95"
                                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: "#E84545" }}
                                title="Cancel Job">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Safe Area */}
              <div className="md:hidden h-20" />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: th.pagBtnBg, border: `1px solid ${th.pagBtnBorder}`, color: th.pagBtnText }}>
                    Previous
                  </button>
                  <span style={{ color: th.pagText }}>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: th.pagBtnBg, border: `1px solid ${th.pagBtnBorder}`, color: th.pagBtnText }}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilters && isMobile && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-xl active:scale-95"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Status", value: statusFilter, onChange: (v: string) => { setStatusFilter(v); setPage(1); }, opts: [["all","All Statuses"],["DRAFT","Draft"],["PENDING","Pending"],["IN_PROGRESS","In Progress"],["COMPLETED","Completed"],["CANCELLED","Cancelled"]] },
                { label: "Priority", value: priorityFilter, onChange: (v: string) => { setPriorityFilter(v); setPage(1); }, opts: [["all","All Priorities"],["LOW","Low"],["MEDIUM","Medium"],["HIGH","High"],["URGENT","Urgent"]] },
                { label: "Conversion Status", value: convertedFilter, onChange: (v: string) => { setConvertedFilter(v); setPage(1); }, opts: [["all","All Jobs"],["false","Not Converted"],["true","Converted to Sale"]] },
              ].map(s => (
                <div key={s.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>{s.label}</label>
                  <select value={s.value} onChange={e => s.onChange(e.target.value)} className="w-full px-3 py-3 rounded-xl"
                    style={{ background: th.modalSelectBg, border: `1px solid ${th.modalSelectBorder}`, color: th.modalSelectText }}>
                    {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                <button
                  onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setConvertedFilter("all"); setPage(1); }}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors"
                  style={{ background: th.clearBtnBg, border: `1px solid ${th.clearBtnBorder}`, color: th.clearBtnText }}>
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-semibold"
                  style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}