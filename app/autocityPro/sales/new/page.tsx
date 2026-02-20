// app/autocityPro/sales/new/page.tsx - WITH TIME-BASED THEME
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search,
  Plus,
  Trash2,
  Car,
  ShoppingCart,
  User,
  Wrench,
  X,
  Star,
  Percent,
  Sparkles,
  Filter,
  Briefcase,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";
import {
  carMakesModels,
  carColors,
  carYears,
  CarMake,
} from "@/lib/data/carData";
import toast from "react-hot-toast";
import InvoicePrint from "@/components/InvoicePrint";
import { ChevronLeft, MoreVertical, DollarSign } from "lucide-react";
import { useRef } from "react";

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

// ─── Theme token builder ──────────────────────────────────────────────────────
function buildTheme(isDark: boolean) {
  return {
    // Page
    pageBg:               isDark ? "#050505"                                             : "#f3f4f6",
    // Desktop header
    headerBgFrom:         isDark ? "#932222"                                             : "#fef2f2",
    headerBgVia:          isDark ? "#411010"                                             : "#fee2e2",
    headerBgTo:           isDark ? "#a20c0c"                                             : "#fecaca",
    headerBorder:         isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.06)",
    headerTitle:          isDark ? "#ffffff"                                             : "#7f1d1d",
    headerSub:            isDark ? "rgba(255,255,255,0.90)"                              : "#991b1b",
    headerStatBg:         isDark ? "rgba(255,255,255,0.20)"                              : "rgba(255,255,255,0.70)",
    headerStatBorder:     isDark ? "rgba(255,255,255,0.10)"                              : "rgba(127,29,29,0.15)",
    headerStatLabel:      isDark ? "rgba(255,255,255,0.80)"                              : "#991b1b",
    headerStatValue:      isDark ? "#ffffff"                                             : "#7f1d1d",
    // Mobile header
    mobileHeaderBg:       isDark ? "linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)"    : "linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)",
    mobileHeaderBorder:   isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    mobileHeaderTitle:    isDark ? "#ffffff"                                             : "#111827",
    mobileHeaderSub:      isDark ? "rgba(255,255,255,0.60)"                              : "#6b7280",
    mobileBtnBg:          isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.05)",
    mobileBtnText:        isDark ? "rgba(255,255,255,0.80)"                              : "#374151",
    // Dynamic island
    islandBg:             isDark ? "#000000"                                             : "#ffffff",
    islandBorder:         isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.10)",
    islandText:           isDark ? "#ffffff"                                             : "#111827",
    islandDivider:        isDark ? "rgba(255,255,255,0.20)"                              : "rgba(0,0,0,0.12)",
    // Cards / panels
    cardBg:               isDark ? "#0A0A0A"                                             : "#ffffff",
    cardBorder:           isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    cardTitle:            isDark ? "#ffffff"                                             : "#111827",
    cardSubtext:          isDark ? "#94a3b8"                                             : "#6b7280",
    // Inputs
    inputBg:              isDark ? "#111111"                                             : "#ffffff",
    inputBorder:          isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.12)",
    inputText:            isDark ? "#ffffff"                                             : "#111827",
    inputPlaceholder:     isDark ? "#6b7280"                                             : "#9ca3af",
    // Product items
    productItemBg:        isDark ? "#111111"                                             : "#f9fafb",
    productItemBorder:    isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    productItemName:      isDark ? "#ffffff"                                             : "#111827",
    productItemSku:       isDark ? "#6b7280"                                             : "#9ca3af",
    productItemPrice:     "#E84545",
    productItemStock:     isDark ? "#6b7280"                                             : "#9ca3af",
    // Cart
    cartItemBg:           isDark ? "#111111"                                             : "#f9fafb",
    cartItemBorder:       isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    cartItemName:         isDark ? "#ffffff"                                             : "#111827",
    cartItemMeta:         isDark ? "#9ca3af"                                             : "#6b7280",
    cartItemSku:          isDark ? "#6b7280"                                             : "#9ca3af",
    // Summary panel
    summaryDivider:       isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.06)",
    summaryLabel:         isDark ? "#9ca3af"                                             : "#6b7280",
    summaryValue:         isDark ? "#ffffff"                                             : "#111827",
    summaryBoldLabel:     isDark ? "#d1d5db"                                             : "#374151",
    // Select option bg (browser native)
    optionBg:             isDark ? "#0A0A0A"                                             : "#ffffff",
    // Customer card
    customerCardBg:       isDark ? "#111111"                                             : "#f3f4f6",
    customerCardBorder:   isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    customerCardText:     isDark ? "#ffffff"                                             : "#111827",
    customerCardSub:      isDark ? "#9ca3af"                                             : "#6b7280",
    // Filter panel
    filterPanelBg:        isDark ? "#1e293b"                                             : "#ffffff",
    filterPanelBorder:    isDark ? "#334155"                                             : "rgba(0,0,0,0.10)",
    filterTagBg:          isDark ? "rgba(232,69,69,0.20)"                                : "rgba(232,69,69,0.10)",
    // Modal overlays
    modalOverlay:         isDark ? "rgba(0,0,0,0.70)"                                   : "rgba(0,0,0,0.50)",
    modalBg:              isDark ? "#0A0A0A"                                             : "#ffffff",
    modalBorder:          isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    modalHeaderBg:        isDark ? "linear-gradient(90deg,#0A0A0A,#111111)"              : "linear-gradient(90deg,#ffffff,#f9fafb)",
    modalTitle:           isDark ? "#ffffff"                                             : "#111827",
    modalClose:           isDark ? "#9ca3af"                                             : "#6b7280",
    modalSectionBorder:   isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    modalSectionLabel:    isDark ? "#ffffff"                                             : "#111827",
    modalCancelBg:        "transparent",
    modalCancelBorder:    isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.10)",
    modalCancelText:      isDark ? "#d1d5db"                                             : "#374151",
    // Jobs modal
    jobItemBg:            isDark ? "#111111"                                             : "#f9fafb",
    jobItemBorder:        isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.08)",
    jobItemName:          isDark ? "#ffffff"                                             : "#111827",
    jobItemMeta:          isDark ? "#9ca3af"                                             : "#6b7280",
    jobItemTotal:         isDark ? "#9ca3af"                                             : "#6b7280",
    jobItemTotalVal:      isDark ? "#ffffff"                                             : "#111827",
    // Mobile action menu
    mobileMenuBg:         isDark ? "linear-gradient(180deg,#0A0A0A,#050505)"            : "linear-gradient(180deg,#ffffff,#f9fafb)",
    mobileMenuBorder:     isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.08)",
    mobileMenuTitle:      isDark ? "#ffffff"                                             : "#111827",
    mobileMenuCloseBg:    isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.05)",
    mobileMenuCloseText:  isDark ? "#9ca3af"                                             : "#6b7280",
    mobileMenuItemBg:     isDark ? "rgba(10,10,10,0.50)"                                 : "rgba(0,0,0,0.04)",
    mobileMenuItemBorder: isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.08)",
    mobileMenuItemText:   isDark ? "#d1d5db"                                             : "#374151",
    // Mobile quick stats
    mobileStatBg:         isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.04)",
    mobileStatBorder:     isDark ? "rgba(255,255,255,0.05)"                              : "rgba(0,0,0,0.06)",
    mobileStatLabel:      isDark ? "rgba(255,255,255,0.60)"                              : "#9ca3af",
    mobileStatValue:      isDark ? "#ffffff"                                             : "#111827",
    // Keyboard hints
    kbdPanelBg:           isDark ? "rgba(10,10,10,0.95)"                                 : "rgba(255,255,255,0.95)",
    kbdPanelBorder:       isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.10)",
    kbdLabel:             isDark ? "#9ca3af"                                             : "#6b7280",
    kbdBg:                isDark ? "#111111"                                             : "#f3f4f6",
    kbdBorder:            isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.10)",
    kbdText:              isDark ? "#ffffff"                                             : "#111827",
    kbdTitle:             isDark ? "#ffffff"                                             : "#111827",
    // Empty states
    emptyIcon:            isDark ? "#4b5563"                                             : "#d1d5db",
    emptyText:            isDark ? "#9ca3af"                                             : "#6b7280",
    emptySubtext:         isDark ? "#6b7280"                                             : "#9ca3af",
    // Discount highlight
    discountHighlightBg:  isDark ? "rgba(232,69,69,0.10)"                                : "rgba(232,69,69,0.07)",
    discountHighlightBorder: isDark ? "rgba(232,69,69,0.30)"                            : "rgba(232,69,69,0.25)",
    // Mobile filter
    mobileFilterBg:       isDark ? "linear-gradient(180deg,#050505,#0A0A0A)"            : "linear-gradient(180deg,#ffffff,#f9fafb)",
    mobileFilterBorder:   isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.08)",
    mobileSelectBg:       isDark ? "#0A0A0A"                                             : "#ffffff",
    mobileSelectBorder:   isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.10)",
    mobileSelectText:     isDark ? "#ffffff"                                             : "#111827",
    mobileFilterLabel:    isDark ? "#d1d5db"                                             : "#374151",
    mobileClearBg:        isDark ? "#0A0A0A"                                             : "rgba(0,0,0,0.04)",
    mobileClearBorder:    isDark ? "rgba(255,255,255,0.10)"                              : "rgba(0,0,0,0.08)",
    mobileClearText:      isDark ? "#d1d5db"                                             : "#374151",
  };
}

