'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  ChevronLeft,
  MoreVertical,
  X,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Calendar,
  Search,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'byProduct' | 'byCustomer'>('summary');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `₹${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
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
  
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/sales?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        toast.success('Report generated successfully');
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
  
  const printReport = () => {
    window.print();
    toast.success('Printing report...');
  };
  
  const downloadReport = async () => {
    toast.success('Downloading report...');
  };
  
  if (loading || !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-[#E84545] mx-auto mb-4"></div>
            <p className="text-slate-300 text-sm md:text-base">Generating sales report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const summary = reportData.summary || {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalDiscount: 0,
    totalTax: 0,
    averageOrderValue: 0,
  };
  
  const sales = reportData.sales || [];
  const productSales = reportData.productSales || {};
  const customerSales = reportData.customerSales || {};
  
  const profitMargin = summary.totalRevenue > 0 
    ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';
  
  const filteredSales = sales.filter((sale: any) =>
    searchTerm === '' ||
    sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredProducts = Object.entries(productSales).filter(([productName]: [string, any]) =>
    searchTerm === '' ||
    productName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCustomers = Object.entries(customerSales).filter(([customerName]: [string, any]) =>
    searchTerm === '' ||
    customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const dateRangeText = `${new Date(dateRange.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(dateRange.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-5 py-2.5 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-[11px] font-semibold">{formatCompactCurrency(summary.totalRevenue)}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-blue-400" />
                  <span className="text-white text-[11px] font-medium">{summary.totalSales}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="text-green-400 text-[11px] font-medium">{profitMargin}%</span>
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
                  <h1 className="text-xl font-bold text-white">Sales Report</h1>
                  <p className="text-xs text-white/60">{dateRangeText}</p>
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
            {(viewMode === 'detailed' || viewMode === 'byProduct' || viewMode === 'byCustomer') && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder={`Search ${viewMode === 'detailed' ? 'sales' : viewMode === 'byProduct' ? 'products' : 'customers'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-8 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Sales Report</h1>
                  <p className="text-white/80 mt-1">Detailed sales analysis • {dateRangeText}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchReport()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={printReport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="mt-6 grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">View Mode</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                >
                  <option value="summary" className="bg-[#0A0A0A]">Summary</option>
                  <option value="detailed" className="bg-[#0A0A0A]">Detailed Sales</option>
                  <option value="byProduct" className="bg-[#0A0A0A]">By Product</option>
                  <option value="byCustomer" className="bg-[#0A0A0A]">By Customer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:shadow-lg hover:shadow-[#E84545]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Generate</span>
                </button>
              </div>
            </div>
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
              <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
              <p className="text-base md:text-xl font-bold text-white truncate">
                {formatCompactCurrency(summary.totalRevenue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ₹{summary.totalRevenue.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Package className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Sales</p>
              <p className="text-base md:text-xl font-bold text-white">{summary.totalSales}</p>
              <p className="text-xs text-slate-500 mt-1">Orders</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-green-400/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-400/10 rounded-xl">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Profit</p>
              <p className="text-base md:text-xl font-bold text-green-400 truncate">
                {formatCompactCurrency(summary.totalProfit)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{profitMargin}% margin</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Avg Order Value</p>
              <p className="text-base md:text-xl font-bold text-[#E84545] truncate">
                ₹{summary.averageOrderValue.toFixed(0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Per order</p>
            </div>
          </div>

          {/* View Mode Tabs - Mobile */}
          <div className="md:hidden mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-2">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'summary', label: 'Summary', icon: BarChart3 },
                  { key: 'detailed', label: 'Sales', icon: FileText },
                  { key: 'byProduct', label: 'Products', icon: Package },
                  { key: 'byCustomer', label: 'Customers', icon: Users },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setViewMode(tab.key as any)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-all ${
                        viewMode === tab.key
                          ? 'bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white shadow-lg'
                          : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 md:p-6">
              {viewMode === 'summary' && (
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">Performance Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                      <div className="bg-gradient-to-br from-[#E84545]/10 to-[#050505] border border-[#E84545]/20 rounded-xl p-4">
                        <p className="text-xs md:text-sm text-slate-400 mb-1">Profit Margin</p>
                        <p className="text-xl md:text-2xl font-bold text-green-400">{profitMargin}%</p>
                        <p className="text-xs text-slate-500 mt-1">Avg margin</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-400/10 to-[#050505] border border-yellow-400/20 rounded-xl p-4">
                        <p className="text-xs md:text-sm text-slate-400 mb-1">Total Discount</p>
                        <p className="text-xl md:text-2xl font-bold text-yellow-400">₹{summary.totalDiscount.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">Given</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-400/10 to-[#050505] border border-blue-400/20 rounded-xl p-4">
                        <p className="text-xs md:text-sm text-slate-400 mb-1">Total Tax</p>
                        <p className="text-xl md:text-2xl font-bold text-blue-400">₹{summary.totalTax.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">Collected</p>
                      </div>
                    </div>
                  </div>
                  
                  {summary.totalRevenue === 0 && (
                    <div className="bg-gradient-to-r from-[#E84545]/10 to-[#050505] border border-[#E84545]/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-[#E84545] flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm md:text-base font-bold text-white mb-1">
                            No Sales Data Available
                          </h3>
                          <p className="text-xs md:text-sm text-slate-300">
                            Try adjusting your date range to see sales data.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {viewMode === 'detailed' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-bold text-white">Sales Details</h2>
                    <p className="text-xs md:text-sm text-slate-400">{filteredSales.length} sales</p>
                  </div>
                  {filteredSales.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-sm md:text-lg font-medium">No sales found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredSales.map((sale: any) => (
                        <div
                          key={sale._id}
                          className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-[#E84545]/30 hover:bg-white/10 transition-all active:scale-[0.98]"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm md:text-base font-bold text-white">#{sale.invoiceNumber}</p>
                              </div>
                              <p className="text-xs text-slate-400">
                                {new Date(sale.saleDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <span className={`px-2 md:px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                              sale.status === 'COMPLETED' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                              sale.status === 'DRAFT' ? 'bg-slate-400/10 text-slate-400 border-slate-400/20' :
                              'bg-[#E84545]/10 text-[#E84545] border-[#E84545]/20'
                            }`}>
                              {sale.status}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm text-white font-medium">{sale.customerName || 'Walk-in Customer'}</p>
                            <p className="text-xs text-slate-400 mt-1">{sale.items?.length || 0} items</p>
                          </div>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-white/10">
                            <div>
                              <span className="text-xs text-slate-500">Total Amount</span>
                              <p className="text-sm md:text-base font-bold text-[#E84545]">
                                ₹{(sale.grandTotal || 0).toLocaleString()}
                              </p>
                            </div>
                            <button className="text-xs text-white/60 hover:text-[#E84545] font-semibold flex items-center gap-1 active:scale-95 transition-all">
                              <Eye className="h-3 w-3" />
                              <span className="hidden md:inline">View</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {viewMode === 'byProduct' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-bold text-white">Product Performance</h2>
                    <p className="text-xs md:text-sm text-slate-400">{filteredProducts.length} products</p>
                  </div>
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-sm md:text-lg font-medium">No product data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredProducts
                        .sort((a: any, b: any) => b[1].revenue - a[1].revenue)
                        .map(([productName, data]: [string, any]) => (
                          <div
                            key={productName}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-[#E84545]/30 hover:bg-white/10 transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-bold text-white truncate">{productName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm md:text-base font-bold text-white">₹{data.revenue.toLocaleString()}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block mb-1">Quantity Sold</span>
                                <p className="text-sm font-semibold text-slate-300">{data.quantity}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block mb-1">Profit</span>
                                <p className="text-sm font-semibold text-green-400">₹{data.profit.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              
              {viewMode === 'byCustomer' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-bold text-white">Customer Performance</h2>
                    <p className="text-xs md:text-sm text-slate-400">{filteredCustomers.length} customers</p>
                  </div>
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-sm md:text-lg font-medium">No customer data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCustomers
                        .sort((a: any, b: any) => b[1].revenue - a[1].revenue)
                        .map(([customerName, data]: [string, any]) => (
                          <div
                            key={customerName}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-[#E84545]/30 hover:bg-white/10 transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-bold text-white truncate">{customerName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm md:text-base font-bold text-white">₹{data.revenue.toLocaleString()}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block mb-1">Total Orders</span>
                                <p className="text-sm font-semibold text-slate-300">{data.count}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block mb-1">Avg Order Value</span>
                                <p className="text-sm font-semibold text-[#E84545]">₹{(data.revenue / data.count).toFixed(0)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
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

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Date Range</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setDateRange({
                      fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                      toDate: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-semibold hover:bg-white/10 transition-all active:scale-95"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    fetchReport();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-[#E84545]/20 transition-all active:scale-95"
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
                  setShowFilters(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-white font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#E84545]" />
                  <span>Change Date Range</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  fetchReport();
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
                  downloadReport();
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
                  printReport();
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