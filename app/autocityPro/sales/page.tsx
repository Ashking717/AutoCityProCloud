'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Plus, Search, Eye, DollarSign, Calendar, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchUser();
    fetchSales();
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
  
  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch (error) {
      console.error('Failed to fetch sales');
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const filteredSales = sales.filter(s =>
    s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      COMPLETED: 'bg-green-600/20 text-green-400 border-green-600/30',
      DRAFT: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
      CANCELLED: 'bg-red-600/20 text-red-400 border-red-600/30',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusMap[status] || 'bg-blue-600/20 text-blue-400 border-blue-600/30'}`}>
        {status}
      </span>
    );
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Sales</h1>
            <p className="text-slate-400 mt-1">{filteredSales.length} total sales</p>
          </div>
          <button
            onClick={() => router.push('/autocityPro/sales/new')}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>New Sale</span>
          </button>
        </div>
        
        {/* Search */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number or customer..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-white placeholder-slate-400"
            />
          </div>
        </div>
        
        {/* Sales Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 text-lg">No sales found</p>
              <p className="text-slate-500 text-sm mt-2">Create your first sale to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Invoice #</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Date</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Customer</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredSales.map((sale) => (
                    <tr key={sale._id} className="bg-slate-800 hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-purple-400">
                          {sale.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-300">
                          {new Date(sale.saleDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-300">{sale.customerName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-slate-300">{sale.items?.length || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-white">
                          QAR {sale.grandTotal?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-green-400">
                          QAR {sale.amountPaid?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${sale.balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          QAR {sale.balanceDue?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(sale.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toast.success('View details coming soon!')}
                          className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}