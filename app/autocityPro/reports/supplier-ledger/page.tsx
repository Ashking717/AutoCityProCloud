'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  FileText,
  MoreVertical,
  Printer,
  Truck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SupplierLedgerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchUser();
    fetchSuppliers();

    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/supplier-ledger', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      } else {
        toast.error((await res.json()).error || 'Failed to fetch suppliers');
      }
    } catch {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (supplierId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/supplier-ledger?supplierId=${supplierId}&fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
        setSelectedSupplier(data.supplier);
      } else {
        toast.error((await res.json()).error || 'Failed to fetch ledger');
      }
    } catch {
      toast.error('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedSupplier(null);
    setLedgerData(null);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const formatCompactCurrency = (amount: number) => {
    const value = Number(amount) || 0;
    if (Math.abs(value) >= 1000000) return `QR${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 10000) return `QR${(value / 1000).toFixed(1)}K`;
    return `QR${value.toFixed(0)}`;
  };

  if (!selectedSupplier) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505]">
          {isMobile && showDynamicIsland && (
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
              <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-3">
                  <Truck className="h-3 w-3 text-[color:var(--autocity-accent)]" />
                  <span className="text-white text-xs font-semibold">{suppliers.length}</span>
                  <div className="h-3 w-px bg-white/20"></div>
                  <span className="text-white/80 text-xs">Suppliers</span>
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 text-white/80 active:scale-95 transition-all">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Supplier Ledger</h1>
                  <p className="text-xs text-white/60">{suppliers.length} suppliers</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:block py-5 bg-gradient-to-r from-[var(--autocity-header-from-dark)] via-[var(--autocity-header-via-dark)] to-[var(--autocity-header-to-dark)] border border-[color:var(--autocity-accent-30)] shadow-lg">
            <div className="px-8">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
                <div className="h-8 w-0.5 bg-white/30"></div>
                <Truck className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Supplier Ledger</h1>
                  <p className="text-white/90 mt-1">Supplier statements, payments, and payable balances</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-8 pt-[120px] md:pt-6 pb-6">
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--autocity-accent)] mx-auto mb-4"></div>
                  <p className="text-white/60">Loading suppliers...</p>
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="h-12 w-12 mx-auto mb-2 text-white/20" />
                  <p className="text-white/60">No suppliers found</p>
                </div>
              ) : (
                suppliers.map((supplier) => (
                  <button
                    key={supplier._id}
                    onClick={() => fetchLedger(supplier._id)}
                    className="w-full bg-[#0A0A0A] rounded-xl p-4 border border-white/5 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{supplier.name}</p>
                        <p className="text-xs text-white/60">{supplier.phone}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[color:var(--autocity-accent)] flex-shrink-0" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-white/40 mb-1">Purchases</p>
                        <p className="text-white font-medium truncate">{formatCompactCurrency(supplier.totalPurchases)}</p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">Paid</p>
                        <p className="text-green-400 font-medium truncate">{formatCompactCurrency(supplier.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">Payable</p>
                        <p className={`font-semibold truncate ${supplier.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCompactCurrency(supplier.balance)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="hidden md:block bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 overflow-hidden">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-[#111111]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Opening</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Purchases</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Payable</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-white/60">Loading suppliers...</td>
                    </tr>
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-white/60">No suppliers found</td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{supplier.name}</p>
                          <p className="text-xs text-white/60">{supplier.phone}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-white">QAR {supplier.openingBalance.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-right text-white">QAR {supplier.totalPurchases.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-right text-green-400">QAR {supplier.totalPaid.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={`font-semibold ${supplier.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            QAR {supplier.balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => fetchLedger(supplier._id)} className="inline-flex items-center gap-1 text-[color:var(--autocity-accent)] hover:text-[color:var(--autocity-accent-strong)] transition-colors">
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
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {isMobile && showDynamicIsland && ledgerData && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <Truck className="h-3 w-3 text-[color:var(--autocity-accent)]" />
                <span className="text-white text-xs font-semibold">{ledgerData.summary.transactionsCount}</span>
                <div className="h-3 w-px bg-white/20"></div>
                <span className={`text-xs font-medium ${ledgerData.summary.closingBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCompactCurrency(Math.abs(ledgerData.summary.closingBalance))}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="p-2 rounded-xl bg-white/5 text-white/80 active:scale-95 transition-all">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-white truncate">{selectedSupplier.name}</h1>
                  <p className="text-xs text-white/60 truncate">{selectedSupplier.phone}</p>
                </div>
              </div>
              <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl bg-white/5 text-white/80 active:scale-95 transition-all">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="date" value={dateRange.fromDate} onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[color:var(--autocity-accent)]" />
              <input type="date" value={dateRange.toDate} onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[color:var(--autocity-accent)]" />
            </div>
            <button onClick={() => fetchLedger(selectedSupplier._id)} disabled={loading} className="w-full px-4 py-2 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-xl font-medium disabled:opacity-50 text-sm active:scale-95 transition-all">
              Generate
            </button>
          </div>
        </div>

        <div className="hidden md:block py-12 bg-gradient-to-r from-[var(--autocity-header-from-dark)] via-[var(--autocity-header-via-dark)] to-[var(--autocity-header-to-dark)] border border-[color:var(--autocity-accent-30)] shadow-lg">
          <div className="px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white">{selectedSupplier.name}</h1>
                  <p className="text-white/90 mt-1">{selectedSupplier.phone} | {selectedSupplier.email}</p>
                </div>
              </div>
              <button onClick={() => window.print()} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors">
                <Printer className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block px-8 py-6">
          <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="sl-from-date" className="block text-sm font-medium text-white mb-1">From Date</label>
                <input id="sl-from-date" type="date" value={dateRange.fromDate} onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })} className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[color:var(--autocity-accent)]" />
              </div>
              <div>
                <label htmlFor="sl-to-date" className="block text-sm font-medium text-white mb-1">To Date</label>
                <input id="sl-to-date" type="date" value={dateRange.toDate} onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })} className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[color:var(--autocity-accent)]" />
              </div>
              <div className="flex items-end">
                <button onClick={() => fetchLedger(selectedSupplier._id)} disabled={loading} className="w-full px-4 py-2 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-lg disabled:opacity-50 transition-all">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[240px] md:pt-0 pb-6">
          {ledgerData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Total Debit</p>
                  <p className="text-lg md:text-xl font-bold text-green-400 truncate">
                    {isMobile ? formatCompactCurrency(ledgerData.summary.totalDebit) : `QAR ${ledgerData.summary.totalDebit.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Total Credit</p>
                  <p className="text-lg md:text-xl font-bold text-white truncate">
                    {isMobile ? formatCompactCurrency(ledgerData.summary.totalCredit) : `QAR ${ledgerData.summary.totalCredit.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Payable Balance</p>
                  <p className={`text-lg md:text-xl font-bold truncate ${ledgerData.summary.closingBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {isMobile ? formatCompactCurrency(ledgerData.summary.closingBalance) : `QAR ${ledgerData.summary.closingBalance.toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-white/60 mb-1">Transactions</p>
                  <p className="text-lg md:text-xl font-bold text-[color:var(--autocity-accent)]">{ledgerData.summary.transactionsCount}</p>
                </div>
              </div>

              <div className="md:hidden space-y-3">
                {ledgerData.ledgerEntries.length === 0 ? (
                  <div className="text-center py-12 bg-[#0A0A0A] rounded-xl border border-white/5">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-white/20" />
                    <p className="text-white/60">No transactions found</p>
                  </div>
                ) : (
                  ledgerData.ledgerEntries.map((entry: any, index: number) => (
                    <div key={`${entry.reference}-${entry.date}-${index}`} className="bg-[#0A0A0A] rounded-xl p-3 border border-white/5 active:scale-[0.98] transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-medium text-white">{entry.reference}</p>
                          <p className="text-[10px] text-white/60">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs font-semibold ${entry.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCompactCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? 'Cr' : 'Dr'}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 mb-2 line-clamp-2">{entry.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-white/40 mb-1">Debit</p>
                          <p className="text-green-400 font-medium">{entry.debit > 0 ? formatCompactCurrency(entry.debit) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-white/40 mb-1">Credit</p>
                          <p className="text-white font-medium">{entry.credit > 0 ? formatCompactCurrency(entry.credit) : '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden md:block bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)]">
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
                        <td colSpan={6} className="px-6 py-12 text-center text-white/60">No transactions found for this period</td>
                      </tr>
                    ) : (
                      ledgerData.ledgerEntries.map((entry: any, index: number) => (
                        <tr key={`${entry.reference}-${entry.date}-${index}`} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-white">{new Date(entry.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm font-medium text-white">{entry.reference}</td>
                          <td className="px-6 py-4 text-sm text-white/80">{entry.description}</td>
                          <td className="px-6 py-4 text-sm text-right text-green-400">{entry.debit > 0 ? `QAR ${entry.debit.toFixed(2)}` : '-'}</td>
                          <td className="px-6 py-4 text-sm text-right text-white">{entry.credit > 0 ? `QAR ${entry.credit.toFixed(2)}` : '-'}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold">
                            <span className={entry.balance > 0 ? 'text-red-400' : 'text-green-400'}>
                              QAR {Math.abs(entry.balance).toFixed(2)} {entry.balance > 0 ? 'Cr' : 'Dr'}
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

      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
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
      )}
    </MainLayout>
  );
}
