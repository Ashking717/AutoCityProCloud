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
  DollarSign, 
  BookOpen, 
  ArrowLeftRight, 
  Filter,
  X,
  ChevronLeft,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  FileDown,
  RefreshCw,
  Calendar,
  ChevronRight,
  Download,
  SortAsc,
  SortDesc,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VouchersPage() {
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  
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
      let url = '/api/vouchers?';
      if (filterType !== 'all') url += `voucherType=${filterType}&`;
      if (filterStatus !== 'all') url += `status=${filterStatus}&`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.vouchers || []);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers');
      toast.error('Failed to fetch vouchers');
    } finally {
      setLoading(false);
    }
  };
  
  const getVoucherTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-4 w-4 text-red-400" />;
      case 'receipt': return <DollarSign className="h-4 w-4 text-green-400" />;
      case 'journal': return <BookOpen className="h-4 w-4 text-blue-400" />;
      case 'contra': return <ArrowLeftRight className="h-4 w-4 text-purple-400" />;
      default: return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'posted': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'void': return <Ban className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50';
      case 'posted': return 'bg-blue-900/30 text-blue-400 border border-blue-800/50';
      case 'approved': return 'bg-green-900/30 text-green-400 border border-green-800/50';
      case 'void': return 'bg-red-900/30 text-red-400 border border-red-800/50';
      default: return 'bg-black/50 text-gray-400 border border-gray-800';
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredVouchers = vouchers.filter(v =>
    v.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedVouchers = [...filteredVouchers].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle date sorting
    if (sortConfig.key === 'date') {
      aValue = new Date(a.date).getTime();
      bValue = new Date(b.date).getTime();
    }

    // Handle amount sorting
    if (sortConfig.key === 'amount') {
      aValue = a.totalDebit || 0;
      bValue = b.totalDebit || 0;
    }

    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  const handleDeleteVoucher = async (id: string, voucherNumber: string) => {
    if (!confirm(`Are you sure you want to delete voucher ${voucherNumber}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast.success('Voucher deleted successfully!');
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

  const downloadVouchersCSV = () => {
    if (filteredVouchers.length === 0) {
      toast.error("No vouchers to export");
      return;
    }
    
    const headers = ["Voucher #", "Type", "Date", "Narration", "Amount", "Status", "Reference"];
    const rows = filteredVouchers.map(v => [
      v.voucherNumber || '',
      v.voucherType || '',
      new Date(v.date).toLocaleDateString(),
      v.narration || '',
      v.totalDebit || 0,
      v.status || '',
      v.referenceNumber || ''
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vouchers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredVouchers.length} vouchers to CSV`);
  };
  
  const voucherTypes = [
    // { value: 'payment', label: 'Payment', color: 'red', href: '/autocityPro/vouchers/payment' },
    // { value: 'receipt', label: 'Receipt', color: 'green', href: '/autocityPro/vouchers/receipt' },
    { value: 'journal', label: 'Journal', color: 'blue', href: '/autocityPro/vouchers/journal' },
    { value: 'contra', label: 'Contra', color: 'purple', href: '/autocityPro/vouchers/contra' },
  ];
  
  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchTerm('');
    setSortConfig({ key: 'date', direction: 'desc' });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' 
      ? <SortAsc className="h-3 w-3 ml-1 text-red-400" /> 
      : <SortDesc className="h-3 w-3 ml-1 text-red-400" />;
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
                  <FileText className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{filteredVouchers.length} vouchers</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  {filterType !== 'all' && (
                    <>
                      <span className="text-white text-xs font-medium capitalize">{filterType}</span>
                      <div className="h-3 w-px bg-white/20"></div>
                    </>
                  )}
                  <span className="text-[#E84545] text-xs font-medium">
                    {filterStatus === 'all' ? 'All Status' : filterStatus}
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
              <div>
                <h1 className="text-xl font-bold text-white">Vouchers</h1>
                <p className="text-xs text-white/60">{filteredVouchers.length} vouchers</p>
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
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vouchers..."
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
                <h1 className="text-3xl font-bold text-white">Vouchers</h1>
                <p className="text-white/80 mt-1">Manage and track all financial vouchers</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={downloadVouchersCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Desktop Filters with Sort */}
          <div className="hidden md:block bg-black border border-gray-800 rounded-lg shadow p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vouchers..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-500"
                />
              </div>

              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="receipt">Receipt</option>
                  <option value="journal">Journal</option>
                  <option value="contra">Contra</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="posted">Posted</option>
                  <option value="approved">Approved</option>
                  <option value="void">Void</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={sortConfig.key}
                  onChange={(e) => handleSort(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="voucherNumber">Sort by Voucher #</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  {sortConfig.direction === 'asc' 
                    ? <SortAsc className="h-4 w-4 text-gray-400" />
                    : <SortDesc className="h-4 w-4 text-gray-400" />
                  }
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm bg-black border border-gray-800 rounded hover:bg-gray-900 transition-colors text-white hover:border-[#E84545]"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Quick Actions - Mobile */}
          <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
            {voucherTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => router.push(type.href)}
                className={`p-4 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-2xl hover:border-[#E84545] transition-all active:scale-[0.98] group`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{type.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Create</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-${type.color}-900/20 border border-${type.color}-800/50`}>
                    {getVoucherTypeIcon(type.value)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Actions - Desktop */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {voucherTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => router.push(type.href)}
                className={`p-6 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl hover:border-[#E84545] hover:shadow-lg hover:shadow-red-900/20 transition-all group`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-red-400">{type.label} Voucher</h3>
                    <p className="text-sm text-gray-500 mt-1">Create new</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${type.color}-900/20 border border-${type.color}-800/50 group-hover:border-[#E84545] transition-all`}>
                    {getVoucherTypeIcon(type.value)}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Vouchers List - Mobile */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
              </div>
            ) : sortedVouchers.length === 0 ? (
              <div className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-2xl p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400 text-lg font-medium">No vouchers found</p>
                <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
                {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-[#E84545] text-white text-sm font-semibold rounded-lg hover:bg-[#cc3c3c] transition-all active:scale-95"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedVouchers.map((voucher) => (
                  <div
                    key={voucher._id}
                    className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl p-4 hover:border-[#E84545] transition-all active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getVoucherTypeIcon(voucher.voucherType)}
                          <span className="text-sm font-semibold text-white">{voucher.voucherNumber}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(voucher.status)} flex items-center gap-1`}>
                            {getStatusIcon(voucher.status)}
                            <span className="capitalize">{voucher.status}</span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(voucher.date).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setShowMobileMenu(true)}
                        className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-2 py-3 border-t border-gray-800">
                      <p className="text-sm text-gray-300 line-clamp-2">{voucher.narration}</p>
                      {voucher.referenceNumber && (
                        <p className="text-xs text-gray-500">Ref: {voucher.referenceNumber}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Type</span>
                        <p className="text-sm font-semibold text-gray-300 capitalize">{voucher.voucherType}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Amount</span>
                        <p className="text-sm font-bold text-white">QAR {voucher.totalDebit?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Vouchers Table - Desktop */}
          <div className="hidden md:block bg-black border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-800 text-sm">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('voucherNumber')}
                  >
                    <div className="flex items-center">
                      Voucher #
                      {getSortIcon('voucherNumber')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      {getSortIcon('date')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Narration
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      Amount
                      {getSortIcon('amount')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black divide-y divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545]"></div>
                      </div>
                      <p className="mt-2">Loading vouchers...</p>
                    </td>
                  </tr>
                ) : sortedVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-700" />
                      <p className="text-gray-400 text-lg font-medium">No vouchers found</p>
                      {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                        <button
                          onClick={clearFilters}
                          className="mt-4 px-4 py-2 bg-[#E84545] text-white text-sm font-semibold rounded-lg hover:bg-[#cc3c3c] transition-all"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedVouchers.map((voucher) => (
                    <tr key={voucher._id} className="hover:bg-gray-900 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white group-hover:text-red-400">{voucher.voucherNumber}</p>
                          {voucher.referenceNumber && (
                            <p className="text-xs text-gray-500">Ref: {voucher.referenceNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getVoucherTypeIcon(voucher.voucherType)}
                          <span className="text-sm capitalize text-gray-200">{voucher.voucherType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-200">
                          {new Date(voucher.date).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-200 line-clamp-2 max-w-xs">{voucher.narration}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-white group-hover:text-red-400">
                          QAR {voucher.totalDebit?.toLocaleString() || '0'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${getStatusColor(voucher.status)} group-hover:border-[#E84545] transition-all`}>
                          {getStatusIcon(voucher.status)}
                          <span className="capitalize">{voucher.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}`)}
                            className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-[#E84545] hover:text-white transition-all group-hover:border border-[#E84545]"
                            title="View voucher"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {voucher.status === 'draft' && (
                            <>
                              <button
                                onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}/edit`)}
                                className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-[#E84545] hover:text-white transition-all group-hover:border border-[#E84545]"
                                title="Edit voucher"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteVoucher(voucher._id, voucher.voucherNumber)}
                                className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-[#E84545] hover:text-white transition-all group-hover:border border-[#E84545]"
                                title="Delete voucher"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Filters & Sort</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Voucher Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="receipt">Receipt</option>
                  <option value="journal">Journal</option>
                  <option value="contra">Contra</option>
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
                  <option value="draft">Draft</option>
                  <option value="posted">Posted</option>
                  <option value="approved">Approved</option>
                  <option value="void">Void</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortConfig.key}
                  onChange={(e) => handleSort(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="date">Date (Newest First)</option>
                  <option value="amount">Amount (High to Low)</option>
                  <option value="voucherNumber">Voucher # (A-Z)</option>
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
                  Clear All
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
                  router.push('/autocityPro/vouchers/payment');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center gap-3 active:scale-95"
              >
                <div className="p-2 bg-red-900/20 border border-red-800/50 rounded-lg">
                  <DollarSign className="h-4 w-4 text-red-400" />
                </div>
                <span>Create Payment</span>
              </button>
              <button
                onClick={() => {
                  router.push('/autocityPro/vouchers/receipt');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center gap-3 active:scale-95"
              >
                <div className="p-2 bg-green-900/20 border border-green-800/50 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <span>Create Receipt</span>
              </button>
              <button
                onClick={() => {
                  router.push('/autocityPro/vouchers/journal');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center gap-3 active:scale-95"
              >
                <div className="p-2 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-blue-400" />
                </div>
                <span>Create Journal</span>
              </button>
              <button
                onClick={() => {
                  router.push('/autocityPro/vouchers/contra');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center gap-3 active:scale-95"
              >
                <div className="p-2 bg-purple-900/20 border border-purple-800/50 rounded-lg">
                  <ArrowLeftRight className="h-4 w-4 text-purple-400" />
                </div>
                <span>Create Contra</span>
              </button>
              <button
                onClick={downloadVouchersCSV}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchVouchers();
                  setShowMobileMenu(false);
                  toast.success('Vouchers refreshed');
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