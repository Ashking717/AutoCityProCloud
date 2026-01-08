'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Search, Plus, Eye, Edit, Trash2, FileText, DollarSign, BookOpen, ArrowLeftRight, Filter } from 'lucide-react';
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
  
  useEffect(() => {
    fetchUser();
    fetchVouchers();
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
    } finally {
      setLoading(false);
    }
  };
  
  const getVoucherTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-5 w-5 text-red-400" />;
      case 'receipt': return <DollarSign className="h-5 w-5 text-green-400" />;
      case 'journal': return <BookOpen className="h-5 w-5 text-blue-400" />;
      case 'contra': return <ArrowLeftRight className="h-5 w-5 text-purple-400" />;
      default: return <FileText className="h-5 w-5 text-slate-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50';
      case 'posted': return 'bg-blue-900/30 text-blue-400 border border-blue-800/50';
      case 'approved': return 'bg-green-900/30 text-green-400 border border-green-800/50';
      case 'void': return 'bg-red-900/30 text-red-400 border border-red-800/50';
      default: return 'bg-slate-800/50 text-slate-400 border border-slate-700';
    }
  };
  
  const filteredVouchers = vouchers.filter(v =>
    v.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
  
  const voucherTypes = [
    { value: 'payment', label: 'Payment Voucher', icon: DollarSign, color: 'red', href: '/autocityPro/vouchers/payment' },
    { value: 'receipt', label: 'Receipt Voucher', icon: DollarSign, color: 'green', href: '/autocityPro/vouchers/receipt' },
    { value: 'journal', label: 'Journal Entry', icon: BookOpen, color: 'blue', href: '/autocityPro/vouchers/journal' },
    { value: 'contra', label: 'Contra Voucher', icon: ArrowLeftRight, color: 'purple', href: '/autocityPro/vouchers/contra' },
  ];
  
  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchTerm('');
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Vouchers</h1>
            <p className="text-purple-100 mt-1">
              {filteredVouchers.length} vouchers found
              {(filterType !== 'all' || filterStatus !== 'all') &&
                ` (filtered from ${vouchers.length})`}
            </p>
          </div>
          
          {/* Search and Filters in Header */}
          <div className="mt-6 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by voucher number, narration, or reference..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent text-white placeholder-purple-200"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border border-white/30 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-white/20 backdrop-blur-sm text-white"
                    : "hover:bg-white/10 text-white"
                }`}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {(filterType !== 'all' || filterStatus !== 'all') && (
                  <span className="ml-2 px-2 py-0.5 bg-white text-slate-800 text-xs rounded-full">
                    {
                      [
                        filterType !== 'all',
                        filterStatus !== 'all',
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>
            </div>
            
            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/20">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Voucher Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
                  >
                    <option value="all" className="text-slate-800">All Types</option>
                    <option value="payment" className="text-slate-800">Payment</option>
                    <option value="receipt" className="text-slate-800">Receipt</option>
                    <option value="journal" className="text-slate-800">Journal</option>
                    <option value="contra" className="text-slate-800">Contra</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
                  >
                    <option value="all" className="text-slate-800">All Status</option>
                    <option value="draft" className="text-slate-800">Draft</option>
                    <option value="posted" className="text-slate-800">Posted</option>
                    <option value="approved" className="text-slate-800">Approved</option>
                    <option value="void" className="text-slate-800">Void</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {voucherTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => router.push(type.href)}
              className={`p-6 bg-slate-900 rounded-lg border border-slate-700 hover:border-${type.color}-500 hover:shadow-lg hover:shadow-${type.color}-500/10 transition-all group`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-white">{type.label}</h3>
                  <p className="text-sm text-slate-400 mt-1">Create new</p>
                </div>
                <type.icon className={`h-8 w-8 text-${type.color}-400 group-hover:text-${type.color}-300`} />
              </div>
            </button>
          ))}
        </div>
        
        {/* Vouchers Table */}
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Voucher #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Narration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-purple-600"></div>
                    </div>
                    <p className="mt-2">Loading vouchers...</p>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                    <p>No vouchers found</p>
                    {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-100">{voucher.voucherNumber}</p>
                      {voucher.referenceNumber && (
                        <p className="text-xs text-slate-500">Ref: {voucher.referenceNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getVoucherTypeIcon(voucher.voucherType)}
                        <span className="ml-2 text-sm capitalize text-slate-200">{voucher.voucherType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-200">
                        {new Date(voucher.date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-200 line-clamp-2">{voucher.narration}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-slate-100">
                        QAR {voucher.totalDebit?.toLocaleString() || '0'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(voucher.status)}`}>
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}`)}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 p-2 rounded-lg transition-colors"
                          title="View voucher"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {voucher.status === 'draft' && (
                          <>
                            <button
                              onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}/edit`)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 p-2 rounded-lg transition-colors"
                              title="Edit voucher"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(voucher._id, voucher.voucherNumber)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-colors"
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
    </MainLayout>
  );
}