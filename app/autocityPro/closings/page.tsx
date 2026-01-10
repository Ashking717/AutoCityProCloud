'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Calendar, 
  Lock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  TrendingUp, 
  DollarSign,
  BookOpen,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  Plus,
  MoreVertical,
  ChevronLeft,
  Filter,
  X,
  BarChart3,
  Shield,
  Clock,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClosingData {
  _id: string;
  closingType: 'day' | 'month';
  closingDate: string;
  periodStart: string;
  periodEnd: string;
  status: 'closed' | 'locked' | 'pending';
  
  // Financial Metrics
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  
  // Cash Flow
  openingCash: number;
  cashSales: number;
  cashReceipts: number;
  cashPayments: number;
  closingCash: number;
  
  // Sales Metrics
  salesCount: number;
  totalDiscount: number;
  totalTax: number;
  
  // Inventory
  openingStock: number;
  closingStock: number;
  stockValue: number;
  
  // Ledger Integration
  ledgerEntriesCount?: number;
  voucherIds?: string[];
  trialBalanceMatched?: boolean;
  
  // Audit Trail
  closedBy: {
    firstName: string;
    lastName: string;
  };
  closedAt: string;
  verifiedBy?: {
    firstName: string;
    lastName: string;
  };
  verifiedAt?: string;
  notes?: string;
}

