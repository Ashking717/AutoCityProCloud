"use client";
// app/autocityPro/products/ProductsClient.tsx
// ✅ FIX #3: No blocking full-screen loader - content renders immediately
import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import AddProductModal from "@/components/products/AddProductModal";
import EditProductModal from "@/components/products/EditProductModal";
import {
  Search,
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
  Zap,
  Box,
  File,
} from "lucide-react";
import toast from "react-hot-toast";
import ProductCard from "./ProductCard"; // Separate component for list items
import DynamicIsland from "./DynamicIsland"; // ✅ FIX #4: Lazy-loaded component
import useKeyboardShortcuts from "./useKeyboardShortcuts"; // ✅ FIX #4: Custom hook

interface ProductsClientProps {
  initialUser: any;
  initialProducts: any[];
  initialStats: any;
  initialPagination: any;
  categories: any[];
  nextSKU: string;
}

export default function ProductsClient({
  initialUser,
  initialProducts,
  initialStats,
  initialPagination,
  categories,
  nextSKU,
}: ProductsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // ✅ Initialize with server data - no loading state needed
  const [user] = useState(initialUser);
  const [products, setProducts] = useState(initialProducts);
  const [stats, setStats] = useState(initialStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [allCategories, setAllCategories] = useState(categories);
  const [currentSKU, setCurrentSKU] = useState(nextSKU);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockToDecrease, setStockToDecrease] = useState<number>(0);

  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterMake, setFilterMake] = useState("");
  const [filterIsVehicle, setFilterIsVehicle] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(false); // ✅ FIX #4: Start false
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // ✅ FIX #4: Defer non-critical features
  useEffect(() => {
    // Defer Dynamic Island rendering
    const timer = setTimeout(() => {
      setShowDynamicIsland(true);
    }, 1000);

    // Check if mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkIfMobile);
    };
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

  // ✅ FIX #4: Keyboard shortcuts in separate hook (deferred)
  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onNewProduct: () => openAddModal(),
    onToggleFilters: () => setShowFilters((prev) => !prev),
    onExport: () => downloadProductsCSV(),
    selectedIndex: selectedProductIndex,
    setSelectedIndex: setSelectedProductIndex,
    products,
    onViewProduct: (product) => router.push(`/autocityPro/products/${product._id}`),
    onDeleteProduct: handleDeleteClick,
    disabled: showAddModal || showEditModal || showQuickAddCategory || !!productToDelete || showFilters || showMobileMenu || showStockModal,
  });

  const fetchProducts = async (page = 1, append = false) => {
    try {
      if (!append) {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (searchTerm) params.append("search", searchTerm);
      if (filterCategory) params.append("categoryId", filterCategory);
      if (filterMake) params.append("carMake", filterMake);
      if (filterIsVehicle !== "all") {
        params.append("isVehicle", filterIsVehicle === "vehicle" ? "true" : "false");
      }

      const res = await fetch(`/api/products?${params.toString()}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();

        startTransition(() => {
          if (append) {
            setProducts((prev) => [...prev, ...data.products]);
          } else {
            setProducts(data.products || []);
          }
          setPagination(data.pagination);
          setStats(data.stats);
        });
      } else {
        toast.error("Failed to load products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMoreProducts = () => {
    if (!isLoadingMore && pagination.hasMore) {
      fetchProducts(pagination.page + 1, true);
    }
  };

  // ✅ FIX #2: Lazy-load PDF export library
  const downloadProductsPDF = async () => {
    try {
      toast.loading("Preparing PDF export...");

      // Dynamic import - only load when needed
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const params = new URLSearchParams({ export: "true" });
      if (searchTerm) params.append("search", searchTerm);
      if (filterCategory) params.append("categoryId", filterCategory);
      if (filterMake) params.append("carMake", filterMake);
      if (filterIsVehicle !== "all") {
        params.append("isVehicle", filterIsVehicle === "vehicle" ? "true" : "false");
      }

      const res = await fetch(`/api/products?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Export fetch failed");

      const { products: allProducts } = await res.json();

      if (!allProducts || allProducts.length === 0) {
        toast.dismiss();
        toast.error("No products to export");
        return;
      }

      const PRIORITY_MAKES = ["toyota", "nissan", "lexus", "ford"];
      const sortedProducts = [...allProducts].sort((a, b) => {
        const hasMakeA = !!a.carMake;
        const hasMakeB = !!b.carMake;

        if (hasMakeA && !hasMakeB) return -1;
        if (!hasMakeA && hasMakeB) return 1;
        if (!hasMakeA && !hasMakeB) return 0;

        const makeA = a.carMake.toLowerCase();
        const makeB = b.carMake.toLowerCase();

        const idxA = PRIORITY_MAKES.indexOf(makeA);
        const idxB = PRIORITY_MAKES.indexOf(makeB);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        if (makeA !== makeB) return makeA.localeCompare(makeB);

        const modelA = (a.carModel || "").toLowerCase();
        const modelB = (b.carModel || "").toLowerCase();
        if (modelA !== modelB) return modelA.localeCompare(modelB);

        return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
      });

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const headers = [
        ["SKU", "Name", "Category", "Barcode", "Price", "Stock", "Make", "Model", "Variant", "Year", "Color", "Part No"],
      ];

      const rows: any[] = [];
      let lastMake = "";
      let lastModel = "";
      let othersStarted = false;

      const formatYearRange = (yearFrom?: string | number, yearTo?: string | number): string => {
        if (!yearFrom && !yearTo) return "";
        if (yearFrom && !yearTo) return `${yearFrom}+`;
        if (!yearFrom && yearTo) return `Up to ${yearTo}`;
        if (yearFrom === yearTo) return `${yearFrom}`;
        return `${yearFrom}-${yearTo}`;
      };

      sortedProducts.forEach((p) => {
        const hasMake = !!p.carMake;

        if (!hasMake) {
          if (!othersStarted) {
            rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
            rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
            rows.push([
              {
                content: "OTHERS / GENERAL PRODUCTS",
                colSpan: 12,
                styles: {
                  fillColor: [40, 40, 40],
                  textColor: 255,
                  fontStyle: "bold",
                  fontSize: 9,
                  halign: "center",
                },
              },
            ]);
            othersStarted = true;
          }

          rows.push([
            p.sku || "",
            p.name || "",
            p.category?.name || "",
            p.barcode || "",
            p.sellingPrice || 0,
            p.currentStock || 0,
            "",
            "",
            p.variant || "",
            formatYearRange(p.yearFrom, p.yearTo),
            p.color || "",
            p.partNumber || "",
          ]);
          return;
        }

        if (p.carMake !== lastMake) {
          rows.push([
            {
              content: p.carMake.toUpperCase(),
              colSpan: 12,
              styles: {
                fillColor: [25, 25, 25],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 9,
                halign: "center",
              },
            },
          ]);
          lastMake = p.carMake;
          lastModel = "";
        }

        if (p.carModel && p.carModel !== lastModel) {
          rows.push([
            {
              content: `  ${p.carModel}`,
              colSpan: 12,
              styles: {
                fillColor: [140, 140, 140],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 8,
                halign: "left",
              },
            },
          ]);
          lastModel = p.carModel;
        }

        rows.push([
          p.sku || "",
          p.name || "",
          p.category?.name || "",
          p.barcode || "",
          p.sellingPrice || 0,
          p.currentStock || 0,
          p.carMake || "",
          p.carModel || "",
          p.variant || "",
          formatYearRange(p.yearFrom, p.yearTo),
          p.color || "",
          p.partNumber || "",
        ]);
      });

      // @ts-ignore
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 22,
        theme: "grid",
        showHead: "everyPage",
        pageBreak: "auto",
        styles: {
          fontSize: 6.8,
          cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
          valign: "middle",
        },
        headStyles: {
          fillColor: [65, 16, 16],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
        },
        margin: { top: 18, left: 8, right: 8 },
      });

      doc.save(`products_${new Date().toISOString().split("T")[0]}.pdf`);

      toast.dismiss();
      toast.success(`Exported ${sortedProducts.length} products to PDF`);
    } catch (err) {
      toast.dismiss();
      console.error("PDF export failed:", err);
      toast.error("Failed to export PDF");
    }
  };

  const downloadProductsCSV = () => {
    if (products.length === 0) {
      toast.error("No products to export");
      return;
    }
    const headers = [
      "SKU",
      "Name",
      "Category",
      "Barcode",
      "Selling Price",
      "Current Stock",
      "Car Make",
      "Car Model",
      "Variant",
      "Year From",
      "Year To",
      "Part Number",
      "Color",
    ];
    const rows = products.map((product) => [
      product.sku || "",
      product.name || "",
      product.category?.name || "",
      product.barcode || "",
      product.sellingPrice || 0,
      product.currentStock || 0,
      product.carMake || "",
      product.carModel || "",
      product.variant || "",
      product.yearFrom || "",
      product.yearTo || "",
      product.partNumber || "",
      product.color || "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${products.length} products to CSV`);
  };

  

  const handleDecreaseStock = async () => {
    if (!productToDelete) return;

    try {
      const res = await fetch(`/api/products/${productToDelete._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...productToDelete,
          currentStock: 0,
        }),
      });

      if (res.ok) {
        toast.success("Stock decreased to zero");
        setShowStockModal(false);
        setProductToDelete({ ...productToDelete, currentStock: 0 });
        await fetchProducts(1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update stock");
      }
    } catch (error) {
      toast.error("Failed to update stock");
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    if (productToDelete.currentStock > 0) {
      toast.error("Cannot delete product with stock. Please decrease stock to zero first.");
      return;
    }

    try {
      const res = await fetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Product deleted successfully!");
        setProductToDelete(null);
        setShowStockModal(false);
        await fetchProducts(1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const openAddModal = async () => {
    setShowAddModal(true);
  };

  const handleAddProduct = async (productData: any) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        toast.success("Product added successfully!");
        setShowAddModal(false);
        await fetchProducts(1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add product");
      }
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const handleEditProduct = async (productData: any) => {
    if (!editingProduct) return;

    try {
      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        toast.success("Product updated successfully!");
        setShowEditModal(false);
        setEditingProduct(null);
        await fetchProducts(1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update product");
      }
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Category added successfully!");
        const newCategoryWithCount = {
          ...data.category,
          productCount: 0,
        };
        setAllCategories([...allCategories, newCategoryWithCount]);
        setNewCategoryName("");
        setShowQuickAddCategory(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add category");
      }
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const clearFilters = () => {
    setFilterCategory("");
    setFilterMake("");
    setFilterIsVehicle("all");
    setSearchTerm("");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const availableMakes = [...new Set(products.filter((p) => p.carMake).map((p) => p.carMake))].sort();

  const formatYearRange = (yearFrom?: string | number, yearTo?: string | number): string => {
    if (!yearFrom && !yearTo) return "";
    if (yearFrom && !yearTo) return `${yearFrom}+`;
    if (!yearFrom && yearTo) return `Up to ${yearTo}`;
    if (yearFrom === yearTo) return `${yearFrom}`;
    return `${yearFrom}-${yearTo}`;
  };

  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, filterCategory, filterMake, filterIsVehicle]);

  // ✅ FIX #3: Content renders immediately, no blocking loader
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* ✅ FIX #4: Dynamic Island only renders after 1s delay */}
        {isMobile && showDynamicIsland && (
          <DynamicIsland
            totalProducts={pagination.total || 0}
            totalValue={stats.totalValue || 0}
            lowStockCount={stats.lowStockCount || 0}
          />
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="hidden md:block fixed bottom-4 right-4 z-40">
          <button
            onClick={() => {
              toast.success(
                "Keyboard Shortcuts:\n" +
                  "/ - Focus search\n" +
                  "N - New product\n" +
                  "F - Toggle filters\n" +
                  "E - Export CSV\n" +
                  "↑↓ - Navigate\n" +
                  "Enter - View\n" +
                  "e - Edit\n" +
                  "Del - Delete\n" +
                  "? - Show help",
                { duration: 5000 }
              );
            }}
            className="px-3 py-2 bg-[#0A0A0A]/90 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs flex items-center gap-2"
            title="Keyboard shortcuts (press ?)"
          >
            <span className="font-mono">?</span>
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Mobile Header - Compact */}
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
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
                  <h1 className="text-xl font-bold text-white">Products</h1>
                  <p className="text-xs text-white/60">
                    {products.length} of {pagination.total || 0} loaded
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Total</p>
                <p className="text-sm font-bold text-white">{pagination.total || 0}</p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Value</p>
                <p className="text-sm font-bold text-green-400">
                  QR{((stats.totalValue || 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Low Stock</p>
                <p
                  className={`text-sm font-bold ${
                    (stats.lowStockCount || 0) > 0 ? "text-orange-400" : "text-green-400"
                  }`}
                >
                  {stats.lowStockCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Products</h1>
                <p className="text-white/80 mt-1">
                  {products.length} of {pagination.total || 0} products loaded
                  {(filterCategory || filterMake || filterIsVehicle !== "all" || searchTerm) && ` (filtered)`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={downloadProductsCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  <FileDown className="h-5 w-5" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={downloadProductsPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  <FileDown className="h-5 w-5" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={openAddModal}
                  className="flex items-center space-x-2 rounded-xl px-4 py-2 bg-[#E84545] text-white hover:bg-[#cc3c3c] transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-weight-medium">Add Product</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-6 pt-[220px] md:pt-6 pb-6 bg-[#050505]">
          {/* Search and Filters - Desktop */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#E84545]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, barcode, make, model, variant, or color... (press / to focus)"
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border border-white/10 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-[#E84545]/20 backdrop-blur-sm text-white border-[#E84545]/30"
                    : "hover:bg-white/5 text-white"
                }`}
                title="Toggle Filters (F)"
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                  <span className="ml-2 px-2 py-0.5 bg-[#E84545] text-white text-xs rounded-full">
                    {[filterCategory, filterMake, filterIsVehicle !== "all"].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Options - Desktop */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    value={filterIsVehicle}
                    onChange={(e) => setFilterIsVehicle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="all" className="text-[#050505]">
                      All Products
                    </option>
                    <option value="vehicle" className="text-[#050505]">
                      Vehicles/Parts Only
                    </option>
                    <option value="non-vehicle" className="text-[#050505]">
                      Non-Vehicle Products
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="" className="text-[#050505]">
                      All Categories
                    </option>
                    {allCategories.map((cat) => (
                      <option key={cat._id} value={cat._id} className="text-[#050505]">
                        {cat.name} ({cat.productCount})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Car Make</label>
                  <select
                    value={filterMake}
                    onChange={(e) => setFilterMake(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="" className="text-[#050505]">
                      All Makes
                    </option>
                    {availableMakes.map((make) => (
                      <option key={make} value={make} className="text-[#050505]">
                        {make}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-[#E84545]/10 backdrop-blur-sm border border-[#E84545]/30 rounded-lg hover:bg-[#E84545]/20 text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Filter Modal */}
          {showFilters && (
            <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={filterIsVehicle}
                      onChange={(e) => setFilterIsVehicle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="all" className="text-[#050505]">
                        All Products
                      </option>
                      <option value="vehicle" className="text-[#050505]">
                        Vehicles Only
                      </option>
                      <option value="non-vehicle" className="text-[#050505]">
                        Non-Vehicle
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="" className="text-[#050505]">
                        All Categories
                      </option>
                      {allCategories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="text-[#050505]">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Car Make</label>
                    <select
                      value={filterMake}
                      onChange={(e) => setFilterMake(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="" className="text-[#050505]">
                        All Makes
                      </option>
                      {availableMakes.map((make) => (
                        <option key={make} value={make} className="text-[#050505]">
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={clearFilters}
                      className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors active:scale-95"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-xl overflow-hidden border border-white/10">
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5 md:table hidden">
                <thead className="bg-[#050505]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Vehicle Info
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isPending ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"></div>
                        </div>
                        <p className="mt-2">Loading products...</p>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No products found</p>
                        {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                          <button
                            onClick={clearFilters}
                            className="mt-2 text-[#E84545] hover:text-[#cc3c3c] text-sm transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    products.map((product, index) => (
                      <tr
                        key={product._id}
                        ref={(el) => {
                          productRefs.current[index] = el;
                        }}
                        className={`transition-all ${
                          selectedProductIndex === index
                            ? "bg-[#E84545]/10 ring-2 ring-[#E84545]/50 ring-inset"
                            : "hover:bg-white/2"
                        }`}
                        onClick={() => setSelectedProductIndex(index)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {product.isVehicle && <Car className="h-4 w-4 mr-2 text-[#E84545] flex-shrink-0" />}
                            <div>
                              <p className="text-sm font-medium text-white">{product.name}</p>
                              {product.partNumber && (
                                <p className="text-xs text-gray-500">Part#: {product.partNumber}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{product.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{product.category?.name || "N/A"}</td>
                        <td className="px-6 py-4 text-sm">
                          {product.carMake ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-gray-300 font-medium">
                                <Car className="h-3 w-3 mr-1 text-[#E84545] flex-shrink-0" />
                                <span>{product.carMake}</span>
                              </div>
                              {product.carModel && (
                                <div className="text-gray-400 text-xs pl-4">
                                  Model: {product.carModel}
                                  {product.variant && ` (${product.variant})`}
                                </div>
                              )}
                              {(product.yearFrom || product.yearTo) && (
                                <div className="text-gray-500 text-xs pl-4">
                                  Year: {formatYearRange(product.yearFrom, product.yearTo)}
                                </div>
                              )}
                              {product.color && (
                                <div className="text-gray-500 text-xs pl-4">Color: {product.color}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              {product.isVehicle ? "Vehicle (no details)" : "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span
                            className={`${
                              (product.currentStock || 0) <= (product.minStock || 0)
                                ? "text-red-400 font-semibold"
                                : "text-gray-300"
                            }`}
                          >
                            {product.currentStock || 0}
                          </span>
                          <div className="text-xs text-gray-500">Min: {product.minStock || 0}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-white">
                          QAR {product.sellingPrice || 0}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/autocityPro/products/${product._id}`);
                              }}
                              className="text-blue-400 hover:text-blue-300 p-2 transition-colors"
                              title="View Details (Enter)"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(product);
                              }}
                              className="text-[#E84545] hover:text-[#cc3c3c] p-2 transition-colors"
                              title="Edit (e)"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(product);
                              }}
                              className="text-red-400 hover:text-red-300 p-2 transition-colors"
                              title="Delete (Del)"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* ✅ FIX #5: Mobile Card Layout - ready for virtualization */}
              <div className="md:hidden divide-y divide-white/5">
                {isPending ? (
                  <div className="p-6 text-center text-gray-400">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"></div>
                    </div>
                    <p className="mt-2 text-sm">Loading products...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">No products found</p>
                    {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-[#E84545] hover:text-[#cc3c3c] text-sm transition-colors active:scale-95"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  products.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onEdit={openEditModal}
                      onDelete={handleDeleteClick}
                      formatYearRange={formatYearRange}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Load More Button - Desktop */}
          {pagination.hasMore && !isPending && (
            <div className="hidden md:flex justify-center py-8">
              <button
                onClick={loadMoreProducts}
                disabled={isLoadingMore}
                className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
              >
                {isLoadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Loading More...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Products</span>
                    <span className="text-sm opacity-80 bg-white/20 px-2 py-1 rounded">
                      {products.length} of {pagination.total || 0}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Load More Button - Mobile */}
          {pagination.hasMore && !isPending && (
            <div className="md:hidden flex justify-center py-6">
              <button
                onClick={loadMoreProducts}
                disabled={isLoadingMore}
                className="w-full mx-4 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>Load More</span>
                    <span className="text-sm opacity-80">
                      ({products.length}/{pagination.total || 0})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Products Count Display */}
          {!isPending && products.length > 0 && (
            <div className="text-center py-4 text-gray-400 text-sm border-t border-white/5">
              Showing {products.length} of {pagination.total || 0} products
              {pagination.hasMore && " • Scroll down to load more"}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  setShowAddModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-gradient-to-red from-[#E84545] to-[#cc3c3c] rounded-2xl text-white font-semibold hover:opacity-90 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Add Product</span>
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadProductsPDF();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-white font-semibold hover:bg-[#E84545]/20 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export PDF</span>
                <File className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  downloadProductsCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  setShowFilters(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Filters</span>
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddProduct}
        categories={allCategories}
        nextSKU={currentSKU}
        onQuickAddCategory={() => setShowQuickAddCategory(true)}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        onUpdate={handleEditProduct}
        categories={allCategories}
        product={editingProduct}
        onQuickAddCategory={() => setShowQuickAddCategory(true)}
      />

      {/* Quick Add Category Modal */}
      {showQuickAddCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#E84545]" />
                Quick Add Category
              </h2>
              <button
                onClick={() => {
                  setShowQuickAddCategory(false);
                  setNewCategoryName("");
                }}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    placeholder="Enter category name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleQuickAddCategory();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This will create a new category and automatically select it
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowQuickAddCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAddCategory}
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Verification Modal */}
      {showStockModal && productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Stock Must Be Zero</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    <strong className="text-white">{productToDelete.name}</strong> currently has{" "}
                    <strong className="text-orange-400">{productToDelete.currentStock}</strong> units in stock.
                  </p>
                  <p className="text-sm text-gray-400">
                    You must decrease the stock to zero before deleting this product.
                  </p>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Current Stock:</span>
                  <span className="text-lg font-bold text-orange-400">{productToDelete.currentStock}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-400">After Decrease:</span>
                  <span className="text-lg font-bold text-green-400">0</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => {
                    setShowStockModal(false);
                    setProductToDelete(null);
                  }}
                  className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecreaseStock}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                >
                  Decrease Stock to Zero
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && !showStockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Delete Product</h3>
                  <p className="text-sm text-gray-400">
                    Are you sure you want to delete <strong className="text-white">{productToDelete.name}</strong>?
                    This action cannot be undone.
                  </p>
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400">✓ Stock is at zero - Ready to delete</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                >
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-24"></div>

      <style jsx global>{`
        @supports (padding: max(0px)) {
          .md\\:hidden.fixed.top-16 {
            padding-top: max(12px, env(safe-area-inset-top));
          }
        }
      `}</style>
    </MainLayout>
  );
}