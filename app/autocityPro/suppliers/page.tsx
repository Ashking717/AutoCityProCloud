'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Truck, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Phone, 
  Mail,
  ChevronLeft,
  MoreVertical,
  MapPin,
  CreditCard,
  FileText,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    creditLimit: 0,
    paymentTerms: '',
  });
  
  useEffect(() => {
    fetchUser();
    fetchSuppliers();
    
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
  
  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };
  
  const generateSupplierCode = (name: string) => {
    const code = name.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
    const timestamp = Date.now().toString().slice(-4);
    return `SUP-${code}${timestamp}`;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const supplierData = {
      ...formData,
      code: formData.code || generateSupplierCode(formData.name),
    };
    
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier._id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(supplierData),
      });
      
      if (res.ok) {
        toast.success(editingSupplier ? 'Supplier updated!' : 'Supplier created!');
        setShowAddModal(false);
        setEditingSupplier(null);
        setFormData({
          code: '',
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          taxNumber: '',
          creditLimit: 0,
          paymentTerms: '',
        });
        fetchSuppliers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save supplier');
      }
    } catch (error) {
      toast.error('Suppliers API not implemented yet');
    }
  };
  
  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      taxNumber: supplier.taxNumber || '',
      creditLimit: supplier.creditLimit || 0,
      paymentTerms: supplier.paymentTerms || '',
    });
    setShowAddModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast.success('Supplier deleted!');
        fetchSuppliers();
      } else {
        toast.error('Failed to delete supplier');
      }
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const filteredSuppliers = suppliers.filter(sup =>
    sup.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sup.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sup.phone?.includes(searchTerm)
  );
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{filteredSuppliers.length}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">Suppliers</span>
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
                  <h1 className="text-xl font-bold text-white">Suppliers</h1>
                  <p className="text-xs text-white/60">{filteredSuppliers.length} suppliers</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setFormData({
                    code: '',
                    name: '',
                    contactPerson: '',
                    phone: '',
                    email: '',
                    address: '',
                    taxNumber: '',
                    creditLimit: 0,
                    paymentTerms: '',
                  });
                  setShowAddModal(true);
                }}
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
                placeholder="Search suppliers..."
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
                  <Truck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Suppliers</h1>
                  <p className="text-white/80 mt-1">{filteredSuppliers.length} suppliers</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setFormData({
                    code: '',
                    name: '',
                    contactPerson: '',
                    phone: '',
                    email: '',
                    address: '',
                    taxNumber: '',
                    creditLimit: 0,
                    paymentTerms: '',
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add Supplier</span>
              </button>
            </div>

            {/* Desktop Search */}
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[200px] md:pt-6 pb-6">
          {/* Suppliers Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
              <p className="text-slate-300">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 text-lg mb-4">No suppliers found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:shadow-lg hover:shadow-[#E84545]/20 transition-all"
              >
                Add Your First Supplier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier._id} 
                  className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6 hover:border-[#E84545]/30 hover:shadow-xl hover:shadow-[#E84545]/5 transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-bold text-white truncate">{supplier.name}</h3>
                      <p className="text-xs text-slate-500">{supplier.code}</p>
                    </div>
                    <span className="px-2 md:px-3 py-1 text-xs font-semibold rounded-lg bg-green-400/10 text-green-400 border border-green-400/20">
                      Active
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {supplier.contactPerson && (
                      <div className="flex items-center text-xs md:text-sm text-slate-300">
                        <Building className="h-3 w-3 md:h-4 md:w-4 mr-2 text-[#E84545] flex-shrink-0" />
                        <span className="truncate">{supplier.contactPerson}</span>
                      </div>
                    )}
                    <div className="flex items-center text-xs md:text-sm text-slate-300">
                      <Phone className="h-3 w-3 md:h-4 md:w-4 mr-2 text-[#E84545] flex-shrink-0" />
                      <span className="truncate">{supplier.phone}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center text-xs md:text-sm text-slate-300">
                        <Mail className="h-3 w-3 md:h-4 md:w-4 mr-2 text-blue-400 flex-shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-400/10 text-blue-400 rounded-lg hover:bg-blue-400/20 border border-blue-400/20 transition-all text-xs md:text-sm font-semibold active:scale-95"
                    >
                      <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(supplier._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-400/10 text-red-400 rounded-lg hover:bg-red-400/20 border border-red-400/20 transition-all text-xs md:text-sm font-semibold active:scale-95"
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>
      
      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 sticky top-0 bg-[#0A0A0A] z-10">
              <h2 className="text-xl font-bold text-white">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Supplier Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                    placeholder="Auto-generated"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Supplier Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                    placeholder="Supplier name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                    placeholder="Contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                  placeholder="Business address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tax Number</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                    placeholder="Tax/VAT number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-white/40"
                  placeholder="e.g., Net 30"
                />
              </div>
              
              <div className="flex flex-col md:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-white/10 text-slate-300 rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:shadow-lg hover:shadow-[#E84545]/20 transition-all"
                >
                  {editingSupplier ? 'Update' : 'Create'} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}