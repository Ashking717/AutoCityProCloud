'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  ChevronLeft,
  MoreVertical,
  X,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DaybookPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
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
      const res = await fetch(
        `/api/reports/daybook?date=${selectedDate}`,
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
            <p className="text-white">Generating daybook...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const summary = reportData.summary || {
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0,
    totalTransactions: 0,
    salesCount: 0,
    vouchersCount: 0,
  };
  
  const entries = reportData.entries || [];
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{summary.totalTransactions}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  {summary.netBalance >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-400 text-xs font-medium">
                        {formatCompactCurrency(summary.netBalance)}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      <span className="text-red-400 text-xs font-medium">
                        {formatCompactCurrency(Math.abs(summary.netBalance))}
                      </span>
                    </>
                  )}
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
                  <h1 className="text-xl font-bold text-white">Daybook</h1>
                  <p className="text-xs text-white/60">Daily transactions</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium disabled:opacity-50 text-sm active:scale-95 transition-all"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-4 md:py-12 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
          
          <div className="px-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
                <div className="h-8 w-0.5 bg-white/30"></div>
                <Calendar className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Daybook</h1>
                  <p className="text-white/90 mt-1">Daily transaction summary</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Date Filter - Desktop Only */}
        <div className="hidden md:block px-8 py-6">
          <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="daybook-date" className="block text-sm font-medium text-white mb-1">Select Date</label>
                <input
                  id="daybook-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Generate Report
                </button>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => toast.success('PDF export coming soon!')}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-[#111111] border border-white/5 rounded-lg hover:bg-white/5 transition-all"
                >
                  <Download className="h-4 w-4 text-white" />
                  <span className="text-white">PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg hover:bg-white/5 transition-all"
                >
                  <Printer className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="px-4 md:px-8 pt-[160px] md:pt-0 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            {/* Total Debit */}
            <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 p-4 md:p-6 active:scale-[0.98] transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="bg-red-500/10 p-2 md:p-3 rounded-xl">
                  <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-red-400" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-white/60 mb-1">Total Debit</p>
              <p className="text-lg md:text-2xl font-bold text-white truncate">
                {isMobile ? formatCompactCurrency(summary.totalDebit) : `QAR ${summary.totalDebit.toFixed(2)}`}
              </p>
            </div>
            
            {/* Total Credit */}
            <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 p-4 md:p-6 active:scale-[0.98] transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="bg-green-500/10 p-2 md:p-3 rounded-xl">
                  <TrendingDown className="h-4 w-4 md:h-6 md:w-6 text-green-400" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-white/60 mb-1">Total Credit</p>
              <p className="text-lg md:text-2xl font-bold text-green-400 truncate">
                {isMobile ? formatCompactCurrency(summary.totalCredit) : `QAR ${summary.totalCredit.toFixed(2)}`}
              </p>
            </div>
            
            {/* Net Balance */}
            <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 p-4 md:p-6 active:scale-[0.98] transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="bg-[#E84545]/10 p-2 md:p-3 rounded-xl">
                  <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-white/60 mb-1">Net Balance</p>
              <p className={`text-lg md:text-2xl font-bold truncate ${summary.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {isMobile ? formatCompactCurrency(summary.netBalance) : `QAR ${summary.netBalance.toFixed(2)}`}
              </p>
            </div>
            
            {/* Transactions */}
            <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 p-4 md:p-6 active:scale-[0.98] transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="bg-[#E84545]/10 p-2 md:p-3 rounded-xl">
                  <FileText className="h-4 w-4 md:h-6 md:w-6 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-white/60 mb-1">Transactions</p>
              <p className="text-lg md:text-2xl font-bold text-white">{summary.totalTransactions}</p>
              <p className="text-[10px] md:text-xs text-white/40 mt-1">
                Sales: {summary.salesCount} | Vouchers: {summary.vouchersCount}
              </p>
            </div>
          </div>
          
          {/* Daybook Entries */}
          <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 overflow-hidden">
            {/* Table Header */}
            <div className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c]">
              <h2 className="text-base md:text-xl font-bold text-white">Daily Transactions</h2>
              <p className="text-xs md:text-sm text-white/90 mt-1">
                {new Date(reportData.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-white/20" />
                  <p className="text-white/60">No transactions for this day</p>
                </div>
              ) : (
                entries.map((entry: any) => (
                  <div key={`${entry.reference}-${entry.time}`} className="bg-[#111111] rounded-xl p-3 border border-white/5 active:scale-[0.98] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${
                          entry.type === 'Sale' ? 'bg-green-500/10 text-green-400' :
                          entry.type === 'Payment' ? 'bg-red-500/10 text-red-400' :
                          entry.type === 'Receipt' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-white/10 text-white/80'
                        }`}>
                          {entry.type}
                        </span>
                        <span className="text-xs text-white/60">
                          {new Date(entry.time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-white">{entry.reference}</span>
                    </div>
                    <p className="text-sm text-white/80 mb-2 line-clamp-2">{entry.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-white/40 mb-1">Debit</p>
                        <p className="text-white font-medium">
                          {entry.debit > 0 ? formatCompactCurrency(entry.debit) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">Credit</p>
                        <p className="text-green-400 font-medium">
                          {entry.credit > 0 ? formatCompactCurrency(entry.credit) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">Balance</p>
                        <p className={`font-semibold ${entry.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCompactCurrency(Math.abs(entry.balance))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-[#111111]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-white/20" />
                        <p className="text-white/60">No transactions for this day</p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry: any) => (
                      <tr key={`${entry.reference}-${entry.time}`} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">
                          {new Date(entry.time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.type === 'Sale' ? 'bg-green-500/10 text-green-400' :
                            entry.type === 'Payment' ? 'bg-red-500/10 text-red-400' :
                            entry.type === 'Receipt' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-white/10 text-white/80'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{entry.reference}</td>
                        <td className="px-6 py-4 text-sm text-white/80">{entry.description}</td>
                        <td className="px-6 py-4 text-sm text-right text-white">
                          {entry.debit > 0 ? `QAR ${entry.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-green-400">
                          {entry.credit > 0 ? `QAR ${entry.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold">
                          <span className={entry.balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                            QAR {Math.abs(entry.balance).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {entries.length > 0 && (
                  <tfoot className="bg-[#111111] font-semibold">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right text-white">Total:</td>
                      <td className="px-6 py-4 text-right text-white">QAR {summary.totalDebit.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-green-400">QAR {summary.totalCredit.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={summary.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}>
                          QAR {Math.abs(summary.netBalance).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
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
                onClick={() => {
                  toast.success('PDF export coming soon!');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
              >
                <span>Export PDF</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
              >
                <span>Print Report</span>
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}