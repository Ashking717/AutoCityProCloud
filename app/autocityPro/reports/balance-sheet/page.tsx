'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  BarChart3, 
  Loader2, 
  ChevronLeft, 
  AlertCircle, 
  CheckCircle, 
  Bug,
  MoreVertical,
  X,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types for the API response
interface BalanceSheetItem {
  items: { [key: string]: number };
  total: number;
}

interface BalanceSheetData {
  assets: {
    currentAssets: BalanceSheetItem;
    fixedAssets: BalanceSheetItem;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetItem;
    longTermLiabilities: BalanceSheetItem;
    totalLiabilities: number;
  };
  equity: {
    items: { [key: string]: number };
    total: number;
  };
  isBalanced: boolean;
  balanceDifference?: number;
  accountingEquation?: {
    leftSide: number;
    rightSide: number;
    difference: number;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
};

function AccountItems({ items, isMobile }: { items: { [key: string]: number }; isMobile: boolean }) {
  return (
    <>
      {Object.entries(items).map(([name, value]) => (
        <div key={name} className="flex justify-between items-center py-2 border-b border-white/5/50 last:border-0">
          <span className="text-white/80 text-xs md:text-sm truncate pr-2">{name}</span>
          <span className={`font-medium text-xs md:text-sm flex-shrink-0 ${value < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {isMobile ? formatCompactCurrency(value) : formatCurrency(value)}
          </span>
        </div>
      ))}
    </>
  );
}

export default function BalanceSheetPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<BalanceSheetData | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchBalanceSheet();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [asOfDate]);

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

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ asOfDate });
      const res = await fetch(`/api/reports/balance-sheet?${params}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data.reportData);
        
        if (data.reportData && !data.reportData.isBalanced) {
          const diff = data.reportData.balanceDifference || 0;
          toast.error(
            `Balance sheet is not balanced! Difference: ${formatCurrency(Math.abs(diff))}`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error('Failed to fetch balance sheet data');
      }
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      toast.error('Error loading balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async () => {
    try {
      toast.loading('Running diagnostic...');
      const res = await fetch('/api/reports/balance-sheet/diagnostic', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss();
        
        console.log('=== BALANCE SHEET DIAGNOSTIC ===');
        console.log(data.diagnostic);
        
        const { diagnostic } = data;
        const issues = diagnostic.recommendations.length;
        
        if (issues === 0) {
          toast.success('All checks passed! Your accounts are properly configured.');
        } else {
          toast.error(`Found ${issues} issue(s). Check console for details.`, {
            duration: 5000
          });
          
          const critical = diagnostic.recommendations.find((r: any) => r.severity === 'critical');
          if (critical) {
            toast.error(`Critical: ${critical.issue}`, { duration: 7000 });
            
            if (critical.issue === 'Missing system accounts') {
              setTimeout(() => {
                toast.custom((t) => (
                  <div className="bg-[#0A0A0A] text-white p-4 rounded-lg shadow-lg border border-amber-500 max-w-md">
                    <p className="font-semibold mb-3">Missing System Accounts Detected</p>
                    <p className="text-sm text-white/80 mb-4">
                      Would you like to automatically fix this issue?
                    </p>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          fixAccounts();
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-sm font-medium transition-colors"
                      >
                        Fix Existing Accounts
                      </button>
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          createMissingAccounts();
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
                      >
                        Create Missing Accounts
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 py-2 bg-white/10 hover:bg-[#111111] rounded text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ), { duration: 15000 });
              }, 1000);
            }
          }
        }
        
        setShowDiagnostic(true);
      } else {
        toast.dismiss();
        toast.error('Diagnostic failed');
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.dismiss();
      toast.error('Error running diagnostic');
    }
  };

  const fixAccounts = async () => {
    try {
      toast.loading('Fixing account configuration...');
      
      const res = await fetch('/api/admin/fix-accounts', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss();
        
        console.log('=== FIX ACCOUNTS RESULT ===');
        console.log(data);
        
        if (data.summary.updated > 0) {
          toast.success(`Successfully fixed ${data.summary.updated} account(s)!`, {
            duration: 5000
          });
          
          setTimeout(() => {
            runDiagnostic();
          }, 1000);
        } else {
          toast.success('All accounts are already correctly configured!');
        }
      } else {
        const error = await res.json();
        toast.dismiss();
        toast.error(error.error || 'Failed to fix accounts');
      }
    } catch (error) {
      console.error('Fix accounts error:', error);
      toast.dismiss();
      toast.error('Error fixing accounts');
    }
  };

  const createMissingAccounts = async () => {
    try {
      toast.loading('Creating missing system accounts...');
      
      const res = await fetch('/api/admin/create-system-accounts', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss();
        
        console.log('=== CREATE ACCOUNTS RESULT ===');
        console.log(data);
        
        if (data.summary.created > 0) {
          toast.success(`Successfully created ${data.summary.created} system account(s)!`, {
            duration: 5000
          });
          
          setTimeout(() => {
            runDiagnostic();
          }, 1500);
        } else if (data.summary.alreadyExists === data.summary.total) {
          toast.success('All system accounts already exist!');
        } else {
          toast.error(`Some accounts could not be created. Check console for details.`);
        }
      } else {
        const error = await res.json();
        toast.dismiss();
        toast.error(error.error || 'Failed to create accounts');
      }
    } catch (error) {
      console.error('Create accounts error:', error);
      toast.dismiss();
      toast.error('Error creating accounts');
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    try {
      if (format === 'pdf') {
        toast.loading('Generating PDF...');
        const { exportToPDF } = await import('@/lib/export/balanceSheetPDF');
        exportToPDF(reportData, asOfDate, user?.outletName || 'AutoCity');
        toast.dismiss();
        toast.success('PDF generated successfully');
      } else if (format === 'excel') {
        toast.loading('Generating Excel file...');
        const params = new URLSearchParams({ asOfDate, format: 'excel' });
        const res = await fetch(`/api/reports/balance-sheet/export?${params}`, {
          credentials: 'include',
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `balance-sheet-${asOfDate}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          toast.dismiss();
          toast.success('Excel file downloaded');
        } else {
          const error = await res.json();
          toast.dismiss();
          toast.error(error.error || 'Export failed');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('Export failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  if (loading && !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#E84545] mx-auto mb-4" />
            <p className="text-white/80">Loading balance sheet...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && reportData && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                {reportData.isBalanced ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-white text-xs font-semibold">Balanced</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-white text-xs font-semibold">Not Balanced</span>
                  </>
                )}
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs">{formatCompactCurrency(reportData.assets.totalAssets)}</span>
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
                  <h1 className="text-xl font-bold text-white">Balance Sheet</h1>
                  <p className="text-xs text-white/60">Financial position</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
              <button
                onClick={fetchBalanceSheet}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium disabled:opacity-50 text-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                <span className="hidden xs:inline">Generate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-4 md:py-7 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
          
          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors mb-4"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                  <BarChart3 className="w-8 h-8" />
                  <span>Balance Sheet</span>
                </h1>
                <p className="text-white/90 mt-1">Statement of financial position</p>
              </div>

              <div className="text-right">
                <p className="text-sm text-white/80">As of</p>
                <p className="text-xl font-semibold text-white">
                  {new Date(asOfDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel - Desktop Only */}
        <div className="hidden md:block max-w-7xl mx-auto px-8 py-6">
          <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label htmlFor="bs-as-of-date" className="block text-sm font-medium text-white/80 mb-2">
                  As of Date
                </label>
                <input
                  id="bs-as-of-date"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-[#E84545] outline-none transition-all text-white"
                />
              </div>

              <div className="md:col-span-2 flex items-end space-x-3">
                <button
                  onClick={fetchBalanceSheet}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>

                <button
                  onClick={runDiagnostic}
                  disabled={loading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transition-all duration-200"
                >
                  <Bug className="w-5 h-5" />
                  <span>Run Diagnostic</span>
                </button>

                <div className="flex-1" />

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-[#111111] border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm transition-all duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleExport('excel')}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-[#111111] border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm transition-all duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-[#111111] border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm transition-all duration-200"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Warning Banner */}
        {reportData && !reportData.isBalanced && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-6 pt-[140px] md:pt-0">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 active:scale-[0.98] transition-all">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-red-400 mb-1">
                    Balance Sheet Not Balanced
                  </h3>
                  <p className="text-red-300 text-xs md:text-sm mb-2">
                    Assets do not equal Liabilities + Equity. This indicates an accounting error.
                  </p>
                  {reportData.balanceDifference !== undefined && (
                    <div className="bg-red-950/50 rounded-lg p-3 mb-2">
                      <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                        <div>
                          <span className="text-red-300 block mb-1">Assets:</span>
                          <p className="text-white font-semibold truncate">
                            {formatCompactCurrency(reportData.assets.totalAssets)}
                          </p>
                        </div>
                        <div>
                          <span className="text-red-300 block mb-1">Liab + Equity:</span>
                          <p className="text-white font-semibold truncate">
                            {formatCompactCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                          </p>
                        </div>
                        <div>
                          <span className="text-red-300 block mb-1">Difference:</span>
                          <p className="text-red-400 font-bold truncate">
                            {formatCompactCurrency(Math.abs(reportData.balanceDifference))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={runDiagnostic}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-medium flex items-center space-x-2 transition-colors active:scale-95"
                  >
                    <Bug className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Run Diagnostic</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 pt-[140px] md:pt-0">
          {!reportData ? (
            <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-8 md:p-12 text-center">
              <BarChart3 className="w-12 h-12 md:w-16 md:h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white/80 mb-2">
                No Balance Sheet Data
              </h3>
              <p className="text-white/60 text-sm md:text-base mb-6">
                Generate a balance sheet report to view your financial position.
              </p>
              <button
                onClick={fetchBalanceSheet}
                className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:opacity-90 text-white rounded-lg font-medium inline-flex items-center space-x-2 active:scale-95 transition-all"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Generate Report</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Assets Card */}
              <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 md:px-6 py-3 md:py-4">
                  <div className="flex justify-between items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold text-white">ASSETS</h2>
                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-bold text-white truncate">
                        {formatCompactCurrency(reportData.assets.totalAssets)}
                      </div>
                      <div className="text-[10px] md:text-sm text-green-100">Resources owned</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {/* Current Assets */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-green-600/30">
                      <h3 className="font-semibold text-green-400 text-sm md:text-base">CURRENT ASSETS</h3>
                      <span className="font-bold text-green-400 text-sm md:text-base">
                        {formatCompactCurrency(reportData.assets.currentAssets.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.assets.currentAssets.items).length > 0 ? (
                      <div className="space-y-1">
                        <AccountItems items={reportData.assets.currentAssets.items} isMobile={isMobile} />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-white/40 text-sm">
                        <p>No current assets found</p>
                      </div>
                    )}
                  </div>

                  {/* Fixed Assets */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-green-600/30">
                      <h3 className="font-semibold text-green-400 text-sm md:text-base">FIXED ASSETS</h3>
                      <span className="font-bold text-green-400 text-sm md:text-base">
                        {formatCompactCurrency(reportData.assets.fixedAssets.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.assets.fixedAssets.items).length > 0 ? (
                      <div className="space-y-1">
                        <AccountItems items={reportData.assets.fixedAssets.items} isMobile={isMobile} />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-white/40 text-sm">
                        <p>No fixed assets found</p>
                      </div>
                    )}
                  </div>

                  {/* Total Assets */}
                  <div className="pt-4 border-t-2 border-white/5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base md:text-lg font-bold text-white">TOTAL ASSETS</h3>
                      <span className="text-xl md:text-2xl font-bold text-white truncate ml-2">
                        {formatCompactCurrency(reportData.assets.totalAssets)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Card */}
              <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 overflow-hidden">
                <div className="bg-gradient-to-r from-[#E84545] to-[#cc3c3c] px-4 md:px-6 py-3 md:py-4">
                  <div className="flex justify-between items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold text-white">LIABILITIES & EQUITY</h2>
                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-bold text-white truncate">
                        {formatCompactCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                      </div>
                      <div className="text-[10px] md:text-sm text-white/80">Obligations</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {/* Current Liabilities */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-red-600/30">
                      <h3 className="font-semibold text-red-400 text-sm md:text-base">CURRENT LIABILITIES</h3>
                      <span className="font-bold text-red-400 text-sm md:text-base">
                        {formatCompactCurrency(reportData.liabilities.currentLiabilities.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.liabilities.currentLiabilities.items).length > 0 ? (
                      <div className="space-y-1">
                        <AccountItems items={reportData.liabilities.currentLiabilities.items} isMobile={isMobile} />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-white/40 text-sm">
                        <p>No current liabilities found</p>
                      </div>
                    )}
                  </div>

                  {/* Long-term Liabilities */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-red-600/30">
                      <h3 className="font-semibold text-red-400 text-sm md:text-base">LONG-TERM LIABILITIES</h3>
                      <span className="font-bold text-red-400 text-sm md:text-base">
                        {formatCompactCurrency(reportData.liabilities.longTermLiabilities.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.liabilities.longTermLiabilities.items).length > 0 ? (
                      <div className="space-y-1">
                        <AccountItems items={reportData.liabilities.longTermLiabilities.items} isMobile={isMobile} />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-white/40 text-sm">
                        <p>No long-term liabilities found</p>
                      </div>
                    )}
                  </div>

                  {/* Total Liabilities */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-white text-sm md:text-base">TOTAL LIABILITIES</h3>
                      <span className="text-base md:text-lg font-bold text-white truncate ml-2">
                        {formatCompactCurrency(reportData.liabilities.totalLiabilities)}
                      </span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-blue-600/30">
                      <h3 className="font-semibold text-blue-400 text-sm md:text-base">EQUITY</h3>
                      <span className="font-bold text-blue-400 text-sm md:text-base">
                        {formatCompactCurrency(reportData.equity.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.equity.items).length > 0 ? (
                      <div className="space-y-1">
                        <AccountItems items={reportData.equity.items} isMobile={isMobile} />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-white/40 text-sm">
                        <p>No equity accounts found</p>
                      </div>
                    )}
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="pt-4 border-t-2 border-white/5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base md:text-lg font-bold text-white">TOTAL LIAB & EQUITY</h3>
                      <span className="text-xl md:text-2xl font-bold text-white truncate ml-2">
                        {formatCompactCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Status */}
          {reportData && (
            <div className="mt-6">
              {reportData.isBalanced ? (
                <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-4 flex items-center space-x-3 active:scale-[0.98] transition-all">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-400 text-sm md:text-base">Balance Sheet is balanced</h3>
                    <p className="text-xs md:text-sm text-green-300">
                      Assets = Liabilities + Equity ✓
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 flex items-center space-x-3 active:scale-[0.98] transition-all">
                  <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-400 text-sm md:text-base">Balance Sheet is not balanced</h3>
                    <p className="text-xs md:text-sm text-red-300">
                      Please review your ledger entries and accounts
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
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
                  runDiagnostic();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-amber-600/20 border border-amber-600/30 rounded-2xl text-amber-400 font-semibold hover:bg-amber-600/30 transition-all flex items-center justify-between active:scale-[0.98]"
              >
                <span>Run Diagnostic</span>
                <Bug className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  handleExport('pdf');
                  setShowMobileMenu(false);
                }}
                disabled={!reportData}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Export PDF</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  handleExport('excel');
                  setShowMobileMenu(false);
                }}
                disabled={!reportData}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Export Excel</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowMobileMenu(false);
                }}
                disabled={!reportData}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Print</span>
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}