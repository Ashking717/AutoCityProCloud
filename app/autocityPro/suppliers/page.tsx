'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Truck, Search, Plus, Edit2, Trash2, X, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  
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
        // Suppliers API might not exist yet
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
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-orange-300" />
              <div>
                <h1 className="text-3xl font-bold text-white">Suppliers</h1>
                <p className="text-purple-100 mt-1">{filteredSuppliers.length} suppliers</p>
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
              className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span>Add Supplier</span>
            </button>
          </div>
          
          {/* Search
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-purple-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent text-white placeholder-purple-200"
              />
            </div>
          </div> */}
        </div>
      </div>
      <div className='p-6 bg-slate-900 border-b border-slate-700'>
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen">
        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-400 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Truck className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-4">No suppliers found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Add Your First Supplier
              </button>
            </div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <div 
                key={supplier._id} 
                className="bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 hover:shadow-lg hover:shadow-orange-500/5 transition-all p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{supplier.name}</h3>
                    <p className="text-sm text-slate-500">{supplier.code}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-900/30 text-orange-400 border border-orange-800/50">
                    Active
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {supplier.contactPerson && (
                    <p className="text-sm text-slate-400">
                      <strong className="text-slate-300">Contact:</strong> {supplier.contactPerson}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Phone className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    <span className="truncate">{supplier.phone}</span>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <Mail className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between space-x-2 pt-4 border-t border-slate-700">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-900/20 text-blue-400 rounded-lg hover:bg-blue-900/30 hover:text-blue-300 border border-blue-800/30 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(supplier._id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 hover:text-red-300 border border-red-800/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
      
      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Supplier Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="Auto-generated"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="Supplier name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="Contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                  placeholder="Business address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tax Number</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="Tax/VAT number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100"
                  placeholder="e.g., Net 30"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
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