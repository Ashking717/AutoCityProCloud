'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, BarChart3, Loader2, ChevronLeft, AlertCircle, CheckCircle, Bug } from 'lucide-react';
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

export default function BalanceSheetPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<BalanceSheetData | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchBalanceSheet();
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
        
        // Show warning if not balanced
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
        
        // Show diagnostic results in console for developer
        console.log('=== BALANCE SHEET DIAGNOSTIC ===');
        console.log(data.diagnostic);
        
        // Show summary to user
        const { diagnostic } = data;
        const issues = diagnostic.recommendations.length;
        
        if (issues === 0) {
          toast.success('All checks passed! Your accounts are properly configured.');
        } else {
          toast.error(`Found ${issues} issue(s). Check console for details.`, {
            duration: 5000
          });
          
          // Show first critical issue
          const critical = diagnostic.recommendations.find((r: any) => r.severity === 'critical');
          if (critical) {
            toast.error(`Critical: ${critical.issue}`, { duration: 7000 });
            
            // If missing system accounts, offer to fix
            if (critical.issue === 'Missing system accounts') {
              setTimeout(() => {
                toast.custom((t) => (
                  <div className="bg-slate-800 text-white p-4 rounded-lg shadow-lg border border-amber-500 max-w-md">
                    <p className="font-semibold mb-3">Missing System Accounts Detected</p>
                    <p className="text-sm text-slate-300 mb-4">
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
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded text-sm font-medium transition-colors"
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
          
          // Automatically re-run diagnostic
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
          
          // Automatically re-run diagnostic
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
        exportToPDF(reportData, asOfDate, user?.outletName || 'AutoCity Pro');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const renderAccountItems = (items: { [key: string]: number }) => {
    return Object.entries(items).map(([name, value]) => (
      <div key={name} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
        <span className="text-slate-300">{name}</span>
        <span className={`font-medium ${value < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatCurrency(value)}
        </span>
      </div>
    ));
  };
  const handleLogout = async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/autocityPro/login";
    };

  if (loading && !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-300">Loading balance sheet...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <p className="text-indigo-100 mt-1">Statement of financial position</p>
              </div>

              <div className="text-right">
                <p className="text-sm text-indigo-100">As of</p>
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

        {/* Filters Panel */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  As of Date
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-100"
                />
              </div>

              <div className="md:col-span-2 flex items-end space-x-3">
                <button
                  onClick={fetchBalanceSheet}
                  disabled={loading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
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
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Bug className="w-5 h-5" />
                  <span>Run Diagnostic</span>
                </button>

                <div className="flex-1" />

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-400">Export:</span>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleExport('excel')}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow transition-all duration-200"
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-400 mb-1">
                    Balance Sheet Not Balanced
                  </h3>
                  <p className="text-red-300 text-sm mb-2">
                    Assets do not equal Liabilities + Equity. This indicates an accounting error.
                  </p>
                  {reportData.balanceDifference !== undefined && (
                    <div className="bg-red-950/50 rounded-lg p-3 mb-2">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-red-300">Total Assets:</span>
                          <p className="text-white font-semibold">
                            {formatCurrency(reportData.assets.totalAssets)}
                          </p>
                        </div>
                        <div>
                          <span className="text-red-300">Liabilities + Equity:</span>
                          <p className="text-white font-semibold">
                            {formatCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                          </p>
                        </div>
                        <div>
                          <span className="text-red-300">Difference:</span>
                          <p className="text-red-400 font-bold">
                            {formatCurrency(Math.abs(reportData.balanceDifference))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={runDiagnostic}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                  >
                    <Bug className="w-4 h-4" />
                    <span>Run Diagnostic to Find Issues</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {!reportData ? (
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No Balance Sheet Data
              </h3>
              <p className="text-slate-400 mb-6">
                Generate a balance sheet report to view your financial position.
              </p>
              <button
                onClick={fetchBalanceSheet}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium inline-flex items-center space-x-2"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Generate Report</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assets Card */}
              <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">ASSETS</h2>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(reportData.assets.totalAssets)}
                      </div>
                      <div className="text-sm text-emerald-100">Resources owned by the business</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Current Assets */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-emerald-600/30">
                      <h3 className="font-semibold text-emerald-400">CURRENT ASSETS</h3>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(reportData.assets.currentAssets.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.assets.currentAssets.items).length > 0 ? (
                      <div className="space-y-1">
                        {renderAccountItems(reportData.assets.currentAssets.items)}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <p>No current assets found</p>
                      </div>
                    )}
                  </div>

                  {/* Fixed Assets */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-emerald-600/30">
                      <h3 className="font-semibold text-emerald-400">FIXED ASSETS</h3>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(reportData.assets.fixedAssets.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.assets.fixedAssets.items).length > 0 ? (
                      <div className="space-y-1">
                        {renderAccountItems(reportData.assets.fixedAssets.items)}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <p>No fixed assets found</p>
                      </div>
                    )}
                  </div>

                  {/* Total Assets */}
                  <div className="pt-4 border-t-2 border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">TOTAL ASSETS</h3>
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(reportData.assets.totalAssets)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Card */}
              <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">LIABILITIES & EQUITY</h2>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                      </div>
                      <div className="text-sm text-purple-100">Obligations and ownership interest</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Current Liabilities */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-red-600/30">
                      <h3 className="font-semibold text-red-400">CURRENT LIABILITIES</h3>
                      <span className="font-bold text-red-400">
                        {formatCurrency(reportData.liabilities.currentLiabilities.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.liabilities.currentLiabilities.items).length > 0 ? (
                      <div className="space-y-1">
                        {renderAccountItems(reportData.liabilities.currentLiabilities.items)}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <p>No current liabilities found</p>
                      </div>
                    )}
                  </div>

                  {/* Long-term Liabilities */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-red-600/30">
                      <h3 className="font-semibold text-red-400">LONG-TERM LIABILITIES</h3>
                      <span className="font-bold text-red-400">
                        {formatCurrency(reportData.liabilities.longTermLiabilities.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.liabilities.longTermLiabilities.items).length > 0 ? (
                      <div className="space-y-1">
                        {renderAccountItems(reportData.liabilities.longTermLiabilities.items)}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <p>No long-term liabilities found</p>
                      </div>
                    )}
                  </div>

                  {/* Total Liabilities */}
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-200">TOTAL LIABILITIES</h3>
                      <span className="text-lg font-bold text-slate-200">
                        {formatCurrency(reportData.liabilities.totalLiabilities)}
                      </span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-blue-600/30">
                      <h3 className="font-semibold text-blue-400">EQUITY</h3>
                      <span className="font-bold text-blue-400">
                        {formatCurrency(reportData.equity.total)}
                      </span>
                    </div>
                    {Object.keys(reportData.equity.items).length > 0 ? (
                      <div className="space-y-1">
                        {renderAccountItems(reportData.equity.items)}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <p>No equity accounts found</p>
                      </div>
                    )}
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="pt-4 border-t-2 border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">TOTAL LIABILITIES & EQUITY</h3>
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
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
                <div className="bg-emerald-900/30 border-2 border-emerald-500 rounded-xl p-4 flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-emerald-400">Balance Sheet is balanced</h3>
                    <p className="text-sm text-emerald-300">
                      Assets = Liabilities + Equity ✓
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-400">Balance Sheet is not balanced</h3>
                    <p className="text-sm text-red-300">
                      Please review your ledger entries and accounts
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}