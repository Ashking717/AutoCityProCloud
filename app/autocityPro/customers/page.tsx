'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Search, Plus, Edit, Trash2, Phone, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchUser();
    fetchCustomers();
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
    try {
      const res = await fetch('/api/customers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    
    // If address is a string
    if (typeof address === 'string') {
      return address || 'N/A';
    }
    
    // If address is an object
    const parts = [
      address.street,
      address.city,
      address.state,
      address.country,
      address.postalCode
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Customers</h1>
              <p className="text-purple-100 mt-1">{filteredCustomers.length} customers found</p>
            </div>
            <button
              onClick={() => toast.success('Add Customer feature coming in Phase 2!')}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span>Add Customer</span>
            </button>
          </div>
          
        </div>
      </div>
      <div className='p-6 bg-slate-900 border-b border-slate-700'>
                {/* Search */}
          <div className="bg-slate-800mt-6">
            <div className=" relative bg-slate-800">
              <Search className="absolute left-3 top-3 h-5 w-5 text-purple-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent text-white placeholder-purple-200"
              />
            </div>
          </div>

      
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen">
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <User className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                    <p>No customers found</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-100">{customer.name}</p>
                      {customer.code && (
                        <p className="text-xs text-slate-500">Code: {customer.code}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {customer.phone && (
                          <div className="flex items-center text-sm text-slate-300">
                            <Phone className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center text-sm text-slate-300">
                            <Mail className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-400">
                        {formatAddress(customer.address)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => toast.success('Edit feature coming in Phase 2!')}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 p-2 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toast.error('Delete feature coming in Phase 2!')}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                          title="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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