"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import AddProductModal from "@/components/products/AddProductModal";
import EditProductModal from "@/components/products/EditProductModal";
import {
  Search, Plus, Edit, Trash2, Package, Car, X, Filter, Eye, Tag,
  FileDown, ChevronLeft, MoreVertical, AlertCircle, Zap, Box, File,
} from "lucide-react";
import toast from "react-hot-toast";
import ProductCard from "./ProductCard";
import DynamicIsland from "./DynamicIsland";
import useKeyboardShortcuts from "./useKeyboardShortcuts";

// ─── Time-based theme ────────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setIsDark(h < 6 || h >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

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
  const [products, setProducts]         = useState(initialProducts);
  const [stats, setStats]               = useState(initialStats);
  const [pagination, setPagination]     = useState(initialPagination);
  const [allCategories, setAllCategories] = useState(categories);
  const [currentSKU, setCurrentSKU]     = useState(nextSKU);

  const [searchTerm, setSearchTerm]     = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [showStockModal, setShowStockModal]   = useState(false);
  const [stockToDecrease, setStockToDecrease] = useState<number>(0);

  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const productRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [filterCategory,  setFilterCategory]  = useState("");
  const [filterMake,      setFilterMake]       = useState("");
  const [filterIsVehicle, setFilterIsVehicle]  = useState<string>("all");
  const [showFilters,     setShowFilters]      = useState(false);

  const [isMobile,         setIsMobile]         = useState(false);
  const [showMobileMenu,   setShowMobileMenu]   = useState(false);
  const [showDynamicIsland,setShowDynamicIsland]= useState(true);
  const [isLoadingMore,    setIsLoadingMore]    = useState(false);

  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName,      setNewCategoryName]      = useState("");
  const [editingProduct,       setEditingProduct]       = useState<any>(null);

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const th = {
    pageBg:            isDark ? '#050505'  : '#f3f4f6',
    // Mobile header
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
    // Stat cards (mobile)
    cardBg:     isDark ? 'rgba(10,10,10,0.50)' : 'rgba(255,255,255,0.80)',
    cardBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    cardLabel:  isDark ? '#9ca3af' : '#6b7280',
    cardValue:  isDark ? '#ffffff' : '#111827',
    // Desktop header
    headerBgFrom:    isDark ? '#932222' : '#fef2f2',
    headerBgVia:     isDark ? '#411010' : '#fee2e2',
    headerBgTo:      isDark ? '#a20c0c' : '#fecaca',
    headerTitle:     isDark ? '#ffffff' : '#7f1d1d',
    headerSub:       isDark ? 'rgba(255,255,255,0.80)' : '#991b1b',
    headerBorder:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    headerBtnBg:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    headerBtnBorder: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)',
    headerBtnText:   isDark ? '#ffffff' : '#7f1d1d',
    // Shortcuts button (desktop)
    shortcutsBg:     isDark ? 'rgba(10,10,12,0.90)' : 'rgba(255,255,255,0.90)',
    shortcutsBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    shortcutsText:   isDark ? '#9ca3af' : '#6b7280',
    shortcutsHover:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    // Filter panel
    filterBg:     isDark ? '#0A0A0A' : '#ffffff',
    filterBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    filterText:   isDark ? '#ffffff' : '#111827',
    filterLabel:  isDark ? '#d1d5db' : '#374151',
    filterDivider:isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    filterBtnBg:  isDark ? 'rgba(232,69,69,0.10)' : 'rgba(232,69,69,0.08)',
    filterBtnBorder: isDark ? 'rgba(232,69,69,0.30)' : 'rgba(232,69,69,0.20)',
    // Products container
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
    // Load more / count bar
    endBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    endText:   isDark ? '#9ca3af' : '#6b7280',
    // Mobile overlays / modals
    overlayBg:     isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)' : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    overlayBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    overlayTitle:  isDark ? '#ffffff' : '#111827',
    overlayClose:  isDark ? '#9ca3af' : '#6b7280',
    overlayCloseBg:isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    overlayItemBg: isDark ? '#0A0A0A' : 'rgba(0,0,0,0.04)',
    overlayItemBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    overlayItemText: isDark ? '#d1d5db' : '#374151',
    // Confirm modals
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

  // ── Deferred features ───────────────────────────────────────────────────────
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

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
    onSearch: () => searchInputRef.current?.focus(),
    onNewProduct: () => openAddModal(),
    onToggleFilters: () => setShowFilters(prev => !prev),
    onExport: () => downloadProductsCSV(),
    selectedIndex: selectedProductIndex,
    setSelectedIndex: setSelectedProductIndex,
    products,
    onViewProduct: product => router.push(`/autocityPro/products/${product._id}`),
    onDeleteProduct: handleDeleteClick,
    disabled: showAddModal || showEditModal || showQuickAddCategory || !!productToDelete || showFilters || showMobileMenu || showStockModal,
  });

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchProducts = async (page = 1, append = false) => {
    try {
      if (!append) setIsLoadingMore(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "50" });
      if (searchTerm)           params.append("search",     searchTerm);
      if (filterCategory)       params.append("categoryId", filterCategory);
      if (filterMake)           params.append("carMake",    filterMake);
      if (filterIsVehicle !== "all")
        params.append("isVehicle", filterIsVehicle === "vehicle" ? "true" : "false");

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

  useEffect(() => { fetchProducts(1); }, [searchTerm, filterCategory, filterMake, filterIsVehicle]);

  // ── Exports ─────────────────────────────────────────────────────────────────
  const downloadProductsPDF = async () => {
    try {
      toast.loading("Preparing PDF export...");
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"), import("jspdf-autotable"),
      ]);
      const params = new URLSearchParams({ export: "true" });
      if (searchTerm)     params.append("search",     searchTerm);
      if (filterCategory) params.append("categoryId", filterCategory);
      if (filterMake)     params.append("carMake",    filterMake);
      if (filterIsVehicle !== "all")
        params.append("isVehicle", filterIsVehicle === "vehicle" ? "true" : "false");
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
        if (!f && !t) return "";
        if (f && !t) return `${f}+`;
        if (!f && t) return `Up to ${t}`;
        if (f === t) return `${f}`;
        return `${f}-${t}`;
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

  const downloadProductsCSV = () => {
    if (!products.length) { toast.error("No products to export"); return; }
    const headers = ["SKU","Name","Category","Barcode","Selling Price","Current Stock","Car Make","Car Model","Variant","Year From","Year To","Part Number","Color"];
    const rows = products.map(p => [p.sku||"",p.name||"",p.category?.name||"",p.barcode||"",p.sellingPrice||0,p.currentStock||0,p.carMake||"",p.carModel||"",p.variant||"",p.yearFrom||"",p.yearTo||"",p.partNumber||"",p.color||""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => { const s=String(c); return (s.includes(",")||s.includes("\n")||s.includes('"')) ? `"${s.replace(/"/g,'""')}"` : s; }).join(","))].join("\n");
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})), download:`products_${new Date().toISOString().split("T")[0]}.csv` });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${products.length} products to CSV`);
  };

  // ── CRUD ────────────────────────────────────────────────────────────────────
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
    const res = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(productData) });
    if (res.ok) { toast.success("Product added!"); setShowAddModal(false); fetchProducts(1); }
    else { const e=await res.json(); toast.error(e.error||"Failed to add product"); }
  };

  const handleEditProduct = async (productData: any) => {
    if (!editingProduct) return;
    const res = await fetch(`/api/products/${editingProduct._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(productData) });
    if (res.ok) { toast.success("Product updated!"); setShowEditModal(false); setEditingProduct(null); fetchProducts(1); }
    else { const e=await res.json(); toast.error(e.error||"Failed to update product"); }
  };

  const openEditModal = (product: any) => { setEditingProduct(product); setShowEditModal(true); };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("Category name is required"); return; }
    const res = await fetch("/api/categories", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({name:newCategoryName}) });
    if (res.ok) { const d=await res.json(); toast.success("Category added!"); setAllCategories([...allCategories,{...d.category,productCount:0}]); setNewCategoryName(""); setShowQuickAddCategory(false); }
    else { const e=await res.json(); toast.error(e.error||"Failed to add category"); }
  };

  const clearFilters = () => { setFilterCategory(""); setFilterMake(""); setFilterIsVehicle("all"); setSearchTerm(""); };
  const handleLogout = async () => { await fetch("/api/auth/logout",{method:"POST",credentials:"include"}); window.location.href="/autocityPro/login"; };

  const availableMakes = [...new Set(products.filter(p => p.carMake).map(p => p.carMake))].sort() as string[];
  const formatYearRange = (f?: string|number, t?: string|number) => {
    if (!f && !t) return ""; if (f && !t) return `${f}+`; if (!f && t) return `Up to ${t}`; if (f===t) return `${f}`; return `${f}-${t}`;
  };

  // Shared select style
  const selectStyle = { background: th.filterBg, border: `1px solid ${th.filterBorder}`, color: th.filterText };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && (
          <DynamicIsland
            totalProducts={pagination.total || 0}
            totalValue={stats.totalValue || 0}
            lowStockCount={stats.lowStockCount || 0}
            isDark={isDark}
          />
        )}

        {/* Keyboard shortcuts hint */}
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
        <div
          className="md:hidden fixed top-14 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom:`1px solid ${th.mobileHeaderBorder}` }}
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
                  <h1 className="text-xl font-bold transition-colors" style={{ color: th.mobileTitle }}>Products</h1>
                  <p className="text-xs transition-colors" style={{ color: th.mobileSub }}>
                    {products.length} of {pagination.total || 0} loaded
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#E84545]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                style={{ background: th.mobileSearchBg, border:`1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label:"Total",     value: pagination.total || 0,                    color: th.cardValue },
                { label:"Value",     value:`QR${((stats.totalValue||0)/1000).toFixed(0)}K`, color:'#4ade80' },
                { label:"Low Stock", value: stats.lowStockCount || 0,                  color:(stats.lowStockCount||0)>0?'#fb923c':th.cardValue },
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
        <div
          className="hidden md:block py-12 border-b shadow-xl transition-colors duration-500"
          style={{
            background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`,
            borderColor: th.headerBorder,
          }}
        >
          <div className="px-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold transition-colors duration-500" style={{ color: th.headerTitle }}>
                Products
              </h1>
              <p className="mt-1 transition-colors duration-500" style={{ color: th.headerSub }}>
                {products.length} of {pagination.total || 0} products loaded
                {(filterCategory||filterMake||filterIsVehicle!=="all"||searchTerm) && " (filtered)"}
              </p>
            </div>
            <div className="flex gap-3">
              {[
                { label:"CSV", icon:<FileDown className="h-5 w-5"/>, action: downloadProductsCSV },
                { label:"PDF", icon:<FileDown className="h-5 w-5"/>, action: downloadProductsPDF },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ background: th.headerBtnBg, border:`1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)')}
                  onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}
                >
                  {btn.icon}<span>{btn.label}</span>
                </button>
              ))}
              <button
                onClick={openAddModal}
                className="flex items-center space-x-2 rounded-xl px-4 py-2 bg-[#E84545] text-white hover:bg-[#cc3c3c] transition-colors"
              >
                <Plus className="h-5 w-5" /><span className="font-medium">Add Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <div className="px-4 md:px-6 pt-[220px] md:pt-6 pb-6 transition-colors duration-500" style={{ background: th.pageBg }}>

          {/* Desktop Search + Filters */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#E84545]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, barcode, make, model, variant, or color... (press / to focus)"
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                  style={selectStyle}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: showFilters ? 'rgba(232,69,69,0.20)' : 'transparent',
                  border: `1px solid ${showFilters ? 'rgba(232,69,69,0.30)' : th.filterBorder}`,
                  color: th.filterText,
                }}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {(filterCategory||filterMake||filterIsVehicle!=="all") && (
                  <span className="ml-2 px-2 py-0.5 bg-[#E84545] text-white text-xs rounded-full">
                    {[filterCategory,filterMake,filterIsVehicle!=="all"].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 transition-colors duration-500"
                style={{ borderTop:`1px solid ${th.filterDivider}` }}>
                {[
                  { label:"Type",     value:filterIsVehicle, onChange:setFilterIsVehicle,
                    opts:[["all","All Products"],["vehicle","Vehicles/Parts Only"],["non-vehicle","Non-Vehicle Products"]] },
                  { label:"Category", value:filterCategory, onChange:setFilterCategory,
                    opts:[["","All Categories"], ...allCategories.map(c=>[c._id,`${c.name} (${c.productCount})`])] },
                  { label:"Car Make", value:filterMake, onChange:setFilterMake,
                    opts:[["","All Makes"], ...availableMakes.map(m=>[m,m])] },
                ].map(s => (
                  <div key={s.label}>
                    <label className="block text-sm font-medium mb-1" style={{ color: th.filterLabel }}>{s.label}</label>
                    <select value={s.value} onChange={e => s.onChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg appearance-none transition-colors duration-500"
                      style={selectStyle}
                    >
                      {s.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <div className="flex items-end">
                  <button onClick={clearFilters}
                    className="w-full px-4 py-2 rounded-lg transition-colors text-white"
                    style={{ background: th.filterBtnBg, border:`1px solid ${th.filterBtnBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,69,69,0.20)')}
                    onMouseLeave={e => (e.currentTarget.style.background = th.filterBtnBg)}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Products Container ──────────────────────────────────────── */}
          <div className="rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.containerBg, border:`1px solid ${th.containerBorder}` }}>

            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full md:table hidden" style={{ borderCollapse:'collapse' }}>
                <thead style={{ background: th.tableHeadBg }}>
                  <tr>
                    {["Product","SKU","Category","Vehicle Info","Stock","Price","Actions"].map(h => (
                      <th key={h}
                        className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${h==="Stock"||h==="Price"||h==="Actions" ? "text-right" : "text-left"}`}
                        style={{ color: th.tableHeadText, borderBottom:`1px solid ${th.tableRowDivider}` }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isPending ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"/>
                        <p style={{ color: th.cellMuted }}>Loading products...</p>
                      </div>
                    </td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-2" style={{ color: th.cellFaint }} />
                      <p style={{ color: th.cellMuted }}>No products found</p>
                      {(filterCategory||filterMake||filterIsVehicle!=="all") && (
                        <button onClick={clearFilters} className="mt-2 text-[#E84545] hover:text-[#cc3c3c] text-sm transition-colors">
                          Clear filters
                        </button>
                      )}
                    </td></tr>
                  ) : products.map((product, index) => (
                    <tr
                      key={product._id}
                      ref={el => { productRefs.current[index] = el; }}
                      className="transition-all cursor-pointer"
                      style={{
                        background: selectedProductIndex === index ? 'rgba(232,69,69,0.10)' : 'transparent',
                        boxShadow: selectedProductIndex === index ? 'inset 0 0 0 2px rgba(232,69,69,0.50)' : 'none',
                        borderBottom: `1px solid ${th.tableRowDivider}`,
                      }}
                      onMouseEnter={e => { if (selectedProductIndex !== index) e.currentTarget.style.background = th.tableRowHover; }}
                      onMouseLeave={e => { if (selectedProductIndex !== index) e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => setSelectedProductIndex(index)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.isVehicle && <Car className="h-4 w-4 mr-2 text-[#E84545] flex-shrink-0" />}
                          <div>
                            <p className="text-sm font-medium" style={{ color: th.cellPrimary }}>{product.name}</p>
                            {product.partNumber && <p className="text-xs" style={{ color: th.cellFaint }}>Part#: {product.partNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono" style={{ color: th.cellSecondary }}>{product.sku}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cellMuted }}>{product.category?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-sm">
                        {product.carMake ? (
                          <div className="space-y-1">
                            <div className="flex items-center font-medium" style={{ color: th.cellSecondary }}>
                              <Car className="h-3 w-3 mr-1 text-[#E84545] flex-shrink-0" />{product.carMake}
                            </div>
                            {product.carModel && (
                              <div className="text-xs pl-4" style={{ color: th.cellMuted }}>
                                Model: {product.carModel}{product.variant && ` (${product.variant})`}
                              </div>
                            )}
                            {(product.yearFrom||product.yearTo) && (
                              <div className="text-xs pl-4" style={{ color: th.cellFaint }}>
                                Year: {formatYearRange(product.yearFrom, product.yearTo)}
                              </div>
                            )}
                            {product.color && <div className="text-xs pl-4" style={{ color: th.cellFaint }}>Color: {product.color}</div>}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: th.cellFaint }}>
                            {product.isVehicle ? "Vehicle (no details)" : "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={(product.currentStock||0)<=(product.minStock||0) ? "text-red-400 font-semibold" : ""}
                          style={(product.currentStock||0)>(product.minStock||0) ? { color: th.cellSecondary } : {}}>
                          {product.currentStock || 0}
                        </span>
                        <div className="text-xs" style={{ color: th.cellFaint }}>Min: {product.minStock || 0}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold" style={{ color: th.cellPrimary }}>
                        QAR {product.sellingPrice || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          <button onClick={e => { e.stopPropagation(); router.push(`/autocityPro/products/${product._id}`); }}
                            className="text-blue-400 hover:text-blue-300 p-2 transition-colors" title="View (Enter)">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); openEditModal(product); }}
                            className="text-[#E84545] hover:text-[#cc3c3c] p-2 transition-colors" title="Edit (e)">
                            <Edit className="h-5 w-5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteClick(product); }}
                            className="text-red-400 hover:text-red-300 p-2 transition-colors" title="Delete (Del)">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden" style={{ borderTop:`1px solid ${th.tableRowDivider}` }}>
                {isPending ? (
                  <div className="p-6 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"/>
                    </div>
                    <p className="text-sm" style={{ color: th.cellMuted }}>Loading products...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-6 text-center">
                    <Package className="h-12 w-12 mx-auto mb-2" style={{ color: th.cellFaint }} />
                    <p className="text-sm" style={{ color: th.cellMuted }}>No products found</p>
                    {(filterCategory||filterMake||filterIsVehicle!=="all") && (
                      <button onClick={clearFilters} className="mt-2 text-[#E84545] text-sm active:scale-95 transition-all">
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : products.map((product, index) => (
                  <div key={product._id} style={{ borderBottom:`1px solid ${th.tableRowDivider}` }}>
                    <ProductCard
                      product={product}
                      onEdit={openEditModal}
                      onDelete={handleDeleteClick}
                      formatYearRange={formatYearRange}
                      isDark={isDark}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Load More */}
          {pagination.hasMore && !isPending && (
            <div className="flex justify-center py-8">
              <button
                onClick={loadMoreProducts}
                disabled={isLoadingMore}
                className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg active:scale-95"
              >
                {isLoadingMore ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"/><span>Loading...</span></>
                ) : (
                  <><span>Load More Products</span><span className="text-sm opacity-80 bg-white/20 px-2 py-1 rounded">{products.length} of {pagination.total||0}</span></>
                )}
              </button>
            </div>
          )}

          {/* Count bar */}
          {!isPending && products.length > 0 && (
            <div className="text-center py-4 text-sm transition-colors duration-500"
              style={{ color: th.endText, borderTop:`1px solid ${th.endBorder}` }}>
              Showing {products.length} of {pagination.total||0} products
              {pagination.hasMore && " • Load more above"}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Modal ──────────────────────────────────────────── */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl p-6 transition-colors duration-500"
            style={{ background: th.overlayBg, borderTop:`1px solid ${th.overlayBorder}` }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.overlayTitle }}>Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label:"Type",     value:filterIsVehicle, onChange:setFilterIsVehicle,
                  opts:[["all","All Products"],["vehicle","Vehicles Only"],["non-vehicle","Non-Vehicle"]] },
                { label:"Category", value:filterCategory,  onChange:setFilterCategory,
                  opts:[["","All Categories"],...allCategories.map(c=>[c._id,c.name])] },
                { label:"Car Make", value:filterMake,      onChange:setFilterMake,
                  opts:[["","All Makes"],...availableMakes.map(m=>[m,m])] },
              ].map(s => (
                <div key={s.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.filterLabel }}>{s.label}</label>
                  <select value={s.value} onChange={e => s.onChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg transition-colors duration-500"
                    style={{ background: th.overlayItemBg, border:`1px solid ${th.overlayItemBorder}`, color: th.overlayTitle }}>
                    {s.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors active:scale-95"
                  style={{ background: th.overlayItemBg, border:`1px solid ${th.overlayItemBorder}`, color: th.overlayItemText }}>
                  Clear
                </button>
                <button onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all">
                  Apply
                </button>
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
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { setShowAddModal(true); setShowMobileMenu(false); }}
                className="w-full p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-2xl text-white font-semibold flex items-center justify-between active:scale-95 transition-all">
                <span>Add Product</span><Plus className="h-5 w-5" />
              </button>
              {[
                { label:"Export PDF", icon:<File className="h-5 w-5"/>,     action:() => { downloadProductsPDF(); setShowMobileMenu(false); } },
                { label:"Export CSV", icon:<FileDown className="h-5 w-5"/>, action:() => { downloadProductsCSV(); setShowMobileMenu(false); } },
                { label:"Filters",   icon:<Filter className="h-5 w-5"/>,   action:() => { setShowFilters(true); setShowMobileMenu(false); } },
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
      <AddProductModal
        show={showAddModal} onClose={() => setShowAddModal(false)}
        onAdd={handleAddProduct} categories={allCategories} nextSKU={currentSKU}
        onQuickAddCategory={() => setShowQuickAddCategory(true)}
      />
      <EditProductModal
        show={showEditModal} onClose={() => { setShowEditModal(false); setEditingProduct(null); }}
        onUpdate={handleEditProduct} categories={allCategories} product={editingProduct}
        onQuickAddCategory={() => setShowQuickAddCategory(true)}
      />

      {/* ── Quick Add Category ───────────────────────────────────────────── */}
      {showQuickAddCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="rounded-2xl shadow-2xl max-w-md w-full transition-colors duration-500"
            style={{ background: th.modalBg, border:`1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-4 md:px-6 py-4"
              style={{ borderBottom:`1px solid ${th.modalBorder}` }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                <Tag className="h-5 w-5 text-[#E84545]" />Quick Add Category
              </h2>
              <button onClick={() => { setShowQuickAddCategory(false); setNewCategoryName(""); }}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.overlayCloseBg, color: th.overlayClose }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label htmlFor="quick-add-category-name" className="block text-xs font-medium mb-1" style={{ color: th.filterLabel }}>Category Name *</label>
                <input
                  id="quick-add-category-name"
                  type="text" value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleQuickAddCategory()}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                  style={{ background: th.modalInputBg, border:`1px solid ${th.modalInputBorder}`, color: th.modalInputText }}
                  placeholder="Enter category name"
                />
                <p className="text-xs mt-1" style={{ color: th.cellFaint }}>
                  This will create a new category and automatically select it
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => { setShowQuickAddCategory(false); setNewCategoryName(""); }}
                  className="px-4 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>
                  Cancel
                </button>
                <button onClick={handleQuickAddCategory}
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">
                  Add Category
                </button>
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
                  <p className="text-sm mb-3" style={{ color: th.modalText }}>
                    <strong style={{ color: th.modalTitle }}>{productToDelete.name}</strong> currently has{" "}
                    <strong className="text-orange-400">{productToDelete.currentStock}</strong> units in stock.
                  </p>
                  <p className="text-sm" style={{ color: th.modalText }}>
                    You must decrease the stock to zero before deleting this product.
                  </p>
                </div>
              </div>
              <div className="rounded-xl p-4 mb-4 transition-colors duration-500"
                style={{ background: th.modalInfoBg, border:`1px solid ${th.modalInfoBorder}` }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: th.modalText }}>Current Stock:</span>
                  <span className="text-lg font-bold text-orange-400">{productToDelete.currentStock}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm" style={{ color: th.modalText }}>After Decrease:</span>
                  <span className="text-lg font-bold text-green-400">0</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => { setShowStockModal(false); setProductToDelete(null); }}
                  className="px-4 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>
                  Cancel
                </button>
                <button onClick={handleDecreaseStock}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">
                  Decrease Stock to Zero
                </button>
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
                  <p className="text-sm" style={{ color: th.modalText }}>
                    Are you sure you want to delete{" "}
                    <strong style={{ color: th.modalTitle }}>{productToDelete.name}</strong>? This action cannot be undone.
                  </p>
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400">✓ Stock is at zero — Ready to delete</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ border:`1px solid ${th.modalCancelBorder}`, color: th.modalCancelText, background:'transparent' }}>
                  Cancel
                </button>
                <button onClick={handleDeleteProduct}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden h-24" />
    </MainLayout>
  );
}