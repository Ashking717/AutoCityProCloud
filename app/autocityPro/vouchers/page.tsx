'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Search, Plus, Eye, Edit, Trash2, FileText, DollarSign, BookOpen, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VouchersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
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
      case 'payment': return <DollarSign className="h-5 w-5 text-red-600" />;
      case 'receipt': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'journal': return <BookOpen className="h-5 w-5 text-blue-600" />;
      case 'contra': return <ArrowLeftRight className="h-5 w-5 text-purple-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'posted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'void': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredVouchers = vouchers.filter(v =>
    v.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vouchers</h1>
            <p className="text-gray-600 mt-1">{filteredVouchers.length} vouchers found</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {voucherTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => router.push(type.href)}
              className={`p-6 bg-white rounded-lg shadow hover:shadow-md transition border-l-4 border-${type.color}-500`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{type.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">Create new</p>
                </div>
                <type.icon className={`h-8 w-8 text-${type.color}-600`} />
              </div>
            </button>
          ))}
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vouchers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">All Types</option>
              <option value="payment">Payment</option>
              <option value="receipt">Receipt</option>
              <option value="journal">Journal</option>
              <option value="contra">Contra</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="approved">Approved</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
        
        {/* Vouchers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading vouchers...
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No vouchers found</p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{voucher.voucherNumber}</p>
                      {voucher.referenceNumber && (
                        <p className="text-xs text-gray-500">Ref: {voucher.referenceNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getVoucherTypeIcon(voucher.voucherType)}
                        <span className="ml-2 text-sm capitalize">{voucher.voucherType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {new Date(voucher.date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 line-clamp-2">{voucher.narration}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900">
                        QAR {voucher.totalDebit.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(voucher.status)}`}>
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toast.success('View voucher coming soon!')}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {voucher.status === 'draft' && (
                        <>
                          <button
                            onClick={() => toast.success('Edit coming soon!')}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toast.error('Delete coming soon!')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
