"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import InvoicePrint from "@/components/InvoicePrint";
import {
  Plus, Search, Eye, DollarSign, Calendar, User, FileText,
  Edit, Trash2, RefreshCw, Filter, Download, MoreVertical,
  ChevronLeft, ChevronRight, X, ArrowLeftRight, CreditCard,
  Undo, Zap, AlertCircle, ShoppingCart, TrendingUp, Printer,
  Sparkles, Sun, Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfDay, endOfDay, format, subDays, subMonths,
  parseISO, isValid,
} from "date-fns";

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

// ─── Safe date formatter — never crashes ──────────────────────────────────────
function safeFormat(dateStr: string | undefined | null, fmt: string, fallback = "—"): string {
  if (!dateStr) return fallback;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Theme token builder ──────────────────────────────────────────────────────
function buildTheme(isDark: boolean) {
  return {
    pageBg:               isDark ? "#050505"                                              : "#f3f4f6",
    // Desktop header
    headerBgFrom:         isDark ? "#932222"                                              : "#fef2f2",
    headerBgVia:          isDark ? "#411010"                                              : "#fee2e2",
    headerBgTo:           isDark ? "#a20c0c"                                              : "#fecaca",
    headerBorder:         isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.06)",
    headerTitle:          isDark ? "#ffffff"                                              : "#7f1d1d",
    headerSub:            isDark ? "rgba(255,255,255,0.90)"                               : "#991b1b",
    headerBadgeBg:        isDark ? "rgba(232,69,69,0.30)"                                 : "rgba(232,69,69,0.15)",
    headerBadgeText:      isDark ? "rgba(255,255,255,0.90)"                               : "#7f1d1d",
    headerBtnBg:          isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.07)",
    headerBtnBorder:      isDark ? "rgba(255,255,255,0.20)"                               : "rgba(127,29,29,0.25)",
    headerBtnText:        isDark ? "#ffffff"                                              : "#7f1d1d",
    headerNewSaleBg:      isDark ? "#ffffff"                                              : "#7f1d1d",
    headerNewSaleText:    isDark ? "#E84545"                                              : "#ffffff",
    // Mobile header
    mobileHeaderBg:       isDark ? "linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)"     : "linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)",
    mobileHeaderBorder:   isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    mobileHeaderTitle:    isDark ? "#ffffff"                                              : "#111827",
    mobileHeaderSub:      isDark ? "rgba(255,255,255,0.60)"                               : "#6b7280",
    mobileBtnBg:          isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.05)",
    mobileBtnText:        isDark ? "rgba(255,255,255,0.80)"                               : "#374151",
    mobileSearchBg:       isDark ? "#111111"                                              : "#ffffff",
    mobileSearchBorder:   isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.12)",
    mobileSearchText:     isDark ? "#ffffff"                                              : "#111827",
    mobileSearchPH:       isDark ? "rgba(255,255,255,0.70)"                               : "#9ca3af",
    // Dynamic island
    islandBg:             isDark ? "#0A0A0A"                                              : "#ffffff",
    islandBorder:         isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    islandText:           isDark ? "#ffffff"                                              : "#111827",
    islandDivider:        isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.12)",
    // Stat cards
    cardBgFrom:           isDark ? "#111111"                                              : "#ffffff",
    cardBgTo:             isDark ? "#0A0A0A"                                              : "#f9fafb",
    cardBorder:           isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    cardLabel:            isDark ? "#9ca3af"                                              : "#6b7280",
    cardValue:            isDark ? "#ffffff"                                              : "#111827",
    // Filter panel
    filterPanelBg:        isDark ? "#0A0A0A"                                              : "#ffffff",
    filterPanelBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    filterInputBg:        isDark ? "#111111"                                              : "#ffffff",
    filterInputBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    filterInputText:      isDark ? "#ffffff"                                              : "#111827",
    filterInputPH:        isDark ? "#6b7280"                                              : "#9ca3af",
    // Date dropdown
    dateDdBg:             isDark ? "#0A0A0A"                                              : "#ffffff",
    dateDdBorder:         isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    dateDdTitle:          isDark ? "#ffffff"                                              : "#111827",
    dateDdPresetText:     isDark ? "#d1d5db"                                              : "#374151",
    dateDdPresetHover:    isDark ? "#111111"                                              : "#f3f4f6",
    dateDdLabel:          isDark ? "#9ca3af"                                              : "#6b7280",
    dateDdInputBg:        isDark ? "#111111"                                              : "#f9fafb",
    dateDdInputBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    dateDdInputText:      isDark ? "#ffffff"                                              : "#111827",
    // Sales container
    salesBg:              isDark ? "#0A0A0A"                                              : "#ffffff",
    salesBorder:          isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    tableHeadBg:          isDark ? "#111111"                                              : "#f3f4f6",
    tableHeadText:        isDark ? "#d1d5db"                                              : "#6b7280",
    tableRowHover:        isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.02)",
    tableRowDivider:      isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.06)",
    tableCellPrimary:     isDark ? "#ffffff"                                              : "#111827",
    tableCellSecondary:   isDark ? "#d1d5db"                                              : "#374151",
    tableCellMuted:       isDark ? "#6b7280"                                              : "#9ca3af",
    // Mobile sale cards
    mobileCardBgFrom:     isDark ? "#111111"                                              : "#ffffff",
    mobileCardBgTo:       isDark ? "#0A0A0A"                                              : "#f9fafb",
    mobileCardBorder:     isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    mobileCardDivider:    isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.08)",
    mobileCardLabel:      isDark ? "#6b7280"                                              : "#9ca3af",
    mobileCardValue:      isDark ? "#ffffff"                                              : "#111827",
    mobileActionBg:       isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.04)",
    mobileActionHover:    isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.07)",
    mobileActionText:     isDark ? "#d1d5db"                                              : "#374151",
    showActionsText:      isDark ? "#9ca3af"                                              : "#6b7280",
    // Action dropdown
    dropdownBg:           isDark ? "#0A0A0A"                                              : "#ffffff",
    dropdownBorder:       isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    dropdownItemText:     isDark ? "#d1d5db"                                              : "#374151",
    dropdownItemHover:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.04)",
    // Pagination
    paginationBorder:     isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    paginationText:       isDark ? "#9ca3af"                                              : "#6b7280",
    paginationBtnBorder:  isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    paginationBtnText:    isDark ? "#9ca3af"                                              : "#6b7280",
    paginationBtnHover:   isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.04)",
    // Modals
    modalOverlay:         isDark ? "rgba(0,0,0,0.70)"                                     : "rgba(0,0,0,0.50)",
    modalBg:              isDark ? "#0A0A0A"                                              : "#ffffff",
    modalBorder:          isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    modalHeaderBg:        isDark ? "linear-gradient(90deg,#0A0A0A,#111111)"               : "linear-gradient(90deg,#ffffff,#f9fafb)",
    modalHeaderBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    modalTitle:           isDark ? "#ffffff"                                              : "#111827",
    modalClose:           isDark ? "#9ca3af"                                              : "#6b7280",
    modalSub:             isDark ? "#9ca3af"                                              : "#6b7280",
    modalSectionBg:       isDark ? "#111111"                                              : "#f9fafb",
    modalSectionBorder:   isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    modalSectionTitle:    isDark ? "#ffffff"                                              : "#111827",
    modalLabel:           isDark ? "#9ca3af"                                              : "#6b7280",
    modalValue:           isDark ? "#ffffff"                                              : "#111827",
    modalInputBg:         isDark ? "#111111"                                              : "#ffffff",
    modalInputBorder:     isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.10)",
    modalInputText:       isDark ? "#ffffff"                                              : "#111827",
    modalTableHeadBg:     isDark ? "#0A0A0A"                                              : "#f3f4f6",
    modalTableHeadText:   isDark ? "#d1d5db"                                              : "#6b7280",
    modalFooterBg:        isDark ? "#111111"                                              : "#f9fafb",
    modalFooterBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    modalFooterMeta:      isDark ? "#9ca3af"                                              : "#6b7280",
    modalCancelBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    modalCancelText:      isDark ? "#d1d5db"                                              : "#374151",
    // Empty state
    emptyIcon:            isDark ? "#4b5563"                                              : "#d1d5db",
    emptyText:            isDark ? "#9ca3af"                                              : "#6b7280",
    emptySubtext:         isDark ? "#6b7280"                                              : "#9ca3af",
    // Return modal summary cards
    returnSummaryBg:      isDark ? "#111111"                                              : "#f9fafb",
    returnSummaryBorder:  isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    returnSummaryLabel:   isDark ? "#9ca3af"                                              : "#6b7280",
    returnSummaryValue:   isDark ? "#ffffff"                                              : "#111827",
    returnItemBg:         isDark ? "#111111"                                              : "#f9fafb",
    returnItemBorder:     isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    returnBtnBg:          isDark ? "#0A0A0A"                                              : "#ffffff",
    returnBtnBorder:      isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    returnFooterBg:       isDark ? "#111111"                                              : "#f9fafb",
    // Invoice loading overlay
    invoiceOverlayBg:     isDark ? "#0A0A0A"                                              : "#ffffff",
    invoiceOverlayBorder: isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    invoiceOverlayText:   isDark ? "#ffffff"                                              : "#111827",
    invoiceOverlaySub:    isDark ? "#9ca3af"                                              : "#6b7280",
    // Edit modal
    editGridBg:           isDark ? "#111111"                                              : "#f9fafb",
    editGridBorder:       isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.08)",
    editItemName:         isDark ? "#ffffff"                                              : "#111827",
    editItemQty:          isDark ? "#9ca3af"                                              : "#6b7280",
    editDiscPct:          isDark ? "#d1d5db"                                              : "#374151",
    // Mobile menu
    mobileMenuBg:         isDark ? "linear-gradient(180deg,#0A0A0A,#050505)"             : "linear-gradient(180deg,#ffffff,#f9fafb)",
    mobileMenuBorder:     isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.08)",
    mobileMenuTitle:      isDark ? "#ffffff"                                              : "#111827",
    mobileMenuCloseBg:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.05)",
    mobileMenuCloseText:  isDark ? "#9ca3af"                                              : "#6b7280",
    // Date badge (mode indicator)
    modeBadgeBg:          isDark ? "rgba(0,0,0,0.30)"                                     : "rgba(255,255,255,0.60)",
    modeBadgeBorder:      isDark ? "rgba(255,255,255,0.15)"                               : "rgba(127,29,29,0.20)",
    modeBadgeText:        isDark ? "rgba(255,255,255,0.70)"                               : "#7f1d1d",
    // option bg for native selects
    optionBg:             isDark ? "#0A0A0A"                                              : "#ffffff",
  };
}

