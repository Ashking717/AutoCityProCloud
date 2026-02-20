// app/autocityPro/closings/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, Printer, CheckCircle, XCircle, DollarSign, 
  TrendingUp, TrendingDown, Package, Receipt, CreditCard, Wallet, 
  Lock, Clock, FileText, BarChart3, BookOpen, Zap, ArrowUpRight, 
  ArrowDownRight, Info, AlertCircle, Database, Shield, Percent, Calendar
} from 'lucide-react';
import { generateClosingPDF } from '@/lib/utils/closingPdfGenerator';
import MainLayout from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';

interface ClosingData {
  _id: string;
  closingType: 'day' | 'month';
  closingDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  
  // Revenue
  totalRevenue: number;
  
  // Costs
  totalCOGS: number;
  totalPurchases: number;
  totalExpenses: number;
  
  // Profit
  grossProfit: number;
  netProfit: number;
  
  // Cash & Bank
  openingCash: number;
  openingBank: number;
  cashSales: number;
  cashReceipts?: number;
  cashPayments?: number;
  closingCash: number;
  closingBank: number;
  bankSales?: number;
  bankReceipts?: number;
  bankPayments?: number;
  
  totalOpeningBalance: number;
  totalClosingBalance: number;
  
  salesCount: number;
  purchasesCount?: number;
  expensesCount?: number;
  
  totalDiscount: number;
  totalTax: number;
  
  openingStock: number;
  closingStock: number;
  stockValue: number;
  
  accountsPayable?: number;
  
  ledgerEntriesCount?: number;
  trialBalanceMatched?: boolean;
  totalDebits?: number;
  totalCredits?: number;
  
  closedBy: {
    firstName: string;
    lastName: string;
  };
  closedAt: string;
  notes?: string;
}

interface AverageSalesData {
  averageSales: number;
  periodCount: number;
  totalPeriodSales: number;
  periodType: string; // "month" for daily closings, "year" for monthly closings
  periodLabel: string; // Display label
}

