"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import InvoicePrint from "@/components/InvoicePrint";
import {
  Plus,
  Search,
  Eye,
  DollarSign,
  Calendar,
  User,
  FileText,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeftRight,
  CreditCard,
  Undo,
  Zap,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  Printer,
  Sparkles,
  Home,
  Package,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  format,
  subDays,
  subMonths,
  parseISO,
} from "date-fns";

export default function SalesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mobile states
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Return modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);

  // Details modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editAmountPaid, setEditAmountPaid] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Invoice printing states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] =
    useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Date range presets
  const datePresets = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "This Week", value: "week" },
    { label: "Last Week", value: "lastWeek" },
    { label: "This Month", value: "month" },
    { label: "Last Month", value: "lastMonth" },
    { label: "Custom", value: "custom" },
  ];

  // Status options
  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Pending", value: "DRAFT" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Refunded", value: "REFUNDED" },
    { label: "Returned", value: "RETURNED" },
  ];

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    fetchUser();
    fetchSales();
  }, [dateRange, pagination.page, statusFilter]);

  useEffect(() => {
    if (!selectedSaleForEdit) return;

    setEditItems(
      selectedSaleForEdit.items.map((item: any) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
      }))
    );

    setEditPaymentMethod(selectedSaleForEdit.paymentMethod);
    setEditAmountPaid(selectedSaleForEdit.amountPaid);
    setEditNotes("");
  }, [selectedSaleForEdit]);

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
  const calculateReturnItemTotal = (item: any) => {
    const qty = item.returnQuantity || 0;
    if (qty <= 0) return 0;

    // Use the same ERP calculation as the backend
    const originalItem = item.originalItem || item;
    const sale = selectedSaleForReturn;

    if (!sale || !originalItem) return 0;

    // Calculate gross line total (original item's contribution to subtotal)
    const grossLineTotal = originalItem.unitPrice * originalItem.quantity;

    // Calculate net line total (proportional share of grand total)
    const netLineTotal = grossLineTotal * (sale.grandTotal / sale.subtotal);

    // Calculate net unit price
    const netUnitPrice = netLineTotal / originalItem.quantity;

    // Calculate return amount
    return Number((netUnitPrice * qty).toFixed(2));
  };
  const fetchSales = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter !== "all" ? statusFilter : "",
      });

      const res = await fetch(`/api/sales?${queryParams}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch sales");
      toast.error("Failed to fetch sales");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = async (sale: any) => {
    try {
      setInvoiceLoading(true);

      const res = await fetch(`/api/sales/${sale._id}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const saleData = data.sale;

        // Format data for InvoicePrint component
        const invoiceData = {
          invoiceNumber: saleData.invoiceNumber,
          saleDate: saleData.saleDate,
          poNumber: saleData.poNumber || "",
          dueDate: saleData.dueDate || "",
          items:
            saleData.items?.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discountAmount || 0,
              total: item.total || item.unitPrice * item.quantity,
            })) || [],
          subtotal: saleData.subtotal || 0,
          totalDiscount: saleData.totalDiscount || 0,
          totalTax: saleData.totalTax || 0,
          grandTotal: saleData.grandTotal || 0,
        };

        // DEBUG: Log the data to see what we're getting
        console.log("Sale data for invoice:", {
          saleId: sale._id,
          customerId: saleData.customerId,
          customerIdType: typeof saleData.customerId,
          customerData: saleData.customer,
          outletId: user?.outletId,
          user: user,
        });

        // Extract customer ID properly
        let customerId;
        if (
          typeof saleData.customerId === "object" &&
          saleData.customerId !== null
        ) {
          // If customerId is an object, get the _id from it
          customerId = saleData.customerId._id || saleData.customerId.id;
        } else if (saleData.customer && typeof saleData.customer === "object") {
          // If there's a customer object, get the _id from it
          customerId = saleData.customer._id;
        } else {
          // Otherwise use it as is
          customerId = saleData.customerId;
        }

        // Get outlet ID - check if user has outletId or if it's in saleData
        let outletId = user?.outletId || saleData.outletId;

        // If outletId is an object, extract the string
        if (typeof outletId === "object" && outletId !== null) {
          outletId = outletId._id || outletId.id;
        }

        // Validate required data
        if (!customerId) {
          toast.error("Customer information not available");
          console.error("No customer ID found:", saleData);
          return;
        }

        if (!outletId) {
          toast.error("Outlet information not available");
          console.error("No outlet ID found:", { user, saleData });
          return;
        }

        console.log("Final IDs for invoice:", { customerId, outletId });

        setInvoiceData(invoiceData);
        setSelectedSaleForInvoice({
          ...saleData,
          outletId: outletId,
          customerId: customerId,
        });
        setShowInvoiceModal(true);
        setShowActions(null);

        toast.success("Invoice loaded for printing");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to load invoice data");
      }
    } catch (error) {
      console.error("Error loading invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const handleDatePreset = (preset: string) => {
    const now = new Date();
    let start, end;

    switch (preset) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "yesterday":
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 0 });
        end = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case "lastWeek":
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 0 });
        end = endOfWeek(subDays(now, 7), { weekStartsOn: 0 });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "lastMonth":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      default:
        return;
    }

    setDateRange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
    setShowDateFilter(false);
  };

  const handleEditSale = (sale: any) => {
    if (sale.status === "COMPLETED") {
      toast.error("Cannot edit completed sales. Create a return instead.");
      return;
    }
    router.push(`/autocityPro/sales/edit/${sale._id}`);
  };

  const handleCancelSale = async (sale: any) => {
    if (
      !confirm(`Are you sure you want to cancel sale ${sale.invoiceNumber}?`)
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/sales/${sale._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Sale cancelled successfully");
        fetchSales();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to cancel sale");
      }
    } catch (error) {
      toast.error("Failed to cancel sale");
    }
  };

  const handleReturnSale = (sale: any) => {
    if (sale.status !== "COMPLETED") {
      toast.error("Only completed sales can be returned");
      return;
    }

    const totalReturned =
      sale.returns?.reduce(
        (sum: number, ret: any) => sum + ret.totalAmount,
        0
      ) || 0;
    if (totalReturned >= sale.grandTotal) {
      toast.error("This sale has already been fully returned");
      return;
    }

    setSelectedSaleForReturn(sale);

    const initialReturnItems = sale.items
      .filter((item: any) => {
        const isLabor =
          item.isLabor ||
          item.sku === "LABOR" ||
          item.name?.includes("Labor") ||
          item.name?.includes("labor") ||
          false;
        return !isLabor;
      })
      .map((item: any) => {
        const alreadyReturned = item.returnedQuantity || 0;
        const availableForReturn = Math.max(0, item.quantity - alreadyReturned);

        return {
          _id: item._id,
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          returnedQuantity: alreadyReturned,
          availableForReturn: availableForReturn,
          unitPrice: item.unitPrice,
          maxReturnQuantity: availableForReturn,
          returnQuantity: 0,
          returnReason: "",
          originalItem: item,
          isLabor: item.isLabor,
        };
      })
      .filter((item: any) => item.availableForReturn > 0);

    if (initialReturnItems.length === 0) {
      toast.error("No items available for return in this sale");
      return;
    }

    setReturnItems(initialReturnItems);
    setReturnReason("");
    setShowReturnModal(true);
    setShowActions(null);
  };

  const handleReturnQuantityChange = (itemId: string, quantity: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        const match =
          item._id === itemId ||
          (item.productId && item.productId.toString() === itemId) ||
          item.productId === itemId;

        if (match) {
          const maxQty = item.maxReturnQuantity || item.availableForReturn;
          const newQty = Math.max(0, Math.min(quantity, maxQty));
          return { ...item, returnQuantity: newQty };
        }
        return item;
      })
    );
  };

  const processReturn = async () => {
    if (!selectedSaleForReturn) return;

    const itemsToReturn = returnItems
      .filter((item) => {
        const isLabor =
          item.originalItem?.isLabor ||
          item.isLabor ||
          item.sku === "LABOR" ||
          item.productName?.includes("Labor") ||
          item.productName?.includes("labor") ||
          false;

        return !isLabor && item.returnQuantity > 0;
      })
      .map((item) => ({
        productId: item.productId?.toString(),
        productName: item.productName,
        sku: item.sku,
        quantity: item.returnQuantity,
        unitPrice: item.unitPrice,

        reason: item.returnReason || "",
      }));

    if (itemsToReturn.length === 0) {
      toast.error("Please select items to return");
      return;
    }

    const returnData = {
      saleId: selectedSaleForReturn._id,
      invoiceNumber: selectedSaleForReturn.invoiceNumber,
      reason: returnReason,
      items: itemsToReturn,
    };

    setProcessingReturn(true);

    try {
      const res = await fetch("/api/sales/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(returnData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process return");
      }

      toast.success(
        `Return processed successfully. Return #${data.data?.returnNumber}`
      );
      setShowReturnModal(false);
      setSelectedSaleForReturn(null);
      setReturnItems([]);
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleRefundSale = async (sale: any) => {
    if (!confirm(`Process refund for sale ${sale.invoiceNumber}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sales/${sale._id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refundAmount: sale.balanceDue }),
      });

      if (res.ok) {
        toast.success("Refund processed successfully");
        fetchSales();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to process refund");
      }
    } catch (error) {
      toast.error("Failed to process refund");
    }
  };

  const handleDeleteSale = async (sale: any) => {
    if (
      !confirm(
        `Are you sure you want to delete sale ${sale.invoiceNumber}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/sales/${sale._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Sale deleted successfully");
        fetchSales();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete sale");
      }
    } catch (error) {
      toast.error("Failed to delete sale");
    }
  };

  const handleViewDetails = (sale: any) => {
    setSelectedSaleDetails(sale);
    setShowDetailsModal(true);
    setShowActions(null);
  };

  const handleExportSales = async () => {
    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter !== "all" ? statusFilter : "",
      });

      const res = await fetch(`/api/sales/export?${queryParams}`, {
        credentials: "include",
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Sales exported successfully");
      }
    } catch (error) {
      toast.error("Failed to export sales");
    }
  };

  const filteredSales = sales.filter(
    (s) =>
      s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerId?.phone?.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `QR${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 10000) {
      return `QR${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      COMPLETED: "bg-green-600/20 text-green-400 border-green-600/30",
      DRAFT: "bg-[#333333]/50 text-gray-400 border-white/10",
      CANCELLED: "bg-[#E84545]/20 text-[#E84545] border-[#E84545]/30",
      REFUNDED: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
      RETURNED: "bg-orange-600/20 text-orange-400 border-orange-600/30",
      PARTIAL_RETURN: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${
          statusMap[status] || "bg-blue-600/20 text-blue-400 border-blue-600/30"
        }`}
      >
        {status}
      </span>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodMap: Record<string, string> = {
      CASH: "bg-green-600/20 text-green-400 border-green-600/30",
      CARD: "bg-blue-600/20 text-blue-400 border-blue-600/30",
      BANK_TRANSFER: "bg-purple-600/20 text-purple-400 border-purple-600/30",
      CREDIT: "bg-orange-600/20 text-orange-400 border-orange-600/30",
    };

    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium border ${
          methodMap[method] || "bg-gray-600/20 text-gray-400 border-gray-600/30"
        }`}
      >
        {method}
      </span>
    );
  };

  const totalSalesAmount = filteredSales.reduce(
    (sum, sale) => sum + (sale.grandTotal || 0),
    0
  );
  const totalPaidAmount = filteredSales.reduce(
    (sum, sale) => sum + (sale.amountPaid || 0),
    0
  );
  const totalBalance = filteredSales.reduce(
    (sum, sale) => sum + (sale.balanceDue || 0),
    0
  );

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-[#0A0A0A] rounded-[28px] px-6 py-3 shadow-2xl border border-white/5 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">
                    {formatCompactCurrency(totalSalesAmount)}
                  </span>
                </div>
                <div className="h-3 w-px bg-white/10"></div>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3 w-3 text-green-400" />
                  <span className="text-white text-xs font-medium">
                    {filteredSales.length}
                  </span>
                </div>
                {totalBalance > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/10"></div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-[#E84545]" />
                      <span className="text-[#E84545] text-xs font-medium">
                        {formatCompactCurrency(totalBalance)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header - Compact */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Sales</h1>
                  <p className="text-xs text-white/60">
                    {filteredSales.length} transactions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportSales}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoice, customer..."
                className="w-full pl-10 pr-4 py-2 bg-[#111111] backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-4 md:py-11 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg overflow-hidden relative">
          <div className="px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Sales</h1>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-white/90 text-sm">
                    {filteredSales.length} sales • QAR{" "}
                    {totalSalesAmount.toFixed(2)} total
                  </p>
                  <span className="text-xs text-white/90 bg-[#E84545]/30 px-2 py-1 rounded-full">
                    {statusFilter === "all" ? "All Status" : statusFilter}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportSales}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => router.push("/autocityPro/sales/new")}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-white text-[#E84545] rounded-lg hover:bg-white/90 transition-all shadow-lg group font-medium"
                >
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                  <span>New Sale</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[140px] md:pt-6 pb-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-r from-[#111111] to-[#0A0A0A] border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-all hover:border-[#E84545]/30 group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl group-hover:bg-[#E84545]/20 transition-colors">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Total Sales</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                {formatCompactCurrency(totalSalesAmount)}
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#111111] to-[#0A0A0A] border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-all hover:border-green-500/30 group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-1">Total Paid</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                {formatCompactCurrency(totalPaidAmount)}
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#111111] to-[#0A0A0A] border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-all hover:border-[#E84545]/30 group cursor-pointer col-span-2 md:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl group-hover:bg-[#E84545]/20 transition-colors">
                  <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-1">Pending Balance</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                {formatCompactCurrency(totalBalance)}
              </p>
            </div>
          </div>

          {/* Filters - Desktop */}
          <div className="hidden md:block bg-[#0A0A0A] border border-white/5 rounded-lg shadow p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoice, customer..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-[#111111] border border-white/5 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#111111] border border-white/5 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm bg-[#111111] border border-white/5 rounded hover:bg-[#0A0A0A] transition-colors text-white"
                >
                  <span className="truncate">
                    {format(parseISO(dateRange.startDate), "MMM d")} -{" "}
                    {format(parseISO(dateRange.endDate), "MMM d")}
                  </span>
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                </button>

                {showDateFilter && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0A0A0A] border border-white/5 rounded-lg shadow-xl z-10">
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-semibold text-white">
                          Date Range
                        </h3>
                        <button
                          onClick={() => setShowDateFilter(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1 mb-3">
                        {datePresets.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => handleDatePreset(preset.value)}
                            className="px-2 py-1.5 text-xs text-gray-300 hover:bg-[#111111] rounded transition-colors text-left hover:text-[#E84545]"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) =>
                              setDateRange((prev) => ({
                                ...prev,
                                startDate: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1.5 text-xs bg-[#111111] border border-white/5 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) =>
                              setDateRange((prev) => ({
                                ...prev,
                                endDate: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1.5 text-xs bg-[#111111] border border-white/5 rounded text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales Content */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545]"></div>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg font-medium">
                  No sales found
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Create your first sale to get started
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/5 text-sm">
                    <thead className="bg-[#111111]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredSales.map((sale) => (
                        <tr
                          key={sale._id}
                          className="bg-[#0A0A0A] hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="text-sm font-medium text-[#E84545] hover:text-[#cc3c3c] transition-colors cursor-pointer"
                              onClick={() => handleViewDetails(sale)}
                            >
                              {sale.invoiceNumber}
                            </span>
                            {sale.returnStatus && (
                              <span className="text-xs text-[#E84545] ml-1">
                                (
                                {sale.returnStatus === "PARTIAL_RETURN"
                                  ? "Partial Return"
                                  : "Returned"}
                                )
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-300">
                                {format(parseISO(sale.saleDate), "MMM d")}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(parseISO(sale.saleDate), "h:mm a")}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col max-w-[120px]">
                              <span className="text-sm text-gray-300 truncate">
                                {sale.customerName}
                              </span>
                              {sale.customerId?.phone && (
                                <span className="text-xs text-gray-500 truncate">
                                  {sale.customerId.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm text-gray-300">
                              {sale.items?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-white">
                              QAR {sale.grandTotal?.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm text-green-400">
                              QAR {sale.amountPaid?.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span
                              className={`text-sm font-semibold ${
                                sale.balanceDue > 0
                                  ? "text-[#E84545]"
                                  : "text-green-400"
                              }`}
                            >
                              QAR {sale.balanceDue?.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {getPaymentMethodBadge(sale.paymentMethod)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {getStatusBadge(sale.status)}
                            {sale.returnStatus && (
                              <div className="text-xs text-[#E84545] mt-1">
                                {sale.returnStatus === "PARTIAL_RETURN"
                                  ? "Partial Return"
                                  : "Fully Returned"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center relative">
                            <button
                              onClick={() =>
                                setShowActions(
                                  showActions === sale._id ? null : sale._id
                                )
                              }
                              className="relative z-30 inline-flex items-center pointer-events-auto text-gray-400 hover:text-white transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {showActions === sale._id && (
                              <div className="absolute right-0 top-full mt-1 bg-[#0A0A0A] border border-white/5 rounded-lg shadow-xl z-10 min-w-[180px]">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      handleViewDetails(sale);
                                      setShowActions(null);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>View Details</span>
                                  </button>

                                  {/* Print Invoice Button */}
                                  {sale.status === "COMPLETED" && (
                                    <button
                                      onClick={() => {
                                        handlePrintInvoice(sale);
                                        setShowActions(null);
                                      }}
                                      className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-blue-400 hover:bg-white/5 transition-colors"
                                    >
                                      <Printer className="h-3 w-3" />
                                      <span>Print Invoice</span>
                                    </button>
                                  )}

                                 {sale.status === "COMPLETED" &&
                            !sale.returnStatus && (
                              <button
                                onClick={() => {
                                  setSelectedSaleForEdit(sale);
                                  setShowEditModal(true);
                                  setShowActions(null);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-blue-400 hover:bg-white/5 transition-colors"
                              >
                                <Edit className="h-3 w-3" />
                                <span>Edit (Correction)</span>
                              </button>
                            )}

                                  {sale.status === "COMPLETED" &&
                                    !sale.returnStatus && (
                                      <button
                                        onClick={() => {
                                          handleReturnSale(sale);
                                          setShowActions(null);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-yellow-400 hover:bg-white/5 transition-colors"
                                      >
                                        <Undo className="h-3 w-3" />
                                        <span>Return Items</span>
                                      </button>
                                    )}

                                  {sale.status === "COMPLETED" &&
                                    sale.returnStatus === "PARTIAL_RETURN" && (
                                      <button
                                        onClick={() => {
                                          handleReturnSale(sale);
                                          setShowActions(null);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-yellow-400 hover:bg-white/5 transition-colors"
                                      >
                                        <Undo className="h-3 w-3" />
                                        <span>Return More Items</span>
                                      </button>
                                    )}

                                  {sale.status === "COMPLETED" &&
                                    sale.balanceDue < 0 && (
                                      <button
                                        onClick={() => {
                                          handleRefundSale(sale);
                                          setShowActions(null);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-purple-400 hover:bg-white/5 transition-colors"
                                      >
                                        <CreditCard className="h-3 w-3" />
                                        <span>Process Refund</span>
                                      </button>
                                    )}

                                  {sale.status !== "CANCELLED" &&
                                    sale.status !== "REFUNDED" &&
                                    !sale.returnStatus && (
                                      <button
                                        onClick={() => {
                                          handleCancelSale(sale);
                                          setShowActions(null);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-[#E84545] hover:bg-white/5 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                        <span>Cancel Sale</span>
                                      </button>
                                    )}

                                  {sale.status === "DRAFT" && (
                                    <button
                                      onClick={() => {
                                        handleDeleteSale(sale);
                                        setShowActions(null);
                                      }}
                                      className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-[#E84545] hover:bg-white/5 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Delete Draft</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {filteredSales.map((sale) => (
                    <div
                      key={sale._id}
                      className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98] group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#E84545] mb-1 group-hover:text-[#E84545] transition-colors">
                            {sale.invoiceNumber}
                          </p>
                          <p className="text-xs text-gray-300 truncate">
                            {sale.customerName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(parseISO(sale.saleDate), "MMM d, h:mm a")}
                          </p>
                          {sale.returnStatus && (
                            <span className="inline-block text-xs text-[#E84545] mt-1">
                              (
                              {sale.returnStatus === "PARTIAL_RETURN"
                                ? "Partial Return"
                                : "Returned"}
                              )
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(sale.status)}
                          {getPaymentMethodBadge(sale.paymentMethod)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-white/10 mb-3">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block mb-1">
                            Total
                          </span>
                          <p className="text-sm font-bold text-white truncate">
                            {formatCompactCurrency(sale.grandTotal)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block mb-1">
                            Paid
                          </span>
                          <p className="text-sm font-semibold text-green-400 truncate">
                            {formatCompactCurrency(sale.amountPaid)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block mb-1">
                            Balance
                          </span>
                          <p
                            className={`text-sm font-semibold truncate ${
                              sale.balanceDue > 0
                                ? "text-[#E84545]"
                                : "text-green-400"
                            }`}
                          >
                            {formatCompactCurrency(sale.balanceDue)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setShowActions(
                            showActions === sale._id ? null : sale._id
                          )
                        }
                        className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>
                          {showActions === sale._id ? "Hide" : "Show"} Actions
                        </span>
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {showActions === sale._id && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <button
                            onClick={() => handleViewDetails(sale)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Details</span>
                          </button>

                          {/* Print Invoice Button for Mobile */}
                          {sale.status === "COMPLETED" && (
                            <button
                              onClick={() => handlePrintInvoice(sale)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors active:scale-95"
                            >
                              <Printer className="h-3 w-3" />
                              <span>Print Invoice</span>
                            </button>
                          )}

                          {sale.status === "COMPLETED" &&
                            !sale.returnStatus && (
                              <button
                                onClick={() => {
                                  setSelectedSaleForEdit(sale);
                                  setShowEditModal(true);
                                  setShowActions(null);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-blue-400 hover:bg-white/5 transition-colors"
                              >
                                <Edit className="h-3 w-3" />
                                <span>Edit (Correction)</span>
                              </button>
                            )}

                          {sale.status === "COMPLETED" &&
                            !sale.returnStatus && (
                              <button
                                onClick={() => handleReturnSale(sale)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg hover:bg-yellow-500/20 transition-colors active:scale-95"
                              >
                                <Undo className="h-3 w-3" />
                                <span>Return Items</span>
                              </button>
                            )}

                          {sale.status === "COMPLETED" &&
                            sale.returnStatus === "PARTIAL_RETURN" && (
                              <button
                                onClick={() => handleReturnSale(sale)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg hover:bg-yellow-500/20 transition-colors active:scale-95"
                              >
                                <Undo className="h-3 w-3" />
                                <span>Return More Items</span>
                              </button>
                            )}

                          {sale.status === "COMPLETED" &&
                            sale.balanceDue < 0 && (
                              <button
                                onClick={() => handleRefundSale(sale)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors active:scale-95"
                              >
                                <CreditCard className="h-3 w-3" />
                                <span>Process Refund</span>
                              </button>
                            )}

                          {sale.status !== "CANCELLED" &&
                            sale.status !== "REFUNDED" &&
                            !sale.returnStatus && (
                              <button
                                onClick={() => handleCancelSale(sale)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E84545] bg-[#E84545]/10 rounded-lg hover:bg-[#E84545]/20 transition-colors active:scale-95"
                              >
                                <X className="h-3 w-3" />
                                <span>Cancel Sale</span>
                              </button>
                            )}

                          {sale.status === "DRAFT" && (
                            <button
                              onClick={() => handleDeleteSale(sale)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E84545] bg-[#E84545]/10 rounded-lg hover:bg-[#E84545]/20 transition-colors active:scale-95"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete Draft</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                    <div className="text-xs text-gray-400">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} sales
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page - 1,
                          }))
                        }
                        disabled={pagination.page === 1}
                        className="px-2 py-1 rounded border border-white/5 text-gray-400 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>

                      {Array.from(
                        { length: Math.min(5, pagination.pages) },
                        (_, i) => {
                          let pageNum;
                          if (pagination.pages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.pages - 2) {
                            pageNum = pagination.pages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() =>
                                setPagination((prev) => ({
                                  ...prev,
                                  page: pageNum,
                                }))
                              }
                              className={`px-2 py-1 rounded border transition-colors text-xs ${
                                pagination.page === pageNum
                                  ? "bg-[#E84545] border-[#E84545] text-white"
                                  : "border-white/5 text-gray-400 hover:bg-white/5"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}

                      <button
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page + 1,
                          }))
                        }
                        disabled={pagination.page === pagination.pages}
                        className="px-2 py-1 rounded border border-white/5 text-gray-400 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Invoice Print Modal */}
      {showInvoiceModal && invoiceData && selectedSaleForInvoice && (
        <InvoicePrint
          invoice={invoiceData}
          outletId={selectedSaleForInvoice.outletId}
          customerId={selectedSaleForInvoice.customerId}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedSaleForInvoice(null);
            setInvoiceData(null);
          }}
        />
      )}
      {/* Invoice Loading Overlay */}
      {invoiceLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#E84545] mx-auto mb-4"></div>
            <p className="text-white font-medium">Preparing invoice...</p>
            <p className="text-gray-400 text-sm mt-2">
              Loading invoice data for printing
            </p>
          </div>
        </div>
      )}
      {/* Edit Sale Modal */}
      {showEditModal && selectedSaleForEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl w-full max-w-3xl shadow-2xl">
            {/* HEADER */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                Edit Sale (Correction)
              </h2>
              <button onClick={() => setShowEditModal(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* WARNING */}
            <div className="px-6 py-3 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400 text-sm">
              ⚠ This will reverse and re-post accounting entries.
            </div>

            {/* BODY */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* ITEMS */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Price Correction
                </h3>

                <div className="space-y-3">
                  {editItems.map((item, idx) => (
                    <div
                      key={item.sku}
                      className="grid grid-cols-5 gap-3 bg-[#111111] p-3 rounded-lg"
                    >
                      <div className="col-span-2 text-white">
                        {item.name}
                        <div className="text-xs text-gray-400">
                          Qty: {item.quantity}
                        </div>
                      </div>

                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditItems((prev) =>
                            prev.map((i, iIdx) =>
                              iIdx === idx ? { ...i, unitPrice: val } : i
                            )
                          );
                        }}
                        className="bg-[#0A0A0A] border border-white/10 rounded px-2 py-1 text-white text-sm"
                      />

                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditItems((prev) =>
                            prev.map((i, iIdx) =>
                              iIdx === idx ? { ...i, discount: val } : i
                            )
                          );
                        }}
                        className="bg-[#0A0A0A] border border-white/10 rounded px-2 py-1 text-white text-sm"
                      />

                      <div className="text-gray-300 text-sm flex items-center">
                        %
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PAYMENT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">
                    Payment Method
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Amount Paid</label>
                  <input
                    type="number"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="text-xs text-gray-400">
                  Correction Reason
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-300 border border-white/10 rounded"
              >
                Cancel
              </button>

              <button
                disabled={savingEdit}
                onClick={async () => {
                  setSavingEdit(true);
                  try {
                    const res = await fetch(
                      `/api/sales/${selectedSaleForEdit._id}/edit`,
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          items: editItems,
                          paymentMethod: editPaymentMethod,
                          amountPaid: editAmountPaid,
                          notes: editNotes,
                          correctionReason: editNotes,
                        }),
                      }
                    );

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    toast.success("Sale corrected successfully");
                    setShowEditModal(false);
                    fetchSales();
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update sale");
                  } finally {
                    setSavingEdit(false);
                  }
                }}
                className="px-5 py-2 bg-[#E84545] text-white rounded hover:bg-[#cc3c3c]"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedSaleForReturn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#0A0A0A] to-[#111111]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Undo className="h-5 w-5 text-yellow-400" />
                    Process Return
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Sale #{selectedSaleForReturn.invoiceNumber} •{" "}
                    {selectedSaleForReturn.customerName}
                  </p>
                </div>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Original Amount</p>
                  <p className="text-lg font-bold text-white">
                    QAR {selectedSaleForReturn.grandTotal?.toFixed(2)}
                  </p>
                </div>

                <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Items to Return</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {returnItems.filter((i) => i.returnQuantity > 0).length}
                  </p>
                </div>

                <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Return Amount</p>
                  <p className="text-lg font-bold text-green-400">
                    QAR{" "}
                    {returnItems
                      .reduce(
                        (sum, item) => sum + calculateReturnItemTotal(item),
                        0
                      )
                      .toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Return Reason
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter reason for return..."
                  className="w-full px-4 py-3 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-yellow-500 text-white resize-none"
                  rows={3}
                />
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Select Items to Return
                </h3>

                <div className="space-y-3">
                  {returnItems.map((item) => (
                    <div
                      key={item._id || item.sku}
                      className="bg-[#111111] border border-white/5 rounded-lg p-4"
                    >
                      <div className="flex justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">
                            {item.productName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            SKU: {item.sku}
                          </p>
                          <p className="text-sm text-gray-400">
                            QAR {item.unitPrice.toFixed(2)} × {item.quantity}
                          </p>
                          {item.returnedQuantity > 0 && (
                            <p className="text-xs text-yellow-400 mt-1">
                              Already returned: {item.returnedQuantity}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-sm text-gray-400">
                            Available to return
                          </span>
                          <p className="text-lg font-semibold text-white">
                            {item.maxReturnQuantity}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              handleReturnQuantityChange(
                                item._id || item.productId,
                                item.returnQuantity - 1
                              )
                            }
                            disabled={item.returnQuantity <= 0}
                            className="w-8 h-8 bg-[#0A0A0A] border border-white/5 rounded text-white disabled:opacity-50"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={item.maxReturnQuantity}
                            value={item.returnQuantity}
                            onChange={(e) =>
                              handleReturnQuantityChange(
                                item._id || item.productId,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-16 text-center bg-[#0A0A0A] border border-white/5 rounded py-1 text-white"
                          />

                          <button
                            onClick={() =>
                              handleReturnQuantityChange(
                                item._id || item.productId,
                                item.returnQuantity + 1
                              )
                            }
                            disabled={
                              item.returnQuantity >= item.maxReturnQuantity
                            }
                            className="w-8 h-8 bg-[#0A0A0A] border border-white/5 rounded text-white disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>

                        {item.returnQuantity > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-gray-400">
                              Return Amount
                            </p>
                            <p className="text-lg font-bold text-green-400">
                              QAR {calculateReturnItemTotal(item).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-[#111111] flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Total Return Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  QAR{" "}
                  {returnItems
                    .reduce(
                      (sum, item) => sum + calculateReturnItemTotal(item),
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-6 py-3 border border-white/5 text-gray-300 rounded-lg hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  onClick={processReturn}
                  disabled={
                    processingReturn ||
                    returnItems.every((i) => i.returnQuantity === 0)
                  }
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {processingReturn ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Undo className="h-4 w-4" />
                      <span>Process Return</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#0A0A0A] to-[#111111]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-400" />
                    Sale Details - {selectedSaleDetails.invoiceNumber}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {format(
                      parseISO(selectedSaleDetails.saleDate),
                      "MMMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Sale Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Customer Name</p>
                      <p className="text-white font-medium">
                        {selectedSaleDetails.customerName}
                      </p>
                    </div>
                    {selectedSaleDetails.customerId?.phone && (
                      <div>
                        <p className="text-sm text-gray-400">Phone</p>
                        <p className="text-white">
                          {selectedSaleDetails.customerId.phone}
                        </p>
                      </div>
                    )}
                    {selectedSaleDetails.customerId?.email && (
                      <div>
                        <p className="text-sm text-gray-400">Email</p>
                        <p className="text-white">
                          {selectedSaleDetails.customerId.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Sale Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span>{getStatusBadge(selectedSaleDetails.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment Method:</span>
                      <span>
                        {getPaymentMethodBadge(
                          selectedSaleDetails.paymentMethod
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sale Date:</span>
                      <span className="text-white">
                        {format(
                          parseISO(selectedSaleDetails.saleDate),
                          "MMM d, yyyy"
                        )}
                      </span>
                    </div>
                    {selectedSaleDetails.createdBy?.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created By:</span>
                        <span className="text-white">
                          {selectedSaleDetails.createdBy.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Items</h3>
                <div className="bg-[#111111] border border-white/5 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-[#0A0A0A]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          Tax
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          Returned
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedSaleDetails.items?.map(
                        (item: any, index: number) => (
                          <tr
                            key={index}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-white font-medium">
                                  {item.name}
                                </p>
                                {item.isLabor && (
                                  <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                                    Labor
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {item.sku}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {item.quantity} {item.unit}
                              {item.returnedQuantity > 0 && (
                                <div className="text-xs text-[#E84545]">
                                  (Returned: {item.returnedQuantity})
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              QAR {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {item.taxRate}% (QAR {item.taxAmount.toFixed(2)})
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              QAR {item.total.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              {item.returnedQuantity > 0 ? (
                                <span className="text-xs text-[#E84545] bg-[#E84545]/10 px-2 py-1 rounded">
                                  {item.returnedQuantity} returned
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Financial Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-white">
                          QAR {selectedSaleDetails.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tax:</span>
                        <span className="text-white">
                          QAR {selectedSaleDetails.totalTax.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Discount:</span>
                        <span className="text-white">
                          QAR {selectedSaleDetails.totalDiscount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-3">
                        <span className="text-gray-300 font-semibold">
                          Grand Total:
                        </span>
                        <span className="text-white font-bold text-lg">
                          QAR {selectedSaleDetails.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount Paid:</span>
                        <span className="text-green-400 font-medium">
                          QAR {selectedSaleDetails.amountPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Balance Due:</span>
                        <span
                          className={`font-medium ${
                            selectedSaleDetails.balanceDue > 0
                              ? "text-[#E84545]"
                              : selectedSaleDetails.balanceDue < 0
                              ? "text-green-400"
                              : "text-gray-400"
                          }`}
                        >
                          QAR {selectedSaleDetails.balanceDue.toFixed(2)}
                          {selectedSaleDetails.balanceDue < 0 && (
                            <span className="text-xs ml-1 text-gray-400">
                              (Customer Credit)
                            </span>
                          )}
                        </span>
                      </div>
                      {selectedSaleDetails.returns &&
                        selectedSaleDetails.returns.length > 0 && (
                          <div className="flex justify-between border-t border-white/5 pt-3">
                            <span className="text-gray-400">
                              Total Returns:
                            </span>
                            <span className="text-[#E84545] font-medium">
                              QAR{" "}
                              {selectedSaleDetails.returns
                                .reduce(
                                  (sum: number, ret: any) =>
                                    sum + ret.totalAmount,
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Returns History */}
              {selectedSaleDetails.returns &&
                selectedSaleDetails.returns.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Return History
                    </h3>
                    <div className="space-y-4">
                      {selectedSaleDetails.returns.map(
                        (ret: any, index: number) => (
                          <div
                            key={index}
                            className="bg-[#111111] border border-white/5 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-white font-medium">
                                  Return #{ret.returnNumber}
                                </h4>
                                <p className="text-gray-400 text-sm">
                                  {format(
                                    parseISO(ret.returnDate),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )}
                                </p>
                                {ret.reason && (
                                  <p className="text-gray-300 text-sm mt-1">
                                    Reason: {ret.reason}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-[#E84545]">
                                  QAR {ret.totalAmount.toFixed(2)}
                                </span>
                                <p className="text-gray-400 text-sm">
                                  Processed by: {ret.processedByName}
                                </p>
                              </div>
                            </div>

                            <div className="border-t border-white/5 pt-3">
                              <h5 className="text-gray-300 text-sm font-medium mb-2">
                                Returned Items:
                              </h5>
                              <div className="space-y-2">
                                {ret.items.map(
                                  (item: any, itemIndex: number) => (
                                    <div
                                      key={itemIndex}
                                      className="flex justify-between text-sm"
                                    >
                                      <div>
                                        <span className="text-gray-300">
                                          {item.productName}
                                        </span>
                                        <span className="text-gray-500 text-xs ml-2">
                                          ({item.sku})
                                        </span>
                                        {item.reason && (
                                          <div className="text-gray-400 text-xs">
                                            Reason: {item.reason}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="text-gray-300">
                                          {item.quantity} × QAR{" "}
                                          {item.unitPrice.toFixed(2)}
                                        </div>
                                        <div className="text-[#E84545]">
                                          QAR {item.totalAmount.toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Notes */}
              {selectedSaleDetails.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Notes
                  </h3>
                  <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedSaleDetails.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-[#111111]">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Sale ID: {selectedSaleDetails._id}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-3 border border-white/5 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Close
                  </button>
                  {selectedSaleDetails.status === "COMPLETED" && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleReturnSale(selectedSaleDetails);
                      }}
                      className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                    >
                      <Undo className="h-4 w-4" />
                      <span>Return Items</span>
                    </button>
                  )}
                  {selectedSaleDetails.status === "DRAFT" && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleEditSale(selectedSaleDetails);
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit Sale</span>
                    </button>
                  )}
                  {/* Print Invoice Button in Details Modal */}
                  {selectedSaleDetails.status === "COMPLETED" && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handlePrintInvoice(selectedSaleDetails);
                      }}
                      className="px-6 py-3 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-colors flex items-center space-x-2"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Invoice</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
