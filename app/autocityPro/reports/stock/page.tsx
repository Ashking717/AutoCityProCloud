'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Package,
  ChevronLeft,
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  DollarSign,
  Layers,
  Box,
  Archive,
  RefreshCw,
  Eye,
  MoreVertical,
  X,
  Calendar,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  AlertTriangle,
  CheckCircle,
  Info,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'byCategory' | 'alerts'>('summary');
  
  useEffect(() => {
    fetchUser();
    fetchReport();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
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
  
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/stock', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const handleExport = () => {
    toast.success('PDF export coming soon!');
  };

  const handleRefresh = () => {
    fetchReport();
  };

  if (loading || !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-[#E84545] mx-auto mb-4"></div>
            <p className="text-slate-300 text-sm md:text-base">Generating stock report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const summary = reportData.summary || {
    totalStockValue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    overStockItems: 0,
    deadStockItems: 0,
  };
  
  const products = reportData.products || [];
  const stockByCategory = reportData.stockByCategory || {};
  const deadStock = reportData.deadStock || [];
  
  const getStockStatus = (product: any) => {
    const currentStock = product.currentStock || 0;
    const minStock = product.minStock || 0;
    const maxStock = product.maxStock || 1000;
    
    if (currentStock <= 0) return 'out';
    if (currentStock <= minStock) return 'low';
    if (currentStock > maxStock) return 'over';
    return 'normal';
  };
  
  const stockHealth = {
    normal: products.filter((p: any) => getStockStatus(p) === 'normal').length,
    low: summary.lowStockItems,
    out: summary.outOfStockItems,
  };

  const filteredProducts = products.filter((product: any) =>
    searchQuery === '' ||
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'low':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'out':
        return 'text-[#E84545] bg-[#E84545]/10 border-[#E84545]/20';
      case 'over':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="h-3 w-3" />;
      case 'low':
        return <AlertTriangle className="h-3 w-3" />;
      case 'out':
        return <AlertCircle className="h-3 w-3" />;
      case 'over':
        return <ArrowUpRight className="h-3 w-3" />;
      default:
        return null;
    }
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
                  <span className="text-white text-xs font-semibold">{summary.totalProducts}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <Box className="h-3 w-3 text-blue-400" />
                  <span className="text-white text-xs font-medium">Items</span>
                </div>
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
                  <h1 className="text-xl font-bold text-white">Stock Report</h1>
                  <p className="text-xs text-white/60">Inventory overview</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Search Bar */}
            {(viewMode === 'detailed' || viewMode === 'byCategory') && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Stock Report</h1>
                  <p className="text-white/80 mt-1">Inventory valuation and stock alerts</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Desktop Search & Filters */}
            {(viewMode === 'detailed' || viewMode === 'byCategory') && (
              <div className="mt-6 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[200px] md:pt-6 pb-6">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Stock Value</p>
              <p className="text-base md:text-xl font-bold text-white">QR.{(summary.totalStockValue / 1000).toFixed(1)}K</p>
              <p className="text-xs text-slate-500 mt-1">Total inventory</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-green-400/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-400/10 rounded-xl">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Normal</p>
              <p className="text-base md:text-xl font-bold text-green-400">{stockHealth.normal}</p>
              <p className="text-xs text-slate-500 mt-1">Items</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-yellow-400/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-400/10 rounded-xl">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Low Stock</p>
              <p className="text-base md:text-xl font-bold text-yellow-400">{summary.lowStockItems}</p>
              <p className="text-xs text-slate-500 mt-1">Items</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Out of Stock</p>
              <p className="text-base md:text-xl font-bold text-[#E84545]">{summary.outOfStockItems}</p>
              <p className="text-xs text-slate-500 mt-1">Urgent</p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl mb-6 overflow-hidden">
            <div className="flex border-b border-white/10">
              {[
                { key: 'summary', label: 'Summary', icon: BarChart3 },
                { key: 'detailed', label: 'Detailed', icon: Layers },
                { key: 'byCategory', label: 'Category', icon: Box },
                { key: 'alerts', label: 'Alerts', icon: AlertTriangle },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-4 text-sm md:text-base font-semibold transition-all ${
                    viewMode === tab.key
                      ? 'text-[#E84545] bg-[#E84545]/10 border-b-2 border-[#E84545]'
                      : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 md:p-6">
              {/* Summary View */}
              {viewMode === 'summary' && (
                <div className="space-y-4 md:space-y-6">
                  {/* Stock Health Overview */}
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">Stock Health Distribution</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-green-400/10 to-[#050505] border border-green-400/20 rounded-xl p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-xs md:text-sm text-slate-400">Normal</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-green-400">{stockHealth.normal}</p>
                        <p className="text-xs text-slate-500 mt-1">{products.length > 0 ? ((stockHealth.normal / products.length) * 100).toFixed(0) : 0}% of stock</p>
                      </div>

                      <div className="bg-gradient-to-br from-yellow-400/10 to-[#050505] border border-yellow-400/20 rounded-xl p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs md:text-sm text-slate-400">Low</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-yellow-400">{summary.lowStockItems}</p>
                        <p className="text-xs text-slate-500 mt-1">{products.length > 0 ? ((summary.lowStockItems / products.length) * 100).toFixed(0) : 0}% of stock</p>
                      </div>

                      <div className="bg-gradient-to-br from-[#E84545]/10 to-[#050505] border border-[#E84545]/20 rounded-xl p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-[#E84545]" />
                          <span className="text-xs md:text-sm text-slate-400">Out</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-[#E84545]">{summary.outOfStockItems}</p>
                        <p className="text-xs text-slate-500 mt-1">{products.length > 0 ? ((summary.outOfStockItems / products.length) * 100).toFixed(0) : 0}% of stock</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Inventory Value */}
                  <div className="bg-gradient-to-br from-[#E84545]/10 to-[#050505] border border-[#E84545]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-[#E84545]" />
                      <span className="text-sm text-slate-400">Total Inventory Value</span>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">QR.{summary.totalStockValue.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Detailed View */}
              {viewMode === 'detailed' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-bold text-white">Stock Details</h2>
                    <p className="text-xs md:text-sm text-slate-400">{filteredProducts.length} products</p>
                  </div>
                  
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-sm md:text-lg font-medium">No products found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredProducts.map((product: any) => {
                        const status = getStockStatus(product);
                        const stockValue = (product.currentStock || 0) * (product.costPrice || 0);

                        return (
                          <div
                            key={product._id}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-[#E84545]/30 hover:bg-white/10 transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm md:text-base font-bold text-white truncate">{product.name}</h3>
                                <p className="text-xs text-slate-400">SKU: {product.sku}</p>
                              </div>
                              <div className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-lg border text-xs font-semibold ${getStatusColor(status)}`}>
                                {getStatusIcon(status)}
                                <span className="capitalize hidden md:inline">
                                  {status === 'out' ? 'Out' : status === 'normal' ? 'Normal' : status === 'low' ? 'Low' : 'Over'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Current</p>
                                <p className="text-sm md:text-base font-semibold text-white">{product.currentStock || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Min Stock</p>
                                <p className="text-sm md:text-base font-semibold text-slate-400">{product.minStock || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Cost Price</p>
                                <p className="text-sm md:text-base font-semibold text-white">QR.{(product.costPrice || 0).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Value</p>
                                <p className="text-sm md:text-base font-semibold text-[#E84545]">QR.{stockValue.toFixed(2)}</p>
                              </div>
                            </div>

                            {/* Stock Level Bar */}
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-500">Stock Level</span>
                                <span className="text-slate-400">
                                  {product.maxStock ? ((product.currentStock / product.maxStock) * 100).toFixed(0) : 0}%
                                </span>
                              </div>
                              <div className="h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    status === 'out' ? 'bg-[#E84545]' :
                                    status === 'low' ? 'bg-yellow-400' :
                                    status === 'over' ? 'bg-blue-400' :
                                    'bg-green-400'
                                  }`}
                                  style={{ 
                                    width: `${product.maxStock ? Math.min((product.currentStock / product.maxStock) * 100, 100) : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* By Category View */}
              {viewMode === 'byCategory' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-bold text-white">Stock by Category</h2>
                    <p className="text-xs md:text-sm text-slate-400">{Object.keys(stockByCategory).length} categories</p>
                  </div>
                  
                  {Object.keys(stockByCategory).length === 0 ? (
                    <div className="text-center py-12">
                      <Box className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-sm md:text-lg font-medium">No categories found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stockByCategory).map(([category, data]: [string, any]) => (
                        <div
                          key={category}
                          className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-[#E84545]/30 hover:bg-white/10 transition-all active:scale-[0.98]"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-[#E84545]" />
                              <span className="text-sm md:text-base font-bold text-white">{category}</span>
                            </div>
                            <span className="text-xs md:text-sm text-slate-400">{data.count} products</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1">Quantity</span>
                              <p className="text-sm font-semibold text-slate-300">{data.quantity}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1">Value</span>
                              <p className="text-sm font-semibold text-[#E84545]">QR.{data.value.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alerts View */}
              {viewMode === 'alerts' && (
                <div className="space-y-4 md:space-y-6">
                  {/* Out of Stock */}
                  {summary.outOfStockItems > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <AlertCircle className="h-5 w-5 text-[#E84545]" />
                        <h3 className="text-base md:text-lg font-bold text-[#E84545]">
                          Out of Stock ({summary.outOfStockItems})
                        </h3>
                      </div>
                      <div className="space-y-2 md:space-y-3">
                        {products.filter((p: any) => getStockStatus(p) === 'out').map((product: any) => (
                          <div
                            key={product._id}
                            className="bg-gradient-to-r from-[#E84545]/10 to-[#050505] border border-[#E84545]/30 rounded-xl p-3 md:p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-sm md:text-base font-bold text-white mb-1">{product.name}</h4>
                                <p className="text-xs text-slate-400">SKU: {product.sku}</p>
                              </div>
                              <span className="px-2 md:px-3 py-1 bg-[#E84545] text-white text-xs font-bold rounded-lg">
                                URGENT
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                              <span className="text-slate-400">
                                Current: <span className="text-[#E84545] font-semibold">0</span> / Min: {product.minStock || 0}
                              </span>
                              <button className="text-[#E84545] hover:text-[#ff5555] font-semibold flex items-center gap-1">
                                <span>Reorder</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Low Stock */}
                  {summary.lowStockItems > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <h3 className="text-base md:text-lg font-bold text-yellow-400">
                          Low Stock ({summary.lowStockItems})
                        </h3>
                      </div>
                      <div className="space-y-2 md:space-y-3">
                        {products.filter((p: any) => getStockStatus(p) === 'low').map((product: any) => (
                          <div
                            key={product._id}
                            className="bg-gradient-to-r from-yellow-400/10 to-[#050505] border border-yellow-400/30 rounded-xl p-3 md:p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-sm md:text-base font-bold text-white mb-1">{product.name}</h4>
                                <p className="text-xs text-slate-400">
                                  Current: {product.currentStock || 0} | Min: {product.minStock || 0}
                                </p>
                              </div>
                              <span className="px-2 md:px-3 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-bold rounded-lg border border-yellow-400/30">
                                LOW
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Clear */}
                  {summary.outOfStockItems === 0 && summary.lowStockItems === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-green-400" />
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">All Stock Levels Are Healthy!</h3>
                      <p className="text-sm md:text-base text-slate-400">No critical alerts or warnings at this time.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

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
                  handleRefresh();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-white font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-[#E84545]" />
                  <span>Refresh Data</span>
                </div>
              </button>

              <button
                onClick={() => {
                  handleExport();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-white font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-[#E84545]" />
                  <span>Export Report</span>
                </div>
              </button>

              <button
                onClick={() => {
                  window.print();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-white font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-[#E84545]" />
                  <span>Print Report</span>
                </div>
              </button>
              
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}