export default function ClosingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [closings, setClosings] = useState<ClosingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [newClosing, setNewClosing] = useState({
    closingType: 'day' as 'day' | 'month',
    closingDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Summary statistics
  const [summary, setSummary] = useState({
    totalClosings: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgProfit: 0,
  });
  
  useEffect(() => {
    fetchUser();
    fetchClosings();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, [filterType, filterStatus]);
  
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
  
  const fetchClosings = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('closingType', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const url = `/api/closings${params.toString() ? '?' + params.toString() : ''}`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClosings(data.closings || []);
        
        // Calculate summary
        const totalRevenue = data.closings.reduce((sum: number, c: ClosingData) => sum + c.totalRevenue, 0);
        const totalProfit = data.closings.reduce((sum: number, c: ClosingData) => sum + c.netProfit, 0);
        const avgProfit = data.closings.length > 0 ? totalProfit / data.closings.length : 0;
        
        setSummary({
          totalClosings: data.closings.length,
          totalRevenue,
          totalProfit,
          avgProfit,
        });
      }
    } catch (error) {
      console.error('Failed to fetch closings');
      toast.error('Failed to fetch closings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = async () => {
    try {
      const res = await fetch('/api/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newClosing),
      });
      
      if (res.ok) {
        toast.success(`${newClosing.closingType === 'day' ? 'Day' : 'Month'} closed successfully!`);
        setShowCloseModal(false);
        setNewClosing({
          closingType: 'day',
          closingDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchClosings();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to close period');
      }
    } catch (error) {
      toast.error('Failed to close period');
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
        return 'bg-red-900/30 border border-red-800/50 text-red-400';
      case 'closed':
        return 'bg-emerald-900/30 border border-emerald-800/50 text-emerald-400';
      case 'pending':
        return 'bg-amber-900/30 border border-amber-800/50 text-amber-400';
      default:
        return 'bg-gray-800/50 border border-gray-700 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'locked':
        return <Lock className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
  };

  const downloadClosingsCSV = () => {
    if (closings.length === 0) {
      toast.error("No closings to export");
      return;
    }
    
    const headers = ["Date", "Type", "Status", "Revenue", "Expenses", "Profit", "Cash Sales", "Closed By"];
    const rows = closings.map(c => [
      new Date(c.closingDate).toLocaleDateString(),
      c.closingType,
      c.status,
      c.totalRevenue,
      c.totalExpenses,
      c.netProfit,
      c.cashSales,
      `${c.closedBy?.firstName} ${c.closedBy?.lastName}`
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `closings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${closings.length} closings to CSV`);
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-white">Closings</h1>
                <p className="text-xs text-white/60">{closings.length} periods</p>
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
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Period Closings</h1>
                  <p className="text-white/80 mt-1">Ledger-based financial period management</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={downloadClosingsCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group"
                >
                  <Lock className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Close Period</span>
                </button>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Closings</p>
                    <p className="text-2xl font-bold text-white mt-1">{summary.totalClosings}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-white/60" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      QAR {summary.totalRevenue.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-white/60" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Profit</p>
                    <p className={`text-2xl font-bold mt-1 ${summary.totalProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      QAR {summary.totalProfit.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-white/60" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Avg Profit/Period</p>
                    <p className={`text-2xl font-bold mt-1 ${summary.avgProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      QAR {summary.avgProfit.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-white/60" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          <div className="max-w-7xl mx-auto">
            {/* Desktop Filters */}
            <div className="hidden md:block bg-black border border-gray-800 rounded-xl shadow-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Period Type
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType === 'all'
                          ? 'bg-[#E84545] text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      All Periods
                    </button>
                    <button
                      onClick={() => setFilterType('day')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType === 'day'
                          ? 'bg-[#E84545] text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setFilterType('month')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType === 'month'
                          ? 'bg-[#E84545] text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterStatus === 'all'
                          ? 'bg-[#E84545] text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterStatus('closed')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterStatus === 'closed'
                          ? 'bg-[#E84545] text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      Closed
                    </button>
                    <button
                      onClick={() => setFilterStatus('locked')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterStatus === 'locked'
                          ? 'bg-[#E84545] text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      Locked
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Closings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <RefreshCw className="h-12 w-12 text-[#E84545] animate-spin mb-4" />
                  <p className="text-gray-400 text-lg">Loading closings...</p>
                </div>
              ) : closings.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <BookOpen className="h-16 w-16 text-gray-700 mb-4" />
                  <p className="text-gray-300 text-lg">No closings found</p>
                  <p className="text-gray-500 text-sm mt-2">Start by closing a period</p>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="mt-4 px-6 py-2 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all"
                  >
                    Close First Period
                  </button>
                </div>
              ) : (
                closings.map((closing) => (
                  <div
                    key={closing._id}
                    className="bg-gradient-to-br from-black to-gray-900 border border-gray-800 rounded-xl shadow-xl hover:border-[#E84545] transition-all duration-300 overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-black p-4 border-b border-gray-800">
                      <div className="flex justify-between items-start">
                        <div className="text-white">
                          <div className="flex items-center space-x-2 mb-1">
                            <Calendar className="h-5 w-5 text-[#E84545]" />
                            <h3 className="text-lg font-bold">
                              {closing.closingType === 'day' ? 'Daily' : 'Monthly'} Closing
                            </h3>
                          </div>
                          <p className="text-sm text-gray-400">
                            {new Date(closing.closingDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${getStatusColor(closing.status)}`}>
                          {getStatusIcon(closing.status)}
                          <span className="text-xs font-semibold uppercase">
                            {closing.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Financial Summary */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-800">
                          <span className="text-sm text-gray-400">Total Revenue</span>
                          <span className="font-bold text-emerald-400 text-lg">
                            QAR {closing.totalRevenue.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-800">
                          <span className="text-sm text-gray-400">Total Expenses</span>
                          <span className="font-semibold text-red-400">
                            QAR {closing.totalExpenses.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 bg-gray-900 px-3 rounded-lg border border-gray-800">
                          <span className="text-sm font-semibold text-gray-300">Net Profit</span>
                          <span className={`font-bold text-lg ${
                            closing.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            QAR {closing.netProfit.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Cash Flow */}
                      <div className="bg-blue-900/20 rounded-lg p-3 space-y-2 border border-blue-800/50">
                        <h4 className="text-xs font-semibold text-blue-400 uppercase mb-2">Cash Flow</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Opening Cash</span>
                          <span className="font-medium text-gray-300">
                            QAR {closing.openingCash.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Cash Sales</span>
                          <span className="font-medium text-emerald-400">
                            +{closing.cashSales.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Cash Payments</span>
                          <span className="font-medium text-red-400">
                            -{closing.cashPayments.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-blue-800/50">
                          <span className="font-semibold text-blue-300">Closing Cash</span>
                          <span className="font-bold text-blue-300">
                            QAR {closing.closingCash.toLocaleString('en-QA', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Ledger Info */}
                      {closing.ledgerEntriesCount && (
                        <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <BookOpen className="h-4 w-4 text-purple-400" />
                              <span className="text-sm font-medium text-purple-300">Ledger Entries</span>
                            </div>
                            <span className="text-lg font-bold text-purple-300">
                              {closing.ledgerEntriesCount}
                            </span>
                          </div>
                          {closing.trialBalanceMatched && (
                            <div className="flex items-center space-x-1 mt-2">
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              <span className="text-xs text-emerald-400">Trial Balance Matched</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Operations */}
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-gray-900 rounded-lg p-2 border border-gray-800">
                          <p className="text-gray-400 text-xs">Sales</p>
                          <p className="font-bold text-white">{closing.salesCount}</p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-2 border border-gray-800">
                          <p className="text-gray-400 text-xs">Discount</p>
                          <p className="font-bold text-white">
                            {closing.totalDiscount.toFixed(0)}
                          </p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-2 border border-gray-800">
                          <p className="text-gray-400 text-xs">Tax</p>
                          <p className="font-bold text-white">
                            {closing.totalTax.toFixed(0)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Audit Trail */}
                      <div className="pt-3 border-t border-gray-800">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate max-w-[120px]">
                            Closed by: {closing.closedBy?.firstName} {closing.closedBy?.lastName}
                          </span>
                          <span>
                            {new Date(closing.closedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {closing.notes && (
                        <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <FileText className="h-4 w-4 text-amber-400 mt-0.5" />
                            <p className="text-sm text-amber-300 line-clamp-2">{closing.notes}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => router.push(`/autocityPro/closings/${closing._id}`)}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 hover:border-[#E84545] border border-gray-800 transition-all font-medium group-hover:border-[#E84545]"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                        <button
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white border border-gray-800 transition-all font-medium group-hover:border-[#E84545]"
                        >
                          <Download className="h-4 w-4" />
                          <span>Export</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>
      
      {/* Close Period Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#932222] via-[#411010] to-[#a20c0c] px-6 py-5 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Close Period</h2>
                    <p className="text-white/80 text-sm">Lock financial transactions for this period</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  <XCircle className="h-7 w-7" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Closing Type *
                </label>
                <select
                  value={newClosing.closingType}
                  onChange={(e) =>
                    setNewClosing({
                      ...newClosing,
                      closingType: e.target.value as 'day' | 'month',
                    })
                  }
                  className="w-full px-4 py-3 bg-black border-2 border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                >
                  <option value="day">Daily Closing</option>
                  <option value="month">Monthly Closing</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the period type you want to close
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Closing Date *
                </label>
                <input
                  type="date"
                  value={newClosing.closingDate}
                  onChange={(e) =>
                    setNewClosing({ ...newClosing, closingDate: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-black border-2 border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The date for which this closing applies
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={newClosing.notes}
                  onChange={(e) =>
                    setNewClosing({ ...newClosing, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-black border-2 border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white resize-none"
                  placeholder="Add any notes, observations, or remarks about this closing..."
                />
              </div>
              
              {/* Warning Box */}
              <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-2 border-amber-800/50 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-400 mb-1">Important Notice</h4>
                    <ul className="text-sm text-amber-300 space-y-1 list-disc list-inside">
                      <li>All transactions for this period will be locked</li>
                      <li>Financial reports will be generated and archived</li>
                      <li>Ledger entries will be posted and balanced</li>
                      <li>This action requires proper verification</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-2 border-blue-800/50 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <BookOpen className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-1">Ledger Integration</h4>
                    <p className="text-sm text-blue-300">
                      This closing will automatically verify trial balance, reconcile all accounts, 
                      and ensure double-entry bookkeeping integrity across all transactions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3 border-t border-gray-800">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-6 py-2.5 border-2 border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all font-semibold shadow-lg"
              >
                Close Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Period Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="all">All Periods</option>
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="closed">Closed</option>
                  <option value="locked">Locked</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-black border border-gray-800 rounded-lg text-gray-300 hover:text-white hover:border-[#E84545] transition-colors active:scale-95"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all hover:shadow-lg hover:shadow-red-900/30"
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
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
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
                  setShowCloseModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Close Period</span>
                <Lock className="h-5 w-5" />
              </button>
              <button
                onClick={downloadClosingsCSV}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchClosings();
                  setShowMobileMenu(false);
                  toast.success('Closings refreshed');
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
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