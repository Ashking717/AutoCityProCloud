'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  BookOpen,
  Filter,
  X,
  MoreVertical,
  ChevronLeft,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JournalVouchersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
  useEffect(() => {
    fetchUser();
    fetchVouchers();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [filterType, filterStatus]);
  
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };
  
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
  
  const fetchVouchers = async () => {
    try {
      setLoading(true);
      let url = '/api/vouchers?type=journal';
      if (filterType !== 'all') url += `&voucherType=${filterType}`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.vouchers || []);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-3 w-3" />;
      case 'posted': return <CheckCircle className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'void': return <Ban className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-400 bg-yellow-900/20 border border-yellow-800/50';
      case 'posted': return 'text-blue-400 bg-blue-900/20 border border-blue-800/50';
      case 'approved': return 'text-green-400 bg-green-900/20 border border-green-800/50';
      case 'void': return 'text-red-400 bg-red-900/20 border border-red-800/50';
      default: return 'text-gray-400 bg-gray-900/20 border border-gray-800/50';
    }
  };
  
  const filteredVouchers = vouchers.filter(v =>
    v.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalJournalAmount = filteredVouchers.reduce((sum, v) => sum + (v.totalDebit || 0), 0);
  
  const handleDeleteVoucher = async (id: string, voucherNumber: string) => {
    if (!confirm(`Are you sure you want to delete journal voucher ${voucherNumber}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast.success('Journal voucher deleted successfully!');
        fetchVouchers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete voucher');
      }
    } catch (error) {
      toast.error('Failed to delete voucher');
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchTerm('');
  };
  
  const activeFiltersCount = [
    filterType !== 'all',
    filterStatus !== 'all',
  ].filter(Boolean).length;
  
  const downloadJournalCSV = () => {
    if (filteredVouchers.length === 0) {
      toast.error("No journal data to export");
      return;
    }
    const headers = ["Voucher #", "Date", "Narration", "Debit", "Credit", "Status", "Reference #"];
    const rows = filteredVouchers.map(v => [
      v.voucherNumber || "",
      new Date(v.date).toLocaleDateString(),
      v.narration || "",
      v.totalDebit || 0,
      v.totalCredit || 0,
      v.status || "",
      v.referenceNumber || ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `journal_vouchers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredVouchers.length} journal vouchers to CSV`);
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{filteredVouchers.length}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">Journal</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[#E84545] text-xs font-medium">
                    {formatCompactCurrency(totalJournalAmount)}
                  </span>
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
                  <h1 className="text-xl font-bold text-white">Journal</h1>
                  <p className="text-xs text-white/60">{filteredVouchers.length} vouchers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E84545] rounded-full text-[10px] flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search journal vouchers..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Journal Vouchers</h1>
                <p className="text-white/80 mt-1">Manage your accounting journal entries</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/autocityPro/vouchers/journal/new')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>New Journal</span>
                </button>
                <button
                  onClick={downloadJournalCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Vouchers</p>
              <p className="text-lg md:text-xl font-bold text-white">{filteredVouchers.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Amount</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545] truncate">
                {formatCompactCurrency(totalJournalAmount)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Draft</p>
              <p className="text-lg md:text-xl font-bold text-yellow-400">
                {filteredVouchers.filter(v => v.status === 'draft').length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Posted</p>
              <p className="text-lg md:text-xl font-bold text-green-400">
                {filteredVouchers.filter(v => v.status === 'posted' || v.status === 'approved').length}
              </p>
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by voucher #, narration..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="posted">Posted</option>
                  <option value="approved">Approved</option>
                  <option value="void">Void</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm bg-[#050505] border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white"
              >
                Clear Filters
              </button>

              <button
                onClick={() => router.push('/autocityPro/vouchers/journal/new')}
                className="px-4 py-2.5 text-sm bg-gradient-to-r from-[#E84545] to-[#cc3c3c] border border-[#E84545]/30 rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] transition-all text-white font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Journal</span>
              </button>
            </div>
          </div>

          {/* Vouchers List */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545]"></div>
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg font-medium">No journal vouchers found</p>
                {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-[#E84545] hover:text-[#cc3c3c] text-sm transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-slate-700 p-4 space-y-3">
                  {filteredVouchers.map((voucher) => (
                    <div
                      key={voucher._id}
                      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-3 w-3 text-blue-400" />
                            <p className="text-sm font-semibold text-white truncate">#{voucher.voucherNumber}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(voucher.date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(voucher.status)}`}>
                          {getStatusIcon(voucher.status)}
                          <span className="capitalize">{voucher.status}</span>
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-slate-200 line-clamp-2">{voucher.narration}</p>
                        {voucher.referenceNumber && (
                          <p className="text-xs text-slate-500 mt-1">Ref: {voucher.referenceNumber}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">Amount</span>
                          <p className="text-sm font-semibold text-[#E84545]">
                            QAR {voucher.totalDebit?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}`)}
                            className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          {voucher.status === 'draft' && (
                            <>
                              <button
                                onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}/edit`)}
                                className="p-2 rounded-lg bg-white/5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 transition-colors"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteVoucher(voucher._id, voucher.voucherNumber)}
                                className="p-2 rounded-lg bg-white/5 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700 text-sm">
                    <thead className="bg-[#050505]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Voucher #</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Narration</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredVouchers.map((voucher) => (
                        <tr key={voucher._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-blue-400" />
                              <p className="text-sm font-medium text-white">#{voucher.voucherNumber}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {new Date(voucher.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-200 line-clamp-2 max-w-xs">{voucher.narration}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {voucher.referenceNumber || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-[#E84545]">
                              QAR {voucher.totalDebit?.toLocaleString() || '0'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 inline-flex items-center space-x-2 text-xs font-semibold rounded-full ${getStatusColor(voucher.status)}`}>
                              {getStatusIcon(voucher.status)}
                              <span className="capitalize">{voucher.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}`)}
                                className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                title="View voucher"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {voucher.status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}/edit`)}
                                    className="p-2 rounded-lg bg-white/5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 transition-colors"
                                    title="Edit voucher"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVoucher(voucher._id, voucher.voucherNumber)}
                                    className="p-2 rounded-lg bg-white/5 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                                    title="Delete voucher"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
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
                <label htmlFor="journal-filter-status" className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  id="journal-filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="posted">Posted</option>
                  <option value="approved">Approved</option>
                  <option value="void">Void</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-gray-300 hover:text-white transition-colors active:scale-95"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all"
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
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
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
                  router.push('/autocityPro/vouchers/journal/new');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>New Journal</span>
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadJournalCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchVouchers();
                  setShowMobileMenu(false);
                  toast.success('Journal data refreshed');
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
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