'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Search, Plus, Edit, Trash2, X, FolderOpen, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function CategoriesPage() {
  const isDark = useTimeBasedTheme();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:            isDark ? '#0f172a'                                             : '#f3f4f6',
    headerBgFrom:      isDark ? '#4f46e5'                                             : '#eef2ff',
    headerBgTo:        isDark ? '#7c3aed'                                             : '#ede9fe',
    headerTitle:       isDark ? '#ffffff'                                             : '#3730a3',
    headerSub:         isDark ? 'rgba(199,210,254,0.90)'                              : '#4338ca',
    headerBtnBg:       isDark ? '#ffffff'                                             : '#1e1b4b',
    headerBtnText:     isDark ? '#1e293b'                                             : '#ffffff',
    headerBtnHover:    isDark ? '#e2e8f0'                                             : '#312e81',
    badgeBg:           isDark ? 'rgba(0,0,0,0.25)'                                   : 'rgba(255,255,255,0.60)',
    badgeBorder:       isDark ? 'rgba(255,255,255,0.15)'                              : 'rgba(67,56,202,0.20)',
    badgeText:         isDark ? 'rgba(199,210,254,0.80)'                              : '#4338ca',
    contentBg:         isDark ? '#1e293b'                                             : '#ffffff',
    contentBorder:     isDark ? '#334155'                                             : 'rgba(0,0,0,0.08)',
    searchBg:          isDark ? '#0f172a'                                             : '#f9fafb',
    searchBorder:      isDark ? '#334155'                                             : 'rgba(0,0,0,0.10)',
    searchText:        isDark ? '#ffffff'                                             : '#111827',
    searchPH:          isDark ? '#64748b'                                             : '#9ca3af',
    cardBg:            isDark ? '#0f172a'                                             : '#ffffff',
    cardBorder:        isDark ? '#334155'                                             : 'rgba(0,0,0,0.08)',
    cardHoverBorder:   isDark ? '#6d28d9'                                             : 'rgba(109,40,217,0.30)',
    cardTitle:         isDark ? '#f1f5f9'                                             : '#111827',
    cardDesc:          isDark ? '#94a3b8'                                             : '#6b7280',
    cardMeta:          isDark ? '#64748b'                                             : '#9ca3af',
    cardDivider:       isDark ? '#334155'                                             : 'rgba(0,0,0,0.06)',
    cardIconBg:        isDark ? 'rgba(139,92,246,0.20)'                               : 'rgba(139,92,246,0.10)',
    cardIconBorder:    isDark ? 'rgba(139,92,246,0.40)'                               : 'rgba(139,92,246,0.20)',
    emptyBg:           isDark ? '#0f172a'                                             : '#ffffff',
    emptyBorder:       isDark ? '#334155'                                             : 'rgba(0,0,0,0.08)',
    emptyIcon:         isDark ? '#334155'                                             : '#d1d5db',
    emptyText:         isDark ? '#94a3b8'                                             : '#6b7280',
    modalBg:           isDark ? '#1e293b'                                             : '#ffffff',
    modalBorder:       isDark ? '#334155'                                             : 'rgba(0,0,0,0.10)',
    modalHdrBorder:    isDark ? '#334155'                                             : 'rgba(0,0,0,0.08)',
    modalTitle:        isDark ? '#f1f5f9'                                             : '#111827',
    modalLabel:        isDark ? '#d1d5db'                                             : '#374151',
    modalCloseText:    isDark ? '#94a3b8'                                             : '#6b7280',
    modalInputBg:      isDark ? '#0f172a'                                             : '#f9fafb',
    modalInputBorder:  isDark ? '#334155'                                             : 'rgba(0,0,0,0.10)',
    modalInputText:    isDark ? '#f1f5f9'                                             : '#111827',
    modalFtrBorder:    isDark ? '#334155'                                             : 'rgba(0,0,0,0.06)',
    modalCancelBorder: isDark ? '#475569'                                             : 'rgba(0,0,0,0.12)',
    modalCancelText:   isDark ? '#d1d5db'                                             : '#374151',
    modalCancelHover:  isDark ? '#334155'                                             : 'rgba(0,0,0,0.05)',
    loadingText:       isDark ? '#94a3b8'                                             : '#6b7280',
  };

  useEffect(() => { fetchUser(); fetchCategories(); }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (res.ok) setCategories((await res.json()).categories || []);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Category name is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success('Category added!'); setShowAddModal(false);
        setFormData({ name: '', description: '' }); fetchCategories();
      } else { toast.error((await res.json()).error || 'Failed to add category'); }
    } catch { toast.error('Failed to add category'); } finally { setSubmitting(false); }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Category name is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${editingCategory._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success('Category updated!'); setShowEditModal(false);
        setEditingCategory(null); setFormData({ name: '', description: '' }); fetchCategories();
      } else { toast.error((await res.json()).error || 'Failed to update category'); }
    } catch { toast.error('Failed to update category'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast.success('Category deleted!'); fetchCategories(); }
      else { toast.error((await res.json()).error || 'Failed to delete category'); }
    } catch { toast.error('Failed to delete category'); }
  };

  const filteredCategories = categories.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const modalInputStyle = {
    background: th.modalInputBg,
    border: `1px solid ${th.modalInputBorder}`,
    color: th.modalInputText,
  };

  // Shared modal shell
  const Modal = ({ title, onSubmit, onClose, submitLabel }: {
    title: string; onSubmit: (e: React.FormEvent) => void;
    onClose: () => void; submitLabel: string;
  }) => (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.70)' }}>
      <div className="rounded-xl shadow-2xl max-w-md w-full transition-colors duration-500"
        style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
        <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: `1px solid ${th.modalHdrBorder}` }}>
          <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>{title}</h2>
          <button onClick={onClose} className="transition-colors" style={{ color: th.modalCloseText }}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>
              Category Name <span className="text-red-400">*</span>
            </label>
            <input type="text" required value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Vehicles, Parts, Accessories"
              className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              style={modalInputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Description</label>
            <textarea value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description" rows={3}
              className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
              style={modalInputStyle}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4" style={{ borderTop: `1px solid ${th.modalFtrBorder}` }}>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}
              onMouseEnter={e => (e.currentTarget.style.background = th.modalCancelHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? (submitLabel.startsWith('Add') ? 'Adding...' : 'Updating...') : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgTo})` }}>
          <div className="p-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Categories</h1>
                  
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>{filteredCategories.length} categories found</p>
              </div>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-md"
                style={{ background: th.headerBtnBg, color: th.headerBtnText }}
                onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                <Plus className="h-5 w-5" /><span>Add Category</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="p-6 transition-colors duration-500" style={{ background: th.contentBg, borderBottom: `1px solid ${th.contentBorder}`, minHeight: 'calc(100vh - 140px)' }}>

          {/* Search */}
          <div className="mb-6 relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.searchPH }} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-500"
              style={{ background: th.searchBg, border: `1px solid ${th.searchBorder}`, color: th.searchText }}
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p style={{ color: th.loadingText }}>Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-xl p-12 text-center transition-colors duration-500"
              style={{ background: th.emptyBg, border: `1px solid ${th.emptyBorder}` }}>
              <FolderOpen className="h-12 w-12 mx-auto mb-4" style={{ color: th.emptyIcon }} />
              <p className="mb-4" style={{ color: th.emptyText }}>No categories found</p>
              <button onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                <Plus className="h-5 w-5" /><span>Add Your First Category</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map(category => (
                <div key={category._id}
                  className="rounded-xl p-6 transition-all duration-200"
                  style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg transition-colors duration-500"
                        style={{ background: th.cardIconBg, border: `1px solid ${th.cardIconBorder}` }}>
                        <FolderOpen className="h-6 w-6 text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold" style={{ color: th.cardTitle }}>{category.name}</h3>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-sm mb-4" style={{ color: th.cardDesc }}>{category.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${th.cardDivider}` }}>
                    <span className="text-sm" style={{ color: th.cardMeta }}>{category.productCount || 0} products</span>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(category)}
                        className="p-2 rounded-lg transition-colors text-purple-400 hover:bg-purple-900/30 hover:text-purple-300"
                        title="Edit category">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(category._id, category.name)}
                        className="p-2 rounded-lg transition-colors text-red-400 hover:bg-red-900/30 hover:text-red-300"
                        title="Delete category">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal  && <Modal title="Add New Category" onSubmit={handleSubmit}  onClose={() => setShowAddModal(false)}  submitLabel="Add Category"    />}
      {showEditModal && <Modal title="Edit Category"     onSubmit={handleUpdate} onClose={() => setShowEditModal(false)} submitLabel="Update Category" />}
    </MainLayout>
  );
}