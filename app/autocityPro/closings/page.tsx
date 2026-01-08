// app/autocityPro/closings/page.tsx
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
  RefreshCw
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
        return 'bg-red-500';
      case 'closed':
        return 'bg-emerald-500';
      case 'pending':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'locked':
        return <Lock className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-slate-800">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 backdrop-blur-lg p-3 rounded-xl">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Period Closings</h1>
                  <p className="text-indigo-100 mt-1">
                    Ledger-based financial period management
                  </p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all shadow-lg font-semibold"
                >
                  <Lock className="h-5 w-5" />
                  <span>Close Period</span>
                </button>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">Total Closings</p>
                    <p className="text-2xl font-bold text-white mt-1">{summary.totalClosings}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-white/60" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {summary.totalRevenue.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-white/60" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">Total Profit</p>
                    <p className={`text-2xl font-bold mt-1 ${summary.totalProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {summary.totalProfit.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-white/60" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">Avg Profit/Period</p>
                    <p className={`text-2xl font-bold mt-1 ${summary.avgProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {summary.avgProfit.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-white/60" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-slate-700 rounded-xl shadow-xl border border-slate-600 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Period Type
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      filterType === 'all'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    All Periods
                  </button>
                  <button
                    onClick={() => setFilterType('day')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      filterType === 'day'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setFilterType('month')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      filterType === 'month'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Status
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      filterStatus === 'all'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('closed')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      filterStatus === 'closed'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    Closed
                  </button>
                  <button
                    onClick={() => setFilterStatus('locked')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      filterStatus === 'locked'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
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
                <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600 text-lg">Loading closings...</p>
              </div>
            ) : closings.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <BookOpen className="h-16 w-16 text-slate-600 mb-4" />
                <p className="text-slate-300 text-lg">No closings found</p>
                <p className="text-slate-500 text-sm mt-2">Start by closing a period</p>
              </div>
            ) : (
              closings.map((closing) => (
                <div
                  key={closing._id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200"
                >
                  {/* Card Header */}
                  <div className={`${getStatusColor(closing.status)} bg-gradient-to-r p-4`}>
                    <div className="flex justify-between items-start">
                      <div className="text-white">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="h-5 w-5" />
                          <h3 className="text-lg font-bold">
                            {closing.closingType === 'day' ? 'Daily' : 'Monthly'} Closing
                          </h3>
                        </div>
                        <p className="text-sm opacity-90">
                          {new Date(closing.closingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        {getStatusIcon(closing.status)}
                        <span className="text-xs font-semibold text-white uppercase">
                          {closing.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Financial Summary */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Total Revenue</span>
                        <span className="font-bold text-emerald-600 text-lg">
                          QAR {closing.totalRevenue.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Total Expenses</span>
                        <span className="font-semibold text-red-600">
                          QAR {closing.totalExpenses.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 bg-slate-50 px-3 rounded-lg">
                        <span className="text-sm font-semibold text-slate-700">Net Profit</span>
                        <span className={`font-bold text-lg ${
                          closing.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          QAR {closing.netProfit.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Cash Flow */}
                    <div className="bg-indigo-50 rounded-lg p-3 space-y-2">
                      <h4 className="text-xs font-semibold text-indigo-900 uppercase mb-2">Cash Flow</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Opening Cash</span>
                        <span className="font-medium text-slate-900">
                          QAR {closing.openingCash.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Cash Sales</span>
                        <span className="font-medium text-emerald-600">
                          +{closing.cashSales.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Cash Payments</span>
                        <span className="font-medium text-red-600">
                          -{closing.cashPayments.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-indigo-200">
                        <span className="font-semibold text-indigo-900">Closing Cash</span>
                        <span className="font-bold text-indigo-900">
                          QAR {closing.closingCash.toLocaleString('en-QA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Ledger Info */}
                    {closing.ledgerEntriesCount && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Ledger Entries</span>
                          </div>
                          <span className="text-lg font-bold text-purple-900">
                            {closing.ledgerEntriesCount}
                          </span>
                        </div>
                        {closing.trialBalanceMatched && (
                          <div className="flex items-center space-x-1 mt-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs text-emerald-700">Trial Balance Matched</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Operations */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-600 text-xs">Sales</p>
                        <p className="font-bold text-slate-900">{closing.salesCount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-600 text-xs">Discount</p>
                        <p className="font-bold text-slate-900">
                          {closing.totalDiscount.toFixed(0)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-600 text-xs">Tax</p>
                        <p className="font-bold text-slate-900">
                          {closing.totalTax.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Audit Trail */}
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          Closed by: {closing.closedBy?.firstName} {closing.closedBy?.lastName}
                        </span>
                        <span>
                          {new Date(closing.closedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Notes */}
                    {closing.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <FileText className="h-4 w-4 text-amber-600 mt-0.5" />
                          <p className="text-sm text-amber-900">{closing.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => router.push(`/autocityPro/closings/${closing._id}`)}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                      <button
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium"
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
      
      {/* Close Period Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Close Period</h2>
                    <p className="text-indigo-100 text-sm">Lock financial transactions for this period</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <XCircle className="h-7 w-7" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                >
                  <option value="day">Daily Closing</option>
                  <option value="month">Monthly Closing</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select the period type you want to close
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Closing Date *
                </label>
                <input
                  type="date"
                  value={newClosing.closingDate}
                  onChange={(e) =>
                    setNewClosing({ ...newClosing, closingDate: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  The date for which this closing applies
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newClosing.notes}
                  onChange={(e) =>
                    setNewClosing({ ...newClosing, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
                  placeholder="Add any notes, observations, or remarks about this closing..."
                />
              </div>
              
              {/* Warning Box */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Important Notice</h4>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>All transactions for this period will be locked</li>
                      <li>Financial reports will be generated and archived</li>
                      <li>Ledger entries will be posted and balanced</li>
                      <li>This action requires proper verification</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Info Box */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <BookOpen className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-indigo-900 mb-1">Ledger Integration</h4>
                    <p className="text-sm text-indigo-800">
                      This closing will automatically verify trial balance, reconcile all accounts, 
                      and ensure double-entry bookkeeping integrity across all transactions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 border-t border-slate-200">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-6 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Close Period
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}