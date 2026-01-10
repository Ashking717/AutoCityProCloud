'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  User, 
  ChevronLeft,
  MoreVertical,
  X,
  MapPin,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
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
    
    if (typeof address === 'string') {
      return address || 'N/A';
    }
    
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
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{filteredCustomers.length}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">Customers</span>
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
                  <h1 className="text-xl font-bold text-white">Customers</h1>
                  <p className="text-xs text-white/60">{filteredCustomers.length} customers</p>
                </div>
              </div>
              <button
                onClick={() => toast.success('Add Customer coming soon!')}
                className="p-2 rounded-xl bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white hover:shadow-lg hover:shadow-[#E84545]/20 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-3 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Customers</h1>
                  <p className="text-white/80 mt-1">{filteredCustomers.length} customers found</p>
                </div>
              </div>
              
              <button
                onClick={() => toast.success('Add Customer coming soon!')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add Customer</span>
              </button>
            </div>

            {/* Desktop Search */}
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[200px] md:pt-6 pb-6">
          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <User className="h-5 w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Customers</p>
              <p className="text-xl font-bold text-white">{customers.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-400/10 rounded-xl">
                  <FileText className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Active</p>
              <p className="text-xl font-bold text-green-400">{customers.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-400/10 rounded-xl">
                  <Search className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Search Results</p>
              <p className="text-xl font-bold text-white">{filteredCustomers.length}</p>
            </div>
          </div>

          {/* Customers List */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
                <p className="text-slate-300">Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <User className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg mb-2">No customers found</p>
                <p className="text-slate-500 text-sm">Try adjusting your search</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[#050505]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Address</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-white">{customer.name}</p>
                            {customer.code && (
                              <p className="text-xs text-slate-500">Code: {customer.code}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              {customer.phone && (
                                <div className="flex items-center text-sm text-slate-300">
                                  <Phone className="h-4 w-4 mr-2 text-[#E84545]" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center text-sm text-slate-300">
                                  <Mail className="h-4 w-4 mr-2 text-blue-400" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start text-sm text-slate-400">
                              <MapPin className="h-4 w-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{formatAddress(customer.address)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => toast.success('Edit coming soon!')}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-all"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toast.error('Delete coming soon!')}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-white/10">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer._id}
                      className="p-4 hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{customer.name}</h3>
                          {customer.code && (
                            <p className="text-xs text-slate-500">Code: {customer.code}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setShowMobileMenu(true)}
                          className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {customer.phone && (
                          <div className="flex items-center text-xs text-slate-300">
                            <Phone className="h-3 w-3 mr-2 text-[#E84545]" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center text-xs text-slate-300">
                            <Mail className="h-3 w-3 mr-2 text-blue-400" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {formatAddress(customer.address) !== 'N/A' && (
                          <div className="flex items-start text-xs text-slate-400">
                            <MapPin className="h-3 w-3 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{formatAddress(customer.address)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                        <button
                          onClick={() => toast.success('Edit coming soon!')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-400/10 text-blue-400 rounded-lg border border-blue-400/20 text-xs font-semibold active:scale-95 transition-all"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => toast.error('Delete coming soon!')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-400/10 text-red-400 rounded-lg border border-red-400/20 text-xs font-semibold active:scale-95 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>
    </MainLayout>
  );
}