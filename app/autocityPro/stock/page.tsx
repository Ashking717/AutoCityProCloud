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
  RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchProducts();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Function to convert stock value to code format
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const totalStockValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  const lowStockItems = products.filter(p => p.currentStock <= p.reorderPoint);
  const outOfStockItems = products.filter(p => p.currentStock <= 0);
  const criticalItems = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock);

  const totalStockCode = convertToStockCode(totalStockValue);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "low" && p.currentStock <= p.reorderPoint && p.currentStock > 0) ||
      (filterStatus === "out" && p.currentStock <= 0) ||
      (filterStatus === "critical" && p.currentStock > 0 && p.currentStock <= p.minStock);
    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setFilterStatus("all");
    setSearchTerm("");
  };

  const downloadStockCSV = () => {
    if (filteredProducts.length === 0) {
      toast.error("No stock data to export");
      return;
    }
    const headers = ["SKU", "Name", "Current Stock", "Min Stock", "Reorder Point", "Stock Value"];
    const rows = filteredProducts.map(p => [
      p.sku || "",
      p.name || "",
      p.currentStock || 0,
      p.minStock || 0,
      p.reorderPoint || 0,
      (p.currentStock * p.costPrice) || 0
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
                  <span className="text-white text-xs font-medium">{products.length} items</span>
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
                  <p className="text-xs text-white/60">{filteredProducts.length} products</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Filter className="h-4 w-4" />
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
                <p className="text-white/80 mt-1">Monitor and manage your inventory levels</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition-colors text-white"
              >
                Clear Filters
              </button>
            </div>
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

                    return (
                      <div
                        key={product._id}
                        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{product.sku}</p>
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

                        return (
                          <tr key={product._id} className="hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-white">{product.name}</p>
                              <p className="text-xs text-slate-500">{product.sku}</p>
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
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="all">All</option>
                  <option value="low">Low Stock</option>
                  <option value="critical">Critical</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-gray-300 hover:text-white transition-colors active:scale-95"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all"
                >
                  Apply
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
                  fetchProducts();
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