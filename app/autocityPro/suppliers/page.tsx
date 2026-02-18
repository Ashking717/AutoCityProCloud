'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Truck, Search, Plus, Edit2, Trash2, X, Phone, Mail,
  ChevronLeft, MapPin, Building, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function SuppliersPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [formData, setFormData] = useState({
    code: '', name: '', contactPerson: '', phone: '', email: '',
    address: '', taxNumber: '', creditLimit: 0, paymentTerms: '',
  });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:              isDark ? '#050505'                                            : '#f3f4f6',
    // Dynamic island
    islandBg:            isDark ? '#000000'                                            : '#ffffff',
    islandBorder:        isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.10)',
    islandText:          isDark ? '#ffffff'                                            : '#111827',
    islandDivider:       isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    // Mobile header
    mobileHdrBg:         isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'   : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHdrBorder:     isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.08)',
    mobileHdrTitle:      isDark ? '#ffffff'                                            : '#111827',
    mobileHdrSub:        isDark ? 'rgba(255,255,255,0.60)'                             : '#6b7280',
    mobileBtnBg:         isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    mobileBtnText:       isDark ? 'rgba(255,255,255,0.80)'                             : '#374151',
    mobileSearchBg:      isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.04)',
    mobileSearchBorder:  isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.10)',
    mobileSearchText:    isDark ? '#ffffff'                                            : '#111827',
    mobileSearchPH:      isDark ? 'rgba(255,255,255,0.40)'                             : '#9ca3af',
    // Desktop header
    desktopHdrBgFrom:    isDark ? '#932222'                                            : '#fef2f2',
    desktopHdrBgVia:     isDark ? '#411010'                                            : '#fee2e2',
    desktopHdrBgTo:      isDark ? '#a20c0c'                                            : '#fecaca',
    desktopHdrBorder:    isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.06)',
    desktopHdrTitle:     isDark ? '#ffffff'                                            : '#7f1d1d',
    desktopHdrSub:       isDark ? 'rgba(255,255,255,0.80)'                             : '#991b1b',
    desktopIconBg:       isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    desktopIconBorder:   isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    desktopSearchBg:     isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(255,255,255,0.80)',
    desktopSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    desktopSearchText:   isDark ? '#ffffff'                                            : '#111827',
    desktopSearchPH:     isDark ? 'rgba(255,255,255,0.60)'                             : '#9ca3af',
    desktopAddBtnBg:     isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.06)',
    desktopAddBtnBorder: isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    desktopAddBtnText:   isDark ? '#ffffff'                                            : '#374151',
    badgeBg:             isDark ? 'rgba(0,0,0,0.30)'                                  : 'rgba(255,255,255,0.60)',
    badgeBorder:         isDark ? 'rgba(255,255,255,0.15)'                             : 'rgba(127,29,29,0.20)',
    badgeText:           isDark ? 'rgba(255,255,255,0.70)'                             : '#7f1d1d',
    // Supplier cards
    cardBgFrom:          isDark ? '#0A0A0A'                                            : '#ffffff',
    cardBgTo:            isDark ? '#050505'                                            : '#f9fafb',
    cardBorder:          isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    cardHover:           isDark ? 'rgba(232,69,69,0.30)'                               : 'rgba(232,69,69,0.25)',
    cardTitle:           isDark ? '#ffffff'                                            : '#111827',
    cardCode:            isDark ? '#64748b'                                            : '#9ca3af',
    cardBody:            isDark ? '#d1d5db'                                            : '#374151',
    cardDivider:         isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.06)',
    // Empty / loading
    emptyIcon:           isDark ? '#334155'                                            : '#d1d5db',
    emptyText:           isDark ? '#94a3b8'                                            : '#6b7280',
    loadingText:         isDark ? '#d1d5db'                                            : '#374151',
    // Modal
    modalBg:             isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'            : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    modalBorder:         isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.10)',
    modalHdrBg:          isDark ? '#0A0A0A'                                            : '#f9fafb',
    modalHdrBorder:      isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    modalTitle:          isDark ? '#ffffff'                                            : '#111827',
    modalLabel:          isDark ? '#d1d5db'                                            : '#374151',
    modalInputBg:        isDark ? 'rgba(255,255,255,0.05)'                             : '#ffffff',
    modalInputBorder:    isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.10)',
    modalInputText:      isDark ? '#ffffff'                                            : '#111827',
    modalInputPH:        isDark ? 'rgba(255,255,255,0.40)'                             : '#9ca3af',
    modalCancelBorder:   isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.10)',
    modalCancelText:     isDark ? '#d1d5db'                                            : '#374151',
    modalCancelHover:    isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.04)',
    modalCloseBg:        isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    modalCloseText:      isDark ? '#94a3b8'                                            : '#6b7280',
  };

  useEffect(() => {
    fetchUser(); fetchSuppliers();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchUser = async () => {
    try { const res = await fetch('/api/auth/me', { credentials: 'include' }); if (res.ok) setUser((await res.json()).user); } catch {}
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers', { credentials: 'include' });
      setSuppliers(res.ok ? ((await res.json()).suppliers || []) : []);
    } catch { setSuppliers([]); } finally { setLoading(false); }
  };

  const generateSupplierCode = (name: string) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    return `SUP-${code}${Date.now().toString().slice(-4)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supplierData = { ...formData, code: formData.code || generateSupplierCode(formData.name) };
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier._id}` : '/api/suppliers';
      const res = await fetch(url, { method: editingSupplier ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(supplierData) });
      if (res.ok) {
        toast.success(editingSupplier ? 'Supplier updated!' : 'Supplier created!');
        setShowAddModal(false); setEditingSupplier(null);
        setFormData({ code:'', name:'', contactPerson:'', phone:'', email:'', address:'', taxNumber:'', creditLimit:0, paymentTerms:'' });
        fetchSuppliers();
      } else { toast.error((await res.json()).error || 'Failed to save supplier'); }
    } catch { toast.error('Failed to save supplier'); }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({ code:supplier.code, name:supplier.name, contactPerson:supplier.contactPerson||'', phone:supplier.phone, email:supplier.email||'', address:supplier.address||'', taxNumber:supplier.taxNumber||'', creditLimit:supplier.creditLimit||0, paymentTerms:supplier.paymentTerms||'' });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast.success('Supplier deleted!'); fetchSuppliers(); }
      else { toast.error('Failed to delete supplier'); }
    } catch { toast.error('Failed to delete supplier'); }
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/autocityPro/login'; };

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  const resetForm = () => { setEditingSupplier(null); setFormData({ code:'', name:'', contactPerson:'', phone:'', email:'', address:'', taxNumber:'', creditLimit:0, paymentTerms:'' }); setShowAddModal(true); };

  const modalInputCls = "w-full px-3 py-2 rounded-xl focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500";
  const modalInputStyle = { background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-3 w-3 text-[#E84545]" />
                  <span className="text-xs font-semibold" style={{ color: th.islandText }}>{filteredSuppliers.length}</span>
                </div>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                <span className="text-xs font-medium" style={{ color: th.islandText }}>Suppliers</span>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold" style={{ color: th.mobileHdrTitle }}>Suppliers</h1>
                  </div>
                  <p className="text-xs" style={{ color: th.mobileHdrSub }}>{filteredSuppliers.length} suppliers</p>
                </div>
              </div>
              <button onClick={resetForm}
                className="p-2 rounded-xl bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white hover:shadow-lg hover:shadow-[#E84545]/20 active:scale-95 transition-all">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: th.mobileSearchPH }} />
              <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50 transition-colors duration-500"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-3 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.desktopHdrBgFrom},${th.desktopHdrBgVia},${th.desktopHdrBgTo})`, borderColor: th.desktopHdrBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl backdrop-blur-sm" style={{ background: th.desktopIconBg, border: `1px solid ${th.desktopIconBorder}` }}>
                  <Truck className="h-8 w-8" style={{ color: th.desktopHdrTitle }} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold" style={{ color: th.desktopHdrTitle }}>Suppliers</h1>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
                      {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="mt-1" style={{ color: th.desktopHdrSub }}>{filteredSuppliers.length} suppliers</p>
                </div>
              </div>
              <button onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                style={{ background: th.desktopAddBtnBg, border: `1px solid ${th.desktopAddBtnBorder}`, color: th.desktopAddBtnText }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.20)')}
                onMouseLeave={e => (e.currentTarget.style.background = th.desktopAddBtnBg)}>
                <Plus className="h-4 w-4" /><span>Add Supplier</span>
              </button>
            </div>
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: th.desktopSearchPH }} />
                <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 backdrop-blur-sm transition-colors duration-500"
                  style={{ background: th.desktopSearchBg, border: `1px solid ${th.desktopSearchBorder}`, color: th.desktopSearchText }} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[200px] md:pt-6 pb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4" />
              <p style={{ color: th.loadingText }}>Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
              <p className="text-lg mb-4" style={{ color: th.emptyText }}>No suppliers found</p>
              <button onClick={resetForm}
                className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:shadow-lg hover:shadow-[#E84545]/20 transition-all">
                Add Your First Supplier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredSuppliers.map(supplier => (
                <div key={supplier._id}
                  className="rounded-2xl p-4 md:p-6 transition-all active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg,${th.cardBgFrom},${th.cardBgTo})`, border: `1px solid ${th.cardBorder}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHover)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-bold truncate" style={{ color: th.cardTitle }}>{supplier.name}</h3>
                      <p className="text-xs" style={{ color: th.cardCode }}>{supplier.code}</p>
                    </div>
                    <span className="px-2 md:px-3 py-1 text-xs font-semibold rounded-lg bg-green-400/10 text-green-400 border border-green-400/20 ml-2">Active</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {supplier.contactPerson && (
                      <div className="flex items-center text-xs md:text-sm" style={{ color: th.cardBody }}>
                        <Building className="h-3 w-3 md:h-4 md:w-4 mr-2 text-[#E84545] flex-shrink-0" />
                        <span className="truncate">{supplier.contactPerson}</span>
                      </div>
                    )}
                    <div className="flex items-center text-xs md:text-sm" style={{ color: th.cardBody }}>
                      <Phone className="h-3 w-3 md:h-4 md:w-4 mr-2 text-[#E84545] flex-shrink-0" />
                      <span className="truncate">{supplier.phone}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center text-xs md:text-sm" style={{ color: th.cardBody }}>
                        <Mail className="h-3 w-3 md:h-4 md:w-4 mr-2 text-blue-400 flex-shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4" style={{ borderTop: `1px solid ${th.cardDivider}` }}>
                    <button onClick={() => handleEdit(supplier)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs md:text-sm font-semibold active:scale-95 bg-blue-400/10 text-blue-400 border-blue-400/20 hover:bg-blue-400/20">
                      <Edit2 className="h-3 w-3 md:h-4 md:w-4" /><span>Edit</span>
                    </button>
                    <button onClick={() => handleDelete(supplier._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs md:text-sm font-semibold active:scale-95 bg-red-400/10 text-red-400 border-red-400/20 hover:bg-red-400/20">
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" /><span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="md:hidden h-24" />
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-500"
            style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-6 py-4 sticky top-0 z-10"
              style={{ background: th.modalHdrBg, borderBottom: `1px solid ${th.modalHdrBorder}` }}>
              <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label:'Supplier Code',   key:'code',          type:'text',   placeholder:'Auto-generated', required:false },
                  { label:'Supplier Name',   key:'name',          type:'text',   placeholder:'Supplier name',  required:true  },
                  { label:'Contact Person',  key:'contactPerson', type:'text',   placeholder:'Contact person', required:false },
                  { label:'Phone',           key:'phone',         type:'text',   placeholder:'Phone number',   required:true  },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </label>
                    <input type={f.type} value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                      required={f.required} placeholder={f.placeholder} className={modalInputCls} style={modalInputStyle} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com" className={modalInputCls} style={modalInputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Address</label>
                <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  rows={2} placeholder="Business address"
                  className={`${modalInputCls} resize-none`} style={modalInputStyle} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Tax Number</label>
                  <input type="text" value={formData.taxNumber} onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                    placeholder="Tax/VAT number" className={modalInputCls} style={modalInputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Credit Limit</label>
                  <input type="number" value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value)||0 })}
                    step="0.01" placeholder="0.00" className={modalInputCls} style={modalInputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Payment Terms</label>
                <input type="text" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g., Net 30" className={modalInputCls} style={modalInputStyle} />
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl transition-all"
                  style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}
                  onMouseEnter={e => (e.currentTarget.style.background = th.modalCancelHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:shadow-lg hover:shadow-[#E84545]/20 transition-all">
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