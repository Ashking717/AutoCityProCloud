'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  ChevronLeft,
  MoreVertical,
  X,
  DollarSign,
  FileText,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerLedgerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  
  useEffect(() => {
    fetchUser();
    fetchCustomers();

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
  
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/customer-ledger', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLedger = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/customer-ledger?customerId=${customerId}&fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
        setSelectedCustomer(data.customer);
      }
    } catch (error) {
      toast.error('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    setSelectedCustomer(null);
    setLedgerData(null);
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
  
  // Customer List View
  if (!selectedCustomer) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505]">
          {/* Dynamic Island - Mobile Only */}
          {isMobile && showDynamicIsland && (
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
              <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-3">
                  <Users className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{customers.length}</span>
                  <div className="h-3 w-px bg-white/20"></div>
                  <span className="text-white/80 text-xs">Customers</span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Header */}
          <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-white">Customer Ledger</h1>
                    <p className="text-xs text-white/60">{customers.length} customers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block py-4 md:py-5 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden relative">
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
                  <Users className="h-8 w-8 text-white" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">Customer Ledger</h1>
                    <p className="text-white/90 mt-1">Select a customer to view their account statement</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer List */}
          <div className="px-4 md:px-8 pt-[120px] md:pt-6 pb-6">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
                  <p className="text-white/60">Loading customers...</p>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-2 text-white/20" />
                  <p className="text-white/60">No customers found</p>
                </div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer._id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fetchLedger(customer._id); }}
                    onClick={() => fetchLedger(customer._id)}
                    className="bg-[#0A0A0A] rounded-xl p-4 border border-white/5 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                        <p className="text-xs text-white/60">{customer.phone}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#E84545] flex-shrink-0" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-white/40 mb-1">Sales</p>
                        <p className="text-white font-medium truncate">{formatCompactCurrency(customer.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">Paid</p>
                        <p className="text-green-400 font-medium truncate">{formatCompactCurrency(customer.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">Balance</p>
                        <p className={`font-semibold truncate ${customer.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCompactCurrency(customer.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 overflow-hidden">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-[#111111]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Customer</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Total Sales</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Total Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Balance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-white/60">
                        Loading customers...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Users className="h-12 w-12 mx-auto mb-2 text-white/20" />
                        <p className="text-white/60">No customers found</p>
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">{customer.name}</p>
                            <p className="text-xs text-white/60">{customer.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-white">QAR {customer.totalSales.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-right text-green-400">QAR {customer.totalPaid.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={`font-semibold ${customer.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            QAR {customer.balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => fetchLedger(customer._id)}
                            className="inline-flex items-center space-x-1 text-[#E84545] hover:text-[#cc3c3c] transition-colors"
                          >
                            <span>View Ledger</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden h-6"></div>
        </div>
      </MainLayout>
    );
  }
  
  // Ledger Detail View
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && ledgerData && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <User className="h-3 w-3 text-[#E84545]" />
                <span className="text-white text-xs font-semibold">{ledgerData.summary.salesCount}</span>
                <div className="h-3 w-px bg-white/20"></div>
                <span className={`text-xs font-medium ${ledgerData.summary.closingBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCompactCurrency(Math.abs(ledgerData.summary.closingBalance))}
                </span>
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
                  onClick={handleBack}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white truncate">{selectedCustomer.name}</h1>
                  <p className="text-xs text-white/60 truncate">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
              <input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => fetchLedger(selectedCustomer._id)}
              disabled={loading}
              className="w-full px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium disabled:opacity-50 text-sm active:scale-95 transition-all"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-4 md:py-12 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden ">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
          
          <div className="px-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white">{selectedCustomer.name}</h1>
                  <p className="text-white/90 mt-1">{selectedCustomer.phone} | {selectedCustomer.email}</p>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Printer className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Date Range - Desktop Only */}
        <div className="hidden md:block px-8 py-6">
          <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="cl-from-date" className="block text-sm font-medium text-white mb-1">From Date</label>
                <input
                  id="cl-from-date"
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="cl-to-date" className="block text-sm font-medium text-white mb-1">To Date</label>
                <input
                  id="cl-to-date"
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fetchLedger(selectedCustomer._id)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary & Ledger */}
        <div className="px-4 md:px-8 pt-[240px] md:pt-0 pb-6">
          {ledgerData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4 active:scale-[0.98] transition-all">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Total Debit</p>
                  <p className="text-lg md:text-xl font-bold text-white truncate">
                    {isMobile ? formatCompactCurrency(ledgerData.summary.totalDebit) : `QAR ${ledgerData.summary.totalDebit.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4 active:scale-[0.98] transition-all">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Total Credit</p>
                  <p className="text-lg md:text-xl font-bold text-green-400 truncate">
                    {isMobile ? formatCompactCurrency(ledgerData.summary.totalCredit) : `QAR ${ledgerData.summary.totalCredit.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4 active:scale-[0.98] transition-all">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Closing Balance</p>
                  <p className={`text-lg md:text-xl font-bold truncate ${ledgerData.summary.closingBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {isMobile ? formatCompactCurrency(ledgerData.summary.closingBalance) : `QAR ${ledgerData.summary.closingBalance.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4 active:scale-[0.98] transition-all">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Transactions</p>
                  <p className="text-lg md:text-xl font-bold text-[#E84545]">{ledgerData.summary.salesCount}</p>
                </div>
              </div>

              {/* Ledger Entries - Mobile Card View */}
              <div className="md:hidden space-y-3">
                {ledgerData.ledgerEntries.length === 0 ? (
                  <div className="text-center py-12 bg-[#0A0A0A] rounded-xl border border-white/5">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-white/20" />
                    <p className="text-white/60">No transactions found</p>
                  </div>
                ) : (
                  ledgerData.ledgerEntries.map((entry: any) => (
                    <div key={`${entry.reference}-${entry.date}`} className="bg-[#0A0A0A] rounded-xl p-3 border border-white/5 active:scale-[0.98] transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-medium text-white">{entry.reference}</p>
                          <p className="text-[10px] text-white/60">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs font-semibold ${entry.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCompactCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? 'Dr' : 'Cr'}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 mb-2 line-clamp-2">{entry.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
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
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Ledger Entries - Desktop Table View */}
              <div className="hidden md:block bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c]">
                  <h2 className="text-xl font-bold text-white">Ledger Entries</h2>
                </div>
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-[#111111]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Credit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ledgerData.ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-white/60">
                          No transactions found for this period
                        </td>
                      </tr>
                    ) : (
                      ledgerData.ledgerEntries.map((entry: any) => (
                        <tr key={`${entry.reference}-${entry.date}`} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-white">
                            {new Date(entry.date).toLocaleDateString()}
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
                            <span className={entry.balance > 0 ? 'text-red-400' : 'text-green-400'}>
                              QAR {Math.abs(entry.balance).toFixed(2)} {entry.balance > 0 ? 'Dr' : 'Cr'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="md:hidden h-6"></div>
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
                  window.print();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
              >
                <span>Print Ledger</span>
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}