'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Filter, 
  X, 
  MoreVertical, 
  ChevronLeft, 
  FileDown, 
  Search,
  Zap,
  RefreshCw,
  Car,
  Palette,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // Advanced filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMake, setFilterMake] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterVariant, setFilterVariant] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterIsVehicle, setFilterIsVehicle] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchCategories();
    fetchProducts(1, false);

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1, false);
  }, [searchTerm, filterStatus, filterCategory, filterMake, filterModel, filterVariant, filterColor, filterYear, filterIsVehicle]);

  // Helper function to check if a year falls within a product's year range
  const isYearInRange = (product: any, selectedYear: string) => {
    if (!selectedYear) return true;
    const year = parseInt(selectedYear);
    const yearFrom = product.yearFrom || year;
    const yearTo = product.yearTo || yearFrom;
    return year >= yearFrom && year <= yearTo;
  };

  const convertToStockCode = (value: number) => {
    const valueStr = Math.floor(value).toString();
    let result = '';
    for (let i = 0; i < valueStr.length; i++) {
      const digit = parseInt(valueStr[i]);
      switch (digit) {
        case 0: result += 'R'; break;
        case 1: result += 'F'; break;
        case 2: result += 'I'; break;
        case 3: result += 'N'; break;
        case 4: result += 'D'; break;
        case 5: result += 'M'; break;
        case 6: result += 'O'; break;
        case 7: result += 'T'; break;
        case 8: result += 'H'; break;
        case 9: result += 'E'; break;
        default: result += digit;
      }
    }
    return result;
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchProducts = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      // Add all filter parameters
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('categoryId', filterCategory);
      if (filterMake) params.append('carMake', filterMake);
      if (filterModel) params.append('carModel', filterModel);
      if (filterVariant) params.append('variant', filterVariant);
      if (filterColor) params.append('color', filterColor);
      // Note: Year filtering will be done client-side to support range checking
      if (filterIsVehicle !== 'all') {
        params.append('isVehicle', filterIsVehicle === 'vehicle' ? 'true' : 'false');
      }

      const res = await fetch(`/api/products?${params.toString()}`, { 
        credentials: 'include' 
      });

      if (res.ok) {
        const data = await res.json();

        if (append) {
          setProducts(prev => [...prev, ...data.products]);
        } else {
          setProducts(data.products || []);
        }

        setTotalProducts(data.pagination.total);
        setHasMoreProducts(data.pagination.hasMore);
        setCurrentPage(page);

        console.log('✓ Fetched stock data:', data.products?.length || 0);
      } else {
        toast.error('Failed to load stock data');
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load stock data');
      setProducts([]);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreProducts = () => {
    if (!isLoadingMore && hasMoreProducts) {
      fetchProducts(currentPage + 1, true);
    }
  };

  // Calculate stats from loaded products (after year range filtering)
  const yearFilteredProducts = products.filter(p => isYearInRange(p, filterYear));
  
  const totalStockValue = yearFilteredProducts.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  const lowStockItems = yearFilteredProducts.filter(p => p.currentStock <= p.reorderPoint);
  const outOfStockItems = yearFilteredProducts.filter(p => p.currentStock <= 0);
  const criticalItems = yearFilteredProducts.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock);

  const totalStockCode = convertToStockCode(totalStockValue);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  // Client-side filtering for status and year range
  const filteredProducts = yearFilteredProducts.filter((p) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "low" && p.currentStock <= p.reorderPoint && p.currentStock > 0) ||
      (filterStatus === "out" && p.currentStock <= 0) ||
      (filterStatus === "critical" && p.currentStock > 0 && p.currentStock <= p.minStock);
    return matchesStatus;
  });

  // Get unique values for filters from loaded products
  const availableMakes = [...new Set(products.filter(p => p.carMake).map(p => p.carMake))].sort();
  const availableModels = filterMake 
    ? [...new Set(products.filter(p => p.carMake === filterMake && p.carModel).map(p => p.carModel))].sort()
    : [];
  const availableVariants = [...new Set(products.filter(p => p.variant).map(p => p.variant))].sort();
  const availableColors = [...new Set(products.filter(p => p.color).map(p => p.color))].sort();
  
  // Generate a list of years from all products' year ranges
  const availableYears = (() => {
    const yearsSet = new Set<number>();
    products.forEach(p => {
      if (p.yearFrom) {
        const yearTo = p.yearTo || p.yearFrom;
        for (let year = p.yearFrom; year <= yearTo; year++) {
          yearsSet.add(year);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  })();

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterCategory("");
    setFilterMake("");
    setFilterModel("");
    setFilterVariant("");
    setFilterColor("");
    setFilterYear("");
    setFilterIsVehicle("all");
    setSearchTerm("");
  };

  const activeFilterCount = [
    filterCategory,
    filterMake,
    filterModel,
    filterVariant,
    filterColor,
    filterYear,
    filterIsVehicle !== "all",
    filterStatus !== "all"
  ].filter(Boolean).length;

  const downloadStockCSV = () => {
    if (filteredProducts.length === 0) {
      toast.error("No stock data to export");
      return;
    }
    const headers = ["SKU", "Name", "Current Stock", "Min Stock", "Reorder Point", "Stock Value", "Make", "Model", "Variant", "Color", "Year Range"];
    const rows = filteredProducts.map(p => [
      p.sku || "",
      p.name || "",
      p.currentStock || 0,
      p.minStock || 0,
      p.reorderPoint || 0,
      (p.currentStock * p.costPrice) || 0,
      p.carMake || "",
      p.carModel || "",
      p.variant || "",
      p.color || "",
      p.yearFrom ? `${p.yearFrom}${p.yearTo ? `-${p.yearTo}` : ''}` : ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredProducts.length} items to CSV`);
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{totalStockCode}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{filteredProducts.length} of {totalProducts}</span>
                </div>
                {lowStockItems.length > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">{lowStockItems.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
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
                  <h1 className="text-xl font-bold text-white">Stock</h1>
                  <p className="text-xs text-white/60">{filteredProducts.length} of {totalProducts} loaded</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all relative"
                >
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#E84545] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
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
                placeholder="Search stock..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Stock Management</h1>
                <p className="text-white/80 mt-1">
                  Monitor and manage your inventory levels • {filteredProducts.length} of {totalProducts} loaded
                  {activeFilterCount > 0 && ` • ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                </p>
              </div>
              <button
                onClick={downloadStockCSV}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
              >
                <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Package className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Value</p>
              <p className="text-lg md:text-xl font-bold text-white truncate">{totalStockCode}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{formatCompactCurrency(totalStockValue)}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Low Stock</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545]">{lowStockItems.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Out of Stock</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545]">{outOfStockItems.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Critical</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545]">{criticalItems.length}</p>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="bg-[#E84545]/10 border-l-4 border-[#E84545] p-4 md:p-6 mb-6 rounded-xl border border-[#E84545]/20 active:scale-[0.98] transition-all">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white">
                    {lowStockItems.length} items need reordering
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">
                    These products are running low on stock and need to be reordered soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-lg shadow p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="low">Low Stock</option>
                  <option value="critical">Critical</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>

              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  value={filterIsVehicle}
                  onChange={(e) => setFilterIsVehicle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="vehicle">Vehicles/Parts Only</option>
                  <option value="non-vehicle">Non-Vehicle Only</option>
                </select>
              </div>
            </div>

            {/* Vehicle-specific filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <Car className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={filterMake}
                  onChange={(e) => {
                    setFilterMake(e.target.value);
                    setFilterModel(""); // Reset model when make changes
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="">All Makes</option>
                  {availableMakes.map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  disabled={!filterMake}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none disabled:opacity-50"
                >
                  <option value="">All Models</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  value={filterVariant}
                  onChange={(e) => setFilterVariant(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="">All Variants</option>
                  {availableVariants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Palette className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="">All Colors</option>
                  {availableColors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {filterCategory && (
                    <span className="px-2 py-1 bg-[#E84545]/20 text-[#E84545] text-xs rounded-full flex items-center gap-1">
                      Category: {categories.find(c => c._id === filterCategory)?.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCategory("")} />
                    </span>
                  )}
                  {filterMake && (
                    <span className="px-2 py-1 bg-[#E84545]/20 text-[#E84545] text-xs rounded-full flex items-center gap-1">
                      Make: {filterMake}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterMake("")} />
                    </span>
                  )}
                  {filterModel && (
                    <span className="px-2 py-1 bg-[#E84545]/20 text-[#E84545] text-xs rounded-full flex items-center gap-1">
                      Model: {filterModel}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterModel("")} />
                    </span>
                  )}
                  {filterVariant && (
                    <span className="px-2 py-1 bg-[#E84545]/20 text-[#E84545] text-xs rounded-full flex items-center gap-1">
                      Variant: {filterVariant}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterVariant("")} />
                    </span>
                  )}
                  {filterColor && (
                    <span className="px-2 py-1 bg-[#E84545]/20 text-[#E84545] text-xs rounded-full flex items-center gap-1">
                      Color: {filterColor}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterColor("")} />
                    </span>
                  )}
                  {filterYear && (
                    <span className="px-2 py-1 bg-[#E84545]/20 text-[#E84545] text-xs rounded-full flex items-center gap-1">
                      Year: {filterYear}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterYear("")} />
                    </span>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-1 text-xs bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition-colors text-white"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Stock List */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545]"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg font-medium">No products found</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-slate-700 p-4 space-y-3">
                  {filteredProducts.map((product) => {
                    let statusColor = 'text-green-400';
                    let statusText = 'In Stock';
                    let bgColor = 'bg-green-900/20';
                    
                    if (product.currentStock <= 0) {
                      statusColor = 'text-red-400';
                      statusText = 'Out of Stock';
                      bgColor = 'bg-red-900/20';
                    } else if (product.currentStock <= product.minStock) {
                      statusColor = 'text-orange-400';
                      statusText = 'Critical';
                      bgColor = 'bg-orange-900/20';
                    } else if (product.currentStock <= product.reorderPoint) {
                      statusColor = 'text-yellow-400';
                      statusText = 'Low Stock';
                      bgColor = 'bg-yellow-900/20';
                    }

                    const productStockValue = product.currentStock * product.costPrice;
                    const productStockCode = convertToStockCode(productStockValue);
                    const yearRange = product.yearFrom ? `${product.yearFrom}${product.yearTo ? `-${product.yearTo}` : ''}` : '';

                    return (
                      <div
                        key={product._id}
                        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {product.isVehicle && <Car className="h-3 w-3 text-[#E84545]" />}
                              <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{product.sku}</p>
                            {product.carMake && (
                              <div className="text-xs text-slate-400 mt-1">
                                <p>{product.carMake} {product.carModel} {product.variant}</p>
                                {yearRange && <p className="text-slate-500">Year: {yearRange}</p>}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bgColor} ${statusColor} flex-shrink-0 ml-2`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-700/50">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Current</span>
                            <p className="text-sm font-semibold text-white">{product.currentStock} {product.unit}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Min Stock</span>
                            <p className="text-sm font-semibold text-slate-300">{product.minStock} {product.unit}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Reorder At</span>
                            <p className="text-sm font-semibold text-slate-300">{product.reorderPoint} {product.unit}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Value</span>
                            <p className="text-sm font-semibold text-[#E84545]">{productStockCode}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700 text-sm">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Vehicle Info</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Min Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Reorder Point</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Stock Value</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredProducts.map((product) => {
                        let statusColor = 'bg-green-900/30 text-green-400 border border-green-800/50';
                        let statusText = 'In Stock';
                        let statusIcon = <TrendingUp className="h-4 w-4" />;
                        
                        if (product.currentStock <= 0) {
                          statusColor = 'bg-red-900/30 text-red-400 border border-red-800/50';
                          statusText = 'Out of Stock';
                          statusIcon = <AlertTriangle className="h-4 w-4" />;
                        } else if (product.currentStock <= product.minStock) {
                          statusColor = 'bg-orange-900/30 text-orange-400 border border-orange-800/50';
                          statusText = 'Critical';
                          statusIcon = <AlertTriangle className="h-4 w-4" />;
                        } else if (product.currentStock <= product.reorderPoint) {
                          statusColor = 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50';
                          statusText = 'Low Stock';
                          statusIcon = <TrendingDown className="h-4 w-4" />;
                        }

                        const productStockValue = product.currentStock * product.costPrice;
                        const productStockCode = convertToStockCode(productStockValue);
                        const yearRange = product.yearFrom ? `${product.yearFrom}${product.yearTo ? `-${product.yearTo}` : ''}` : '';

                        return (
                          <tr key={product._id} className="hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {product.isVehicle && <Car className="h-4 w-4 text-[#E84545]" />}
                                <div>
                                  <p className="text-sm font-medium text-white">{product.name}</p>
                                  <p className="text-xs text-slate-500">{product.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {product.carMake ? (
                                <div className="text-xs">
                                  <p className="text-slate-300">{product.carMake} {product.carModel}</p>
                                  {product.variant && <p className="text-slate-500">{product.variant}</p>}
                                  <div className="flex gap-2 mt-1">
                                    {product.color && <span className="text-slate-500">{product.color}</span>}
                                    {yearRange && <span className="text-slate-500">• {yearRange}</span>}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">{product.currentStock} {product.unit}</td>
                            <td className="px-6 py-4 text-sm text-slate-300">{product.minStock} {product.unit}</td>
                            <td className="px-6 py-4 text-sm text-slate-300">{product.reorderPoint} {product.unit}</td>
                            <td className="px-6 py-4 text-sm text-[#E84545] font-semibold">{productStockCode}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 inline-flex items-center space-x-2 text-xs font-semibold rounded-full ${statusColor}`}>
                                {statusIcon}
                                <span>{statusText}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Load More Button - Desktop */}
          {hasMoreProducts && !loading && (
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
                      {filteredProducts.length} of {totalProducts}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Load More Button - Mobile */}
          {hasMoreProducts && !loading && (
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
                      ({filteredProducts.length}/{totalProducts})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Products Count Display */}
          {!loading && filteredProducts.length > 0 && (
            <div className="text-center py-4 text-gray-400 text-sm border-t border-white/5">
              Showing {filteredProducts.length} of {totalProducts} products
              {hasMoreProducts && " • Scroll down to load more"}
            </div>
          )}
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Filters</h2>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}</p>
                )}
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stock Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="all">All Status</option>
                  <option value="low">Low Stock</option>
                  <option value="critical">Critical</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={filterIsVehicle}
                  onChange={(e) => setFilterIsVehicle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="all">All Types</option>
                  <option value="vehicle">Vehicles/Parts</option>
                  <option value="non-vehicle">Non-Vehicle</option>
                </select>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle Filters
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Make</label>
                    <select
                      value={filterMake}
                      onChange={(e) => {
                        setFilterMake(e.target.value);
                        setFilterModel("");
                      }}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm"
                    >
                      <option value="">All Makes</option>
                      {availableMakes.map((make) => (
                        <option key={make} value={make}>
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Model</label>
                    <select
                      value={filterModel}
                      onChange={(e) => setFilterModel(e.target.value)}
                      disabled={!filterMake}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm disabled:opacity-50"
                    >
                      <option value="">All Models</option>
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Variant</label>
                    <select
                      value={filterVariant}
                      onChange={(e) => setFilterVariant(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm"
                    >
                      <option value="">All Variants</option>
                      {availableVariants.map((variant) => (
                        <option key={variant} value={variant}>
                          {variant}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color</label>
                    <select
                      value={filterColor}
                      onChange={(e) => setFilterColor(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm"
                    >
                      <option value="">All Colors</option>
                      {availableColors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Year (filters by range)</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm"
                    >
                      <option value="">All Years</option>
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-gray-300 hover:text-white transition-colors active:scale-95"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
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
                onClick={() => {
                  downloadStockCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchProducts(1, false);
                  setShowMobileMenu(false);
                  toast.success('Stock data refreshed');
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Refresh Data</span>
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}