export default function ClosingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [closing, setClosing] = useState<ClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [averageSales, setAverageSales] = useState<AverageSalesData | null>(null);
  const [loadingAverage, setLoadingAverage] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchClosingDetails();
  }, [params.id]);

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

  const fetchClosingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/closings/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch closing details');
      }

      setClosing(data.closing);
      fetchAverageSales(data.closing);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAverageSales = async (closingData?: ClosingData) => {
    const target = closingData || closing;
    if (!target) return;

    try {
      setLoadingAverage(true);
      const closingDate = new Date(target.closingDate);
      
      let params;
      if (target.closingType === 'day') {
        // For daily closing: get all daily closings in the same month
        const year = closingDate.getFullYear();
        const month = closingDate.getMonth();
        const monthStart = new Date(year, month, 1).toISOString();
        const monthEnd = new Date(year, month + 1, 0).toISOString();
        
        params = new URLSearchParams({
          closingType: 'day',
          startDate: monthStart,
          endDate: monthEnd,
        });
      } else {
        // For monthly closing: get all monthly closings in the same year
        const year = closingDate.getFullYear();
        const yearStart = new Date(year, 0, 1).toISOString();
        const yearEnd = new Date(year, 11, 31).toISOString();
        
        params = new URLSearchParams({
          closingType: 'month',
          startDate: yearStart,
          endDate: yearEnd,
        });
      }

      const response = await fetch(`/api/closings?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const closings: ClosingData[] = data.closings || [];
        
        if (closings.length > 0) {
          const totalSales = closings.reduce((sum, c) => sum + c.totalRevenue, 0);
          const avgSales = totalSales / closings.length;
          
          const periodLabel = target.closingType === 'day' 
            ? closingDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : closingDate.getFullYear().toString();
          
          setAverageSales({
            averageSales: avgSales,
            periodCount: closings.length,
            totalPeriodSales: totalSales,
            periodType: target.closingType === 'day' ? 'month' : 'year',
            periodLabel,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch average sales:', error);
    } finally {
      setLoadingAverage(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      toast.loading('Generating PDF...', { id: 'pdf-generate' });
      
      const response = await fetch(`/api/closings/${params.id}/pdf`);
      const { data } = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch PDF data');
      }

      const pdfBlob = await generateClosingPDF(data);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `closing-${closing?.closingType}-${new Date(closing?.closingDate || '').toLocaleDateString('en-US').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!', { id: 'pdf-generate' });
    } catch (err: any) {
      toast.error('Failed to download PDF', { id: 'pdf-generate' });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
        return 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 text-red-400';
      case 'closed':
        return 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400';
      case 'pending':
        return 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400';
      default:
        return 'bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'locked':
        return <Lock className="h-3.5 w-3.5" />;
      case 'closed':
        return <CheckCircle className="h-3.5 w-3.5" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !closing) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
          <div className="p-6 bg-[#141414] border border-red-500/10 rounded-2xl mb-6">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Closing</h2>
          <p className="text-gray-400 mb-4">{error || 'Closing not found'}</p>
          <button
            onClick={() => router.push('/autocityPro/closings')}
            className="px-6 py-3 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all font-semibold shadow-lg shadow-red-500/25"
          >
            Back to Closings
          </button>
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-QA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isProfitable = closing.netProfit >= 0;
  const isGrossProfitable = (closing.grossProfit || 0) >= 0;
  const netChange = closing.totalClosingBalance - closing.totalOpeningBalance;
  const cashMovement = closing.closingCash - closing.openingCash;
  const bankMovement = closing.closingBank - closing.openingBank;
  const totalCosts = (closing.totalCOGS || 0) + closing.totalPurchases + closing.totalExpenses;
  const grossMargin = closing.totalRevenue > 0 ? ((closing.grossProfit || 0) / closing.totalRevenue) * 100 : 0;
  const netMargin = closing.totalRevenue > 0 ? (closing.netProfit / closing.totalRevenue) * 100 : 0;

  // Calculate comparison percentages
  const comparisonPercentage = averageSales 
    ? ((closing.totalRevenue - averageSales.averageSales) / averageSales.averageSales) * 100 
    : 0;
  const isAboveAverage = comparisonPercentage > 0;

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#0a0a0a] print:bg-white">
        {/* Header */}
        <div className="relative overflow-hidden print:hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-[#0a0a0a] to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
          
          <div className="relative px-4 md:px-8 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push('/autocityPro/closings')}
                    className="p-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-300" />
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-2xl" />
                    <div className="relative p-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl backdrop-blur-sm">
                      <BookOpen className="h-8 w-8 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {closing.closingType === 'day' ? 'Daily' : 'Monthly'} Closing Details
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatDate(closing.closingDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-red-500/20 text-gray-300 rounded-xl hover:bg-red-500/10 hover:text-white hover:border-red-500/40 transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden md:inline font-medium">Print</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all font-semibold shadow-lg shadow-red-500/25 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    <span>{downloading ? 'Generating...' : 'Download PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`mb-6 p-4 rounded-2xl border ${getStatusColor(closing.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(closing.status)}
                    <div>
                      <span className="font-bold text-sm uppercase tracking-wide">
                        Status: {closing.status}
                      </span>
                      <p className="text-xs opacity-80 mt-0.5">
                        Closed by {closing.closedBy.firstName} {closing.closedBy.lastName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs opacity-60">
                    {formatDateTime(closing.closedAt)}
                  </span>
                </div>
              </div>

              {/* Average Sales Banner - NEW FEATURE */}
              {averageSales && !loadingAverage && (
                <div className="mb-6 p-5 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-cyan-500/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-base font-bold text-cyan-400">
                            {closing.closingType === 'day' ? 'Average Daily Sales' : 'Average Monthly Sales'}
                          </h3>
                          <p className="text-xs text-cyan-300/70 mt-1">
                            {closing.closingType === 'day' 
                              ? `Based on ${averageSales.periodCount} day${averageSales.periodCount > 1 ? 's' : ''} in ${averageSales.periodLabel}`
                              : `Based on ${averageSales.periodCount} month${averageSales.periodCount > 1 ? 's' : ''} in ${averageSales.periodLabel}`
                            }
                          </p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg ${
                          isAboveAverage 
                            ? 'bg-emerald-500/10 border border-emerald-500/20' 
                            : 'bg-amber-500/10 border border-amber-500/20'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            {isAboveAverage ? (
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                            )}
                            <span className={`text-xs font-bold ${
                              isAboveAverage ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {isAboveAverage ? '+' : ''}{comparisonPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-[#1a1a1a]/50 rounded-xl">
                          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Average Sales</p>
                          <p className="text-xl font-bold text-cyan-400">
                            {formatCurrency(averageSales.averageSales)} QAR
                          </p>
                        </div>
                        <div className="p-3 bg-[#1a1a1a]/50 rounded-xl">
                          <p className="text-xs text-gray-500 font-medium uppercase mb-1">This Period Sales</p>
                          <p className="text-xl font-bold text-white">
                            {formatCurrency(closing.totalRevenue)} QAR
                          </p>
                        </div>
                        <div className="p-3 bg-[#1a1a1a]/50 rounded-xl">
                          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Difference</p>
                          <p className={`text-xl font-bold ${
                            isAboveAverage ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {isAboveAverage ? '+' : ''}{formatCurrency(closing.totalRevenue - averageSales.averageSales)} QAR
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ledger System Info Banner */}
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Database className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-blue-400">Ledger-Driven Accounting System</h3>
                      {closing.trialBalanceMatched && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <Shield className="h-3 w-3 text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-400">Verified</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-blue-300/70 mb-2">
                      All financial data calculated from double-entry ledger entries.
                    </p>
                    <p className="text-xs text-blue-400/80 font-medium">
                      Formula: Net Profit = Revenue - (COGS + Purchases + Expenses)
                    </p>
                    {closing.ledgerEntriesCount !== undefined && (
                      <p className="text-xs text-blue-400/60 mt-1">
                        {closing.ledgerEntriesCount.toLocaleString()} ledger entries processed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Rest of the existing code remains the same... */}
            {/* Key Metrics Grid, P&L Statement, Cash Flow, etc. */}
            {/* I'll include the complete remaining sections in the next part */}
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Revenue */}
              <div className="group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 bg-[#141414] border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Total Revenue
                  </p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {formatCurrency(closing.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{closing.salesCount} sales</p>
                </div>
              </div>

              {/* COGS */}
              <div className="group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 bg-[#141414] border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-orange-500/10 rounded-lg">
                      <Package className="h-5 w-5 text-orange-400" />
                    </div>
                    <ArrowDownRight className="h-4 w-4 text-orange-400" />
                  </div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Cost of Goods Sold
                  </p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {formatCurrency(closing.totalCOGS || 0)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">From ledger entries</p>
                </div>
              </div>

              {/* Gross Profit */}
              {closing.totalCOGS > 0 && (
                <div className={`group relative overflow-hidden ${isGrossProfitable ? 'border-l-4 border-blue-600' : 'border-l-4 border-orange-600'}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6 bg-[#141414] border-t border-r border-b border-red-500/10 rounded-r-2xl hover:border-red-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-lg ${isGrossProfitable ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                        {isGrossProfitable ? (
                          <TrendingUp className="h-5 w-5 text-blue-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-orange-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 rounded-full">
                        <Percent className="h-3 w-3 text-blue-400" />
                        <span className="text-xs font-bold text-blue-400">{grossMargin.toFixed(1)}%</span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                      Gross Profit
                    </p>
                    <p className={`text-3xl font-bold tracking-tight ${isGrossProfitable ? 'text-blue-400' : 'text-orange-400'}`}>
                      {formatCurrency(closing.grossProfit || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Revenue - COGS</p>
                  </div>
                </div>
              )}

              {/* Net Profit */}
              <div className={`group relative overflow-hidden ${isProfitable ? 'border-l-4 border-emerald-600' : 'border-l-4 border-red-600'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 bg-[#141414] border-t border-r border-b border-red-500/10 rounded-r-2xl hover:border-red-500/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-lg ${isProfitable ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {isProfitable ? (
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                      <Percent className="h-3 w-3 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">{netMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Net Profit/Loss
                  </p>
                  <p className={`text-3xl font-bold tracking-tight ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(closing.netProfit)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">After all costs</p>
                </div>
              </div>
            </div>

            {/* Cash & Bank Flow - Ledger Driven */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Cash Flow */}
              <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-bold text-white">Cash Flow Analysis</h2>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Database className="h-3 w-3 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400">Ledger</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Opening Balance</span>
                      <Info className="h-3 w-3 text-gray-600" />
                    </div>
                    <span className="text-sm font-bold text-white">{formatCurrency(closing.openingCash)} QAR</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-300">Cash Sales</span>
                      <span className="text-xs text-blue-400/60">(Info)</span>
                    </div>
                    <span className="text-sm font-bold text-blue-300">{formatCurrency(closing.cashSales)} QAR</span>
                  </div>
                  
                  {closing.cashReceipts !== undefined && closing.cashReceipts > 0 && (
                    <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-xl">
                      <span className="text-sm text-emerald-400">+ Total Receipts (Ledger)</span>
                      <span className="text-sm font-bold text-emerald-400">{formatCurrency(closing.cashReceipts)} QAR</span>
                    </div>
                  )}
                  
                  {closing.cashPayments !== undefined && closing.cashPayments > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl">
                      <span className="text-sm text-red-400">- Total Payments (Ledger)</span>
                      <span className="text-sm font-bold text-red-400">{formatCurrency(closing.cashPayments)} QAR</span>
                    </div>
                  )}
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl ${
                    cashMovement >= 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/20'
                  }`}>
                    <span className="text-sm font-medium text-gray-400">Net Movement</span>
                    <span className={`text-sm font-bold ${cashMovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {cashMovement >= 0 ? '+' : ''}{formatCurrency(cashMovement)} QAR
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl">
                    <span className="text-sm font-bold text-blue-400 uppercase">Closing Balance</span>
                    <span className="text-xl font-bold text-blue-400">{formatCurrency(closing.closingCash)} QAR</span>
                  </div>
                </div>
              </div>

              {/* Bank Flow */}
              <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg font-bold text-white">Bank Flow Analysis</h2>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Database className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">Ledger</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Opening Balance</span>
                      <Info className="h-3 w-3 text-gray-600" />
                    </div>
                    <span className="text-sm font-bold text-white">{formatCurrency(closing.openingBank)} QAR</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-300">Bank Sales</span>
                      <span className="text-xs text-emerald-400/60">(Info)</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-300">{formatCurrency(closing.bankSales || 0)} QAR</span>
                  </div>
                  
                  {closing.bankReceipts !== undefined && closing.bankReceipts > 0 && (
                    <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-xl">
                      <span className="text-sm text-emerald-400">+ Total Receipts (Ledger)</span>
                      <span className="text-sm font-bold text-emerald-400">{formatCurrency(closing.bankReceipts)} QAR</span>
                    </div>
                  )}
                  
                  {closing.bankPayments !== undefined && closing.bankPayments > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl">
                      <span className="text-sm text-red-400">- Total Payments (Ledger)</span>
                      <span className="text-sm font-bold text-red-400">{formatCurrency(closing.bankPayments)} QAR</span>
                    </div>
                  )}
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl ${
                    bankMovement >= 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/20'
                  }`}>
                    <span className="text-sm font-medium text-gray-400">Net Movement</span>
                    <span className={`text-sm font-bold ${bankMovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bankMovement >= 0 ? '+' : ''}{formatCurrency(bankMovement)} QAR
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl">
                    <span className="text-sm font-bold text-emerald-400 uppercase">Closing Balance</span>
                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(closing.closingBank)} QAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Balances Summary */}
            <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Total Balance Summary</h2>
                </div>
                <span className="text-xs text-gray-500">Cash + Bank Combined</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#1a1a1a] rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">Total Opening</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(closing.totalOpeningBalance)} QAR</p>
                </div>
                <div className="p-4 bg-[#1a1a1a] rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">Total Closing</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(closing.totalClosingBalance)} QAR</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${
                  netChange >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">Net Change</p>
                  <p className={`text-2xl font-bold ${netChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)} QAR
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Sales Details */}
              <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Sales Details</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <span className="text-sm text-gray-500">Total Discount</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(closing.totalDiscount)} QAR</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <span className="text-sm text-gray-500">Total Tax (VAT)</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(closing.totalTax)} QAR</span>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Inventory Summary</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <span className="text-sm text-gray-500">Opening Stock</span>
                    <span className="text-sm font-bold text-white">{closing.openingStock} units</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <span className="text-sm text-gray-500">Closing Stock</span>
                    <span className="text-sm font-bold text-white">{closing.closingStock} units</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                    <span className="text-sm text-gray-500">Stock Change</span>
                    <span className={`text-sm font-bold ${
                      closing.closingStock - closing.openingStock >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {closing.closingStock - closing.openingStock >= 0 ? '+' : ''}
                      {closing.closingStock - closing.openingStock} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <span className="text-sm font-bold text-purple-400">Inventory Value</span>
                    <span className="text-sm font-bold text-purple-400">{formatCurrency(closing.stockValue)} QAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Statistics */}
            {closing.ledgerEntriesCount !== undefined && (
              <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  Ledger Statistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#1a1a1a] rounded-xl text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-2">Ledger Entries</p>
                    <p className="text-2xl font-bold text-white">{closing.ledgerEntriesCount.toLocaleString()}</p>
                  </div>
                  {closing.totalDebits !== undefined && (
                    <div className="p-4 bg-[#1a1a1a] rounded-xl text-center">
                      <p className="text-xs text-gray-500 font-medium uppercase mb-2">Total Debits</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(closing.totalDebits)}</p>
                    </div>
                  )}
                  {closing.totalCredits !== undefined && (
                    <div className="p-4 bg-[#1a1a1a] rounded-xl text-center">
                      <p className="text-xs text-gray-500 font-medium uppercase mb-2">Total Credits</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(closing.totalCredits)}</p>
                    </div>
                  )}
                  {closing.trialBalanceMatched !== undefined && (
                    <div className={`p-4 rounded-xl text-center ${
                      closing.trialBalanceMatched 
                        ? 'bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      <p className="text-xs text-gray-500 font-medium uppercase mb-2">Trial Balance</p>
                      <p className={`text-lg font-bold ${
                        closing.trialBalanceMatched ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {closing.trialBalanceMatched ? '✓ Matched' : '✗ Not Matched'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Accounts Payable */}
            {closing.accountsPayable !== undefined && closing.accountsPayable > 0 && (
              <div className="bg-[#141414] border border-amber-500/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Liabilities</h2>
                </div>
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-400">Accounts Payable</span>
                    <span className="text-xl font-bold text-amber-400">{formatCurrency(closing.accountsPayable)} QAR</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {closing.notes && (
              <div className="bg-[#141414] border border-red-500/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Notes</h2>
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{closing.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}