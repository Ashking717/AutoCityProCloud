'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Package,
  ChevronLeft,
  MoreVertical,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchasesReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'bySupplier' | 'byCategory'>('summary');
  
  useEffect(() => {
    fetchUser();
    fetchReport();

    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
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
      const res = await fetch(
        `/api/reports/purchases?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
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

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };
  
  if (loading || !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-4 border-[#E84545] mx-auto mb-4"></div>
            <p className="text-white">Generating purchases report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const summary = reportData.summary || {
    totalPurchases: 0,
    totalPurchaseAmount: 0,
    totalPayments: 0,
    totalPaymentAmount: 0,
    averagePurchaseValue: 0,
    outstandingPayables: 0,
  };
  
  const purchases = reportData.purchases || [];
  const supplierPurchases = reportData.supplierPurchases || {};
  const categoryPurchases = reportData.categoryPurchases || {};
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white active:scale-95 transition-all">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Purchases</h1>
                  <p className="text-xs text-white/60">Report</p>
                </div>
              </div>
              <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white active:scale-95 transition-all">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="date" value={dateRange.fromDate} onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545]" />
              <input type="date" value={dateRange.toDate} onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545]" />
            </div>
            <button onClick={fetchReport} disabled={loading} className="w-full px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium text-sm active:scale-95 transition-all">Generate</button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
          <div className="px-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={() => router.back()} className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors">
                  <ChevronLeft className="h-5 w-5" /><span>Back</span>
                </button>
                <div className="h-8 w-0.5 bg-white/30"></div>
                <ShoppingCart className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Purchases Report</h1>
                  <p className="text-white/90 mt-1">Detailed purchase analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop Filters */}
        <div className="hidden md:block px-8 py-6">
          <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-6 mb-6">
            <div className="grid grid-cols-5 gap-4">
              <div><label htmlFor="purchases-from-date" className="block text-sm font-medium text-white mb-1">From Date</label>
                <input id="purchases-from-date" type="date" value={dateRange.fromDate} onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })} className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545]" />
              </div>
              <div><label htmlFor="purchases-to-date" className="block text-sm font-medium text-white mb-1">To Date</label>
                <input id="purchases-to-date" type="date" value={dateRange.toDate} onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })} className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545]" />
              </div>
              <div className="flex items-end">
                <button onClick={fetchReport} disabled={loading} className="w-full px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-all">Generate</button>
              </div>
              <div className="flex items-end space-x-2 col-span-2">
                <button onClick={() => toast.success('PDF export coming soon!')} className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-[#111111] border border-white/5 rounded-lg hover:bg-white/5 transition-all">
                  <Download className="h-4 w-4 text-white" /><span className="text-white">PDF</span>
                </button>
                <button onClick={() => window.print()} className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg hover:bg-white/5 transition-all">
                  <Printer className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="px-4 md:px-8 pt-[200px] md:pt-0 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-4 active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-[#E84545]/10 p-2 md:p-3 rounded-lg"><ShoppingCart className="h-4 w-4 md:h-6 md:w-6 text-[#E84545]" /></div>
              </div>
              <p className="text-xs md:text-sm text-white/60">Total Purchases</p>
              <p className="text-lg md:text-2xl font-bold text-white">{summary.totalPurchases}</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-4 active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-[#E84545]/10 p-2 md:p-3 rounded-lg"><TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-[#E84545]" /></div>
              </div>
              <p className="text-xs md:text-sm text-white/60">Purchase Amount</p>
              <p className="text-lg md:text-2xl font-bold text-[#E84545] truncate">{isMobile ? formatCompactCurrency(summary.totalPurchaseAmount) : `QAR ${summary.totalPurchaseAmount.toFixed(2)}`}</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-4 active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-green-500/10 p-2 md:p-3 rounded-lg"><TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-green-400" /></div>
              </div>
              <p className="text-xs md:text-sm text-white/60">Total Payments</p>
              <p className="text-lg md:text-2xl font-bold text-green-400 truncate">{isMobile ? formatCompactCurrency(summary.totalPaymentAmount) : `QAR ${summary.totalPaymentAmount.toFixed(2)}`}</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-4 active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-500/10 p-2 md:p-3 rounded-lg"><ShoppingCart className="h-4 w-4 md:h-6 md:w-6 text-blue-400" /></div>
              </div>
              <p className="text-xs md:text-sm text-white/60">Avg Purchase</p>
              <p className="text-lg md:text-2xl font-bold text-blue-400 truncate">{isMobile ? formatCompactCurrency(summary.averagePurchaseValue) : `QAR ${summary.averagePurchaseValue.toFixed(2)}`}</p>
            </div>
          </div>
          
          {/* View Mode Tabs */}
          <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5">
            <div className="border-b border-white/5 overflow-x-auto">
              <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6" aria-label="Tabs">
                {[
                  { key: 'summary', label: 'Summary' },
                  { key: 'detailed', label: 'Detailed' },
                  { key: 'bySupplier', label: 'Suppliers' },
                  { key: 'byCategory', label: 'Categories' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setViewMode(tab.key as any)} className={`${viewMode === tab.key ? 'border-[#E84545] text-[#E84545]' : 'border-transparent text-white/60 hover:text-white'} whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors`}>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-4 md:p-6">
              {viewMode === 'summary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-[#E84545] pl-4 bg-[#111111] p-4 rounded-lg">
                      <p className="text-xs md:text-sm text-white/60">Total Purchase Value</p>
                      <p className="text-lg md:text-xl font-bold text-white">{isMobile ? formatCompactCurrency(summary.totalPurchaseAmount) : `QAR ${summary.totalPurchaseAmount.toLocaleString()}`}</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4 bg-[#111111] p-4 rounded-lg">
                      <p className="text-xs md:text-sm text-white/60">Total Paid</p>
                      <p className="text-lg md:text-xl font-bold text-green-400">{isMobile ? formatCompactCurrency(summary.totalPaymentAmount) : `QAR ${summary.totalPaymentAmount.toLocaleString()}`}</p>
                    </div>
                  </div>
                  <div className="border-l-4 border-red-500 pl-4 bg-[#111111] p-4 rounded-lg">
                    <p className="text-xs md:text-sm text-white/60">Outstanding Payables</p>
                    <p className="text-lg md:text-xl font-bold text-red-400">{isMobile ? formatCompactCurrency(summary.totalPurchaseAmount - summary.totalPaymentAmount) : `QAR ${(summary.totalPurchaseAmount - summary.totalPaymentAmount).toFixed(2)}`}</p>
                  </div>
                </div>
              )}
              
              {viewMode === 'detailed' && (
                <div className="md:hidden space-y-3">
                  {purchases.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/60">No purchases found</p>
                    </div>
                  ) : (
                    purchases.map((purchase: any) => (
                      <div key={purchase._id} className="bg-[#111111] rounded-xl p-3 border border-white/5 active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-white">{purchase.voucherNumber}</p>
                            <p className="text-xs text-white/60">{new Date(purchase.date).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${purchase.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-white/80'}`}>{purchase.status}</span>
                        </div>
                        <p className="text-xs text-white/80 mb-2 line-clamp-2">{purchase.narration}</p>
                        <p className="text-sm font-bold text-[#E84545]">{formatCompactCurrency(purchase.totalDebit)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {viewMode === 'bySupplier' && (
                <div className="md:hidden space-y-3">
                  {Object.keys(supplierPurchases).length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/60">No supplier data</p>
                    </div>
                  ) : (
                    Object.entries(supplierPurchases).sort((a: any, b: any) => b[1].amount - a[1].amount).map(([supplier, data]: [string, any]) => (
                      <div key={supplier} className="bg-[#111111] rounded-xl p-3 border border-white/5 active:scale-[0.98] transition-all">
                        <p className="text-sm font-medium text-white mb-2">{supplier}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-white/40">Amount</p><p className="text-white font-medium">{formatCompactCurrency(data.amount)}</p></div>
                          <div><p className="text-white/40">Paid</p><p className="text-green-400 font-medium">{formatCompactCurrency(data.payments)}</p></div>
                          <div><p className="text-white/40">Balance</p><p className={(data.amount - data.payments) > 0 ? 'text-red-400 font-semibold' : 'text-green-400'}>{formatCompactCurrency(data.amount - data.payments)}</p></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {viewMode === 'byCategory' && (
                <div className="md:hidden space-y-3">
                  {Object.keys(categoryPurchases).length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/60">No category data</p>
                    </div>
                  ) : (
                    Object.entries(categoryPurchases).sort((a: any, b: any) => b[1].amount - a[1].amount).map(([category, data]: [string, any]) => (
                      <div key={category} className="bg-[#111111] rounded-xl p-3 border border-white/5 active:scale-[0.98] transition-all">
                        <p className="text-sm font-medium text-white mb-2">{category}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><p className="text-white/40">Purchases</p><p className="text-white font-medium">{data.count}</p></div>
                          <div><p className="text-white/40">Amount</p><p className="text-[#E84545] font-semibold">{formatCompactCurrency(data.amount)}</p></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:hidden h-6"></div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60]">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white active:scale-95 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { toast.success('PDF export coming soon!'); setShowMobileMenu(false); }} className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]">
                <span>Export PDF</span><Download className="h-5 w-5" />
              </button>
              <button onClick={() => { window.print(); setShowMobileMenu(false); }} className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]">
                <span>Print Report</span><Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}