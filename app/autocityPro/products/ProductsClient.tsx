"use client";

import { useTimeBasedTheme } from "@/lib/theme/appearanceMode";
import {
  useState,
  useEffect,
  useRef,
  useTransition } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import AddProductModal from "@/components/products/AddProductModal";
import EditProductModal from "@/components/products/EditProductModal";
import { sanitizeBarcodeValue } from "@/lib/utils/barcode";
import {
  formatProductQuantity,
  getProductUnitLabel,
  PRODUCT_UNIT_OPTIONS,
} from "@/lib/utils/productUnit";

import { Search,
  Plus,
  Edit,
  Trash2,
  Package,
  Car,
  X,
  Filter,
  Eye,
  Tag,
  FileDown,
  ChevronLeft,
  MoreVertical,
  AlertCircle,
  QrCode,
  RefreshCw,
  Zap,
  Box,
  File,
  FileSpreadsheet,
  ChevronRight,
  Palette,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import ProductCard from "./ProductCard";
import DynamicIsland from "./DynamicIsland";
import useKeyboardShortcuts from "./useKeyboardShortcuts";

interface ProductsClientProps {
  initialUser: any;
  initialProducts: any[];
  initialStats: any;
  initialPagination: any;
  categories: any[];
  nextSKU: string;
}

export default function ProductsClient({
  initialUser, initialProducts, initialStats, initialPagination, categories, nextSKU,
}: ProductsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDark = useTimeBasedTheme();

  const user = initialUser;
  const [products, setProducts]           = useState(initialProducts);
  const [stats, setStats]                 = useState(initialStats);
  const [pagination, setPagination]       = useState(initialPagination);
  const [allCategories, setAllCategories] = useState(categories);
  const [currentSKU, setCurrentSKU]       = useState(nextSKU);

  const [searchTerm, setSearchTerm]       = useState("");
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [showStockModal, setShowStockModal]   = useState(false);
  const [stockToDecrease, setStockToDecrease] = useState<number>(0);
  const [printingLabelProductId, setPrintingLabelProductId] = useState<string | null>(null);

  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const productRefs    = useRef<(HTMLTableRowElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopFilterButtonRef = useRef<HTMLButtonElement>(null);
  const desktopFilterMenuRef = useRef<HTMLDivElement>(null);

  const [filterCategory,  setFilterCategory]  = useState("");
  const [filterMake,      setFilterMake]       = useState("");
  const [filterModel,     setFilterModel]      = useState("");
  const [filterVariant,   setFilterVariant]    = useState("");
  const [filterColor,     setFilterColor]      = useState("");
  const [filterYear,      setFilterYear]       = useState("");
  const [filterUnit,      setFilterUnit]       = useState("");
  const [filterLocationId,setFilterLocationId] = useState("");
  const [filterStatus,    setFilterStatus]     = useState("all");
  const [filterIsVehicle, setFilterIsVehicle]  = useState<string>("all");
  const [showFilters,     setShowFilters]      = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [activeDesktopFilterMenu, setActiveDesktopFilterMenu] = useState<'search' | 'stock' | 'product' | 'vehicle' | 'active'>('search');
  const [stockLocations, setStockLocations] = useState<any[]>([]);

  const [isMobile,          setIsMobile]          = useState(false);
  const [showMobileMenu,    setShowMobileMenu]    = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [isLoadingMore,     setIsLoadingMore]     = useState(false);

  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName,      setNewCategoryName]      = useState("");
  const [editingProduct,       setEditingProduct]       = useState<any>(null);

  // ── CSV Export modal state ───────────────────────────────────────────────────
  const [showCSVModal,  setShowCSVModal]  = useState(false);
  const [csvSkuFrom,    setCsvSkuFrom]    = useState("");
  const [csvSkuTo,      setCsvSkuTo]      = useState("");
  const [isExportingCSV,setIsExportingCSV]= useState(false);

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const th = {
    pageBg:            isDark ? '#050505'  : '#f3f4f6',
    mobileHeaderBg:    isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)' : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder:isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    mobileBtnBg:       isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    mobileBtnText:     isDark ? 'rgba(255,255,255,0.80)' : '#374151',
    mobileSearchBg:    isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
    mobileSearchBorder:isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)',
    mobileSearchText:  isDark ? '#ffffff' : '#111827',
    mobileSearchPH:    isDark ? 'rgba(255,255,255,0.70)' : '#9ca3af',
    mobileTitle:       isDark ? '#ffffff' : '#111827',
    mobileSub:         isDark ? 'rgba(255,255,255,0.60)' : '#6b7280',
    cardBg:     isDark ? 'rgba(10,10,10,0.50)' : 'rgba(255,255,255,0.80)',
    cardBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    cardLabel:  isDark ? '#9ca3af' : '#6b7280',
    cardValue:  isDark ? '#ffffff' : '#111827',
    headerBgFrom:    isDark ? 'var(--autocity-header-from-dark)' : 'var(--autocity-header-from-light)',
    headerBgVia:     isDark ? 'var(--autocity-header-via-dark)' : 'var(--autocity-header-via-light)',
    headerBgTo:      isDark ? 'var(--autocity-header-to-dark)' : 'var(--autocity-header-to-light)',
    headerTitle:     isDark ? '#ffffff' : 'var(--autocity-header-text-light)',
    headerSub:       isDark ? 'rgba(255,255,255,0.80)' : 'var(--autocity-header-sub-light)',
    headerBorder:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    headerBtnBg:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    headerBtnBorder: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)',
    headerBtnText:   isDark ? '#ffffff' : 'var(--autocity-header-text-light)',
    shortcutsBg:     isDark ? 'rgba(10,10,12,0.90)' : 'rgba(255,255,255,0.90)',
    shortcutsBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    shortcutsText:   isDark ? '#9ca3af' : '#6b7280',
    shortcutsHover:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    filterBg:     isDark ? '#0A0A0A' : '#ffffff',
    filterBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    filterText:   isDark ? '#ffffff' : '#111827',
    filterLabel:  isDark ? '#d1d5db' : '#374151',
    filterDivider:isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    filterBtnBg:  isDark ? 'var(--autocity-accent-10)' : 'var(--autocity-accent-08)',
    filterBtnBorder: isDark ? 'var(--autocity-accent-30)' : 'var(--autocity-accent-20)',
    containerBg:     isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)' : '#ffffff',
    containerBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    tableHeadBg:     isDark ? '#050505' : '#f3f4f6',
    tableHeadText:   isDark ? '#9ca3af' : '#6b7280',
    tableRowDivider: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    tableRowHover:   isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    cellPrimary:     isDark ? '#ffffff' : '#111827',
    cellSecondary:   isDark ? '#d1d5db' : '#374151',
    cellMuted:       isDark ? '#9ca3af' : '#6b7280',
    cellFaint:       isDark ? '#6b7280' : '#9ca3af',
    endBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    endText:   isDark ? '#9ca3af' : '#6b7280',
    overlayBg:     isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)' : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    overlayBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    overlayTitle:  isDark ? '#ffffff' : '#111827',
    overlayClose:  isDark ? '#9ca3af' : '#6b7280',
    overlayCloseBg:isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    overlayItemBg: isDark ? '#0A0A0A' : 'rgba(0,0,0,0.04)',
    overlayItemBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    overlayItemText: isDark ? '#d1d5db' : '#374151',
    modalBg:      isDark ? 'linear-gradient(180deg,#050505,#0A0A0A)' : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:  isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    modalTitle:   isDark ? '#ffffff' : '#111827',
    modalText:    isDark ? '#9ca3af' : '#6b7280',
    modalInfoBg:  isDark ? '#0A0A0A' : 'rgba(0,0,0,0.04)',
    modalInfoBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    modalInputBg: isDark ? '#050505' : '#ffffff',
    modalInputBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    modalInputText: isDark ? '#ffffff' : '#111827',
    modalInputPH:   isDark ? '#6b7280' : '#9ca3af',
    modalCancelBg:  isDark ? 'transparent' : 'transparent',
    modalCancelBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    modalCancelText: isDark ? '#d1d5db' : '#374151',
  };

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    const fetchStockLocations = async () => {
      try {
        const res = await fetch('/api/stock-locations', { credentials: 'include' });
        if (res.ok) setStockLocations((await res.json()).locations || []);
      } catch {
        setStockLocations([]);
      }
    };
    fetchStockLocations();
  }, []);

  useEffect(() => {
    if (!showDesktopFilters) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (desktopFilterMenuRef.current?.contains(target) || desktopFilterButtonRef.current?.contains(target)) return;
      setShowDesktopFilters(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDesktopFilters]);

  const handleDeleteClick = (product: any) => {
    if (product.currentStock > 0) {
      setProductToDelete(product);
      setStockToDecrease(product.currentStock);
      setShowStockModal(true);
    } else {
      setProductToDelete(product);
      setShowStockModal(false);
    }
  };

  useKeyboardShortcuts({
    onSearch: () => {
      if (!isMobile) {
        setShowDesktopFilters(true);
        setActiveDesktopFilterMenu('search');
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
      searchInputRef.current?.focus();
    },
    onNewProduct: () => openAddModal(),
    onToggleFilters: () => {
      if (isMobile) setShowFilters(prev => !prev);
      else setShowDesktopFilters(prev => !prev);
    },
    onExport: () => setShowCSVModal(true),
    selectedIndex: selectedProductIndex,
    setSelectedIndex: setSelectedProductIndex,
    products,
    onViewProduct: product => router.push(`/autocityPro/products/${product._id}`),
    onDeleteProduct: handleDeleteClick,
    disabled: showAddModal || showEditModal || showQuickAddCategory || !!productToDelete || showFilters || showMobileMenu || showStockModal || showCSVModal,
  });

  useEffect(() => {
    productRefs.current = productRefs.current.slice(0, products.length);
    setSelectedProductIndex((prev) => {
      if (products.length === 0) return -1;
      return prev >= products.length ? products.length - 1 : prev;
    });
  }, [products.length]);

  useEffect(() => {
    if (isMobile || selectedProductIndex < 0) return;

    const selectedRow = productRefs.current[selectedProductIndex];
    if (!selectedRow) return;

    const rect = selectedRow.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const topPadding = 16;
    const bottomPadding = 24;

    if (rect.top < topPadding || rect.bottom > viewportHeight - bottomPadding) {
      selectedRow.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    }
  }, [selectedProductIndex, isMobile, products.length]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const appendProductFilters = (params: URLSearchParams) => {
    if (searchTerm)      params.append("search", searchTerm);
    if (filterCategory)  params.append("categoryId", filterCategory);
    if (filterMake)      params.append("carMake", filterMake);
    if (filterModel)     params.append("carModel", filterModel);
    if (filterVariant)   params.append("variant", filterVariant);
    if (filterColor)     params.append("color", filterColor);
    if (filterYear)      params.append("year", filterYear);
    if (filterUnit)      params.append("unit", filterUnit);
    if (filterLocationId) params.append("locationId", filterLocationId);
    if (filterStatus !== "all") params.append("stockStatus", filterStatus);
    if (filterIsVehicle !== "all") {
      params.append("isVehicle", filterIsVehicle === "vehicle" ? "true" : "false");
    }
    return params;
  };

  const fetchProducts = async (page = 1, append = false) => {
    try {
      if (!append) setIsLoadingMore(true);
      const params = appendProductFilters(new URLSearchParams({ page: page.toString(), limit: "50" }));
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        startTransition(() => {
          if (append) setProducts(prev => [...prev, ...data.products]);
          else        setProducts(data.products || []);
          setPagination(data.pagination);
          setStats(data.stats);
        });
      } else toast.error("Failed to load products");
    } catch { toast.error("Failed to load products"); }
    finally  { setIsLoadingMore(false); }
  };

  const loadMoreProducts = () => {
    if (!isLoadingMore && pagination.hasMore) fetchProducts(pagination.page + 1, true);
  };

  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, filterStatus, filterUnit, filterLocationId, filterCategory, filterMake, filterModel, filterVariant, filterColor, filterYear, filterIsVehicle]);

  // ── PDF Export (unchanged) ────────────────────────────────────────────────
  const downloadProductsPDF = async () => {
    try {
      toast.loading("Preparing PDF export...");
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"), import("jspdf-autotable"),
      ]);
      const params = appendProductFilters(new URLSearchParams({ export: "true" }));
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export fetch failed");
      const { products: allProducts } = await res.json();
      if (!allProducts?.length) { toast.dismiss(); toast.error("No products to export"); return; }
      const PRIORITY_MAKES = ["toyota","nissan","lexus","ford"];
      const sorted = [...allProducts].sort((a, b) => {
        const hasMakeA = !!a.carMake, hasMakeB = !!b.carMake;
        if (hasMakeA && !hasMakeB) return -1;
        if (!hasMakeA && hasMakeB) return 1;
        if (!hasMakeA && !hasMakeB) return 0;
        const ma = a.carMake.toLowerCase(), mb = b.carMake.toLowerCase();
        const ia = PRIORITY_MAKES.indexOf(ma), ib = PRIORITY_MAKES.indexOf(mb);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1; if (ib !== -1) return 1;
        if (ma !== mb) return ma.localeCompare(mb);
        const moa = (a.carModel||"").toLowerCase(), mob = (b.carModel||"").toLowerCase();
        if (moa !== mob) return moa.localeCompare(mob);
        return (a.name||"").toLowerCase().localeCompare((b.name||"").toLowerCase());
      });
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const headers = [["SKU","Name","Category","Barcode","Price","Stock","Make","Model","Variant","Year","Color","Part No"]];
      const rows: any[] = [];
      let lastMake = "", lastModel = "", othersStarted = false;
      const fyr = (f?: string|number, t?: string|number) => {
        if (!f && !t) return ""; if (f && !t) return `${f}+`; if (!f && t) return `Up to ${t}`; if (f === t) return `${f}`; return `${f}-${t}`;
      };
      sorted.forEach(p => {
        if (!p.carMake) {
          if (!othersStarted) {
            rows.push([""],[""]);
            rows.push([{ content:"OTHERS / GENERAL PRODUCTS", colSpan:12, styles:{ fillColor:[40,40,40], textColor:255, fontStyle:"bold", fontSize:9, halign:"center" } }]);
            othersStarted = true;
          }
          rows.push([p.sku||"",p.name||"",p.category?.name||"",p.barcode||"",p.sellingPrice||0,p.currentStock||0,"","",p.variant||"",fyr(p.yearFrom,p.yearTo),p.color||"",p.partNumber||""]);
          return;
        }
        if (p.carMake !== lastMake) {
          rows.push([{ content:p.carMake.toUpperCase(), colSpan:12, styles:{ fillColor:[25,25,25], textColor:255, fontStyle:"bold", fontSize:9, halign:"center" } }]);
          lastMake = p.carMake; lastModel = "";
        }
        if (p.carModel && p.carModel !== lastModel) {
          rows.push([{ content:`  ${p.carModel}`, colSpan:12, styles:{ fillColor:[140,140,140], textColor:255, fontStyle:"bold", fontSize:8, halign:"left" } }]);
          lastModel = p.carModel;
        }
        rows.push([p.sku||"",p.name||"",p.category?.name||"",p.barcode||"",p.sellingPrice||0,p.currentStock||0,p.carMake||"",p.carModel||"",p.variant||"",fyr(p.yearFrom,p.yearTo),p.color||"",p.partNumber||""]);
      });
      // @ts-ignore
      autoTable(doc, { head:headers, body:rows, startY:22, theme:"grid", showHead:"everyPage", pageBreak:"auto", styles:{ fontSize:6.8, cellPadding:{ top:1.4,bottom:1.4,left:2,right:2 }, valign:"middle" }, headStyles:{ fillColor:[65,16,16], textColor:255, fontStyle:"bold", fontSize:7.5 }, margin:{ top:18,left:8,right:8 } });
      doc.save(`products_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.dismiss(); toast.success(`Exported ${sorted.length} products to PDF`);
    } catch { toast.dismiss(); toast.error("Failed to export PDF"); }
  };

  // ── CSV Export — fetch ALL products, sort by SKU ascending ───────────────
  const downloadProductsCSV = async (skuFrom?: string, skuTo?: string) => {
    setIsExportingCSV(true);
    try {
      toast.loading("Preparing CSV export...");

      const params = appendProductFilters(new URLSearchParams({ export: "true" }));

      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export fetch failed");
      const { products: allProducts } = await res.json();
      if (!allProducts?.length) { toast.dismiss(); toast.error("No products to export"); return; }

      // ── Apply SKU range filter if provided ──────────────────────────────
      let filtered = allProducts;
      const fromNum = skuFrom ? parseInt(skuFrom, 10) : null;
      const toNum   = skuTo   ? parseInt(skuTo,   10) : null;
      if (fromNum !== null || toNum !== null) {
        filtered = allProducts.filter((p: any) => {
          const skuNum = parseInt(String(p.sku), 10);
          if (isNaN(skuNum)) return true; // non-numeric SKUs always included
          if (fromNum !== null && skuNum < fromNum) return false;
          if (toNum   !== null && skuNum > toNum)   return false;
          return true;
        });
      }

      if (!filtered.length) {
        toast.dismiss();
        toast.error("No products found in that SKU range");
        return;
      }

      // ── Sort by SKU ascending (numeric where possible, lexicographic fallback)
      filtered.sort((a: any, b: any) => {
        const na = parseInt(String(a.sku), 10);
        const nb = parseInt(String(b.sku), 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.sku || "").localeCompare(String(b.sku || ""));
      });

      const fyr = (f?: string|number, t?: string|number) => {
        if (!f && !t) return ""; if (f && !t) return `${f}+`; if (!f && t) return `Up to ${t}`; if (f===t) return `${f}`; return `${f}-${t}`;
      };

      const headers = ["SKU","Name","Category","Barcode","Location","Unit","Cost Price","Selling Price","Current Stock","Car Make","Car Model","Variant","Year Range","Color","Part Number"];
      const csvRows = filtered.map((p: any) => [
        p.sku||"",
        p.name||"",
        p.category?.name||"",
        p.barcode||"",
        p.location||"",
        p.unit||"pcs",
        p.costPrice||"",
        p.sellingPrice||"",
        p.currentStock||0,
        p.carMake||"",
        p.carModel||"",
        p.variant||"",
        fyr(p.yearFrom, p.yearTo),
        p.color||"",
        p.partNumber||"",
      ]);

      const escape = (c: any) => { const s = String(c); return (s.includes(",")||s.includes("\n")||s.includes('"')) ? `"${s.replace(/"/g,'""')}"` : s; };
      const csv = [headers.join(","), ...csvRows.map((r: any[]) => r.map(escape).join(","))].join("\n");

      const suffix = (fromNum || toNum) ? `_sku${fromNum||"start"}-${toNum||"end"}` : "";
      const link = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
        download: `products${suffix}_${new Date().toISOString().split("T")[0]}.csv`,
      });
      document.body.appendChild(link); link.click(); document.body.removeChild(link);

      toast.dismiss();
      toast.success(`Exported ${filtered.length} products to CSV`);
      setShowCSVModal(false);
      setCsvSkuFrom(""); setCsvSkuTo("");
    } catch {
      toast.dismiss();
      toast.error("Failed to export CSV");
    } finally {
      setIsExportingCSV(false);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleDecreaseStock = async () => {
    if (!productToDelete) return;
    const res = await fetch(`/api/products/${productToDelete._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({...productToDelete,currentStock:0}) });
    if (res.ok) { toast.success("Stock decreased to zero"); setShowStockModal(false); setProductToDelete({...productToDelete,currentStock:0}); fetchProducts(1); }
    else { const e=await res.json(); toast.error(e.error||"Failed to update stock"); }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    if (productToDelete.currentStock > 0) { toast.error("Cannot delete product with stock. Please decrease stock to zero first."); return; }
    const res = await fetch(`/api/products/${productToDelete._id}`, { method:"DELETE", credentials:"include" });
    if (res.ok) { toast.success("Product deleted!"); setProductToDelete(null); setShowStockModal(false); fetchProducts(1); }
    else { const e=await res.json(); toast.error(e.error||"Failed to delete product"); }
  };

  const openAddModal = () => setShowAddModal(true);

  const handleAddProduct = async (productData: any) => {
    try {
      const res = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(productData) });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success("Product added!");
        setShowAddModal(false);
        await fetchProducts(1);
        return true;
      }

      toast.error(data.error || "Failed to add product");
      return false;
    } catch {
      toast.error("Failed to add product");
      return false;
    }
  };

  const handleEditProduct = async (productData: any) => {
    if (!editingProduct) return;
    const res = await fetch(`/api/products/${editingProduct._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(productData) });
    if (res.ok) { toast.success("Product updated!"); setShowEditModal(false); setEditingProduct(null); fetchProducts(1); }
    else { const e=await res.json(); toast.error(e.error||"Failed to update product"); }
  };

  const openEditModal = (product: any) => { setEditingProduct(product); setShowEditModal(true); };

  const handlePrintLabel = async (product: any) => {
    if (!product?._id) return;
    const hasDistinctBarcode = Boolean(
      product.barcode &&
      sanitizeBarcodeValue(product.barcode) !== sanitizeBarcodeValue(product.sku)
    );

    try {
      setPrintingLabelProductId(product._id);

      if (!hasDistinctBarcode) {
        const res = await fetch(`/api/products/${product._id}/barcode`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Failed to generate barcode");
          return;
        }

        setProducts(prev => prev.map((item: any) => (
          item._id === product._id ? { ...item, barcode: data.barcode } : item
        )));
        toast.success("Barcode generated");
      }

      router.push(`/autocityPro/products/${product._id}/barcode-label`);
    } catch {
      toast.error("Failed to open barcode label");
    } finally {
      setPrintingLabelProductId(null);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("Category name is required"); return; }
    const res = await fetch("/api/categories", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({name:newCategoryName}) });
    if (res.ok) { const d=await res.json(); toast.success("Category added!"); setAllCategories([...allCategories,{...d.category,productCount:0}]); setNewCategoryName(""); setShowQuickAddCategory(false); }
    else { const e=await res.json(); toast.error(e.error||"Failed to add category"); }
  };

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterUnit("");
    setFilterLocationId("");
    setFilterCategory("");
    setFilterMake("");
    setFilterModel("");
    setFilterVariant("");
    setFilterColor("");
    setFilterYear("");
    setFilterIsVehicle("all");
    setSearchTerm("");
  };
  const handleLogout = async () => { await fetch("/api/auth/logout",{method:"POST",credentials:"include"}); window.location.href="/autocityPro/login"; };

  const availableMakes = [...new Set(products.filter(p => p.carMake).map(p => p.carMake))].sort() as string[];
  const availableModels = filterMake
    ? [...new Set(products.filter(p => p.carMake === filterMake && p.carModel).map(p => p.carModel))].sort() as string[]
    : [];
  const availableVariants = [...new Set(products.filter(p => p.variant).map(p => p.variant))].sort() as string[];
  const availableColors = [...new Set(products.filter(p => p.color).map(p => p.color))].sort() as string[];
  const availableYears = [...new Set(products.flatMap(p => {
    if (!p.yearFrom && !p.yearTo) return [];
    const from = Number(p.yearFrom || p.yearTo);
    const to = Number(p.yearTo || p.yearFrom);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
  }))].sort((a, b) => b - a);

  const activeFilterCount = [
    filterStatus !== "all",
    filterUnit,
    filterLocationId,
    filterCategory,
    filterIsVehicle !== "all",
    filterMake,
    filterModel,
    filterVariant,
    filterColor,
    filterYear,
  ].filter(Boolean).length;
  const stockFilterCount = filterStatus === "all" ? 0 : 1;
  const productFilterCount = [filterCategory, filterUnit, filterLocationId, filterIsVehicle !== "all"].filter(Boolean).length;
  const vehicleFilterCount = [filterMake, filterModel, filterVariant, filterColor, filterYear].filter(Boolean).length;
  const activeFilterTags = [
    filterStatus !== "all" && { label: `Status: ${filterStatus === "low" ? "Low Stock" : filterStatus === "critical" ? "Critical" : "Out of Stock"}`, clear: () => setFilterStatus("all") },
    filterUnit && { label: `Unit: ${getProductUnitLabel(filterUnit)}`, clear: () => setFilterUnit("") },
    filterLocationId && { label: `Location: ${stockLocations.find(location => String(location._id) === filterLocationId)?.name || "Selected"}`, clear: () => setFilterLocationId("") },
    filterCategory && { label: `Category: ${allCategories.find(category => category._id === filterCategory)?.name || "Selected"}`, clear: () => setFilterCategory("") },
    filterIsVehicle !== "all" && { label: `Type: ${filterIsVehicle === "vehicle" ? "Vehicles/Parts" : "Non-Vehicle"}`, clear: () => setFilterIsVehicle("all") },
    filterMake && { label: `Make: ${filterMake}`, clear: () => { setFilterMake(""); setFilterModel(""); } },
    filterModel && { label: `Model: ${filterModel}`, clear: () => setFilterModel("") },
    filterVariant && { label: `Variant: ${filterVariant}`, clear: () => setFilterVariant("") },
    filterColor && { label: `Color: ${filterColor}`, clear: () => setFilterColor("") },
    filterYear && { label: `Year: ${filterYear}`, clear: () => setFilterYear("") },
  ].filter(Boolean) as Array<{ label: string; clear: () => void }>;
  const desktopFilterMenuItems: Array<{
    id: 'search' | 'stock' | 'product' | 'vehicle' | 'active';
    label: string;
    description: string;
    count: number;
  }> = [
    { id: 'search', label: 'Search', description: 'Name, SKU, barcode, vehicle', count: searchTerm ? 1 : 0 },
    { id: 'stock', label: 'Stock Status', description: 'Low, critical, out', count: stockFilterCount },
    { id: 'product', label: 'Product & Area', description: 'Type, unit, category, location', count: productFilterCount },
    { id: 'vehicle', label: 'Vehicle Compatibility', description: 'Make, model, year', count: vehicleFilterCount },
    { id: 'active', label: 'Selected Filters', description: 'Review and clear', count: activeFilterTags.length },
  ];
  const formatYearRange = (f?: string|number, t?: string|number) => {
    if (!f && !t) return ""; if (f && !t) return `${f}+`; if (!f && t) return `Up to ${t}`; if (f===t) return `${f}`; return `${f}-${t}`;
  };

  const selectStyle = { background: th.filterBg, border: `1px solid ${th.filterBorder}`, color: th.filterText };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {isMobile && showDynamicIsland && (
          <DynamicIsland totalProducts={pagination.total||0} totalValue={stats.totalValue||0} lowStockCount={stats.lowStockCount||0} isDark={isDark} />
        )}

        <div className="hidden md:block fixed bottom-4 right-4 z-40">
          <button
            onClick={() => toast.success("/ Search  N New  F Filters  E Export  ↑↓ Navigate  Enter View  Del Delete", { duration:5000 })}
            className="px-3 py-2 backdrop-blur-sm rounded-lg text-xs flex items-center gap-2 transition-all"
            style={{ background: th.shortcutsBg, border:`1px solid ${th.shortcutsBorder}`, color: th.shortcutsText }}
            onMouseEnter={e => (e.currentTarget.style.background = th.shortcutsHover)}
            onMouseLeave={e => (e.currentTarget.style.background = th.shortcutsBg)}
          >
            <span className="font-mono">?</span><span>Shortcuts</span>
          </button>
        </div>

        {/* ── Mobile Header ─────────────────────────────────────────────── */}
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom:`1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold transition-colors" style={{ color: th.mobileTitle }}>Products</h1>
                  <p className="text-xs transition-colors" style={{ color: th.mobileSub }}>{products.length} of {pagination.total||0} loaded</p>
                </div>
              </div>
              <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--autocity-accent)]" />
              <input ref={searchInputRef} type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent transition-colors duration-500"
                style={{ background: th.mobileSearchBg, border:`1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label:"Total",     value: pagination.total||0,                         color: th.cardValue },
                { label:"Value",     value:`QR${((stats.totalValue||0)/1000).toFixed(0)}K`, color:'#4ade80' },
                { label:"Low Stock", value: stats.lowStockCount||0,                       color:(stats.lowStockCount||0)>0?'#fb923c':th.cardValue },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-2 transition-colors duration-500"
                  style={{ background: th.cardBg, border:`1px solid ${th.cardBorder}` }}>
                  <p className="text-[10px]" style={{ color: th.cardLabel }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Desktop Header ────────────────────────────────────────────── */}
        <div className="hidden md:block py-12 border-b shadow-xl transition-colors duration-500"
          style={{ background:`linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold transition-colors duration-500" style={{ color: th.headerTitle }}>Products</h1>
              <p className="mt-1 transition-colors duration-500" style={{ color: th.headerSub }}>
                {products.length} of {pagination.total||0} products loaded
                {(activeFilterCount > 0 || searchTerm) && ` • ${activeFilterCount + (searchTerm ? 1 : 0)} filter${activeFilterCount + (searchTerm ? 1 : 0) === 1 ? '' : 's'} active`}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <button
                  ref={desktopFilterButtonRef}
                  type="button"
                  onClick={() => {
                    setShowDesktopFilters(previous => {
                      const next = !previous;
                      if (next) setActiveDesktopFilterMenu('search');
                      return next;
                    });
                  }}
                  className="relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ background: showDesktopFilters ? 'rgba(255,255,255,0.20)' : th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
                >
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                  {(activeFilterCount > 0 || searchTerm) && (
                    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-[color:var(--autocity-accent)] text-white text-xs flex items-center justify-center">
                      {activeFilterCount + (searchTerm ? 1 : 0)}
                    </span>
                  )}
                </button>

                {showDesktopFilters && (
                  <div ref={desktopFilterMenuRef} className="absolute right-0 top-full mt-3 z-50 flex items-start">
                    <div className="w-64 rounded-2xl shadow-2xl overflow-hidden" style={{ background: th.containerBg, border: `1px solid ${th.containerBorder}` }}>
                      <div className="p-2">
                        {desktopFilterMenuItems.map(item => {
                          const active = activeDesktopFilterMenu === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActiveDesktopFilterMenu(item.id)}
                              onMouseEnter={() => setActiveDesktopFilterMenu(item.id)}
                              className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                              style={{ background: active ? 'var(--autocity-accent-10)' : 'transparent', color: active ? th.cellPrimary : th.cellSecondary }}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{item.label}</p>
                                <p className="text-xs mt-0.5 truncate" style={{ color: th.cellMuted }}>{item.description}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!!item.count && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--autocity-accent-10)', color: 'var(--autocity-accent)' }}>{item.count}</span>}
                                <ChevronRight className="h-4 w-4" style={{ color: th.cellMuted }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-4 py-3" style={{ borderTop: `1px solid ${th.tableRowDivider}` }}>
                        <button type="button" onClick={clearFilters} className="w-full px-3 py-2 rounded-xl text-sm transition-colors" style={{ background: th.filterBtnBg, border: `1px solid ${th.filterBtnBorder}`, color: th.filterText }}>
                          Clear All Filters
                        </button>
                      </div>
                    </div>

                    <div className="w-[360px] ml-2 rounded-2xl shadow-2xl overflow-hidden" style={{ background: th.filterBg, border: `1px solid ${th.filterBorder}` }}>
                      {activeDesktopFilterMenu === 'search' && (
                        <>
                          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.tableRowDivider}` }}>
                            <p className="text-sm font-semibold" style={{ color: th.cellPrimary }}>Search Products</p>
                            <p className="text-xs mt-1" style={{ color: th.cellMuted }}>Search by name, SKU, barcode, make, model, variant, or colour.</p>
                          </div>
                          <div className="p-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-[color:var(--autocity-accent)]" />
                              <input ref={searchInputRef} type="text" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent" style={selectStyle} />
                            </div>
                          </div>
                        </>
                      )}

                      {activeDesktopFilterMenu === 'stock' && (
                        <>
                          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.tableRowDivider}` }}>
                            <p className="text-sm font-semibold" style={{ color: th.cellPrimary }}>Stock Status</p>
                            <p className="text-xs mt-1" style={{ color: th.cellMuted }}>Show healthy, low, critical, or out-of-stock products.</p>
                          </div>
                          <div className="p-4 grid grid-cols-2 gap-2">
                            {[["all", "All Status"], ["low", "Low Stock"], ["critical", "Critical"], ["out", "Out of Stock"]].map(([value, label]) => {
                              const active = filterStatus === value;
                              return (
                                <button key={value} type="button" onClick={() => setFilterStatus(value)} className="px-3 py-2.5 rounded-xl text-sm text-left transition-colors" style={{ background: active ? 'var(--autocity-accent-10)' : th.filterBg, border: active ? '1px solid var(--autocity-accent-30)' : `1px solid ${th.filterBorder}`, color: active ? 'var(--autocity-accent)' : th.filterText }}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {activeDesktopFilterMenu === 'product' && (
                        <>
                          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.tableRowDivider}` }}>
                            <p className="text-sm font-semibold" style={{ color: th.cellPrimary }}>Product & Area</p>
                            <p className="text-xs mt-1" style={{ color: th.cellMuted }}>Choose item type, category, unit, and location.</p>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              {[["all", "All"], ["vehicle", "Vehicles"], ["non-vehicle", "Non-Vehicle"]].map(([value, label]) => {
                                const active = filterIsVehicle === value;
                                return (
                                  <button key={value} type="button" onClick={() => setFilterIsVehicle(value)} className="px-2 py-2.5 rounded-xl text-xs transition-colors" style={{ background: active ? 'var(--autocity-accent-10)' : th.filterBg, border: active ? '1px solid var(--autocity-accent-30)' : `1px solid ${th.filterBorder}`, color: active ? 'var(--autocity-accent)' : th.filterText }}>
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            {[
                              { label: 'Category', value: filterCategory, onChange: setFilterCategory, options: [['', 'All Categories'], ...allCategories.map(category => [category._id, category.name])] },
                              { label: 'Unit', value: filterUnit, onChange: setFilterUnit, options: [['', 'All Units'], ...PRODUCT_UNIT_OPTIONS.map(unit => [unit.value, unit.label])] },
                              { label: 'Location / Area', value: filterLocationId, onChange: setFilterLocationId, options: [['', 'All Locations'], ...stockLocations.map(location => [String(location._id), location.name])] },
                            ].map(field => (
                              <div key={field.label}>
                                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: th.cellMuted }}>{field.label}</p>
                                <select value={field.value} onChange={event => field.onChange(event.target.value)} className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                  {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {activeDesktopFilterMenu === 'vehicle' && (
                        <>
                          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.tableRowDivider}` }}>
                            <p className="text-sm font-semibold" style={{ color: th.cellPrimary }}>Vehicle Compatibility</p>
                            <p className="text-xs mt-1" style={{ color: th.cellMuted }}>Narrow by make, model, variant, colour, and year.</p>
                          </div>
                          <div className="p-4 grid grid-cols-1 gap-3">
                            <div className="relative">
                              <Car className="absolute left-3 top-3 h-4 w-4 text-[color:var(--autocity-accent)]" />
                              <select value={filterMake} onChange={event => { setFilterMake(event.target.value); setFilterModel(''); }} className="w-full pl-10 pr-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                <option value="">All Makes</option>
                                {availableMakes.map(make => <option key={make} value={make}>{make}</option>)}
                              </select>
                            </div>
                            <select value={filterModel} onChange={event => setFilterModel(event.target.value)} disabled={!filterMake} className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none disabled:opacity-50" style={selectStyle}>
                              <option value="">All Models</option>
                              {availableModels.map(model => <option key={model} value={model}>{model}</option>)}
                            </select>
                            <select value={filterVariant} onChange={event => setFilterVariant(event.target.value)} className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                              <option value="">All Variants</option>
                              {availableVariants.map(variant => <option key={variant} value={variant}>{variant}</option>)}
                            </select>
                            <div className="relative">
                              <Palette className="absolute left-3 top-3 h-4 w-4 text-[color:var(--autocity-accent)]" />
                              <select value={filterColor} onChange={event => setFilterColor(event.target.value)} className="w-full pl-10 pr-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                <option value="">All Colours</option>
                                {availableColors.map(color => <option key={color} value={color}>{color}</option>)}
                              </select>
                            </div>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-[color:var(--autocity-accent)]" />
                              <select value={filterYear} onChange={event => setFilterYear(event.target.value)} className="w-full pl-10 pr-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                <option value="">All Years</option>
                                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {activeDesktopFilterMenu === 'active' && (
                        <>
                          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.tableRowDivider}` }}>
                            <p className="text-sm font-semibold" style={{ color: th.cellPrimary }}>Selected Filters</p>
                            <p className="text-xs mt-1" style={{ color: th.cellMuted }}>Remove individual filters or clear the complete search.</p>
                          </div>
                          <div className="p-4 space-y-4">
                            {(activeFilterTags.length > 0 || searchTerm) ? (
                              <>
                                <div className="flex flex-wrap gap-2">
                                  {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="px-3 py-1.5 text-xs rounded-full flex items-center gap-2" style={{ background: 'var(--autocity-accent-10)', color: 'var(--autocity-accent)' }}><span>Search: {searchTerm}</span><X className="h-3 w-3" /></button>}
                                  {activeFilterTags.map(tag => <button key={tag.label} type="button" onClick={tag.clear} className="px-3 py-1.5 text-xs rounded-full flex items-center gap-2" style={{ background: 'var(--autocity-accent-10)', color: 'var(--autocity-accent)' }}><span>{tag.label}</span><X className="h-3 w-3" /></button>)}
                                </div>
                                <button type="button" onClick={clearFilters} className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ background: th.filterBtnBg, border: `1px solid ${th.filterBtnBorder}`, color: th.filterText }}>Clear All</button>
                              </>
                            ) : <p className="text-sm" style={{ color: th.cellMuted }}>No filters selected yet.</p>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {[
                { label:"CSV", icon:<FileDown className="h-5 w-5"/>, action: () => setShowCSVModal(true) },
                { label:"PDF", icon:<FileDown className="h-5 w-5"/>, action: downloadProductsPDF },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ background: th.headerBtnBg, border:`1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)')}
                  onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                  {btn.icon}<span>{btn.label}</span>
                </button>
              ))}
              <button onClick={() => router.push("/autocityPro/products/bulk-import")}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                style={{ background: th.headerBtnBg, border:`1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                <FileSpreadsheet className="h-5 w-5" /><span>Bulk Import</span>
              </button>
              <button onClick={openAddModal}
                className="flex items-center space-x-2 rounded-xl px-4 py-2 bg-[color:var(--autocity-accent)] text-white hover:bg-[color:var(--autocity-accent-strong)] transition-colors">
                <Plus className="h-5 w-5" /><span className="font-medium">Add Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <div className="px-4 md:px-6 pt-[220px] md:pt-6 pb-6 transition-colors duration-500" style={{ background: th.pageBg }}>
          {(activeFilterTags.length > 0 || searchTerm) && (
            <div className="hidden md:flex items-start justify-between gap-4 rounded-2xl p-4 mb-4" style={{ background: th.filterBg, border: `1px solid ${th.filterBorder}` }}>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: th.cellMuted }}>Active Filters</p>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="px-3 py-1.5 text-xs rounded-full flex items-center gap-2" style={{ background: 'var(--autocity-accent-10)', color: 'var(--autocity-accent)' }}><span>Search: {searchTerm}</span><X className="h-3 w-3" /></button>}
                  {activeFilterTags.map(tag => <button key={tag.label} type="button" onClick={tag.clear} className="px-3 py-1.5 text-xs rounded-full flex items-center gap-2" style={{ background: 'var(--autocity-accent-10)', color: 'var(--autocity-accent)' }}><span>{tag.label}</span><X className="h-3 w-3" /></button>)}
                </div>
              </div>
              <button type="button" onClick={clearFilters} className="px-4 py-2 text-sm rounded-lg whitespace-nowrap" style={{ background: th.filterBtnBg, border: `1px solid ${th.filterBtnBorder}`, color: th.filterText }}>Clear All</button>
            </div>
          )}

          <div className="rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.containerBg, border:`1px solid ${th.containerBorder}` }}>
            <div className="overflow-x-auto">
              <table className="min-w-full md:table hidden" style={{ borderCollapse:'collapse' }}>
                <thead style={{ background: th.tableHeadBg }}>
                  <tr>
                    {["Product","SKU","Category","Vehicle Info","Stock","Price","Actions"].map(h => (
                      <th key={h}
                        className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${h==="Stock"||h==="Price"||h==="Actions" ? "text-right" : "text-left"}`}
                        style={{ color: th.tableHeadText, borderBottom:`1px solid ${th.tableRowDivider}` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isPending ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[color:var(--autocity-accent)] border-t-transparent"/>
                        <p style={{ color: th.cellMuted }}>Loading products...</p>
                      </div>
                    </td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-2" style={{ color: th.cellFaint }} />
                      <p style={{ color: th.cellMuted }}>No products found</p>
                      {(activeFilterCount > 0 || searchTerm) && (
                        <button onClick={clearFilters} className="mt-2 text-[color:var(--autocity-accent)] hover:text-[color:var(--autocity-accent-strong)] text-sm transition-colors">Clear filters</button>
                      )}
                    </td></tr>
                  ) : products.map((product, index) => (
                    <tr key={product._id} ref={el => { productRefs.current[index] = el; }} className="transition-all cursor-pointer"
                      style={{ background: selectedProductIndex===index ? 'var(--autocity-accent-10)' : 'transparent', boxShadow: selectedProductIndex===index ? 'inset 0 0 0 2px var(--autocity-accent-50)' : 'none', borderBottom:`1px solid ${th.tableRowDivider}` }}
                      onMouseEnter={e => { if (selectedProductIndex!==index) e.currentTarget.style.background=th.tableRowHover; }}
                      onMouseLeave={e => { if (selectedProductIndex!==index) e.currentTarget.style.background='transparent'; }}
                      onClick={() => setSelectedProductIndex(index)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.isVehicle && <Car className="h-4 w-4 mr-2 text-[color:var(--autocity-accent)] flex-shrink-0" />}
                          <div>
                            <p className="text-sm font-medium" style={{ color: th.cellPrimary }}>{product.name}</p>
                            {product.partNumber && <p className="text-xs" style={{ color: th.cellFaint }}>Part#: {product.partNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono" style={{ color: th.cellSecondary }}>{product.sku}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cellMuted }}>{product.category?.name||"N/A"}</td>
                      <td className="px-6 py-4 text-sm">
                        {product.carMake ? (
                          <div className="space-y-1">
                            <div className="flex items-center font-medium" style={{ color: th.cellSecondary }}>
                              <Car className="h-3 w-3 mr-1 text-[color:var(--autocity-accent)] flex-shrink-0" />{product.carMake}
                            </div>
                            {product.carModel && <div className="text-xs pl-4" style={{ color: th.cellMuted }}>Model: {product.carModel}{product.variant&&` (${product.variant})`}</div>}
                            {(product.yearFrom||product.yearTo) && <div className="text-xs pl-4" style={{ color: th.cellFaint }}>Year: {formatYearRange(product.yearFrom,product.yearTo)}</div>}
                            {product.color && <div className="text-xs pl-4" style={{ color: th.cellFaint }}>Color: {product.color}</div>}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: th.cellFaint }}>{product.isVehicle?"Vehicle (no details)":"-"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={(product.currentStock||0)<=(product.minStock||0)?"text-red-400 font-semibold":""} style={(product.currentStock||0)>(product.minStock||0)?{color:th.cellSecondary}:{}}>
                          {formatProductQuantity(product.currentStock, product.unit)}
                        </span>
                        <div className="text-xs" style={{ color: th.cellFaint }}>
                          Min: {formatProductQuantity(product.minStock, product.unit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold" style={{ color: th.cellPrimary }}>QAR {product.sellingPrice||0}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={e => { e.stopPropagation(); handlePrintLabel(product); }}
                            disabled={printingLabelProductId === product._id}
                            className="text-green-400 hover:text-green-300 p-2 transition-colors disabled:opacity-50"
                            title={
                              product.barcode && sanitizeBarcodeValue(product.barcode) !== sanitizeBarcodeValue(product.sku)
                                ? "Print barcode label"
                                : "Generate and print barcode label"
                            }
                          >
                            {printingLabelProductId === product._id ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <QrCode className="h-5 w-5" />
                            )}
                          </button>
                          <button onClick={e => { e.stopPropagation(); router.push(`/autocityPro/products/${product._id}`); }} className="text-blue-400 hover:text-blue-300 p-2 transition-colors" title="View"><Eye className="h-5 w-5" /></button>
                          <button onClick={e => { e.stopPropagation(); openEditModal(product); }} className="text-[color:var(--autocity-accent)] hover:text-[color:var(--autocity-accent-strong)] p-2 transition-colors" title="Edit"><Edit className="h-5 w-5" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteClick(product); }} className="text-red-400 hover:text-red-300 p-2 transition-colors" title="Delete"><Trash2 className="h-5 w-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="md:hidden" style={{ borderTop:`1px solid ${th.tableRowDivider}` }}>
                {isPending ? (
                  <div className="p-6 text-center">
                    <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[color:var(--autocity-accent)] border-t-transparent"/></div>
                    <p className="text-sm" style={{ color: th.cellMuted }}>Loading products...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-6 text-center">
                    <Package className="h-12 w-12 mx-auto mb-2" style={{ color: th.cellFaint }} />
                    <p className="text-sm" style={{ color: th.cellMuted }}>No products found</p>
                    {(activeFilterCount > 0 || searchTerm) && (
                      <button onClick={clearFilters} className="mt-2 text-[color:var(--autocity-accent)] text-sm active:scale-95 transition-all">Clear filters</button>
                    )}
                  </div>
                ) : products.map((product, index) => (
                  <div key={product._id} style={{ borderBottom:`1px solid ${th.tableRowDivider}` }}>
                    <ProductCard
                      product={product}
                      onEdit={openEditModal}
                      onDelete={handleDeleteClick}
                      onPrintLabel={handlePrintLabel}
                      printingLabel={printingLabelProductId === product._id}
                      formatYearRange={formatYearRange}
                      isDark={isDark}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {pagination.hasMore && !isPending && (
            <div className="flex justify-center py-8">
              <button onClick={loadMoreProducts} disabled={isLoadingMore}
                className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg active:scale-95">
                {isLoadingMore ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"/><span>Loading...</span></>
                ) : (
                  <><span>Load More Products</span><span className="text-sm opacity-80 bg-white/20 px-2 py-1 rounded">{products.length} of {pagination.total||0}</span></>
                )}
              </button>
            </div>
          )}

          {!isPending && products.length > 0 && (
            <div className="text-center py-4 text-sm transition-colors duration-500"
              style={{ color: th.endText, borderTop:`1px solid ${th.endBorder}` }}>
              Showing {products.length} of {pagination.total||0} products{pagination.hasMore && " • Load more above"}
            </div>
          )}
        </div>
      </div>

      {/* ── CSV Export Modal ─────────────────────────────────────────────── */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl max-w-md w-full transition-colors duration-500"
            style={{ background: th.modalBg, border:`1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom:`1px solid ${th.modalBorder}` }}>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                  <FileDown className="h-5 w-5 text-[color:var(--autocity-accent)]" /> Export CSV
                </h2>
                <p className="text-xs mt-0.5" style={{ color: th.modalText }}>All products · sorted by SKU ascending</p>
              </div>
              <button onClick={() => { setShowCSVModal(false); setCsvSkuFrom(""); setCsvSkuTo(""); }}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* SKU range */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: th.filterLabel }}>
                  SKU Range <span className="font-normal" style={{ color: th.modalText }}>(optional — leave blank for all)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: th.modalText }}>From SKU</label>
                    <input
                      type="number"
                      value={csvSkuFrom}
                      onChange={e => setCsvSkuFrom(e.target.value)}
                      placeholder="e.g. 10001"
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent font-mono"
                      style={{ background: th.modalInputBg, border:`1px solid ${th.modalInputBorder}`, color: th.modalInputText }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: th.modalText }}>To SKU</label>
                    <input
                      type="number"
                      value={csvSkuTo}
                      onChange={e => setCsvSkuTo(e.target.value)}
                      placeholder="e.g. 10500"
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent font-mono"
                      style={{ background: th.modalInputBg, border:`1px solid ${th.modalInputBorder}`, color: th.modalInputText }}
                    />
                  </div>
                </div>
                {csvSkuFrom && csvSkuTo && parseInt(csvSkuFrom) > parseInt(csvSkuTo) && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> "From" must be less than or equal to "To"
                  </p>
                )}
              </div>

              {/* Info box */}
              <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: th.modalInfoBg, border:`1px solid ${th.modalInfoBorder}` }}>
                <p style={{ color: th.cellMuted }}>
                  <span style={{ color: th.cellSecondary }} className="font-medium">Includes:</span>{" "}
                  All active products matching current search & filters
                </p>
                <p style={{ color: th.cellMuted }}>
                  <span style={{ color: th.cellSecondary }} className="font-medium">Columns:</span>{" "}
                  SKU, Name, Category, Barcode, Location, Unit, Cost Price, Selling Price, Stock, Make, Model, Variant, Year Range, Color, Part Number
                </p>
                <p style={{ color: th.cellMuted }}>
                  <span style={{ color: th.cellSecondary }} className="font-medium">Sorted:</span>{" "}
                  SKU ascending (10001 → 10002 → 10003 …)
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowCSVModal(false); setCsvSkuFrom(""); setCsvSkuTo(""); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>
                  Cancel
                </button>
                <button
                  onClick={() => downloadProductsCSV(csvSkuFrom || undefined, csvSkuTo || undefined)}
                  disabled={isExportingCSV || !!(csvSkuFrom && csvSkuTo && parseInt(csvSkuFrom) > parseInt(csvSkuTo))}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isExportingCSV ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Exporting…</span></>
                  ) : (
                    <><FileDown className="h-4 w-4" /><span>Export{csvSkuFrom||csvSkuTo ? ` SKU ${csvSkuFrom||"start"}–${csvSkuTo||"end"}` : " All"}</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Filter Modal ──────────────────────────────────────────── */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl p-6 transition-colors duration-500 max-h-[90vh] overflow-y-auto"
            style={{ background: th.overlayBg, borderTop:`1px solid ${th.overlayBorder}` }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: th.overlayTitle }}>Filters</h2>
                {(activeFilterCount > 0 || searchTerm) && <p className="text-xs mt-1" style={{ color: th.cellMuted }}>{activeFilterCount + (searchTerm ? 1 : 0)} active</p>}
              </div>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label:"Stock Status", value:filterStatus, onChange:setFilterStatus, opts:[["all","All Status"],["low","Low Stock"],["critical","Critical"],["out","Out of Stock"]] },
                { label:"Type", value:filterIsVehicle, onChange:setFilterIsVehicle, opts:[["all","All Products"],["vehicle","Vehicles/Parts"],["non-vehicle","Non-Vehicle"]] },
                { label:"Category", value:filterCategory, onChange:setFilterCategory, opts:[["","All Categories"],...allCategories.map(c=>[c._id,c.name])] },
                { label:"Unit", value:filterUnit, onChange:setFilterUnit, opts:[["","All Units"],...PRODUCT_UNIT_OPTIONS.map(unit=>[unit.value,unit.label])] },
                { label:"Location / Area", value:filterLocationId, onChange:setFilterLocationId, opts:[["","All Locations"],...stockLocations.map(location=>[String(location._id),location.name])] },
              ].map(s => (
                <div key={s.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.filterLabel }}>{s.label}</label>
                  <select value={s.value} onChange={e => s.onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg transition-colors duration-500"
                    style={{ background: th.overlayItemBg, border:`1px solid ${th.overlayItemBorder}`, color: th.overlayTitle }}>
                    {s.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="pt-4" style={{ borderTop: `1px solid ${th.overlayItemBorder}` }}>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: th.filterLabel }}><Car className="h-4 w-4" />Vehicle Filters</h3>
                <div className="space-y-3">
                  {[
                    { label:"Make", value:filterMake, onChange:(value: string) => { setFilterMake(value); setFilterModel(''); }, opts:[["","All Makes"],...availableMakes.map(make=>[make,make])] },
                    { label:"Model", value:filterModel, onChange:setFilterModel, opts:[["","All Models"],...availableModels.map(model=>[model,model])], disabled:!filterMake },
                    { label:"Variant", value:filterVariant, onChange:setFilterVariant, opts:[["","All Variants"],...availableVariants.map(variant=>[variant,variant])] },
                    { label:"Colour", value:filterColor, onChange:setFilterColor, opts:[["","All Colours"],...availableColors.map(color=>[color,color])] },
                    { label:"Year", value:filterYear, onChange:setFilterYear, opts:[["","All Years"],...availableYears.map(year=>[String(year),String(year)])] },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-xs mb-1" style={{ color: th.cellMuted }}>{field.label}</label>
                      <select value={field.value} onChange={event => field.onChange(event.target.value)} disabled={(field as any).disabled} className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50" style={{ background: th.overlayItemBg, border:`1px solid ${th.overlayItemBorder}`, color: th.overlayTitle }}>
                        {field.opts.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { clearFilters(); setShowFilters(false); }} className="flex-1 px-4 py-3 rounded-xl transition-colors active:scale-95"
                  style={{ background: th.overlayItemBg, border:`1px solid ${th.overlayItemBorder}`, color: th.overlayItemText }}>Clear</button>
                <button onClick={() => setShowFilters(false)} className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] rounded-xl text-white font-semibold active:scale-95 transition-all">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Action Menu ───────────────────────────────────────────── */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl p-6 transition-colors duration-500"
            style={{ background: th.overlayBg, borderTop:`1px solid ${th.overlayBorder}` }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.overlayTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { setShowAddModal(true); setShowMobileMenu(false); }}
                className="w-full p-4 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] rounded-2xl text-white font-semibold flex items-center justify-between active:scale-95 transition-all">
                <span>Add Product</span><Plus className="h-5 w-5" />
              </button>
              {[
                { label:"Export PDF",          icon:<File className="h-5 w-5"/>,           action:() => { downloadProductsPDF(); setShowMobileMenu(false); } },
                { label:"Export CSV",          icon:<FileDown className="h-5 w-5"/>,        action:() => { setShowCSVModal(true); setShowMobileMenu(false); } },
                { label:"Bulk Import",         icon:<FileSpreadsheet className="h-5 w-5"/>, action:() => { router.push("/autocityPro/products/bulk-import"); setShowMobileMenu(false); } },
                { label:"Filters",             icon:<Filter className="h-5 w-5"/>,          action:() => { setShowFilters(true); setShowMobileMenu(false); } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="w-full p-4 rounded-2xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                  style={{ background: th.overlayItemBg, border:`1px solid ${th.overlayItemBorder}`, color: th.overlayItemText }}>
                  <span>{btn.label}</span>{btn.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modals ────────────────────────────────────────────── */}
      <AddProductModal show={showAddModal} onClose={() => setShowAddModal(false)}
        onAdd={handleAddProduct} categories={allCategories} nextSKU={currentSKU}
        onQuickAddCategory={() => setShowQuickAddCategory(true)}
        variantOptions={products.map((product: any) => product.variant)}
        colorOptions={products.map((product: any) => product.color)} />
      <EditProductModal show={showEditModal} onClose={() => { setShowEditModal(false); setEditingProduct(null); }}
        onUpdate={handleEditProduct} categories={allCategories} product={editingProduct}
        onQuickAddCategory={() => setShowQuickAddCategory(true)} />

      {/* ── Quick Add Category ───────────────────────────────────────────── */}
      {showQuickAddCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="rounded-2xl shadow-2xl max-w-md w-full transition-colors duration-500"
            style={{ background: th.modalBg, border:`1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-4 md:px-6 py-4" style={{ borderBottom:`1px solid ${th.modalBorder}` }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                <Tag className="h-5 w-5 text-[color:var(--autocity-accent)]" />Quick Add Category
              </h2>
              <button onClick={() => { setShowQuickAddCategory(false); setNewCategoryName(""); }}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label htmlFor="quick-add-category-name" className="block text-xs font-medium mb-1" style={{ color: th.filterLabel }}>Category Name *</label>
                <input id="quick-add-category-name" type="text" value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleQuickAddCategory()}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent transition-colors duration-500"
                  style={{ background: th.modalInputBg, border:`1px solid ${th.modalInputBorder}`, color: th.modalInputText }}
                  placeholder="Enter category name" />
                <p className="text-xs mt-1" style={{ color: th.cellFaint }}>This will create a new category and automatically select it</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => { setShowQuickAddCategory(false); setNewCategoryName(""); }}
                  className="px-4 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>Cancel</button>
                <button onClick={handleQuickAddCategory}
                  className="px-4 py-2 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">Add Category</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Verification Modal ─────────────────────────────────────── */}
      {showStockModal && productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl max-w-md w-full transition-colors duration-500"
            style={{ background: th.modalBg, border:`1px solid ${th.modalBorder}` }}>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl"><AlertCircle className="h-6 w-6 text-orange-400" /></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: th.modalTitle }}>Stock Must Be Zero</h3>
                  <p className="text-sm mb-3" style={{ color: th.modalText }}><strong style={{ color: th.modalTitle }}>{productToDelete.name}</strong> currently has <strong className="text-orange-400">{productToDelete.currentStock}</strong> units in stock.</p>
                  <p className="text-sm" style={{ color: th.modalText }}>You must decrease the stock to zero before deleting this product.</p>
                </div>
              </div>
              <div className="rounded-xl p-4 mb-4 transition-colors duration-500" style={{ background: th.modalInfoBg, border:`1px solid ${th.modalInfoBorder}` }}>
                <div className="flex justify-between items-center"><span className="text-sm" style={{ color: th.modalText }}>Current Stock:</span><span className="text-lg font-bold text-orange-400">{productToDelete.currentStock}</span></div>
                <div className="flex justify-between items-center mt-2"><span className="text-sm" style={{ color: th.modalText }}>After Decrease:</span><span className="text-lg font-bold text-green-400">0</span></div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => { setShowStockModal(false); setProductToDelete(null); }}
                  className="px-4 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>Cancel</button>
                <button onClick={handleDecreaseStock}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">Decrease Stock to Zero</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {productToDelete && !showStockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl max-w-md w-full transition-colors duration-500"
            style={{ background: th.modalBg, border:`1px solid ${th.modalBorder}` }}>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl"><AlertCircle className="h-6 w-6 text-red-400" /></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: th.modalTitle }}>Delete Product</h3>
                  <p className="text-sm" style={{ color: th.modalText }}>Are you sure you want to delete <strong style={{ color: th.modalTitle }}>{productToDelete.name}</strong>? This action cannot be undone.</p>
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400">✓ Stock is at zero — Ready to delete</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>Cancel</button>
                <button onClick={handleDeleteProduct}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">Delete Product</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden h-24" />
    </MainLayout>
  );
}
