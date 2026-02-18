'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  User, Mail, Building, Shield, Lock, Edit2, Save, X,
  Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ChevronLeft, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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

interface UserProfile {
  id: string; email: string; username: string; firstName: string;
  lastName: string; role: string; outletId: string | null;
  outletName: string | null; isActive: boolean; outletCode: string | null;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', username: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:           isDark ? '#050505'                                              : '#f3f4f6',
    // Mobile header
    mobileHdrBg:      isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'     : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHdrBorder:  isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.08)',
    mobileHdrTitle:   isDark ? '#ffffff'                                              : '#111827',
    mobileHdrSub:     isDark ? 'rgba(255,255,255,0.60)'                               : '#6b7280',
    mobileBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.05)',
    mobileBtnText:    isDark ? 'rgba(255,255,255,0.80)'                               : '#374151',
    // Desktop header
    desktopHdrBgFrom: isDark ? '#932222'                                              : '#fef2f2',
    desktopHdrBgVia:  isDark ? '#411010'                                              : '#fee2e2',
    desktopHdrBgTo:   isDark ? '#a20c0c'                                              : '#fecaca',
    desktopHdrBorder: isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.06)',
    desktopHdrTitle:  isDark ? '#ffffff'                                              : '#7f1d1d',
    desktopHdrSub:    isDark ? 'rgba(255,255,255,0.80)'                               : '#991b1b',
    // Theme badge
    badgeBg:          isDark ? 'rgba(0,0,0,0.30)'                                    : 'rgba(255,255,255,0.60)',
    badgeBorder:      isDark ? 'rgba(255,255,255,0.15)'                               : 'rgba(127,29,29,0.20)',
    badgeText:        isDark ? 'rgba(255,255,255,0.70)'                               : '#7f1d1d',
    // Cards
    cardBgFrom:       isDark ? '#0f172a'                                              : '#ffffff',
    cardBgTo:         isDark ? '#1e293b'                                              : '#f9fafb',
    cardBorder:       isDark ? '#334155'                                              : 'rgba(0,0,0,0.08)',
    cardTitle:        isDark ? '#ffffff'                                              : '#111827',
    cardSub:          isDark ? '#94a3b8'                                              : '#6b7280',
    // Info fields
    fieldBg:          isDark ? 'rgba(30,41,59,0.50)'                                  : 'rgba(0,0,0,0.03)',
    fieldBorder:      isDark ? '#334155'                                              : 'rgba(0,0,0,0.06)',
    fieldLabel:       isDark ? '#94a3b8'                                              : '#9ca3af',
    fieldValue:       isDark ? '#ffffff'                                              : '#111827',
    fieldDivider:     isDark ? '#334155'                                              : 'rgba(0,0,0,0.06)',
    // Edit inputs
    inputBg:          isDark ? '#1e293b'                                              : '#f9fafb',
    inputBorder:      isDark ? '#334155'                                              : 'rgba(0,0,0,0.10)',
    inputText:        isDark ? '#ffffff'                                              : '#111827',
    inputPH:          isDark ? '#64748b'                                              : '#9ca3af',
    // Cancel button
    cancelBg:         isDark ? '#1e293b'                                              : 'rgba(0,0,0,0.04)',
    cancelBorder:     isDark ? '#334155'                                              : 'rgba(0,0,0,0.10)',
    cancelText:       isDark ? '#ffffff'                                              : '#374151',
    cancelHover:      isDark ? '#334155'                                              : 'rgba(0,0,0,0.08)',
    // Section dividers
    divider:          isDark ? '#334155'                                              : 'rgba(0,0,0,0.06)',
    // Password modal
    modalBg:          isDark ? '#0f172a'                                              : '#ffffff',
    modalBorder:      isDark ? '#334155'                                              : 'rgba(0,0,0,0.10)',
    modalHdrBg:       isDark ? 'rgba(127,29,29,0.30)'                                 : '#fef2f2',
    modalHdrBorder:   isDark ? '#334155'                                              : 'rgba(0,0,0,0.06)',
    modalHdrTitle:    isDark ? '#ffffff'                                              : '#7f1d1d',
    modalLabel:       isDark ? '#d1d5db'                                              : '#374151',
    modalInputBg:     isDark ? '#1e293b'                                              : '#f9fafb',
    modalInputBorder: isDark ? '#334155'                                              : 'rgba(0,0,0,0.10)',
    modalInputText:   isDark ? '#ffffff'                                              : '#111827',
    modalToggleText:  isDark ? '#94a3b8'                                              : '#6b7280',
    modalReqBg:       isDark ? 'rgba(30,41,59,0.50)'                                  : 'rgba(0,0,0,0.03)',
    modalReqBorder:   isDark ? '#334155'                                              : 'rgba(0,0,0,0.06)',
    modalReqTitle:    isDark ? '#d1d5db'                                              : '#374151',
    modalReqText:     isDark ? '#94a3b8'                                              : '#6b7280',
    modalFtrBg:       isDark ? 'rgba(30,41,59,0.50)'                                  : 'rgba(0,0,0,0.02)',
    modalFtrBorder:   isDark ? '#334155'                                              : 'rgba(0,0,0,0.06)',
    modalCancelBg:    isDark ? '#1e293b'                                              : 'rgba(0,0,0,0.04)',
    modalCancelBorder:isDark ? '#334155'                                              : 'rgba(0,0,0,0.10)',
    modalCancelText:  isDark ? '#ffffff'                                              : '#374151',
    // Loading
    loadingText:      isDark ? '#d1d5db'                                              : '#374151',
  };

  useEffect(() => {
    fetchUserProfile();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEditForm({ firstName: data.user.firstName || '', lastName: data.user.lastName || '', username: data.user.username || '', email: data.user.email || '' });
      } else { toast.error('Failed to load profile'); }
    } catch { toast.error('Failed to load profile'); } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    if (!editForm.firstName.trim()) { toast.error('First name is required'); return; }
    if (!editForm.email.trim()) { toast.error('Email is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(editForm) });
      if (res.ok) { setUser((await res.json()).user); setEditMode(false); toast.success('Profile updated!'); }
      else { toast.error((await res.json()).error || 'Failed to update profile'); }
    } catch { toast.error('Failed to update profile'); } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) { toast.error('Current password is required'); return; }
    if (!passwordForm.newPassword)     { toast.error('New password is required'); return; }
    if (passwordForm.newPassword.length < 4) { toast.error('Password must be at least 4 characters'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) });
      if (res.ok) { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password changed!'); }
      else { toast.error((await res.json()).error || 'Failed to change password'); }
    } catch { toast.error('Failed to change password'); } finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setEditForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', username: user?.username || '', email: user?.email || '' });
    setEditMode(false);
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/autocityPro/login'; };

  const inputCls = "w-full px-3 py-2 md:px-4 md:py-2.5 text-sm rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent outline-none transition-colors duration-500";
  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };
  const modalInputCls = "w-full px-3 py-2 md:px-4 md:py-2.5 text-sm rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-12 transition-colors duration-500";
  const modalInputStyle = { background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText };

  const FieldCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all"
      style={{ background: th.fieldBg, border: `1px solid ${th.fieldBorder}` }}>
      <p className="text-xs mb-1" style={{ color: th.fieldLabel }}>{label}</p>
      {children}
    </div>
  );

  const SectionCard = ({ title, icon: Icon, iconColor = 'text-[#E84545]', children, action }: any) => (
    <div className="rounded-2xl p-4 md:p-6 shadow-xl transition-colors duration-500"
      style={{ background: `linear-gradient(135deg,${th.cardBgFrom},${th.cardBgTo})`, border: `1px solid ${th.cardBorder}` }}>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold flex items-center space-x-2" style={{ color: th.cardTitle }}>
          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} /><span>{title}</span>
        </h3>
        {action}
      </div>
      {children}
    </div>
  );

  if (loading) return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
        <div className="text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-[#E84545] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm md:text-base" style={{ color: th.loadingText }}>Loading profile...</p>
        </div>
      </div>
    </MainLayout>
  );

  if (!user) return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500" style={{ background: th.pageBg }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-4" />
          <p className="text-base md:text-lg" style={{ color: th.loadingText }}>Failed to load profile</p>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* ── Mobile Header ───────────────────────────────────────────── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold" style={{ color: th.mobileHdrTitle }}>My Profile</h1>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
                      {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: th.mobileHdrSub }}>@{user.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Desktop Header ──────────────────────────────────────────── */}
        <div className="hidden md:block border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.desktopHdrBgFrom},${th.desktopHdrBgVia},${th.desktopHdrBgTo})`, borderColor: th.desktopHdrBorder }}>
          <div className="px-8 py-12">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.desktopHdrTitle }}>My Profile</h1>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="mt-1" style={{ color: th.desktopHdrSub }}>Manage your account settings and preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">

              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl p-6 text-center shadow-xl active:scale-[0.98] transition-all"
                  style={{ background: `linear-gradient(135deg,${th.cardBgFrom},${th.cardBgTo})`, border: `1px solid ${th.cardBorder}` }}>
                  <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold mb-1" style={{ color: th.cardTitle }}>{user.firstName} {user.lastName}</h2>
                  <p className="text-sm mb-4" style={{ color: th.cardSub }}>@{user.username}</p>
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#E84545]/10 border border-[#E84545]/30 rounded-full mb-6">
                    <Shield className="w-4 h-4 text-[#E84545]" />
                    <span className="text-xs md:text-sm font-medium text-[#E84545] uppercase">{user.role}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span style={{ color: th.cardSub }}>Account Active</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">

                {/* Personal Info */}
                <SectionCard title="Personal Information" icon={User}
                  action={!editMode && (
                    <button onClick={() => setEditMode(true)}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:opacity-90 text-white rounded-lg flex items-center space-x-2 transition-all text-sm active:scale-95">
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
                    </button>
                  )}>
                  {editMode ? (
                    <div className="space-y-3 md:space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {[
                          { label:'First Name', key:'firstName', placeholder:'First name', required:true },
                          { label:'Last Name',  key:'lastName',  placeholder:'Last name'  },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs md:text-sm font-medium mb-2" style={{ color: th.modalLabel }}>
                              {f.label} {f.required && <span className="text-red-400">*</span>}
                            </label>
                            <input type="text" value={(editForm as any)[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                              placeholder={f.placeholder} className={inputCls} style={inputStyle} />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs md:text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Username</label>
                          <input type="text" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                            placeholder="Username" className={inputCls} style={inputStyle} />
                        </div>
                        <div>
                          <label className="block text-xs md:text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Email <span className="text-red-400">*</span></label>
                          <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="email@example.com" className={inputCls} style={inputStyle} />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4" style={{ borderTop: `1px solid ${th.divider}` }}>
                        <button onClick={handleSaveProfile} disabled={saving}
                          className="w-full sm:flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 transition-all text-sm active:scale-95">
                          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></> : <><Save className="w-4 h-4" /><span>Save Changes</span></>}
                        </button>
                        <button onClick={handleCancelEdit} disabled={saving}
                          className="w-full sm:flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors text-sm active:scale-95"
                          style={{ background: th.cancelBg, border: `1px solid ${th.cancelBorder}`, color: th.cancelText }}>
                          <X className="w-4 h-4" /><span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                      <FieldCard label="First Name"><p className="font-medium text-base md:text-lg" style={{ color: th.fieldValue }}>{user.firstName}</p></FieldCard>
                      <FieldCard label="Last Name"><p className="font-medium text-base md:text-lg" style={{ color: th.fieldValue }}>{user.lastName || '-'}</p></FieldCard>
                      <FieldCard label="Username"><p className="font-medium text-base md:text-lg" style={{ color: th.fieldValue }}>@{user.username}</p></FieldCard>
                      <FieldCard label="Email Address">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" style={{ color: th.fieldLabel }} />
                          <p className="font-medium text-sm md:text-base truncate" style={{ color: th.fieldValue }}>{user.email}</p>
                        </div>
                      </FieldCard>
                    </div>
                  )}
                </SectionCard>

                {/* Outlet Info */}
                {user.outletId && (
                  <SectionCard title="Outlet Information" icon={Building}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                      <FieldCard label="Assigned Outlet"><p className="font-medium text-base md:text-lg" style={{ color: th.fieldValue }}>{user.outletName || 'N/A'}</p></FieldCard>
                      <FieldCard label="Outlet Code"><p className="font-medium text-base md:text-lg" style={{ color: th.fieldValue }}>{user.outletCode || 'N/A'}</p></FieldCard>
                    </div>
                  </SectionCard>
                )}

                {/* Security */}
                <SectionCard title="Security Settings" icon={Lock} iconColor="text-red-400">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                    <div className="rounded-lg p-4 active:scale-[0.98] transition-all"
                      style={{ background: th.fieldBg, border: `1px solid ${th.fieldBorder}` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="font-medium mb-1 text-sm md:text-base" style={{ color: th.cardTitle }}>Password</p>
                          <p className="text-xs md:text-sm" style={{ color: th.cardSub }}>Last changed: Recently</p>
                        </div>
                        <button onClick={() => setShowPasswordModal(true)}
                          className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white rounded-lg transition-all text-sm active:scale-95 flex-shrink-0">
                          Change
                        </button>
                      </div>
                      <div className="pt-3" style={{ borderTop: `1px solid ${th.fieldDivider}` }}>
                        <p className="text-xs" style={{ color: th.cardSub }}>For security, change your password regularly</p>
                      </div>
                    </div>
                    <div className="rounded-lg p-4 active:scale-[0.98] transition-all"
                      style={{ background: th.fieldBg, border: `1px solid ${th.fieldBorder}` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="font-medium mb-1 text-sm md:text-base" style={{ color: th.cardTitle }}>Account Status</p>
                          <p className="text-xs md:text-sm" style={{ color: th.cardSub }}>Active and verified</p>
                        </div>
                        <div className="px-3 py-1 bg-green-900/30 border border-green-700 rounded-full flex-shrink-0">
                          <span className="text-xs font-medium text-green-400">ACTIVE</span>
                        </div>
                      </div>
                      <div className="pt-3" style={{ borderTop: `1px solid ${th.fieldDivider}` }}>
                        <p className="text-xs" style={{ color: th.cardSub }}>Your account is in good standing</p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
        <div className="md:hidden h-24" />
      </div>

      {/* ── Change Password Modal ─────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.70)' }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors duration-500"
            style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10"
              style={{ background: th.modalHdrBg, borderBottom: `1px solid ${th.modalHdrBorder}` }}>
              <h3 className="text-lg md:text-xl font-semibold flex items-center space-x-2" style={{ color: th.modalHdrTitle }}>
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-red-400" /><span>Change Password</span>
              </h3>
              <button onClick={() => setShowPasswordModal(false)}
                className="p-2 rounded-lg transition-colors active:scale-95" style={{ color: th.modalToggleText }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              {[
                { label:'Current Password', key:'currentPassword', show:'current' },
                { label:'New Password',     key:'newPassword',     show:'new'     },
                { label:'Confirm New Password', key:'confirmPassword', show:'confirm' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs md:text-sm font-medium mb-2" style={{ color: th.modalLabel }}>
                    {f.label} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input type={(showPasswords as any)[f.show] ? 'text' : 'password'}
                      value={(passwordForm as any)[f.key]}
                      onChange={e => setPasswordForm({ ...passwordForm, [f.key]: e.target.value })}
                      placeholder={f.key === 'newPassword' ? 'Min 4 characters' : undefined}
                      className={modalInputCls} style={modalInputStyle} />
                    <button type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, [f.show]: !(showPasswords as any)[f.show] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-95 transition-all" style={{ color: th.modalToggleText }}>
                      {(showPasswords as any)[f.show] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="p-3 md:p-4 rounded-lg" style={{ background: th.modalReqBg, border: `1px solid ${th.modalReqBorder}` }}>
                <p className="text-xs md:text-sm font-medium mb-2 flex items-center space-x-2" style={{ color: th.modalReqTitle }}>
                  <AlertCircle className="w-4 h-4 text-blue-400" /><span>Password Requirements</span>
                </p>
                <ul className="text-xs space-y-1" style={{ color: th.modalReqText }}>
                  {['Minimum 4 characters', 'Can contain letters, numbers, and special characters', "Don't reuse old passwords"].map(r => (
                    <li key={r} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row items-center gap-3 sticky bottom-0"
              style={{ background: th.modalFtrBg, borderTop: `1px solid ${th.modalFtrBorder}` }}>
              <button onClick={() => setShowPasswordModal(false)} disabled={saving}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm active:scale-95"
                style={{ background: th.modalCancelBg, border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>
                Cancel
              </button>
              <button onClick={handleChangePassword} disabled={saving}
                className="w-full sm:flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 transition-all text-sm active:scale-95">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Changing...</span></> : <><Lock className="w-4 h-4" /><span>Change Password</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}