'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BalanceSheetPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [reportData, setReportData] = useState({
    assets: {
      currentAssets: {
        cash: 50000,
        bank: 120000,
        accountsReceivable: 80000,
        inventory: 150000,
        total: 400000,
      },
      fixedAssets: {
        land: 500000,
        building: 800000,
        furniture: 50000,
        vehicles: 200000,
        depreciation: -150000,
        total: 1400000,
      },
      totalAssets: 1800000,
    },
    liabilities: {
      currentLiabilities: {
        accountsPayable: 60000,
        shortTermLoans: 40000,
        salariesPayable: 15000,
        total: 115000,
      },
      longTermLiabilities: {
        longTermLoans: 300000,
        total: 300000,
      },
      totalLiabilities: 415000,
    },
    equity: {
      capital: 1000000,
      retainedEarnings: 352500,
      currentYearProfit: 32500,
      total: 1385000,
    },
  });
  
  useEffect(() => {
    fetchUser();
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
  
  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`Exporting to ${format.toUpperCase()}...`);
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const totalLiabilitiesAndEquity = reportData.liabilities.totalLiabilities + reportData.equity.total;
  const isBalanced = Math.abs(reportData.assets.totalAssets - totalLiabilitiesAndEquity) < 0.01;
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Balance Sheet</h1>
              <p className="text-gray-600 mt-1">Statement of financial position</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => toast.success('Generating report...')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Generate Report
              </button>
            </div>
            <div className="flex items-end space-x-2 col-span-2">
              <button
                onClick={() => handleExport('pdf')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Report */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <h2 className="text-xl font-bold">ASSETS</h2>
              <p className="text-sm opacity-90">As of {new Date(asOfDate).toLocaleDateString()}</p>
            </div>
            
            <div className="p-6">
              {/* Current Assets */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">CURRENT ASSETS</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Cash in Hand</span>
                    <span className="font-semibold">QAR {reportData.assets.currentAssets.cash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Cash at Bank</span>
                    <span className="font-semibold">QAR {reportData.assets.currentAssets.bank.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Accounts Receivable</span>
                    <span className="font-semibold">QAR {reportData.assets.currentAssets.accountsReceivable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Inventory</span>
                    <span className="font-semibold">QAR {reportData.assets.currentAssets.inventory.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                    <span>Total Current Assets</span>
                    <span>QAR {reportData.assets.currentAssets.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Fixed Assets */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">FIXED ASSETS</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Land</span>
                    <span className="font-semibold">QAR {reportData.assets.fixedAssets.land.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Building</span>
                    <span className="font-semibold">QAR {reportData.assets.fixedAssets.building.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Furniture & Fixtures</span>
                    <span className="font-semibold">QAR {reportData.assets.fixedAssets.furniture.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Vehicles</span>
                    <span className="font-semibold">QAR {reportData.assets.fixedAssets.vehicles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Less: Depreciation</span>
                    <span className="font-semibold text-red-600">QAR {reportData.assets.fixedAssets.depreciation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                    <span>Total Fixed Assets</span>
                    <span>QAR {reportData.assets.fixedAssets.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Total Assets */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-blue-900">TOTAL ASSETS</h3>
                  <span className="text-2xl font-bold text-blue-600">QAR {reportData.assets.totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Liabilities & Equity */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <h2 className="text-xl font-bold">LIABILITIES & EQUITY</h2>
              <p className="text-sm opacity-90">As of {new Date(asOfDate).toLocaleDateString()}</p>
            </div>
            
            <div className="p-6">
              {/* Current Liabilities */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">CURRENT LIABILITIES</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Accounts Payable</span>
                    <span className="font-semibold">QAR {reportData.liabilities.currentLiabilities.accountsPayable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Short-term Loans</span>
                    <span className="font-semibold">QAR {reportData.liabilities.currentLiabilities.shortTermLoans.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Salaries Payable</span>
                    <span className="font-semibold">QAR {reportData.liabilities.currentLiabilities.salariesPayable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-red-600">
                    <span>Total Current Liabilities</span>
                    <span>QAR {reportData.liabilities.currentLiabilities.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Long-term Liabilities */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">LONG-TERM LIABILITIES</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Long-term Loans</span>
                    <span className="font-semibold">QAR {reportData.liabilities.longTermLiabilities.longTermLoans.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-red-600">
                    <span>Total Long-term Liabilities</span>
                    <span>QAR {reportData.liabilities.longTermLiabilities.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Total Liabilities */}
              <div className="bg-red-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-red-900">TOTAL LIABILITIES</h3>
                  <span className="text-2xl font-bold text-red-600">QAR {reportData.liabilities.totalLiabilities.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Equity */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">EQUITY</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Capital</span>
                    <span className="font-semibold">QAR {reportData.equity.capital.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Retained Earnings</span>
                    <span className="font-semibold">QAR {reportData.equity.retainedEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Current Year Profit</span>
                    <span className="font-semibold text-green-600">QAR {reportData.equity.currentYearProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-green-600">
                    <span>Total Equity</span>
                    <span>QAR {reportData.equity.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Total Liabilities & Equity */}
              <div className={`${isBalanced ? 'bg-green-50' : 'bg-red-50'} p-4 rounded-lg`}>
                <div className="flex justify-between items-center">
                  <h3 className={`text-lg font-bold ${isBalanced ? 'text-green-900' : 'text-red-900'}`}>
                    TOTAL LIABILITIES & EQUITY
                  </h3>
                  <span className={`text-2xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    QAR {totalLiabilitiesAndEquity.toLocaleString()}
                  </span>
                </div>
                {isBalanced && (
                  <p className="text-sm text-green-700 mt-2 text-center">✓ Balance Sheet is balanced</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