export default function SalesPage() {
  const router = useRouter();

  // ─── Theme ─────────────────────────────────────────────────────────────────
  const isDark = useTimeBasedTheme();
  const th = buildTheme(isDark);

  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate:   format(endOfMonth(new Date()),   "yyyy-MM-dd"),
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mobile
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Return
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);

  // Details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null);

  // Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editAmountPaid, setEditAmountPaid] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Invoice
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const datePresets = [
    { label: "Today",      value: "today" },
    { label: "Yesterday",  value: "yesterday" },
    { label: "This Week",  value: "week" },
    { label: "Last Week",  value: "lastWeek" },
    { label: "This Month", value: "month" },
    { label: "Last Month", value: "lastMonth" },
  ];

  const statusOptions = [
    { label: "All",        value: "all" },
    { label: "Completed",  value: "COMPLETED" },
    { label: "Pending",    value: "DRAFT" },
    { label: "Cancelled",  value: "CANCELLED" },
    { label: "Refunded",   value: "REFUNDED" },
    { label: "Returned",   value: "RETURNED" },
  ];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { fetchUser(); fetchSales(); }, [dateRange, pagination.page, statusFilter]);

  const openEditModal = (sale: any) => {
    setSelectedSaleForEdit(sale);
    setEditItems(sale.items.map((item: any) => ({
      sku: item.sku, name: item.name, quantity: item.quantity,
      unitPrice: item.unitPrice, discount: item.discount || 0, taxRate: item.taxRate || 0,
    })));
    setEditPaymentMethod(sale.paymentMethod);
    setEditAmountPaid(sale.amountPaid);
    setEditNotes("");
    setShowEditModal(true);
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchSales = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter !== "all" ? statusFilter : "",
      });
      const res = await fetch(`/api/sales?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
        setPagination((p) => ({ ...p, total: data.pagination.total, pages: data.pagination.pages }));
      } else {
        toast.error("Failed to fetch sales");
      }
    } catch {
      toast.error("Failed to fetch sales");
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (preset: string) => {
    const now = new Date();
    const presetMap: Record<string, [Date, Date]> = {
      today:     [startOfDay(now),              endOfDay(now)],
      yesterday: [startOfDay(subDays(now, 1)),  endOfDay(subDays(now, 1))],
      week:      [startOfWeek(now, { weekStartsOn: 0 }), endOfWeek(now, { weekStartsOn: 0 })],
      lastWeek:  [startOfWeek(subDays(now, 7), { weekStartsOn: 0 }), endOfWeek(subDays(now, 7), { weekStartsOn: 0 })],
      month:     [startOfMonth(now),            endOfMonth(now)],
      lastMonth: [startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))],
    };
    const pair = presetMap[preset];
    if (!pair) return;
    setDateRange({ startDate: format(pair[0], "yyyy-MM-dd"), endDate: format(pair[1], "yyyy-MM-dd") });
    setShowDateFilter(false);
  };

  const handlePrintInvoice = async (sale: any) => {
    try {
      setInvoiceLoading(true);
      const res = await fetch(`/api/sales/${sale._id}`, { credentials: "include" });
      if (!res.ok) { toast.error((await res.json()).error || "Failed to load invoice"); return; }
      const { sale: s } = await res.json();

      const invoice = {
        invoiceNumber: s.invoiceNumber,
        saleDate: s.saleDate,
        poNumber: s.poNumber || "",
        dueDate: s.dueDate || "",
        items: (s.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discountAmount || 0,
          total: item.total || item.unitPrice * item.quantity,
        })),
        subtotal: s.subtotal || 0,
        totalDiscount: s.totalDiscount || 0,
        totalTax: s.totalTax || 0,
        grandTotal: s.grandTotal || 0,
      };

      // Safely extract IDs whether they're objects or strings
      let customerId = typeof s.customerId === "object" && s.customerId !== null
        ? (s.customerId._id || s.customerId.id)
        : (s.customer?._id || s.customerId);

      let outletId = user?.outletId || s.outletId;
      if (typeof outletId === "object" && outletId !== null) outletId = outletId._id || outletId.id;

      if (!customerId) { toast.error("Customer information not available"); return; }
      if (!outletId)   { toast.error("Outlet information not available");  return; }

      setInvoiceData(invoice);
      setSelectedSaleForInvoice({ ...s, outletId, customerId });
      setShowInvoiceModal(true);
      setShowActions(null);
      toast.success("Invoice loaded for printing");
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const handleEditSale = (sale: any) => {
    if (sale.status === "COMPLETED") {
      toast.error("Cannot edit completed sales. Create a return instead.");
      return;
    }
    router.push(`/autocityPro/sales/edit/${sale._id}`);
  };

  const handleCancelSale = async (sale: any) => {
    if (!confirm(`Cancel sale ${sale.invoiceNumber}?`)) return;
    try {
      const res = await fetch(`/api/sales/${sale._id}/cancel`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      if (res.ok) { toast.success("Sale cancelled"); fetchSales(); }
      else toast.error((await res.json()).error || "Failed to cancel");
    } catch { toast.error("Failed to cancel sale"); }
  };

  const handleReturnSale = (sale: any) => {
    if (sale.status !== "COMPLETED") { toast.error("Only completed sales can be returned"); return; }
    const totalReturned = sale.returns?.reduce((s: number, r: any) => s + r.totalAmount, 0) || 0;
    if (totalReturned >= sale.grandTotal) { toast.error("This sale has already been fully returned"); return; }

    setSelectedSaleForReturn(sale);
    const items = sale.items
      .filter((i: any) => !i.isLabor && i.sku !== "LABOR" && !i.name?.toLowerCase().includes("labor"))
      .map((item: any) => {
        const alreadyReturned = item.returnedQuantity || 0;
        const available = Math.max(0, item.quantity - alreadyReturned);
        return {
          _id: item._id, productId: item.productId, productName: item.name,
          sku: item.sku, quantity: item.quantity, returnedQuantity: alreadyReturned,
          availableForReturn: available, unitPrice: item.unitPrice,
          maxReturnQuantity: available, returnQuantity: 0, originalItem: item,
        };
      })
      .filter((i: any) => i.availableForReturn > 0);

    if (items.length === 0) { toast.error("No items available for return"); return; }
    setReturnItems(items);
    setReturnReason("");
    setShowReturnModal(true);
    setShowActions(null);
  };

  const calculateReturnItemTotal = (item: any) => {
    const qty = item.returnQuantity || 0;
    if (qty <= 0 || !selectedSaleForReturn) return 0;
    const orig = item.originalItem || item;
    const grossLine = orig.unitPrice * orig.quantity;
    const netLine = grossLine * (selectedSaleForReturn.grandTotal / selectedSaleForReturn.subtotal);
    return Number((netLine / orig.quantity * qty).toFixed(2));
  };

  const handleReturnQuantityChange = (itemId: string, quantity: number) => {
    setReturnItems((prev) => prev.map((item) => {
      const match = item._id === itemId || item.productId?.toString() === itemId || item.productId === itemId;
      if (!match) return item;
      const newQty = Math.max(0, Math.min(quantity, item.maxReturnQuantity || item.availableForReturn));
      return { ...item, returnQuantity: newQty };
    }));
  };

  const processReturn = async () => {
    if (!selectedSaleForReturn) return;
    const itemsToReturn = returnItems
      .filter((i) => !i.originalItem?.isLabor && i.sku !== "LABOR" && !i.productName?.toLowerCase().includes("labor") && i.returnQuantity > 0)
      .map((i) => ({ productId: i.productId?.toString(), productName: i.productName, sku: i.sku, quantity: i.returnQuantity, unitPrice: i.unitPrice, reason: i.returnReason || "" }));

    if (itemsToReturn.length === 0) { toast.error("Please select items to return"); return; }
    setProcessingReturn(true);
    try {
      const res = await fetch("/api/sales/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saleId: selectedSaleForReturn._id, invoiceNumber: selectedSaleForReturn.invoiceNumber, reason: returnReason, items: itemsToReturn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process return");
      toast.success(`Return processed: #${data.data?.returnNumber}`);
      setShowReturnModal(false);
      setSelectedSaleForReturn(null);
      setReturnItems([]);
      fetchSales();
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleRefundSale = async (sale: any) => {
    if (!confirm(`Process refund for ${sale.invoiceNumber}?`)) return;
    try {
      const res = await fetch(`/api/sales/${sale._id}/refund`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ refundAmount: sale.balanceDue }),
      });
      if (res.ok) { toast.success("Refund processed"); fetchSales(); }
      else toast.error((await res.json()).error || "Failed to refund");
    } catch { toast.error("Failed to process refund"); }
  };

  const handleDeleteSale = async (sale: any) => {
    if (!confirm(`Delete sale ${sale.invoiceNumber}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/sales/${sale._id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Sale deleted"); fetchSales(); }
      else toast.error((await res.json()).error || "Failed to delete");
    } catch { toast.error("Failed to delete sale"); }
  };

  const handleViewDetails = (sale: any) => {
    if (!sale?._id) { toast.error("Invalid sale data"); return; }
    setSelectedSaleDetails(sale);
    setShowDetailsModal(true);
    setShowActions(null);
  };

  const handleExportSales = async () => {
    try {
      const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate, status: statusFilter !== "all" ? statusFilter : "" });
      const res = await fetch(`/api/sales/export?${params}`, { credentials: "include" });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: `sales-${format(new Date(), "yyyy-MM-dd")}.csv` });
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
        toast.success("Sales exported");
      }
    } catch { toast.error("Failed to export sales"); }
  };

  const filteredSales = sales.filter((s) =>
    s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerId?.phone?.includes(searchTerm)
  );

  const totalSalesAmount = filteredSales.reduce((s, sale) => s + (sale.grandTotal || 0), 0);
  const totalPaidAmount  = filteredSales.reduce((s, sale) => s + (sale.amountPaid || 0), 0);
  const totalBalance     = filteredSales.reduce((s, sale) => s + (sale.balanceDue || 0), 0);

  const formatCompactCurrency = (n: number) =>
    n >= 1_000_000 ? `QR${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000  ? `QR${(n / 1_000).toFixed(1)}K`
    : new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 0 }).format(n);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED:      "bg-green-600/20 text-green-400 border-green-600/30",
      DRAFT:          "bg-white/10 text-gray-400 border-white/10",
      CANCELLED:      "bg-[#E84545]/20 text-[#E84545] border-[#E84545]/30",
      REFUNDED:       "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
      RETURNED:       "bg-orange-600/20 text-orange-400 border-orange-600/30",
      PARTIAL_RETURN: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${map[status] || "bg-blue-600/20 text-blue-400 border-blue-600/30"}`}>{status}</span>;
  };

  const getPaymentBadge = (method: string) => {
    const map: Record<string, string> = {
      CASH:          "bg-green-600/20 text-green-400 border-green-600/30",
      CARD:          "bg-blue-600/20 text-blue-400 border-blue-600/30",
      BANK_TRANSFER: "bg-purple-600/20 text-purple-400 border-purple-600/30",
      CREDIT:        "bg-orange-600/20 text-orange-400 border-orange-600/30",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[method] || "bg-gray-600/20 text-gray-400 border-gray-600/30"}`}>{method}</span>;
  };

  // ── Shared inline style helpers ─────────────────────────────────────────────
  const inputStyle = { background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText };
  const modalInputStyle = { background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}>
              <div className="flex items-center gap-3">
                <Zap className="h-3 w-3 text-[#E84545]" />
                <span className="text-xs font-semibold" style={{ color: th.islandText }}>{formatCompactCurrency(totalSalesAmount)}</span>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                <ShoppingCart className="h-3 w-3 text-green-400" />
                <span className="text-xs font-medium" style={{ color: th.islandText }}>{filteredSales.length}</span>
                {totalBalance > 0 && (
                  <>
                    <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                    <AlertCircle className="h-3 w-3 text-[#E84545]" />
                    <span className="text-xs font-medium text-[#E84545]">{formatCompactCurrency(totalBalance)}</span>
                  </>
                )}
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><ChevronLeft className="h-5 w-5" /></button>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Sales</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{filteredSales.length} transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportSales} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><Download className="h-4 w-4" /></button>
                <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><MoreVertical className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPH }} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoice, customer..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-11 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Sales</h1>
                  {/* <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: th.modeBadgeBg, border: `1px solid ${th.modeBadgeBorder}`, color: th.modeBadgeText }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    <span className="ml-1">{isDark ? "Night" : "Day"} mode</span>
                  </div> */}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-sm" style={{ color: th.headerSub }}>
                    {filteredSales.length} sales • QAR {totalSalesAmount.toFixed(2)} total
                  </p>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: th.headerBadgeBg, color: th.headerBadgeText }}>
                    {statusFilter === "all" ? "All Status" : statusFilter}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleExportSales}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all group"
                  style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                  <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export</span>
                </button>
                <button onClick={() => router.push("/autocityPro/sales/new")}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all shadow-lg group font-medium"
                  style={{ background: th.headerNewSaleBg, color: th.headerNewSaleText }}>
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                  <span>New Sale</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            {[
              { label: "Total Sales",     value: formatCompactCurrency(totalSalesAmount), icon: <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />, accent: "#E84545", extra: <TrendingUp className="h-4 w-4 text-green-400" /> },
              { label: "Total Paid",      value: formatCompactCurrency(totalPaidAmount),  icon: <CreditCard  className="h-4 w-4 md:h-5 md:w-5 text-green-400"  />, accent: "#22c55e" },
              { label: "Pending Balance", value: formatCompactCurrency(totalBalance),     icon: <RefreshCw   className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />, accent: "#E84545", span: true },
            ].map(({ label, value, icon, accent, extra, span }) => (
              <div key={label}
                className={`rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer ${span ? "col-span-2 md:col-span-1" : ""}`}
                style={{ background: `linear-gradient(135deg,${th.cardBgFrom},${th.cardBgTo})`, border: `1px solid ${th.cardBorder}` }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${accent}4d`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = th.cardBorder)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: `${accent}1a` }}>{icon}</div>
                  {extra}
                </div>
                <p className="text-xs mb-1" style={{ color: th.cardLabel }}>{label}</p>
                <p className="text-xl md:text-2xl font-bold" style={{ color: th.cardValue }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:block rounded-lg shadow p-3 mb-4 transition-colors duration-500"
            style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
            <div className="grid grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: th.filterInputPH }} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoice, customer..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  style={inputStyle} />
              </div>

              {/* Status */}
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent appearance-none"
                  style={inputStyle}>
                  {statusOptions.map((o) => <option key={o.value} value={o.value} style={{ background: th.optionBg }}>{o.label}</option>)}
                </select>
                <Filter className="absolute right-2 top-2.5 h-4 w-4 pointer-events-none" style={{ color: th.filterInputPH }} />
              </div>

              {/* Date range */}
              <div className="relative">
                <button onClick={() => setShowDateFilter(!showDateFilter)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors"
                  style={{ ...inputStyle, ...(showDateFilter ? { borderColor: "#E84545" } : {}) }}>
                  <span className="truncate">
                    {safeFormat(dateRange.startDate, "MMM d")} – {safeFormat(dateRange.endDate, "MMM d, yyyy")}
                  </span>
                  <Calendar className="h-4 w-4 flex-shrink-0 ml-2" style={{ color: th.filterInputPH }} />
                </button>

                {showDateFilter && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-20 transition-colors duration-300"
                    style={{ background: th.dateDdBg, border: `1px solid ${th.dateDdBorder}` }}>
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold" style={{ color: th.dateDdTitle }}>Date Range</h3>
                        <button onClick={() => setShowDateFilter(false)} style={{ color: th.modalClose }}><X className="h-3 w-3" /></button>
                      </div>

                      {/* Quick presets */}
                      <div className="grid grid-cols-3 gap-1 mb-3">
                        {datePresets.map((p) => (
                          <button key={p.value} onClick={() => handleDatePreset(p.value)}
                            className="px-2 py-1.5 text-xs rounded transition-colors text-left"
                            style={{ color: th.dateDdPresetText }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = th.dateDdPresetHover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >{p.label}</button>
                        ))}
                      </div>

                      {/* Custom inputs */}
                      <div className="space-y-2 pt-2" style={{ borderTop: `1px solid ${th.dateDdBorder}` }}>
                        {[
                          { label: "From", key: "startDate" as const },
                          { label: "To",   key: "endDate"   as const },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label className="block text-[10px] uppercase mb-1" style={{ color: th.dateDdLabel }}>{label}</label>
                            <input type="date" value={dateRange[key]}
                              onChange={(e) => setDateRange((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                              style={{ background: th.dateDdInputBg, border: `1px solid ${th.dateDdInputBorder}`, color: th.dateDdInputText }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales Table / Cards */}
          <div className="rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.salesBg, border: `1px solid ${th.salesBorder}` }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545]" />
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg font-medium" style={{ color: th.emptyText }}>No sales found</p>
                <p className="text-sm mt-2" style={{ color: th.emptySubtext }}>Create your first sale to get started</p>
              </div>
            ) : (
              <>
                {/* ── Desktop Table ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead style={{ background: th.tableHeadBg }}>
                      <tr>
                        {["Invoice","Date","Customer","Items","Total","Paid","Balance","Payment","Status","Actions"].map((h) => (
                          <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${["Items","Total","Paid","Balance"].includes(h) ? "text-right" : ["Payment","Status","Actions"].includes(h) ? "text-center" : "text-left"}`}
                            style={{ color: th.tableHeadText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale) => (
                        <tr key={sale._id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableRowDivider}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = th.tableRowHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewDetails(sale); }} className="text-sm font-medium text-[#E84545] hover:text-[#cc3c3c] cursor-pointer transition-colors" onClick={() => handleViewDetails(sale)}>
                              {sale.invoiceNumber}
                            </span>
                            {sale.returnStatus && (
                              <span className="text-xs text-[#E84545] ml-1">({sale.returnStatus === "PARTIAL_RETURN" ? "Partial Return" : "Returned"})</span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm" style={{ color: th.tableCellSecondary }}>{safeFormat(sale.saleDate, "MMM d")}</span>
                              <span className="text-xs" style={{ color: th.tableCellMuted }}>{safeFormat(sale.saleDate, "h:mm a")}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col max-w-[120px]">
                              <span className="text-sm truncate" style={{ color: th.tableCellSecondary }}>{sale.customerName}</span>
                              {sale.customerId?.phone && <span className="text-xs truncate" style={{ color: th.tableCellMuted }}>{sale.customerId.phone}</span>}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm" style={{ color: th.tableCellSecondary }}>{sale.items?.length || 0}</span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold" style={{ color: th.tableCellPrimary }}>QAR {sale.grandTotal?.toFixed(2)}</span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm text-green-400">QAR {sale.amountPaid?.toFixed(2)}</span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className={`text-sm font-semibold ${sale.balanceDue > 0 ? "text-[#E84545]" : "text-green-400"}`}>
                              QAR {sale.balanceDue?.toFixed(2)}
                            </span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-center">{getPaymentBadge(sale.paymentMethod)}</td>

                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {getStatusBadge(sale.status)}
                            {sale.returnStatus && (
                              <div className="text-xs text-[#E84545] mt-1">{sale.returnStatus === "PARTIAL_RETURN" ? "Partial Return" : "Fully Returned"}</div>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-center relative">
                            <button onClick={() => setShowActions(showActions === sale._id ? null : sale._id)}
                              className="inline-flex items-center transition-colors" style={{ color: th.tableCellMuted }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = th.tableCellPrimary)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = th.tableCellMuted)}>
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {showActions === sale._id && (
                              <div className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-20 min-w-[180px]"
                                style={{ background: th.dropdownBg, border: `1px solid ${th.dropdownBorder}` }}>
                                <div className="py-1">
                                  {[
                                    { show: true,                                                   label: "View Details",     icon: <Eye className="h-3 w-3" />,       color: th.dropdownItemText, action: () => handleViewDetails(sale) },
                                    { show: sale.status === "COMPLETED",                            label: "Print Invoice",    icon: <Printer className="h-3 w-3" />,   color: "#60a5fa",           action: () => handlePrintInvoice(sale) },
                                    { show: sale.status === "COMPLETED" && !sale.returnStatus,      label: "Edit (Correction)",icon: <Edit className="h-3 w-3" />,      color: "#60a5fa",           action: () => openEditModal(sale) },
                                    { show: sale.status === "COMPLETED" && !sale.returnStatus,      label: "Return Items",     icon: <Undo className="h-3 w-3" />,      color: "#facc15",           action: () => handleReturnSale(sale) },
                                    { show: sale.status === "COMPLETED" && sale.returnStatus === "PARTIAL_RETURN", label: "Return More", icon: <Undo className="h-3 w-3" />, color: "#facc15", action: () => handleReturnSale(sale) },
                                    { show: sale.status === "COMPLETED" && sale.balanceDue < 0,     label: "Process Refund",   icon: <CreditCard className="h-3 w-3" />,color: "#c084fc",           action: () => handleRefundSale(sale) },
                                    { show: sale.status !== "CANCELLED" && sale.status !== "REFUNDED" && !sale.returnStatus, label: "Cancel Sale", icon: <X className="h-3 w-3" />, color: "#E84545", action: () => handleCancelSale(sale) },
                                    { show: sale.status === "DRAFT",                                label: "Delete Draft",     icon: <Trash2 className="h-3 w-3" />,    color: "#E84545",           action: () => handleDeleteSale(sale) },
                                  ].filter((b) => b.show).map(({ label, icon, color, action }) => (
                                    <button key={label} onClick={() => { action(); setShowActions(null); }}
                                      className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs transition-colors"
                                      style={{ color }}
                                      onMouseEnter={(e) => (e.currentTarget.style.background = th.dropdownItemHover)}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                      {icon}<span>{label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="md:hidden space-y-3 p-4">
                  {filteredSales.map((sale) => (
                    <div key={sale._id} className="rounded-xl p-4 transition-all active:scale-[0.98] group"
                      style={{ background: `linear-gradient(135deg,${th.mobileCardBgFrom},${th.mobileCardBgTo})`, border: `1px solid ${th.mobileCardBorder}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(232,69,69,0.30)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = th.mobileCardBorder)}>

                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#E84545] mb-1">{sale.invoiceNumber}</p>
                          <p className="text-xs truncate" style={{ color: th.tableCellSecondary }}>{sale.customerName}</p>
                          <p className="text-xs mt-1" style={{ color: th.mobileCardLabel }}>{safeFormat(sale.saleDate, "MMM d, h:mm a")}</p>
                          {sale.returnStatus && (
                            <span className="inline-block text-xs text-[#E84545] mt-1">
                              ({sale.returnStatus === "PARTIAL_RETURN" ? "Partial Return" : "Returned"})
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(sale.status)}
                          {getPaymentBadge(sale.paymentMethod)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 py-3" style={{ borderTop: `1px solid ${th.mobileCardDivider}`, borderBottom: `1px solid ${th.mobileCardDivider}` }}>
                        {[
                          { label: "Total",   value: formatCompactCurrency(sale.grandTotal), color: th.mobileCardValue },
                          { label: "Paid",    value: formatCompactCurrency(sale.amountPaid),  color: "#22c55e" },
                          { label: "Balance", value: formatCompactCurrency(sale.balanceDue),  color: sale.balanceDue > 0 ? "#E84545" : "#22c55e" },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileCardLabel }}>{label}</span>
                            <p className="text-sm font-bold truncate" style={{ color }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      <button onClick={() => setShowActions(showActions === sale._id ? null : sale._id)}
                        className="w-full py-2 text-xs flex items-center justify-center gap-2 active:scale-95 mt-3 transition-colors"
                        style={{ color: th.showActionsText }}>
                        <span>{showActions === sale._id ? "Hide" : "Show"} Actions</span>
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {showActions === sale._id && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${th.mobileCardDivider}` }}>
                          {[
                            { show: true,                                                   label: "View Details",     icon: <Eye className="h-3 w-3" />,       color: th.mobileActionText, bg: th.mobileActionBg },
                            { show: sale.status === "COMPLETED",                            label: "Print Invoice",    icon: <Printer className="h-3 w-3" />,   color: "#60a5fa",           bg: "rgba(96,165,250,0.10)" },
                            { show: sale.status === "COMPLETED" && !sale.returnStatus,      label: "Edit (Correction)",icon: <Edit className="h-3 w-3" />,      color: "#60a5fa",           bg: "rgba(96,165,250,0.10)" },
                            { show: sale.status === "COMPLETED" && !sale.returnStatus,      label: "Return Items",     icon: <Undo className="h-3 w-3" />,      color: "#facc15",           bg: "rgba(250,204,21,0.10)" },
                            { show: sale.status === "COMPLETED" && sale.returnStatus === "PARTIAL_RETURN", label: "Return More Items", icon: <Undo className="h-3 w-3" />, color: "#facc15", bg: "rgba(250,204,21,0.10)" },
                            { show: sale.status === "COMPLETED" && sale.balanceDue < 0,     label: "Process Refund",   icon: <CreditCard className="h-3 w-3" />,color: "#c084fc",           bg: "rgba(192,132,252,0.10)" },
                            { show: sale.status !== "CANCELLED" && sale.status !== "REFUNDED" && !sale.returnStatus, label: "Cancel Sale", icon: <X className="h-3 w-3" />, color: "#E84545", bg: "rgba(232,69,69,0.10)" },
                            { show: sale.status === "DRAFT",                                label: "Delete Draft",     icon: <Trash2 className="h-3 w-3" />,    color: "#E84545",           bg: "rgba(232,69,69,0.10)" },
                          ].filter((b) => b.show).map(({ label, icon, color, bg, show, ...rest }) => {
                            const actionMap: Record<string, () => void> = {
                              "View Details":      () => handleViewDetails(sale),
                              "Print Invoice":     () => handlePrintInvoice(sale),
                              "Edit (Correction)": () => { openEditModal(sale); setShowActions(null); },
                              "Return Items":      () => handleReturnSale(sale),
                              "Return More Items": () => handleReturnSale(sale),
                              "Process Refund":    () => handleRefundSale(sale),
                              "Cancel Sale":       () => handleCancelSale(sale),
                              "Delete Draft":      () => handleDeleteSale(sale),
                            };
                            return (
                              <button key={label} onClick={actionMap[label]}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors active:scale-95"
                                style={{ background: bg, color }}>
                                {icon}<span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${th.paginationBorder}` }}>
                    <span className="text-xs" style={{ color: th.paginationText }}>
                      Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                        className="px-2 py-1 rounded border transition-colors disabled:opacity-50"
                        style={{ background: "transparent", border: `1px solid ${th.paginationBtnBorder}`, color: th.paginationBtnText }}>
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum = pagination.pages <= 5 ? i + 1
                          : pagination.page <= 3 ? i + 1
                          : pagination.page >= pagination.pages - 2 ? pagination.pages - 4 + i
                          : pagination.page - 2 + i;
                        return (
                          <button key={pageNum} onClick={() => setPagination((p) => ({ ...p, page: pageNum }))}
                            className="px-2 py-1 rounded border text-xs transition-colors"
                            style={{
                              background: pagination.page === pageNum ? "#E84545" : "transparent",
                              border: `1px solid ${pagination.page === pageNum ? "#E84545" : th.paginationBtnBorder}`,
                              color: pagination.page === pageNum ? "#ffffff" : th.paginationBtnText,
                            }}>
                            {pageNum}
                          </button>
                        );
                      })}
                      <button onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages}
                        className="px-2 py-1 rounded border transition-colors disabled:opacity-50"
                        style={{ background: "transparent", border: `1px solid ${th.paginationBtnBorder}`, color: th.paginationBtnText }}>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="md:hidden h-24" />
      </div>{/* end pageBg wrapper */}

      {/* ── Invoice Print ─────────────────────────────────────────────────────── */}
      {showInvoiceModal && invoiceData && selectedSaleForInvoice && (
        <InvoicePrint invoice={invoiceData} outletId={selectedSaleForInvoice.outletId} customerId={selectedSaleForInvoice.customerId}
          onClose={() => { setShowInvoiceModal(false); setSelectedSaleForInvoice(null); setInvoiceData(null); }} />
      )}

      {/* Invoice Loading Overlay */}
      {invoiceLoading && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100]" style={{ background: th.modalOverlay }}>
          <div className="rounded-xl p-6 shadow-2xl" style={{ background: th.invoiceOverlayBg, border: `1px solid ${th.invoiceOverlayBorder}` }}>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#E84545] mx-auto mb-4" />
            <p className="font-medium text-center" style={{ color: th.invoiceOverlayText }}>Preparing invoice...</p>
            <p className="text-sm mt-2 text-center" style={{ color: th.invoiceOverlaySub }}>Loading invoice data for printing</p>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {showEditModal && selectedSaleForEdit && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: th.modalOverlay }}>
          <div className="rounded-xl w-full max-w-3xl shadow-2xl" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${th.modalHeaderBorder}` }}>
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Edit Sale (Correction)</h2>
              <button onClick={() => setShowEditModal(false)} style={{ color: th.modalClose }}><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-3 text-sm text-yellow-400 bg-yellow-500/10" style={{ borderBottom: "1px solid rgba(234,179,8,0.30)" }}>
              ⚠ This will reverse and re-post accounting entries.
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: th.modalTitle }}>Price Correction</h3>
                <div className="space-y-3">
                  {editItems.map((item, idx) => (
                    <div key={item.sku} className="grid grid-cols-5 gap-3 p-3 rounded-lg" style={{ background: th.editGridBg }}>
                      <div className="col-span-2">
                        <p style={{ color: th.editItemName }}>{item.name}</p>
                        <p className="text-xs" style={{ color: th.editItemQty }}>Qty: {item.quantity}</p>
                      </div>
                      <input type="number" value={item.unitPrice}
                        onChange={(e) => setEditItems((p) => p.map((i, iIdx) => iIdx === idx ? { ...i, unitPrice: Number(e.target.value) } : i))}
                        className="rounded px-2 py-1 text-sm" style={modalInputStyle} />
                      <input type="number" value={item.discount}
                        onChange={(e) => setEditItems((p) => p.map((i, iIdx) => iIdx === idx ? { ...i, discount: Number(e.target.value) } : i))}
                        className="rounded px-2 py-1 text-sm" style={modalInputStyle} />
                      <div className="flex items-center text-sm" style={{ color: th.editDiscPct }}>%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-payment-method" className="text-xs mb-1 block" style={{ color: th.modalLabel }}>Payment Method</label>
                  <select id="edit-payment-method" value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full rounded px-3 py-2" style={modalInputStyle}>
                    {["CASH","CARD","BANK_TRANSFER","CREDIT"].map((m) => <option key={m} value={m} style={{ background: th.optionBg }}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-amount-paid" className="text-xs mb-1 block" style={{ color: th.modalLabel }}>Amount Paid</label>
                  <input id="edit-amount-paid" type="number" value={editAmountPaid} onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    className="w-full rounded px-3 py-2" style={modalInputStyle} />
                </div>
              </div>
              <div>
                <label htmlFor="edit-correction-reason" className="text-xs mb-1 block" style={{ color: th.modalLabel }}>Correction Reason</label>
                <textarea id="edit-correction-reason" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                  className="w-full rounded px-3 py-2" style={modalInputStyle} />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: `1px solid ${th.modalHeaderBorder}` }}>
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded"
                style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Cancel</button>
              <button disabled={savingEdit}
                onClick={async () => {
                  setSavingEdit(true);
                  try {
                    const res = await fetch(`/api/sales/${selectedSaleForEdit._id}/edit`, {
                      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
                      body: JSON.stringify({ items: editItems, paymentMethod: editPaymentMethod, amountPaid: editAmountPaid, notes: editNotes, correctionReason: editNotes }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    toast.success("Sale corrected successfully");
                    setShowEditModal(false);
                    fetchSales();
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update sale");
                  } finally { setSavingEdit(false); }
                }}
                className="px-5 py-2 bg-[#E84545] text-white rounded hover:bg-[#cc3c3c] disabled:opacity-50">
                {savingEdit ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ──────────────────────────────────────────────────────── */}
      {showReturnModal && selectedSaleForReturn && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ background: th.modalOverlay }}>
          <div className="rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="p-6" style={{ borderBottom: `1px solid ${th.modalHeaderBorder}`, background: th.modalHeaderBg }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                    <Undo className="h-5 w-5 text-yellow-400" />Process Return
                  </h2>
                  <p className="text-sm mt-1" style={{ color: th.modalSub }}>Sale #{selectedSaleForReturn.invoiceNumber} • {selectedSaleForReturn.customerName}</p>
                </div>
                <button onClick={() => setShowReturnModal(false)} style={{ color: th.modalClose }}><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Original Amount", value: `QAR ${selectedSaleForReturn.grandTotal?.toFixed(2)}`,                                                      color: th.returnSummaryValue },
                  { label: "Items to Return",  value: String(returnItems.filter((i) => i.returnQuantity > 0).length),                                             color: "#facc15" },
                  { label: "Return Amount",    value: `QAR ${returnItems.reduce((s, i) => s + calculateReturnItemTotal(i), 0).toFixed(2)}`,                       color: "#22c55e" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-4" style={{ background: th.returnSummaryBg, border: `1px solid ${th.returnSummaryBorder}` }}>
                    <p className="text-sm" style={{ color: th.returnSummaryLabel }}>{label}</p>
                    <p className="text-lg font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <label htmlFor="return-reason" className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Return Reason</label>
                <textarea id="return-reason" value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter reason for return..." rows={3}
                  className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 resize-none"
                  style={modalInputStyle} />
              </div>

              <h3 className="text-lg font-semibold mb-4" style={{ color: th.modalTitle }}>Select Items to Return</h3>
              <div className="space-y-3">
                {returnItems.map((item) => (
                  <div key={item._id || item.sku} className="rounded-lg p-4" style={{ background: th.returnItemBg, border: `1px solid ${th.returnItemBorder}` }}>
                    <div className="flex justify-between mb-3">
                      <div>
                        <h4 className="font-medium" style={{ color: th.modalTitle }}>{item.productName}</h4>
                        <p className="text-sm" style={{ color: th.modalLabel }}>SKU: {item.sku}</p>
                        <p className="text-sm" style={{ color: th.modalLabel }}>QAR {item.unitPrice.toFixed(2)} × {item.quantity}</p>
                        {item.returnedQuantity > 0 && <p className="text-xs text-yellow-400 mt-1">Already returned: {item.returnedQuantity}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm" style={{ color: th.modalLabel }}>Available</p>
                        <p className="text-lg font-semibold" style={{ color: th.modalTitle }}>{item.maxReturnQuantity}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {[
                          { label: "−", disabled: item.returnQuantity <= 0, delta: -1 },
                          { label: "+", disabled: item.returnQuantity >= item.maxReturnQuantity, delta: 1 },
                        ].reduce<React.ReactNode[]>((acc, btn, btnIdx) => {
                          if (btnIdx === 1) {
                            acc.push(
                              <input key="qty" type="number" min={0} max={item.maxReturnQuantity} value={item.returnQuantity}
                                onChange={(e) => handleReturnQuantityChange(item._id || item.productId, Number(e.target.value) || 0)}
                                className="w-16 text-center rounded py-1" style={{ ...modalInputStyle }} />
                            );
                          }
                          acc.push(
                            <button key={btn.label} disabled={btn.disabled}
                              onClick={() => handleReturnQuantityChange(item._id || item.productId, item.returnQuantity + btn.delta)}
                              className="w-8 h-8 rounded disabled:opacity-50 transition-colors"
                              style={{ background: th.returnBtnBg, border: `1px solid ${th.returnBtnBorder}`, color: th.modalTitle }}>
                              {btn.label}
                            </button>
                          );
                          return acc;
                        }, [])}
                      </div>
                      {item.returnQuantity > 0 && (
                        <div className="text-right">
                          <p className="text-sm" style={{ color: th.modalLabel }}>Return Amount</p>
                          <p className="text-lg font-bold text-green-400">QAR {calculateReturnItemTotal(item).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 flex justify-between items-center" style={{ borderTop: `1px solid ${th.modalHeaderBorder}`, background: th.returnFooterBg }}>
              <div>
                <p className="text-sm" style={{ color: th.modalLabel }}>Total Return Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  QAR {returnItems.reduce((s, i) => s + calculateReturnItemTotal(i), 0).toFixed(2)}
                </p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => setShowReturnModal(false)} className="px-6 py-3 rounded-lg transition-colors"
                  style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Cancel</button>
                <button onClick={processReturn} disabled={processingReturn || returnItems.every((i) => i.returnQuantity === 0)}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2">
                  {processingReturn ? <><div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /><span>Processing...</span></>
                    : <><Undo className="h-4 w-4" /><span>Process Return</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ────────────────────────────────────────────────── */}
      {showDetailsModal && selectedSaleDetails && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ background: th.modalOverlay }}>
          <div className="rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="p-6" style={{ borderBottom: `1px solid ${th.modalHeaderBorder}`, background: th.modalHeaderBg }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                    <Eye className="h-5 w-5 text-blue-400" />Sale Details — {selectedSaleDetails.invoiceNumber}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: th.modalSub }}>
                    {safeFormat(selectedSaleDetails.saleDate, "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} style={{ color: th.modalClose }}><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Customer + Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[
                  {
                    title: "Customer Information",
                    rows: [
                      { label: "Customer Name", value: selectedSaleDetails.customerName },
                      ...(selectedSaleDetails.customerId?.phone ? [{ label: "Phone", value: selectedSaleDetails.customerId.phone }] : []),
                      ...(selectedSaleDetails.customerId?.email ? [{ label: "Email", value: selectedSaleDetails.customerId.email }] : []),
                    ],
                  },
                ].map(({ title, rows }) => (
                  <div key={title} className="rounded-lg p-4" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: th.modalSectionTitle }}>{title}</h3>
                    <div className="space-y-2">
                      {rows.map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-sm" style={{ color: th.modalLabel }}>{label}</p>
                          <p className="font-medium" style={{ color: th.modalValue }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-lg p-4" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: th.modalSectionTitle }}>Sale Summary</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Status:",         value: getStatusBadge(selectedSaleDetails.status) },
                      { label: "Payment Method:", value: getPaymentBadge(selectedSaleDetails.paymentMethod) },
                      { label: "Sale Date:",       value: <span style={{ color: th.modalValue }}>{safeFormat(selectedSaleDetails.saleDate, "MMM d, yyyy")}</span> },
                      ...(selectedSaleDetails.createdBy?.email ? [{ label: "Created By:", value: <span style={{ color: th.modalValue }}>{selectedSaleDetails.createdBy.email}</span> }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span style={{ color: th.modalLabel }}>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4" style={{ color: th.modalTitle }}>Items</h3>
                <div className="rounded-lg overflow-hidden" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                  <table className="min-w-full">
                    <thead style={{ background: th.modalTableHeadBg }}>
                      <tr>
                        {["Item","SKU","Quantity","Unit Price","Tax","Total","Returned"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: th.modalTableHeadText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSaleDetails.items?.map((item: any, i: number) => (
                        <tr key={item._id || `${item.sku}-${i}`} style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                          <td className="px-4 py-3">
                            <p className="font-medium" style={{ color: th.modalTitle }}>{item.name}</p>
                            {item.isLabor && <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">Labor</span>}
                          </td>
                          <td className="px-4 py-3" style={{ color: th.tableCellSecondary }}>{item.sku}</td>
                          <td className="px-4 py-3" style={{ color: th.tableCellSecondary }}>
                            {item.quantity} {item.unit}
                            {item.returnedQuantity > 0 && <div className="text-xs text-[#E84545]">(Returned: {item.returnedQuantity})</div>}
                          </td>
                          <td className="px-4 py-3" style={{ color: th.tableCellSecondary }}>QAR {item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3" style={{ color: th.tableCellSecondary }}>{item.taxRate}% (QAR {(item.taxAmount || 0).toFixed(2)})</td>
                          <td className="px-4 py-3 font-medium" style={{ color: th.modalTitle }}>QAR {item.total.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {item.returnedQuantity > 0
                              ? <span className="text-xs text-[#E84545] bg-[#E84545]/10 px-2 py-1 rounded">{item.returnedQuantity} returned</span>
                              : <span className="text-xs" style={{ color: th.tableCellMuted }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4" style={{ color: th.modalTitle }}>Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg p-4 space-y-3" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                    {[
                      { label: "Subtotal:", value: `QAR ${selectedSaleDetails.subtotal.toFixed(2)}` },
                      { label: "Tax:",      value: `QAR ${(selectedSaleDetails.totalTax || 0).toFixed(2)}` },
                      { label: "Discount:", value: `QAR ${selectedSaleDetails.totalDiscount.toFixed(2)}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span style={{ color: th.modalLabel }}>{label}</span>
                        <span style={{ color: th.modalValue }}>{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 font-bold text-lg" style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                      <span style={{ color: th.tableCellSecondary }}>Grand Total:</span>
                      <span style={{ color: th.modalTitle }}>QAR {selectedSaleDetails.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg p-4 space-y-3" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                    <div className="flex justify-between">
                      <span style={{ color: th.modalLabel }}>Amount Paid:</span>
                      <span className="text-green-400 font-medium">QAR {selectedSaleDetails.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: th.modalLabel }}>Balance Due:</span>
                      <span className={`font-medium ${selectedSaleDetails.balanceDue > 0 ? "text-[#E84545]" : selectedSaleDetails.balanceDue < 0 ? "text-green-400" : ""}`} style={selectedSaleDetails.balanceDue === 0 ? { color: th.modalLabel } : {}}>
                        QAR {selectedSaleDetails.balanceDue.toFixed(2)}
                        {selectedSaleDetails.balanceDue < 0 && <span className="text-xs ml-1" style={{ color: th.modalLabel }}>(Customer Credit)</span>}
                      </span>
                    </div>
                    {selectedSaleDetails.returns?.length > 0 && (
                      <div className="flex justify-between pt-3" style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                        <span style={{ color: th.modalLabel }}>Total Returns:</span>
                        <span className="text-[#E84545] font-medium">
                          QAR {selectedSaleDetails.returns.reduce((s: number, r: any) => s + r.totalAmount, 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Return History */}
              {selectedSaleDetails.returns?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: th.modalTitle }}>Return History</h3>
                  <div className="space-y-4">
                    {selectedSaleDetails.returns.map((ret: any, i: number) => (
                      <div key={ret.returnNumber} className="rounded-lg p-4" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium" style={{ color: th.modalTitle }}>Return #{ret.returnNumber}</h4>
                            <p className="text-sm" style={{ color: th.modalLabel }}>{safeFormat(ret.returnDate, "MMM d, yyyy 'at' h:mm a")}</p>
                            {ret.reason && <p className="text-sm mt-1" style={{ color: th.tableCellSecondary }}>Reason: {ret.reason}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-[#E84545]">QAR {ret.totalAmount.toFixed(2)}</span>
                            <p className="text-sm" style={{ color: th.modalLabel }}>by {ret.processedByName}</p>
                          </div>
                        </div>
                        <div className="pt-3 space-y-2" style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                          <h5 className="text-sm font-medium" style={{ color: th.tableCellSecondary }}>Returned Items:</h5>
                          {ret.items.map((item: any, ii: number) => (
                            <div key={ii} className="flex justify-between text-sm">
                              <div>
                                <span style={{ color: th.tableCellSecondary }}>{item.productName}</span>
                                <span className="text-xs ml-2" style={{ color: th.tableCellMuted }}>({item.sku})</span>
                                {item.reason && <div className="text-xs" style={{ color: th.modalLabel }}>Reason: {item.reason}</div>}
                              </div>
                              <div className="text-right">
                                <div style={{ color: th.tableCellSecondary }}>{item.quantity} × QAR {item.unitPrice.toFixed(2)}</div>
                                <div className="text-[#E84545]">QAR {item.totalAmount.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSaleDetails.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: th.modalTitle }}>Notes</h3>
                  <div className="rounded-lg p-4" style={{ background: th.modalSectionBg, border: `1px solid ${th.modalSectionBorder}` }}>
                    <p className="whitespace-pre-wrap" style={{ color: th.tableCellSecondary }}>{selectedSaleDetails.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 flex justify-between items-center" style={{ borderTop: `1px solid ${th.modalHeaderBorder}`, background: th.modalFooterBg }}>
              <div className="text-sm" style={{ color: th.modalFooterMeta }}>Sale ID: {selectedSaleDetails._id}</div>
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowDetailsModal(false)} className="px-6 py-3 rounded-lg transition-colors"
                  style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Close</button>
                {selectedSaleDetails.status === "COMPLETED" && (
                  <button onClick={() => { setShowDetailsModal(false); handleReturnSale(selectedSaleDetails); }}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2">
                    <Undo className="h-4 w-4" /><span>Return Items</span>
                  </button>
                )}
                {selectedSaleDetails.status === "DRAFT" && (
                  <button onClick={() => { setShowDetailsModal(false); handleEditSale(selectedSaleDetails); }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Edit className="h-4 w-4" /><span>Edit Sale</span>
                  </button>
                )}
                {selectedSaleDetails.status === "COMPLETED" && (
                  <button onClick={() => { setShowDetailsModal(false); handlePrintInvoice(selectedSaleDetails); }}
                    className="px-6 py-3 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-colors flex items-center space-x-2">
                    <Printer className="h-4 w-4" /><span>Print Invoice</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 backdrop-blur-sm z-50 animate-in fade-in duration-200" style={{ background: "rgba(0,0,0,0.80)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.mobileMenuBg, borderColor: th.mobileMenuBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.mobileMenuTitle }}>Quick Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileMenuCloseBg, color: th.mobileMenuCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { router.push("/autocityPro/sales/new"); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-[0.98] bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545]">
                <span>New Sale</span><Plus className="h-5 w-5" />
              </button>
              <button onClick={() => { setShowDateFilter(true); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-[0.98]"
                style={{ background: th.mobileMenuCloseBg, border: `1px solid ${th.mobileMenuBorder}`, color: th.mobileMenuTitle }}>
                <span>Filter by Date</span><Calendar className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}