interface ICustomer {
  _id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;
  createdAt: string;
  updatedAt: string;
}

interface CartItem {
  productId?: string;
  productName: string;
  sku: string;
  isVehicle: boolean;
  isLabor?: boolean;
  unit: string;
  vin?: string;
  carMake?: string;
  carModel?: string;
  year?: number;
  color?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
  subtotal: number;
  total: number;
  profit: number;
}

interface Payment {
  id: string;
  method: "cash" | "card" | "bank_transfer" | "cheque";
  amount: number;
  reference?: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const isDark = useTimeBasedTheme();
  const th = buildTheme(isDark);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  type SalesOverlay = 'mobileMenu' | 'addCustomer' | 'addLabor' | 'mobileFilters' | 'keyboardHints' | 'jobsModal' | null;
  const [activeOverlay, setActiveOverlay] = useState<SalesOverlay>(null);
  const showMobileMenu = activeOverlay === 'mobileMenu';
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([
    { id: 'init-0', method: "card", amount: 0 },
  ]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");

  const [invoiceCustomer, setInvoiceCustomer] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const showAddCustomer = activeOverlay === 'addCustomer';
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    vehicleRegistrationNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    vehicleVIN: "",
  });

  const showAddLabor = activeOverlay === 'addLabor';
  const [laborCharge, setLaborCharge] = useState({
    description: "",
    hours: 1,
    rate: 0,
    taxRate: 0,
  });

  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMake, setFilterMake] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const showMobileFilters = activeOverlay === 'mobileFilters';
  const [categories, setCategories] = useState<any[]>([]);
  const showKeyboardHints = activeOverlay === 'keyboardHints';

  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const showJobsModal = activeOverlay === 'jobsModal';
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchFrequentProducts();
    fetchCustomers();
    fetchCategories();
    fetchCompletedJobs();
  }, []);

  useEffect(() => {
    const totals = calculateTotals();
    if (payments.length === 1 && cart.length > 0) {
      setPayments([{ ...payments[0], amount: totals.total }]);
    }
  }, [cart, overallDiscount, overallDiscountType]);

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const filteredProducts = products.filter((p) => {
    if (filterYear !== "all" && filterYear !== "") {
      if (!checkYearMatch(p, parseInt(filterYear))) return false;
    }
    if (filterMake !== "all" && filterMake !== "") {
      if (p.carMake !== filterMake) return false;
    }
    if (filterCategory !== "all" && filterCategory !== "") {
      const productCategoryId =
        p.category?._id?.toString() || p.category?.toString();
      if (productCategoryId !== filterCategory.toString()) return false;
    }
    return true;
  });

  useEffect(() => {
    const delay = setTimeout(() => fetchProducts(searchTerm), 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        if (e.key === "Escape") {
          if (activeOverlay) setActiveOverlay(null);
          return;
        }
        return;
      }

      const handledKeys = ["f", "c", "l", "p", "s", "j", "Escape", "ArrowDown", "ArrowUp", "+", "=", "h"];
      if (handledKeys.includes(e.key.toLowerCase()) || handledKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key.toLowerCase()) {
        case "f":
          (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus();
          break;
        case "c":
          setActiveOverlay(prev => prev === 'addCustomer' ? null : 'addCustomer');
          break;
        case "l":
          setActiveOverlay(prev => prev === 'addLabor' ? null : 'addLabor');
          break;
        case "j":
          if (completedJobs.length > 0) setActiveOverlay(prev => prev === 'jobsModal' ? null : 'jobsModal');
          break;
        case "p":
          (document.querySelector('input[placeholder="Amount"]') as HTMLInputElement)?.focus();
          break;
        case "s":
          if (cart.length > 0 && selectedCustomer && !loading) handleSubmit();
          break;
        case "h":
          setActiveOverlay(prev => prev === 'keyboardHints' ? null : 'keyboardHints');
          break;
        case "escape":
          if (activeOverlay) setActiveOverlay(null);
          else if (searchTerm) setSearchTerm("");
          break;
        case "arrowdown":
          if (searchTerm && filteredProducts.length > 0) {
            (document.querySelector('[data-search-item="0"]') as HTMLElement)?.focus();
          } else if (!searchTerm && frequentProducts.length > 0) {
            (document.querySelector('[data-product-item="0"]') as HTMLElement)?.focus();
          }
          break;
        case "+":
        case "=":
          if (!searchTerm && frequentProducts.length > 0) addToCart(frequentProducts[0]);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    cart, selectedCustomer, loading, searchTerm, filteredProducts,
    frequentProducts, activeOverlay, completedJobs,
  ]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchProducts = async (search = "") => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.append("search", search);
      const res = await fetch(`/api/products?${params.toString()}`, { credentials: "include" });
      if (res.ok) setProducts((await res.json()).products || []);
    } catch {}
  };

  const fetchFrequentProducts = async () => {
    try {
      const res = await fetch("/api/products/frequent", { credentials: "include" });
      if (res.ok) {
        setFrequentProducts((await res.json()).products || []);
      } else {
        const res2 = await fetch("/api/products?limit=6", { credentials: "include" });
        if (res2.ok) setFrequentProducts(((await res2.json()).products || []).slice(0, 6));
      }
    } catch {}
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (res.ok) setCustomers((await res.json()).customers || []);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (res.ok) setCategories((await res.json()).categories || []);
    } catch {}
  };

  const fetchCompletedJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/jobs?status=COMPLETED&convertedToSale=false&limit=50", { credentials: "include" });
      if (res.ok) setCompletedJobs((await res.json()).jobs || []);
    } catch {}
    finally { setLoadingJobs(false); }
  };

  const loadJobIntoCart = (job: any) => {
    setActiveJobId(job._id);
    const customerData = job.customerId;
    setSelectedCustomer({
      _id: customerData._id || customerData,
      name: job.customerName,
      phone: customerData.phone || "",
      email: customerData.email || "",
      vehicleRegistrationNumber: job.vehicleRegistrationNumber || customerData.vehicleRegistrationNumber,
    });
    setCart([]);
    const jobItems = job.items.map((item: any) => {
      const actualPrice = item.actualPrice ?? item.estimatedPrice;
      let itemDiscount = item.discountType === "percentage"
        ? (actualPrice * item.quantity * item.discount) / 100
        : item.discount || 0;
      const itemSubtotal = actualPrice * item.quantity - itemDiscount;
      const itemTotal = itemSubtotal * (1 + (item.taxRate || 0) / 100);
      return {
        productId: item.productId || undefined,
        productName: item.productName,
        sku: item.sku,
        isVehicle: false,
        isLabor: item.isLabor || false,
        unit: item.unit || "pcs",
        quantity: item.quantity,
        costPrice: item.isLabor ? 0 : item.costPrice || 0,
        sellingPrice: actualPrice,
        discount: item.discount || 0,
        discountType: item.discountType || "percentage",
        taxRate: item.taxRate || 0,
        subtotal: itemSubtotal,
        total: itemTotal,
        profit: item.isLabor ? actualPrice * item.quantity : (actualPrice - (item.costPrice || 0)) * item.quantity,
      };
    });
    setCart(jobItems);
    setActiveOverlay(null);
    toast.success(`Loaded job ${job.jobNumber} into cart`);
  };

  const generateCustomerCode = (name: string) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 10);
    return `${code}${Date.now().toString().slice(-4)}`;
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Name and phone are required");
      return;
    }
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newCustomer.name,
          code: generateCustomerCode(newCustomer.name),
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: { street: newCustomer.address, city: "", state: "", country: "Qatar", postalCode: "" },
          vehicleRegistrationNumber: newCustomer.vehicleRegistrationNumber,
          vehicleMake: newCustomer.vehicleMake,
          vehicleModel: newCustomer.vehicleModel,
          vehicleYear: newCustomer.vehicleYear ? parseInt(newCustomer.vehicleYear) : undefined,
          vehicleColor: newCustomer.vehicleColor,
          vehicleVIN: newCustomer.vehicleVIN,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Customer added!");
        setCustomers([...customers, data.customer]);
        setSelectedCustomer(data.customer);
        setActiveOverlay(null);
        setNewCustomer({ name: "", phone: "", email: "", address: "", vehicleRegistrationNumber: "", vehicleMake: "", vehicleModel: "", vehicleYear: "", vehicleColor: "", vehicleVIN: "" });
      } else {
        toast.error((await res.json()).error || "Failed to add customer");
      }
    } catch { toast.error("Failed to add customer"); }
  };

  const handleAddLabor = () => {
    if (!laborCharge.description) { toast.error("Labor description is required"); return; }
    const amount = laborCharge.hours * laborCharge.rate;
    setCart([...cart, {
      productName: `Labor: ${laborCharge.description}`,
      sku: "LABOR",
      isVehicle: false,
      isLabor: true,
      unit: "job",
      quantity: laborCharge.hours,
      costPrice: 0,
      sellingPrice: laborCharge.rate,
      discount: 0,
      discountType: "percentage",
      taxRate: laborCharge.taxRate,
      subtotal: amount,
      total: amount * (1 + laborCharge.taxRate / 100),
      profit: amount,
    }]);
    setActiveOverlay(null);
    setLaborCharge({ description: "", hours: 1, rate: 0, taxRate: 0 });
    toast.success("Labor charge added!");
  };

  function isValidCarMake(make: any): make is CarMake {
    return Object.keys(carMakesModels).includes(make);
  }

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.productId === product._id);
    if (existing) {
      updateCartItem(existing.productId!, "quantity", existing.quantity + 1);
    } else {
      setCart([...cart, {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        isVehicle: product.isVehicle || false,
        isLabor: false,
        unit: product.unit || "pcs",
        vin: product.vin,
        carMake: product.carMake,
        carModel: product.carModel,
        year: product.year,
        color: product.color,
        quantity: 1,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice,
        discount: 0,
        discountType: "percentage",
        taxRate: product.taxRate || 0,
        subtotal: product.sellingPrice,
        total: product.sellingPrice * (1 + (product.taxRate || 0) / 100),
        profit: product.sellingPrice - (product.costPrice || 0),
      }]);
    }
    toast.success("Added to cart");
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    toast.success("Removed from cart");
  };

  const updateCartItem = (productId: string, field: string, value: any) => {
    setCart(cart.map((item) => {
      if (item.productId !== productId) return item;
      const updated = { ...item, [field]: value };
      const discountAmount = updated.discountType === "percentage"
        ? (updated.sellingPrice * updated.quantity * updated.discount) / 100
        : updated.discount;
      const discountedPrice = updated.sellingPrice * updated.quantity - discountAmount;
      updated.subtotal = discountedPrice;
      updated.total = updated.subtotal * (1 + updated.taxRate / 100);
      updated.profit = (updated.sellingPrice - updated.costPrice) * updated.quantity - discountAmount;
      return updated;
    }));
  };

  const updatePayment = (index: number, field: string, value: any) =>
    setPayments(payments.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const calculateTotals = () => {
    const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
    const totalDiscount = cart.reduce((s, i) =>
      s + (i.discountType === "percentage"
        ? (i.sellingPrice * i.quantity * i.discount) / 100
        : i.discount), 0);
    const overallDiscountAmount = overallDiscountType === "percentage"
      ? (subtotal - totalDiscount) * (overallDiscount / 100)
      : overallDiscount;
    const subtotalAfterDiscount = subtotal - totalDiscount - overallDiscountAmount;
    const totalTax = cart.reduce((s, i) => {
      const d = i.discountType === "percentage"
        ? (i.sellingPrice * i.quantity * i.discount) / 100 : i.discount;
      return s + ((i.sellingPrice * i.quantity - d) * i.taxRate) / 100;
    }, 0);
    const total = subtotalAfterDiscount + totalTax;
    const totalProfit = cart.reduce((s, i) => s + i.profit, 0);
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    return { subtotal, totalDiscount, overallDiscountAmount, totalTax, total, totalProfit, totalPaid };
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (!selectedCustomer) { toast.error("Please select a customer"); return; }

    setInvoiceCustomer(selectedCustomer);
    const totals = calculateTotals();

    const saleItems = cart.map((item) => {
      const discountAmount = item.discountType === "percentage"
        ? (item.sellingPrice * item.quantity * item.discount) / 100 : item.discount;
      const discountPercentage = item.discountType === "percentage" ? item.discount
        : item.sellingPrice * item.quantity > 0
          ? (item.discount / (item.sellingPrice * item.quantity)) * 100 : 0;
      return {
        ...(item.isLabor ? {} : { productId: item.productId }),
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit || "pcs",
        unitPrice: item.sellingPrice,
        taxRate: item.taxRate,
        discount: discountPercentage,
        discountAmount,
        discountType: item.discountType,
        isLabor: item.isLabor || false,
      };
    });

    const paymentDetails = payments.filter((p) => p.amount > 0).map((p) => ({
      method: p.method.toUpperCase(),
      amount: Number(p.amount),
      reference: p.reference || undefined,
    }));
    if (paymentDetails.length === 0) paymentDetails.push({ method: "CASH", amount: 0, reference: undefined });

    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          customerName: selectedCustomer.name,
          items: saleItems,
          payments: paymentDetails,
          paymentMethod: paymentDetails[0].method,
          amountPaid: totals.totalPaid,
          notes: "",
          overallDiscount,
          overallDiscountType,
          overallDiscountAmount: totals.overallDiscountAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Sale ${data.sale.invoiceNumber} created successfully!`);

        if (activeJobId) {
          await fetch(`/api/jobs/${activeJobId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ convertedToSale: true, status: "COMPLETED" }),
          });
        }

        setInvoiceData({
          invoiceNumber: data.sale.invoiceNumber,
          saleDate: data.sale.saleDate,
          items: cart.map((item) => {
            const discountAmount = item.discountType === "percentage"
              ? (item.sellingPrice * item.quantity * item.discount) / 100 : item.discount;
            const itemSubtotal = item.sellingPrice * item.quantity - discountAmount;
            return {
              name: item.productName,
              quantity: item.quantity,
              unitPrice: item.sellingPrice,
              discount: discountAmount,
              taxAmount: (itemSubtotal * item.taxRate) / 100,
              total: item.total,
              isLabor: item.isLabor,
            };
          }),
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount + totals.overallDiscountAmount,
          totalTax: totals.totalTax,
          grandTotal: totals.total,
          amountPaid: totals.totalPaid,
          balanceDue: totals.total - totals.totalPaid,
          paymentMethods: paymentDetails,
          paymentMethod: paymentDetails[0].method,
          notes: "",
        });

        setShowInvoice(true);
        setCart([]);
        setSelectedCustomer(null);
        setPayments([{ id: `payment-${Date.now()}`, method: "cash", amount: 0 }]);
        setOverallDiscount(0);
        setActiveJobId(null);
        fetchProducts();
        fetchFrequentProducts();
        fetchCompletedJobs();
      } else {
        toast.error((await res.json()).error || "Failed to create sale");
      }
    } catch { toast.error("Failed to create sale"); }
    finally { setLoading(false); }
  };

  const findExactSkuMatch = (sku: string) =>
    products.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());

  const checkYearMatch = (product: any, year: number): boolean => {
    if (!product.isVehicle || !year) return true;
    const { yearFrom, yearTo } = product;
    if (!yearFrom && !yearTo) return true;
    if (yearFrom && !yearTo) return year >= yearFrom;
    if (!yearFrom && yearTo) return year <= yearTo;
    return year >= yearFrom && year <= yearTo;
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 32 }, (_, i) => currentYear + 2 - i);
  const availableMakes = [...new Set(products.filter((p) => p.carMake).map((p) => p.carMake))].sort();
  const availableCarMakes = Object.keys(carMakesModels);

  const clearFilters = () => { setFilterYear("all"); setFilterMake("all"); setFilterCategory("all"); };

  const activeFilterCount = [filterYear !== "all", filterMake !== "all", filterCategory !== "all"].filter(Boolean).length;

  const totals = calculateTotals();

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000)   return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  // ─── Shared inline style helpers ─────────────────────────────────────────
  const inputStyle = {
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    color: th.inputText,
  };
  const selectOptBg = th.optionBg;

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Smooth theme transition wrapper */}
      <div style={{ transition: "background 0.5s ease, color 0.5s ease" }}>

        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div
              className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-3 w-3 text-[#E84545]" />
                <span className="text-xs font-semibold" style={{ color: th.islandText }}>{cart.length}</span>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                <DollarSign className="h-3 w-3 text-green-400" />
                <span className="text-xs font-medium" style={{ color: th.islandText }}>
                  {totals.total > 0 ? formatCompactCurrency(totals.total) : "QR0"}
                </span>
                {selectedCustomer && (
                  <>
                    <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                    <User className="h-3 w-3 text-blue-400" />
                  </>
                )}
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div
          className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}`, transition: "background 0.5s ease" }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>New Sale</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>
                    {cart.length} items • {formatCompactCurrency(totals.total)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveOverlay('mobileMenu')}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {cart.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Cart Total", value: formatCompactCurrency(totals.total) },
                  { label: "Items",      value: String(cart.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg px-3 py-2" style={{ background: th.mobileStatBg, border: `1px solid ${th.mobileStatBorder}` }}>
                    <p className="text-[10px] uppercase" style={{ color: th.mobileStatLabel }}>{label}</p>
                    <p className="text-sm font-bold truncate" style={{ color: th.mobileStatValue }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div
          className="hidden md:block py-4 md:py-8 border-b shadow-lg overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`,
            borderColor: th.headerBorder,
            transition: "background 0.5s ease",
          }}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20" />
          <div className="px-4 md:px-6 relative z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-3xl font-bold mb-1 flex items-center" style={{ color: th.headerTitle }}>
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 mr-2" style={{ color: th.headerTitle }} />
                  New Sale
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm md:text-base" style={{ color: th.headerSub }}>Create a new sales transaction</p>
                  {/* <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      background: isDark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.60)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(127,29,29,0.20)"}`,
                      color: isDark ? "rgba(255,255,255,0.70)" : "#7f1d1d",
                    }}
                  >
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    <span>{isDark ? "Night" : "Day"} mode</span>
                  </div> */}
                </div>
              </div>
              <div className="flex gap-3 md:gap-5">
                {[
                  { label: "Cart Items", value: cart.length },
                  { label: "Total",      value: `QAR ${totals.total.toFixed(2)}`, large: true },
                ].map(({ label, value, large }) => (
                  <div
                    key={label}
                    className="flex-1 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
                    style={{ background: th.headerStatBg, border: `1px solid ${th.headerStatBorder}` }}
                  >
                    <p className={`${large ? "text-xs md:text-sm" : "text-xs md:text-sm"}`} style={{ color: th.headerStatLabel }}>{label}</p>
                    <p className={`${large ? "text-lg md:text-xl font-bold" : "text-base md:text-lg font-semibold"}`} style={{ color: th.headerStatValue }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div
          className="px-4 md:px-6 pt-[180px] md:pt-6 pb-6 min-h-screen"
          style={{ background: th.pageBg, transition: "background 0.5s ease" }}
        >
          <div className="p-6 min-h-screen" style={{ background: th.pageBg }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── Left column: Products + Cart ───────────────────────── */}
              <div className="lg:col-span-2 space-y-6">

                {/* Frequent Products */}
                {!searchTerm && frequentProducts.length > 0 && (
                  <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                    <h2 className="text-lg font-semibold mb-4 flex items-center" style={{ color: th.cardTitle }}>
                      <Star className="h-5 w-5 mr-2 text-[#E84545]" />
                      Frequent Products
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {frequentProducts.map((product, index) => (
                        <div
                          key={product._id}
                          role="button"
                          data-product-item={index}
                          tabIndex={0}
                          onClick={() => addToCart(product)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addToCart(product); }
                            if (e.key === "ArrowRight" && index < frequentProducts.length - 1)
                              (document.querySelector(`[data-product-item="${index + 1}"]`) as HTMLElement)?.focus();
                            if (e.key === "ArrowLeft" && index > 0)
                              (document.querySelector(`[data-product-item="${index - 1}"]`) as HTMLElement)?.focus();
                            if (e.key === "ArrowUp")
                              (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus();
                          }}
                          className="p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                          style={{ background: th.productItemBg, border: `1px solid ${th.productItemBorder}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(232,69,69,0.50)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = th.productItemBorder)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate group-hover:text-[#E84545] transition-colors" style={{ color: th.productItemName }}>
                                {product.name}
                              </h3>
                              <p className="text-xs truncate" style={{ color: th.productItemSku }}>{product.sku}</p>
                              {product.isVehicle && (
                                <div className="flex items-center mt-1">
                                  <Car className="h-3 w-3 text-[#E84545] mr-1" />
                                  <span className="text-xs text-[#E84545] truncate">{product.carMake}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-2">
                              <p className="font-bold text-sm text-[#E84545]">QAR {product.sellingPrice}</p>
                              <p className="text-xs" style={{ color: th.productItemStock }}>Stock: {product.currentStock}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Section */}
                <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-5 w-5" style={{ color: th.inputPlaceholder }} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const exact = findExactSkuMatch(searchTerm.trim());
                            if (exact) { addToCart(exact); setSearchTerm(""); searchInputRef.current?.focus(); e.preventDefault(); }
                          }
                        }}
                        placeholder="Search by name, SKU, barcode..."
                        className="w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        style={inputStyle}
                      />
                    </div>

                    {/* Filter toggle */}
                    <button
                      onClick={() => isMobile ? setActiveOverlay('mobileFilters') : setShowDesktopFilters(!showDesktopFilters)}
                      className="flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors"
                      style={{
                        background: (isMobile ? showMobileFilters : showDesktopFilters) || activeFilterCount > 0
                          ? "rgba(232,69,69,0.20)" : "transparent",
                        border: `1px solid ${(isMobile ? showMobileFilters : showDesktopFilters) || activeFilterCount > 0
                          ? "rgba(232,69,69,0.30)" : th.cardBorder}`,
                        color: th.cardTitle,
                      }}
                    >
                      <Filter className="h-5 w-5" />
                      <span className="hidden md:inline">Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 bg-[#E84545] text-white text-xs rounded-full font-semibold">{activeFilterCount}</span>
                      )}
                    </button>

                    {/* Load Jobs */}
                    {completedJobs.length > 0 && (
                      <button
                        onClick={() => setActiveOverlay('jobsModal')}
                        className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 whitespace-nowrap transition-all shadow-lg relative"
                      >
                        <Briefcase className="h-5 w-5" />
                        <span className="hidden md:inline">Load Jobs</span>
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {completedJobs.length}
                        </span>
                      </button>
                    )}

                    {/* Add Labor */}
                    <button
                      onClick={() => setActiveOverlay('addLabor')}
                      className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] whitespace-nowrap transition-all shadow-lg hover:shadow-[#E84545]/30"
                    >
                      <Wrench className="h-5 w-5" />
                      <span className="hidden md:inline">Add Labor</span>
                    </button>
                  </div>

                  {/* Desktop Filters */}
                  {showDesktopFilters && !isMobile && (
                    <div
                      className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t animate-in slide-in-from-top duration-200"
                      style={{ borderColor: th.cardBorder }}
                    >
                      {[
                        {
                          label: "Category",
                          value: filterCategory,
                          onChange: setFilterCategory,
                          opts: [["all", "All Categories"], ...categories.map((c) => [c._id, c.name])],
                        },
                        {
                          label: "Vehicle Make",
                          value: filterMake,
                          onChange: setFilterMake,
                          opts: [["all", "All Makes"], ...availableMakes.map((m) => [m, m])],
                        },
                        {
                          label: "Vehicle Year",
                          value: filterYear,
                          onChange: setFilterYear,
                          opts: [["all", "All Years"], ...yearOptions.map((y) => [String(y), String(y)])],
                        },
                      ].map(({ label, value, onChange, opts }) => (
                        <div key={label}>
                          <label className="block text-sm font-medium mb-2" style={{ color: th.cardSubtext }}>{label}</label>
                          <select
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                            style={inputStyle}
                          >
                            {opts.map(([v, l]) => <option key={v} value={v} style={{ background: selectOptBg }}>{l}</option>)}
                          </select>
                        </div>
                      ))}
                      <div className="flex items-end">
                        <button
                          onClick={clearFilters}
                          disabled={activeFilterCount === 0}
                          className="w-full px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: "rgba(232,69,69,0.10)",
                            border: `1px solid rgba(232,69,69,0.30)`,
                            color: th.cardTitle,
                          }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active filter chips */}
                  {activeFilterCount > 0 && !showDesktopFilters && !isMobile && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {filterCategory !== "all" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: "rgba(232,69,69,0.20)", border: "1px solid rgba(232,69,69,0.30)" }}>
                          Category: {categories.find((c) => c._id === filterCategory)?.name}
                          <button onClick={() => setFilterCategory("all")} className="ml-1 hover:text-[#E84545]"><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {filterMake !== "all" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: "rgba(232,69,69,0.20)", border: "1px solid rgba(232,69,69,0.30)" }}>
                          Make: {filterMake}
                          <button onClick={() => setFilterMake("all")} className="ml-1 hover:text-[#E84545]"><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {filterYear !== "all" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: "rgba(232,69,69,0.20)", border: "1px solid rgba(232,69,69,0.30)" }}>
                          Year: {filterYear}
                          <button onClick={() => setFilterYear("all")} className="ml-1 hover:text-[#E84545]"><X className="h-3 w-3" /></button>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Search Results */}
                  {searchTerm && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm" style={{ color: th.cardSubtext }}>
                          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
                        </p>
                        {activeFilterCount > 0 && (
                          <button onClick={clearFilters} className="text-xs text-[#E84545] hover:text-[#cc3c3c] transition-colors">
                            Clear all filters
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className="col-span-2 text-center py-8">
                            <Search className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                            <p style={{ color: th.emptyText }}>No products found</p>
                            <p className="text-sm mt-2" style={{ color: th.emptySubtext }}>Try adjusting your search or filters</p>
                          </div>
                        ) : (
                          filteredProducts.map((product, index) => (
                            <div
                              key={product._id}
                              role="button"
                              data-search-item={index}
                              tabIndex={0}
                              onClick={() => addToCart(product)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addToCart(product); }
                                if (e.key === "ArrowDown" && index < filteredProducts.length - 1)
                                  (document.querySelector(`[data-search-item="${index + 1}"]`) as HTMLElement)?.focus();
                                if (e.key === "ArrowUp") {
                                  if (index > 0) (document.querySelector(`[data-search-item="${index - 1}"]`) as HTMLElement)?.focus();
                                  else (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus();
                                }
                              }}
                              className="p-4 rounded-lg cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                              style={{ background: th.productItemBg, border: `1px solid ${th.productItemBorder}` }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(232,69,69,0.50)")}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = th.productItemBorder)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold group-hover:text-[#E84545] transition-colors truncate" style={{ color: th.productItemName }}>
                                    {product.name}
                                  </h3>
                                  <div className="space-y-1 mt-1">
                                    <p className="text-xs truncate" style={{ color: th.productItemSku }}>
                                      SKU: {product.sku}{product.partNumber && ` | Part#: ${product.partNumber}`}
                                    </p>
                                    {product.category?.name && <p className="text-xs truncate" style={{ color: th.emptySubtext }}>{product.category.name}</p>}
                                    {product.isVehicle && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <Car className="h-3 w-3 text-[#E84545]" />
                                        <span className="text-xs text-[#E84545]">{product.carMake} {product.carModel}{product.variant && ` ${product.variant}`}</span>
                                        {(product.yearFrom || product.yearTo) && (
                                          <span className="text-xs" style={{ color: th.productItemSku }}>
                                            | {product.yearFrom && product.yearTo ? `${product.yearFrom}-${product.yearTo}` : product.yearFrom ? `${product.yearFrom}+` : `Up to ${product.yearTo}`}
                                          </span>
                                        )}
                                        {product.color && <span className="text-xs" style={{ color: th.productItemSku }}>| {product.color}</span>}
                                      </div>
                                    )}
                                    {product.vin && <p className="text-xs font-mono truncate" style={{ color: th.productItemSku }}>VIN: {product.vin}</p>}
                                  </div>
                                </div>
                                <div className="text-right ml-3 flex-shrink-0">
                                  <p className="font-bold text-[#E84545] whitespace-nowrap">QAR {product.sellingPrice}</p>
                                  <p className="text-xs" style={{ color: th.productItemStock }}>Stock: {product.currentStock}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart */}
                <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: th.cardTitle }}>
                    <ShoppingCart className="h-5 w-5 mr-2 text-[#E84545]" />
                    Cart ({cart.length} items)
                  </h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {cart.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                        <p style={{ color: th.emptyText }}>Your cart is empty</p>
                        <p className="text-sm mt-2" style={{ color: th.emptySubtext }}>Add products from above</p>
                      </div>
                    ) : (
                      cart.map((item, index) => (
                        <div key={item.productId || `${item.sku}-${index}`} className="rounded-lg p-4 group" style={{ background: th.cartItemBg, border: `1px solid ${th.cartItemBorder}` }}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold flex items-center" style={{ color: th.cartItemName }}>
                                {item.isLabor && <Wrench className="h-4 w-4 mr-2 text-[#E84545]" />}
                                {item.productName}
                              </h3>
                              {item.isVehicle && (
                                <p className="text-sm" style={{ color: th.cartItemMeta }}>
                                  {item.carMake} {item.carModel} {item.year} - {item.color}
                                </p>
                              )}
                              <p className="text-xs mt-1" style={{ color: th.cartItemSku }}>SKU: {item.sku}</p>
                            </div>
                            <button onClick={() => removeFromCart(index)} className="text-[#E84545] hover:text-[#cc3c3c] transition-colors">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          {!item.isLabor && (
                            <>
                              <div className="grid grid-cols-4 gap-2 mt-3">
                                <input type="number" value={item.quantity} min="1" placeholder="Qty"
                                  onChange={(e) => updateCartItem(item.productId!, "quantity", parseFloat(e.target.value) || 1)}
                                  className="px-3 py-2 rounded text-sm focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                                  style={inputStyle} />
                                <input type="number" value={item.sellingPrice} min="0" placeholder="Price"
                                  onChange={(e) => updateCartItem(item.productId!, "sellingPrice", parseFloat(e.target.value) || 0)}
                                  className="px-3 py-2 rounded text-sm focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                                  style={inputStyle} />
                                <input type="number" value={item.discount} min="0"
                                  placeholder={item.discountType === "percentage" ? "%" : "QAR"}
                                  onChange={(e) => updateCartItem(item.productId!, "discount", parseFloat(e.target.value) || 0)}
                                  className="px-3 py-2 rounded text-sm focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                                  style={inputStyle} />
                                <button
                                  onClick={() => updateCartItem(item.productId!, "discountType", item.discountType === "percentage" ? "fixed" : "percentage")}
                                  className="px-2 py-2 rounded text-xs flex items-center justify-center transition-colors hover:bg-[#E84545]/10"
                                  style={inputStyle}
                                  title={`Switch to ${item.discountType === "percentage" ? "Fixed" : "Percentage"}`}
                                >
                                  {item.discountType === "percentage" ? <Percent className="h-4 w-4" style={{ color: th.cartItemName }} /> : <span className="font-bold" style={{ color: th.cartItemName }}>QAR</span>}
                                </button>
                              </div>
                              {item.discount > 0 && (
                                <div className="mt-2 text-xs text-[#E84545]">
                                  Discount: {item.discountType === "percentage"
                                    ? `${item.discount}% (QAR ${((item.sellingPrice * item.quantity * item.discount) / 100).toFixed(2)})`
                                    : `QAR ${item.discount.toFixed(2)} (${((item.discount / (item.sellingPrice * item.quantity)) * 100).toFixed(1)}%)`}
                                </div>
                              )}
                            </>
                          )}

                          <div className="mt-3 flex justify-between items-center text-sm">
                            <div style={{ color: th.cartItemMeta }}>
                              {item.discount > 0 && (
                                <span className="line-through mr-2" style={{ color: th.emptySubtext }}>
                                  QAR {(item.sellingPrice * item.quantity).toFixed(2)}
                                </span>
                              )}
                              <span>Total:</span>
                            </div>
                            <span className="font-bold" style={{ color: th.cartItemName }}>QAR {item.total.toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* ── Sidebar ─────────────────────────────────────────────── */}
              <div className="space-y-6">

                {/* Customer */}
                <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: th.cardTitle }}>Customer</h2>
                  <div className="mb-3">
                    <select
                      value={selectedCustomer?._id || ""}
                      onChange={(e) => setSelectedCustomer(customers.find((c) => c._id === e.target.value))}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      style={inputStyle}
                    >
                      <option value="" style={{ background: selectOptBg }}>Select Customer</option>
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer._id} style={{ background: selectOptBg }}>
                          {customer.name} - {customer.phone}{customer.vehicleRegistrationNumber && ` - ${customer.vehicleRegistrationNumber}`}
                        </option>
                      ))}
                    </select>
                    {selectedCustomer && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: th.customerCardBg, border: `1px solid ${th.customerCardBorder}` }}>
                        <p className="font-medium" style={{ color: th.customerCardText }}>{selectedCustomer.name}</p>
                        <p className="text-sm" style={{ color: th.customerCardSub }}>{selectedCustomer.phone}</p>
                        {selectedCustomer.vehicleRegistrationNumber && (
                          <p className="text-xs mt-1" style={{ color: th.customerCardSub }}>Vehicle: {selectedCustomer.vehicleRegistrationNumber}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveOverlay('addCustomer')}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-3 border-2 border-dashed border-[#E84545]/50 text-[#E84545] rounded-lg hover:border-[#E84545] hover:bg-[#E84545]/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Quick Add Customer (C)</span>
                  </button>
                </div>

                {/* Overall Discount */}
                <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: th.cardTitle }}>Overall Discount</h2>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="number"
                      value={overallDiscount}
                      onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      className="flex-1 px-3 py-2 rounded-lg focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                      style={inputStyle}
                    />
                    <select
                      value={overallDiscountType}
                      onChange={(e) => setOverallDiscountType(e.target.value as any)}
                      className="px-3 py-2 rounded-lg focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                      style={inputStyle}
                    >
                      <option value="percentage" style={{ background: selectOptBg }}>%</option>
                      <option value="fixed"      style={{ background: selectOptBg }}>QAR</option>
                    </select>
                  </div>
                  {overallDiscount > 0 && (
                    <div className="p-3 rounded-lg" style={{ background: th.discountHighlightBg, border: `1px solid ${th.discountHighlightBorder}` }}>
                      <p className="text-sm text-[#E84545] font-medium">Discount: QAR {totals.overallDiscountAmount.toFixed(2)}</p>
                      <p className="text-xs mt-1" style={{ color: th.cardSubtext }}>
                        {overallDiscountType === "percentage" ? `${overallDiscount}% off subtotal` : `Fixed discount of QAR ${overallDiscount}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment */}
                <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: th.cardTitle }}>Payment</h2>
                  {payments.map((payment, index) => (
                    <div key={payment.id} className="mb-4 p-3 rounded-lg" style={{ background: th.customerCardBg, border: `1px solid ${th.customerCardBorder}` }}>
                      <select
                        value={payment.method}
                        onChange={(e) => updatePayment(index, "method", e.target.value)}
                        className="w-full px-3 py-2 mb-2 rounded text-sm focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                        style={inputStyle}
                      >
                        {["cash", "card", "bank_transfer", "cheque"].map((m) => (
                          <option key={m} value={m} style={{ background: selectOptBg }}>
                            {m.charAt(0).toUpperCase() + m.slice(1).replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={payment.amount}
                        onChange={(e) => updatePayment(index, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="Amount"
                        className="w-full px-3 py-2 rounded text-sm focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                        style={inputStyle}
                      />
                      {(payment.method === "bank_transfer" || payment.method === "cheque" || payment.reference) && (
                        <input
                          type="text"
                          value={payment.reference || ""}
                          onChange={(e) => updatePayment(index, "reference", e.target.value)}
                          placeholder="Reference / Cheque No."
                          className="w-full px-3 py-2 mt-2 rounded text-sm focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setPayments([...payments, { id: `payment-${Date.now()}`, method: "cash", amount: 0 }])}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:text-[#E84545]"
                    style={{ border: `1px dashed ${th.cardBorder}`, color: th.cardSubtext }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#E84545")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = th.cardBorder)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Payment Method</span>
                  </button>
                </div>

                {/* Summary */}
                <div className="rounded-lg shadow-lg p-6" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-lg font-bold mb-4" style={{ color: th.cardTitle }}>Summary</h2>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: "Subtotal:", value: `QAR ${totals.subtotal.toFixed(2)}`, show: true },
                      { label: "Item Discount:", value: `-QAR ${totals.totalDiscount.toFixed(2)}`, show: totals.totalDiscount > 0, red: true },
                      { label: "Overall Discount:", value: `-QAR ${totals.overallDiscountAmount.toFixed(2)}`, show: totals.overallDiscountAmount > 0, red: true },
                      { label: "Tax:", value: `QAR ${totals.totalTax.toFixed(2)}`, show: true },
                    ].filter((r) => r.show).map(({ label, value, red }) => (
                      <div key={label} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${th.summaryDivider}` }}>
                        <span style={{ color: th.summaryLabel }}>{label}</span>
                        <span style={{ color: red ? "#E84545" : th.summaryValue }}>{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 font-bold text-lg" style={{ borderTop: `1px solid ${th.summaryDivider}` }}>
                      <span style={{ color: th.summaryValue }}>Total:</span>
                      <span style={{ color: th.summaryValue }}>QAR {totals.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2" style={{ borderTop: `1px solid ${th.summaryDivider}` }}>
                      <span style={{ color: th.summaryLabel }}>Paid:</span>
                      <span style={{ color: th.summaryValue }}>QAR {totals.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 font-semibold">
                      <span style={{ color: th.summaryBoldLabel }}>Balance:</span>
                      <span className="text-[#E84545]">QAR {(totals.total - totals.totalPaid).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0 || !selectedCustomer}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg font-semibold hover:from-[#cc3c3c] hover:to-[#E84545] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[#E84545]/30"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : "Complete Sale (S)"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Action Menu */}
          {showMobileMenu && (
            <div className="md:hidden fixed inset-0 backdrop-blur-md z-[60] animate-in fade-in duration-200" style={{ background: "rgba(0,0,0,0.80)" }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
                style={{ background: th.mobileMenuBg, borderColor: th.mobileMenuBorder }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: th.mobileMenuTitle }}>Quick Actions</h2>
                  <button
                    onClick={() => setActiveOverlay(null)}
                    className="p-2 rounded-xl active:scale-95 transition-all"
                    style={{ background: th.mobileMenuCloseBg, color: th.mobileMenuCloseText }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {completedJobs.length > 0 && (
                    <button
                      onClick={() => setActiveOverlay('jobsModal')}
                      className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-[0.98] bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                    >
                      <span>Load Completed Job</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">{completedJobs.length}</span>
                        <Briefcase className="h-5 w-5" />
                      </div>
                    </button>
                  )}
                  {[
                    { label: "Add Labor Charge",  icon: <Wrench className="h-5 w-5" />,       action: () => setActiveOverlay('addLabor') },
                    { label: "Add New Customer",  icon: <User className="h-5 w-5" />,          action: () => setActiveOverlay('addCustomer') },
                    { label: "View Cart Summary", icon: <ShoppingCart className="h-5 w-5" />,  action: () => { if (selectedCustomer) toast.success(`Customer: ${selectedCustomer.name}`); setActiveOverlay(null); } },
                  ].map(({ label, icon, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-[0.98]"
                      style={{ background: th.mobileMenuItemBg, border: `1px solid ${th.mobileMenuItemBorder}`, color: th.mobileMenuItemText }}
                    >
                      <span>{label}</span>{icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden h-24" />
        </div>

        {/* ── Jobs Modal ───────────────────────────────────────────────────── */}
        {showJobsModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ background: th.modalOverlay }}>
            <div className="rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ background: th.modalHeaderBg, borderColor: th.modalSectionBorder }}>
                <div>
                  <h2 className="text-xl font-bold flex items-center" style={{ color: th.modalTitle }}>
                    <Briefcase className="h-5 w-5 mr-2 text-blue-400" />Completed Jobs
                  </h2>
                  <p className="text-sm mt-1" style={{ color: th.cardSubtext }}>Select a job to load into the cart</p>
                </div>
                <button onClick={() => setActiveOverlay(null)} style={{ color: th.modalClose }}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingJobs ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-3" />
                    <p style={{ color: th.cardSubtext }}>Loading jobs...</p>
                  </div>
                ) : completedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                    <p style={{ color: th.emptyText }}>No completed jobs available</p>
                    <p className="text-sm mt-2" style={{ color: th.emptySubtext }}>Jobs marked as completed will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedJobs.map((job) => (
                      <div
                        key={job._id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadJobIntoCart(job); }}
                        onClick={() => loadJobIntoCart(job)}
                        className="rounded-lg p-4 cursor-pointer transition-all group"
                        style={{ background: th.jobItemBg, border: `1px solid ${th.jobItemBorder}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.50)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = th.jobItemBorder)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold" style={{ color: th.jobItemName }}>{job.jobNumber}</h3>
                              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs border border-green-500/30 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />Completed
                              </span>
                            </div>
                            <h4 className="text-base font-medium mb-1" style={{ color: th.jobItemName }}>{job.title}</h4>
                            <div className="flex items-center gap-3 text-sm" style={{ color: th.jobItemMeta }}>
                              <span>{job.customerName}</span>
                              {job.vehicleRegistrationNumber && <span className="font-mono text-blue-400">{job.vehicleRegistrationNumber}</span>}
                              <span>• {job.items.length} items</span>
                            </div>
                            {job.description && <p className="text-xs mt-2" style={{ color: th.emptySubtext }}>{job.description}</p>}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm" style={{ color: th.jobItemTotal }}>Total</p>
                            <p className="text-lg font-bold" style={{ color: th.jobItemTotalVal }}>
                              QAR {(job.actualGrandTotal || job.estimatedGrandTotal).toFixed(2)}
                            </p>
                            <button className="mt-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs hover:bg-blue-500/30 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                              Load Job
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Add Customer Modal ───────────────────────────────────────────── */}
        {showAddCustomer && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm" style={{ background: th.modalOverlay }}>
            <div className="rounded-lg shadow-2xl max-w-2xl w-full my-8" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ background: th.modalHeaderBg, borderColor: th.modalSectionBorder }}>
                <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>Quick Add Customer</h2>
                <button onClick={() => setActiveOverlay(null)} style={{ color: th.modalClose }}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Name *",   key: "name",  type: "text",  ph: "Customer name",    span: 2 },
                    { label: "Phone *",  key: "phone", type: "text",  ph: "Phone number",     span: 1 },
                    { label: "Email",    key: "email", type: "email", ph: "email@example.com",span: 1 },
                  ].map(({ label, key, type, ph, span }) => (
                    <div key={key} className={span === 2 ? "col-span-2" : ""}>
                      <label className="block text-sm font-medium mb-1" style={{ color: th.modalSectionLabel }}>{label}</label>
                      <input type={type} value={(newCustomer as any)[key]}
                        onChange={(e) => setNewCustomer({ ...newCustomer, [key]: e.target.value })}
                        placeholder={ph}
                        className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        style={inputStyle} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label htmlFor="new-customer-address" className="block text-sm font-medium mb-1" style={{ color: th.modalSectionLabel }}>Address</label>
                    <textarea id="new-customer-address" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      rows={2} placeholder="Customer address"
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      style={inputStyle} />
                  </div>
                </div>

                {/* Vehicle section */}
                <div className="pt-6" style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center" style={{ color: th.modalTitle }}>
                    <Car className="h-4 w-4 mr-2 text-[#E84545]" />Vehicle Information (Optional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="new-customer-reg" className="block text-sm font-medium mb-1" style={{ color: th.modalSectionLabel }}>Registration Number</label>
                      <input id="new-customer-reg" type="text" value={newCustomer.vehicleRegistrationNumber}
                        onChange={(e) => setNewCustomer({ ...newCustomer, vehicleRegistrationNumber: e.target.value.toUpperCase() })}
                        placeholder="ABC-1234" className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent uppercase"
                        style={inputStyle} />
                    </div>
                    {[
                      {
                        label: "Make", key: "vehicleMake",
                        opts: [["", "Select Make"], ...availableCarMakes.map((m) => [m, m])],
                        onChange: (v: string) => setNewCustomer({ ...newCustomer, vehicleMake: v, vehicleModel: "" }),
                      },
                      {
                        label: "Model", key: "vehicleModel",
                        opts: [["", "Select Model"], ...(isValidCarMake(newCustomer.vehicleMake) ? carMakesModels[newCustomer.vehicleMake].map((m) => [m, m]) : [])],
                        onChange: (v: string) => setNewCustomer({ ...newCustomer, vehicleModel: v }),
                        disabled: !newCustomer.vehicleMake,
                      },
                      {
                        label: "Year", key: "vehicleYear",
                        opts: [["", "Select Year"], ...carYears.map((y) => [String(y), String(y)])],
                        onChange: (v: string) => setNewCustomer({ ...newCustomer, vehicleYear: v }),
                      },
                      {
                        label: "Color", key: "vehicleColor",
                        opts: [["", "Select Color"], ...carColors.map((c) => [c, c])],
                        onChange: (v: string) => setNewCustomer({ ...newCustomer, vehicleColor: v }),
                      },
                    ].map(({ label, key, opts, onChange, disabled }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium mb-1" style={{ color: th.modalSectionLabel }}>{label}</label>
                        <select value={(newCustomer as any)[key]} onChange={(e) => onChange(e.target.value)}
                          disabled={disabled}
                          className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          style={inputStyle}>
                          {opts.map(([v, l]) => <option key={v} value={v} style={{ background: selectOptBg }}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label htmlFor="new-customer-vin" className="block text-sm font-medium mb-1" style={{ color: th.modalSectionLabel }}>VIN Number</label>
                      <input id="new-customer-vin" type="text" value={newCustomer.vehicleVIN}
                        onChange={(e) => setNewCustomer({ ...newCustomer, vehicleVIN: e.target.value.toUpperCase() })}
                        placeholder="Vehicle Identification Number"
                        className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent uppercase"
                        style={inputStyle} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6" style={{ borderTop: `1px solid ${th.modalSectionBorder}` }}>
                  <button onClick={() => setActiveOverlay(null)}
                    className="px-4 py-2 rounded-lg transition-colors"
                    style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background: th.modalCancelBg }}>
                    Cancel
                  </button>
                  <button onClick={handleAddCustomer}
                    className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] transition-all">
                    Add Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Labor Modal ──────────────────────────────────────────────── */}
        {showAddLabor && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ background: th.modalOverlay }}>
            <div className="rounded-lg shadow-2xl max-w-md w-full" style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ background: th.modalHeaderBg, borderColor: th.modalSectionBorder }}>
                <h2 className="text-xl font-bold flex items-center" style={{ color: th.modalTitle }}>
                  <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />Add Labor Charge
                </h2>
                <button onClick={() => setActiveOverlay(null)} style={{ color: th.modalClose }}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="labor-desc" className="block text-sm font-medium mb-1" style={{ color: th.modalTitle }}>Description *</label>
                  <input id="labor-desc" type="text" value={laborCharge.description}
                    onChange={(e) => setLaborCharge({ ...laborCharge, description: e.target.value })}
                    placeholder="e.g., Engine repair, Oil change"
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Hours",         key: "hours", min: 0.5, step: 0.5 },
                    { label: "Rate (QAR/hr)", key: "rate",  min: 0,   step: 1 },
                  ].map(({ label, key, min, step }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1" style={{ color: th.modalTitle }}>{label}</label>
                      <input type="number" value={(laborCharge as any)[key]} min={min} step={step}
                        onChange={(e) => setLaborCharge({ ...laborCharge, [key]: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor="labor-tax" className="block text-sm font-medium mb-1" style={{ color: th.modalTitle }}>Tax Rate (%)</label>
                  <input id="labor-tax" type="number" value={laborCharge.taxRate} min="0"
                    onChange={(e) => setLaborCharge({ ...laborCharge, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    style={inputStyle} />
                </div>
                <div className="p-4 rounded-lg" style={{ background: th.customerCardBg, border: `1px solid ${th.customerCardBorder}` }}>
                  <p className="text-sm" style={{ color: th.cardSubtext }}>
                    Total: <span className="font-bold" style={{ color: th.cardTitle }}>
                      QAR {(laborCharge.hours * laborCharge.rate * (1 + laborCharge.taxRate / 100)).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: th.emptySubtext }}>
                    Base: {laborCharge.hours} × {laborCharge.rate} = QAR {laborCharge.hours * laborCharge.rate}
                    {laborCharge.taxRate > 0 && <span> + {laborCharge.taxRate}% tax</span>}
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button onClick={() => setActiveOverlay(null)}
                    className="px-4 py-2 rounded-lg transition-colors"
                    style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background: th.modalCancelBg }}>
                    Cancel
                  </button>
                  <button onClick={handleAddLabor}
                    className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] transition-all">
                    Add Labor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile Filter Modal ──────────────────────────────────────────── */}
        {showMobileFilters && isMobile && (
          <div className="md:hidden fixed inset-0 backdrop-blur-md z-[60] animate-in fade-in duration-200" style={{ background: "rgba(0,0,0,0.80)" }}>
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[80vh] overflow-y-auto"
              style={{ background: th.mobileFilterBg, borderColor: th.mobileFilterBorder }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: th.mobileMenuTitle }}>Filters</h2>
                  {activeFilterCount > 0 && <p className="text-xs mt-1" style={{ color: th.cardSubtext }}>{activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active</p>}
                </div>
                <button onClick={() => setActiveOverlay(null)}
                  className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileMenuCloseBg, color: th.mobileMenuCloseText }}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Category",     value: filterCategory, onChange: setFilterCategory, opts: [["all", "All Categories"], ...categories.map((c) => [c._id, c.name])] },
                  { label: "Vehicle Make", value: filterMake,     onChange: setFilterMake,     opts: [["all", "All Makes"],      ...availableMakes.map((m) => [m, m])] },
                  { label: "Vehicle Year", value: filterYear,     onChange: setFilterYear,     opts: [["all", "All Years"],      ...yearOptions.map((y) => [String(y), String(y)])] },
                ].map(({ label, value, onChange, opts }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.mobileFilterLabel }}>{label}</label>
                    <select value={value} onChange={(e) => onChange(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl"
                      style={{ background: th.mobileSelectBg, border: `1px solid ${th.mobileSelectBorder}`, color: th.mobileSelectText }}>
                      {opts.map(([v, l]) => <option key={v} value={v} style={{ background: th.mobileSelectBg }}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${th.mobileFilterBorder}` }}>
                  <button onClick={() => { clearFilters(); setActiveOverlay(null); }}
                    className="flex-1 px-4 py-3 rounded-xl transition-colors active:scale-95"
                    style={{ background: th.mobileClearBg, border: `1px solid ${th.mobileClearBorder}`, color: th.mobileClearText }}>
                    Clear All
                  </button>
                  <button onClick={() => setActiveOverlay(null)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Print */}
        {showInvoice && invoiceData && user?.outletId && invoiceCustomer && (
          <InvoicePrint
            invoice={invoiceData}
            outletId={user.outletId}
            customerId={invoiceCustomer._id}
            onClose={() => { setShowInvoice(false); setInvoiceCustomer(null); }}
          />
        )}

        {/* Keyboard Hints Toggle - Desktop Only */}
        {!showKeyboardHints && !isMobile && (
          <button
            onClick={() => setActiveOverlay('keyboardHints')}
            className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 rounded-xl px-4 py-3 shadow-2xl transition-all group animate-in slide-in-from-bottom duration-300"
            style={{ background: th.kbdPanelBg, border: `1px solid ${th.kbdPanelBorder}` }}
            title="Show keyboard shortcuts (Press H)"
          >
            <span className="text-xl">⌨️</span>
            <span className="text-xs font-medium" style={{ color: th.kbdTitle }}>Shortcuts</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: th.kbdBg, border: `1px solid ${th.kbdBorder}`, color: th.kbdText }}>H</kbd>
          </button>
        )}

        {/* Keyboard Hints Panel - Desktop Only */}
        {showKeyboardHints && !isMobile && (
          <div
            className="hidden md:block fixed bottom-6 right-6 z-40 rounded-xl p-4 shadow-2xl max-w-xs animate-in slide-in-from-bottom duration-300 backdrop-blur-xl"
            style={{ background: th.kbdPanelBg, border: `1px solid ${th.kbdPanelBorder}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold flex items-center" style={{ color: th.kbdTitle }}>
                <span className="mr-2">⌨️</span>Keyboard Shortcuts
              </h3>
              <button onClick={() => setActiveOverlay(null)} style={{ color: th.kbdLabel }}><X className="h-3 w-3" /></button>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                ["Search",        "F"],
                ["Add Customer",  "C"],
                ["Add Labor",     "L"],
                ...(completedJobs.length > 0 ? [["Load Job", "J"]] : []),
                ["Payment",       "P"],
                ["Complete Sale", "S"],
                ["Close/Clear",   "ESC"],
                ["Navigate",      "↑↓"],
                ["Toggle Hints",  "H"],
              ].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between">
                  <span style={{ color: th.kbdLabel }}>{label}</span>
                  <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: th.kbdBg, border: `1px solid ${th.kbdBorder}`, color: th.kbdText }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>{/* end theme wrapper */}
    </MainLayout>
  );
}