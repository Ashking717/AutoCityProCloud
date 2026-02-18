'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { UserRole, UserRoleType } from '@/lib/types/roles';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import {
  Settings as SettingsIcon, Users, Building2, Plus, Trash2, X, Shield,
  Mail, Phone, MapPin, MoreVertical, RefreshCw, Search, UserPlus, Store,
  Clock, Wifi, WifiOff, Sun, Moon,
} from 'lucide-react';
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

interface OnlineUser {
  _id: string; firstName: string; lastName: string; email: string;
  username: string; role: string; outletId?: { name: string; code: string }; lastActiveAt: string;
}

export default function SettingsPage() {
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useActivityTracker(true);

  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', email: '', username: '', password: '',
    phone: '', role: UserRole.VIEWER as UserRoleType, outletId: '',
  });
  const [newOutlet, setNewOutlet] = useState({
    name: '', code: '',
    address: { street: '', city: '', state: '', country: 'Qatar', postalCode: '' },
    phone: '', email: '', taxNumber: '',
  });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:             isDark ? '#050505'                                            : '#f3f4f6',
    // Desktop header
    headerBgFrom:       isDark ? '#932222'                                            : '#fef2f2',
    headerBgVia:        isDark ? '#411010'                                            : '#fee2e2',
    headerBgTo:         isDark ? '#a20c0c'                                            : '#fecaca',
    headerBorder:       isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.06)',
    headerTitle:        isDark ? '#ffffff'                                            : '#7f1d1d',
    headerSub:          isDark ? 'rgba(255,255,255,0.80)'                             : '#991b1b',
    headerIconBg:       isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    headerIconBorder:   isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    badgeBg:            isDark ? 'rgba(0,0,0,0.30)'                                  : 'rgba(255,255,255,0.60)',
    badgeBorder:        isDark ? 'rgba(255,255,255,0.15)'                             : 'rgba(127,29,29,0.20)',
    badgeText:          isDark ? 'rgba(255,255,255,0.70)'                             : '#7f1d1d',
    // Mobile header
    mobileHdrBg:        isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'   : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHdrBorder:    isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.08)',
    mobileHdrTitle:     isDark ? '#ffffff'                                            : '#111827',
    mobileHdrSub:       isDark ? 'rgba(255,255,255,0.60)'                             : '#6b7280',
    mobileBtnBg:        isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    mobileBtnText:      isDark ? 'rgba(255,255,255,0.80)'                             : '#374151',
    mobileSearchBg:     isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.06)',
    mobileSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    mobileSearchText:   isDark ? '#ffffff'                                            : '#111827',
    mobileSearchPH:     isDark ? 'rgba(255,255,255,0.70)'                             : '#9ca3af',
    // Tabs (desktop)
    tabActive:          '#E84545',
    tabActiveText:      '#ffffff',
    tabInactiveText:    isDark ? '#94a3b8'                                            : '#6b7280',
    tabHoverText:       isDark ? '#ffffff'                                            : '#111827',
    // Filter panel
    filterBg:           isDark ? '#000000'                                            : '#ffffff',
    filterBorder:       isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    filterInputBg:      isDark ? '#000000'                                            : '#f9fafb',
    filterInputBorder:  isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.10)',
    filterInputText:    isDark ? '#ffffff'                                            : '#111827',
    filterInputPH:      isDark ? '#64748b'                                            : '#9ca3af',
    filterBtnText:      isDark ? '#ffffff'                                            : '#374151',
    filterBtnHover:     isDark ? '#111827'                                            : 'rgba(0,0,0,0.04)',
    // User table / cards
    tableBg:            isDark ? '#000000'                                            : '#ffffff',
    tableBorder:        isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    tableHeadBg:        isDark ? '#0A0A0A'                                            : '#f9fafb',
    tableHeadText:      isDark ? '#d1d5db'                                            : '#6b7280',
    tableRowDivider:    isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.05)',
    tableRowHover:      isDark ? '#111827'                                            : 'rgba(0,0,0,0.02)',
    tableCellPrimary:   isDark ? '#ffffff'                                            : '#111827',
    tableCellSecondary: isDark ? '#94a3b8'                                            : '#6b7280',
    tableAvatarBg:      isDark ? 'rgba(232,69,69,0.20)'                               : 'rgba(232,69,69,0.10)',
    tableAvatarBorder:  isDark ? 'rgba(232,69,69,0.30)'                               : 'rgba(232,69,69,0.20)',
    // Mobile cards
    mobileCardBgFrom:   isDark ? '#0A0A0A'                                            : '#ffffff',
    mobileCardBgTo:     isDark ? '#000000'                                            : '#f9fafb',
    mobileCardBorder:   isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    mobileCardHover:    isDark ? '#E84545'                                            : 'rgba(232,69,69,0.40)',
    mobileCardDivider:  isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.06)',
    mobileCardLabel:    isDark ? '#64748b'                                            : '#9ca3af',
    // Outlet cards
    outletCardBgFrom:   isDark ? '#000000'                                            : '#ffffff',
    outletCardBgTo:     isDark ? '#111827'                                            : '#f9fafb',
    outletCardBorder:   isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    outletCardHover:    isDark ? '#E84545'                                            : 'rgba(232,69,69,0.40)',
    outletCardTitle:    isDark ? '#ffffff'                                            : '#111827',
    outletCardSub:      isDark ? '#6b7280'                                            : '#9ca3af',
    outletCardBody:     isDark ? '#94a3b8'                                            : '#374151',
    outletCardDivider:  isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.06)',
    outletIconBg:       isDark ? 'rgba(232,69,69,0.20)'                               : 'rgba(232,69,69,0.10)',
    outletIconBorder:   isDark ? 'rgba(232,69,69,0.30)'                               : 'rgba(232,69,69,0.20)',
    // Modal
    modalBg:            isDark ? '#000000'                                            : '#ffffff',
    modalBorder:        isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.10)',
    modalHdrBorder:     isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    modalTitle:         isDark ? '#ffffff'                                            : '#111827',
    modalLabel:         isDark ? '#d1d5db'                                            : '#374151',
    modalInputBg:       isDark ? '#000000'                                            : '#f9fafb',
    modalInputBorder:   isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.10)',
    modalInputText:     isDark ? '#ffffff'                                            : '#111827',
    modalFtrBorder:     isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.06)',
    modalCancelBorder:  isDark ? '#374151'                                            : 'rgba(0,0,0,0.12)',
    modalCancelText:    isDark ? '#d1d5db'                                            : '#374151',
    // Mobile action menu
    menuBg:             isDark ? 'linear-gradient(180deg,#000000,#0A0A0A)'            : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    menuBorder:         isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    menuTitle:          isDark ? '#ffffff'                                            : '#111827',
    menuItemBg:         isDark ? '#000000'                                            : 'rgba(0,0,0,0.04)',
    menuItemBorder:     isDark ? '#1f2937'                                            : 'rgba(0,0,0,0.08)',
    menuItemText:       isDark ? '#d1d5db'                                            : '#374151',
    menuCloseBg:        isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    menuCloseText:      isDark ? '#9ca3af'                                            : '#6b7280',
    emptyIcon:          isDark ? '#374151'                                            : '#d1d5db',
    emptyText:          isDark ? '#94a3b8'                                            : '#6b7280',
    loadingText:        isDark ? '#94a3b8'                                            : '#6b7280',
  };

  useEffect(() => {
    fetchUser(); fetchUsers(); fetchOutlets(); fetchOnlineUsers();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => { window.removeEventListener('resize', check); clearInterval(interval); };
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.role !== 'SUPERADMIN') setNewUser(prev => ({ ...prev, outletId: data.user.outletId }));
      }
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) setUsers((await res.json()).users || []);
    } catch { toast.error('Failed to fetch users'); } finally { setLoading(false); }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch('/api/users/activity', { credentials: 'include' });
      if (res.ok) setOnlineUsers((await res.json()).onlineUsers || []);
    } catch {}
  };

  const fetchOutlets = async () => {
    try {
      const res = await fetch('/api/outlets', { credentials: 'include' });
      if (res.ok) setOutlets((await res.json()).outlets || []);
    } catch {}
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.email || !newUser.username || !newUser.password) { toast.error('Please fill all required fields'); return; }
    if (newUser.role !== 'SUPERADMIN' && !newUser.outletId) { toast.error('Please select an outlet'); return; }
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(newUser) });
      if (res.ok) {
        toast.success('User created!'); setShowUserModal(false);
        setNewUser({ firstName: '', lastName: '', email: '', username: '', password: '', phone: '', role: UserRole.VIEWER, outletId: user.role === 'SUPERADMIN' ? '' : user.outletId });
        fetchUsers();
      } else { toast.error((await res.json()).error || 'Failed to create user'); }
    } catch { toast.error('Failed to create user'); }
  };

  const handleCreateOutlet = async () => {
    if (!newOutlet.name || !newOutlet.code) { toast.error('Please fill all required fields'); return; }
    try {
      const res = await fetch('/api/outlets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(newOutlet) });
      if (res.ok) {
        toast.success('Outlet created!'); setShowOutletModal(false);
        setNewOutlet({ name: '', code: '', address: { street: '', city: '', state: '', country: 'Qatar', postalCode: '' }, phone: '', email: '', taxNumber: '' });
        fetchOutlets();
      } else { toast.error((await res.json()).error || 'Failed to create outlet'); }
    } catch { toast.error('Failed to create outlet'); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast.success('User deleted'); fetchUsers(); }
      else { toast.error((await res.json()).error || 'Failed to delete user'); }
    } catch { toast.error('Failed to delete user'); }
  };

  const isUserOnline     = (id: string) => onlineUsers.some(u => u._id === id);
  const getUserLastActive = (id: string) => { const u = onlineUsers.find(u => u._id === id); return u ? new Date(u.lastActiveAt) : null; };

  const getRelativeTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1)   return 'Just now';
    if (diff < 60)  return `${diff} min${diff > 1 ? 's' : ''} ago`;
    const h = Math.floor(diff / 60);
    if (h < 24)     return `${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? 's' : ''} ago`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN': return 'bg-white text-red-400 border border-red-800/50';
      case 'ADMIN':      return 'bg-white text-purple-400 border border-purple-800/50';
      case 'MANAGER':    return 'bg-white text-blue-400 border border-blue-800/50';
      case 'CASHIER':    return 'bg-white text-green-400 border border-green-800/50';
      case 'ACCOUNTANT': return 'bg-white text-yellow-400 border border-yellow-800/50';
      default:           return 'bg-gray-800/50 text-gray-400 border border-gray-700';
    }
  };

  const getRoleDisplayName = (role: string) =>
    ({ SUPERADMIN:'Super Admin', ADMIN:'Admin', MANAGER:'Manager', CASHIER:'Cashier', ACCOUNTANT:'Accountant', VIEWER:'Viewer' }[role] || role);

  const getRoleDescription = (role: string) =>
    ({ SUPERADMIN:'Full system access across all outlets', ADMIN:'Can manage users and operations in assigned outlet', MANAGER:'Can manage inventory and operations in assigned outlet', CASHIER:'Can process sales and transactions', ACCOUNTANT:'Can manage accounting and view financial reports', VIEWER:'View-only access to reports and data' }[role] || '');

  const canCreateOutlet = user?.role === 'SUPERADMIN';
  const canCreateUser   = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/autocityPro/login'; };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (filterRole === 'all' || u.role === filterRole) && (!showOnlineOnly || isUserOnline(u._id));
  });

  const onlineCount = users.filter(u => isUserOnline(u._id)).length;

  const modalInputCls = "w-full px-4 py-3 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all";
  const modalInputStyle = { background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* ── Mobile Header ─────────────────────────────────────────────── */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHdrTitle }}>Settings</h1>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="text-xs" style={{ color: th.mobileHdrSub }}>
                  {activeTab === 'users' ? (
                    <>{filteredUsers.length} users <span className="mx-1">•</span>
                      <span className="inline-flex items-center">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse" />{onlineCount} online
                      </span></>
                  ) : `${outlets.length} outlets`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'users' && (
                  <>
                    <button onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                      className={`p-2 rounded-xl transition-all ${showOnlineOnly ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
                      style={!showOnlineOnly ? { background: th.mobileBtnBg, color: th.mobileBtnText } : {}}>
                      <Wifi className="h-4 w-4" />
                    </button>
                    {canCreateUser && (
                      <button onClick={() => setShowUserModal(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                        style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
                {activeTab === 'outlets' && canCreateOutlet && (
                  <button onClick={() => setShowOutletModal(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                    style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                    <Store className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="flex space-x-2">
              <button onClick={() => setActiveTab('users')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-[#E84545] text-white' : ''}`}
                style={activeTab !== 'users' ? { background: th.mobileBtnBg, color: th.mobileBtnText } : {}}>
                <Users className="h-4 w-4 inline mr-2" />Users
              </button>
              {canCreateOutlet && (
                <button onClick={() => setActiveTab('outlets')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'outlets' ? 'bg-[#E84545] text-white' : ''}`}
                  style={activeTab !== 'outlets' ? { background: th.mobileBtnBg, color: th.mobileBtnText } : {}}>
                  <Building2 className="h-4 w-4 inline mr-2" />Outlets
                </button>
              )}
            </div>

            {activeTab === 'users' && (
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPH }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                  style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop Header ────────────────────────────────────────────── */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl" style={{ background: th.headerIconBg, border: `1px solid ${th.headerIconBorder}` }}>
                  <SettingsIcon className="h-8 w-8" style={{ color: th.headerTitle }} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Settings</h1>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                      style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
                      {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>
                    Manage users and outlets
                    {activeTab === 'users' && onlineCount > 0 && (
                      <span className="ml-3 inline-flex items-center">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                        <span className="text-emerald-200 font-semibold">{onlineCount} users online</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">

          {/* Desktop Tabs + Actions */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex space-x-8">
              {['users', ...(canCreateOutlet ? ['outlets'] : [])].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors"
                  style={{
                    borderColor: activeTab === tab ? th.tabActive : 'transparent',
                    color: activeTab === tab ? th.headerTitle : th.tabInactiveText,
                  }}
                  onMouseEnter={e => activeTab !== tab && (e.currentTarget.style.color = th.tabHoverText)}
                  onMouseLeave={e => activeTab !== tab && (e.currentTarget.style.color = th.tabInactiveText)}>
                  {tab === 'users' ? <><Users className="h-5 w-5 inline mr-2" />Users</> : <><Building2 className="h-5 w-5 inline mr-2" />Outlets</>}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'users' && canCreateUser && (
                <button onClick={() => setShowUserModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group">
                  <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" /><span>Add User</span>
                </button>
              )}
              {activeTab === 'outlets' && canCreateOutlet && (
                <button onClick={() => setShowOutletModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group">
                  <Store className="h-4 w-4 group-hover:scale-110 transition-transform" /><span>Add Outlet</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Users Tab ─────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div>
              {/* Desktop Filter Panel */}
              <div className="hidden md:block rounded-xl shadow-xl p-6 mb-6 transition-colors duration-500"
                style={{ background: th.filterBg, border: `1px solid ${th.filterBorder}` }}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: th.filterInputPH }} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                      style={{ background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText }} />
                  </div>
                  <div className="relative">
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent appearance-none transition-colors duration-500"
                      style={{ background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText }}>
                      <option value="all">All Roles</option>
                      {user?.role === 'SUPERADMIN' && <option value="SUPERADMIN">Super Admin</option>}
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="CASHIER">Cashier</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <Shield className="absolute right-2 top-2.5 h-4 w-4 pointer-events-none" style={{ color: th.filterInputPH }} />
                  </div>
                  <button onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${showOnlineOnly ? 'bg-emerald-900/30 border-2 border-emerald-600 text-emerald-400 font-semibold' : ''}`}
                    style={!showOnlineOnly ? { background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterBtnText } : {}}>
                    <Wifi className="h-4 w-4" />{showOnlineOnly ? 'Online Only' : 'All Users'}
                  </button>
                  <button onClick={() => { setSearchTerm(''); setFilterRole('all'); setShowOnlineOnly(false); }}
                    className="px-4 py-2 text-sm rounded-lg transition-colors"
                    style={{ background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterBtnText }}
                    onMouseEnter={e => (e.currentTarget.style.background = th.filterBtnHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = th.filterInputBg)}>
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Mobile Users List */}
              <div className="md:hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-12 w-12 animate-spin text-[#E84545]" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center transition-colors duration-500"
                    style={{ background: th.mobileCardBgFrom, border: `1px solid ${th.mobileCardBorder}` }}>
                    <Users className="h-12 w-12 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                    <p className="text-lg font-medium" style={{ color: th.emptyText }}>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map(u => {
                      const online = isUserOnline(u._id);
                      const lastActive = getUserLastActive(u._id);
                      return (
                        <div key={u._id} className="rounded-xl p-4 transition-all"
                          style={{ background: `linear-gradient(135deg,${th.mobileCardBgFrom},${th.mobileCardBgTo})`, border: `1px solid ${th.mobileCardBorder}` }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = th.mobileCardHover)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = th.mobileCardBorder)}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-10 w-10 rounded-full flex items-center justify-center"
                                  style={{ background: th.tableAvatarBg, border: `1px solid ${th.tableAvatarBorder}` }}>
                                  <span className="text-[#E84545] font-semibold">{u.firstName?.[0]}{u.lastName?.[0]}</span>
                                </div>
                                {online && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />}
                              </div>
                              <div>
                                <p className="text-sm font-semibold flex items-center gap-2" style={{ color: th.tableCellPrimary }}>
                                  {u.firstName} {u.lastName}
                                  {u._id === user?._id && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">You</span>}
                                </p>
                                <p className="text-xs" style={{ color: th.mobileCardLabel }}>@{u.username}</p>
                                {online && lastActive && (
                                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3" />{getRelativeTime(lastActive)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteUser(u._id)}
                              className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                              disabled={!canCreateUser || u._id === user?._id}
                              style={{ background: th.mobileBtnBg }}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 py-3" style={{ borderTop: `1px solid ${th.mobileCardDivider}` }}>
                            <div>
                              <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileCardLabel }}>Role</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(u.role)}`}>{getRoleDisplayName(u.role)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileCardLabel }}>Outlet</span>
                              <p className="text-sm font-semibold" style={{ color: th.tableCellSecondary }}>{u.outletId?.name || 'All Outlets'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop Users Table */}
              <div className="hidden md:block rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
                style={{ background: th.tableBg, border: `1px solid ${th.tableBorder}` }}>
                <table className="min-w-full">
                  <thead style={{ background: th.tableHeadBg }}>
                    <tr>
                      {['User', 'Contact', 'Role', 'Outlet', 'Status', 'Actions'].map((h, i) => (
                        <th key={h} className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${i === 5 ? 'text-right' : 'text-left'}`}
                          style={{ color: th.tableHeadText }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-[#E84545] mx-auto" />
                        <p className="mt-2" style={{ color: th.loadingText }}>Loading users...</p>
                      </td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center">
                        <Users className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                        <p className="text-lg font-medium" style={{ color: th.emptyText }}>No users found</p>
                      </td></tr>
                    ) : filteredUsers.map(u => {
                      const online = isUserOnline(u._id);
                      const lastActive = getUserLastActive(u._id);
                      return (
                        <tr key={u._id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableRowDivider}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="relative">
                                <div className="h-10 w-10 rounded-full flex items-center justify-center"
                                  style={{ background: th.tableAvatarBg, border: `1px solid ${th.tableAvatarBorder}` }}>
                                  <span className="text-[#E84545] font-semibold">{u.firstName?.[0]}{u.lastName?.[0]}</span>
                                </div>
                                {online && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />}
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium flex items-center gap-2" style={{ color: th.tableCellPrimary }}>
                                  {u.firstName} {u.lastName}
                                  {u._id === user?._id && <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">You</span>}
                                </p>
                                <p className="text-xs" style={{ color: th.tableCellSecondary }}>@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm" style={{ color: th.tableCellPrimary }}>{u.email}</p>
                            {u.phone && <p className="text-xs" style={{ color: th.tableCellSecondary }}>{u.phone}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(u.role)}`}>
                              <Shield className="h-3 w-3" />{getRoleDisplayName(u.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{u.outletId?.name || 'All Outlets'}</td>
                          <td className="px-6 py-4">
                            {online ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-800/50">
                                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Online
                                </div>
                                {lastActive && <span className="text-xs" style={{ color: th.tableCellSecondary }}>{getRelativeTime(lastActive)}</span>}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 text-gray-500 rounded-full text-xs">
                                <WifiOff className="h-3 w-3" />Offline
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {canCreateUser && u._id !== user?._id && (
                              <button onClick={() => handleDeleteUser(u._id)}
                                className="p-2 rounded-lg transition-colors text-gray-400 hover:bg-red-900/30 hover:text-red-400"
                                style={{ background: th.menuItemBg }}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Outlets Tab ───────────────────────────────────────────── */}
          {activeTab === 'outlets' && canCreateOutlet && (
            <div>
              {/* Mobile */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {outlets.map(outlet => (
                  <div key={outlet._id} className="rounded-xl p-4 transition-all"
                    style={{ background: `linear-gradient(135deg,${th.outletCardBgFrom},${th.outletCardBgTo})`, border: `1px solid ${th.outletCardBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = th.outletCardHover)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = th.outletCardBorder)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-[#E84545]" />
                        <div>
                          <h3 className="text-base font-bold" style={{ color: th.outletCardTitle }}>{outlet.name}</h3>
                          <p className="text-xs" style={{ color: th.outletCardSub }}>Code: {outlet.code}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${outlet.isActive ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-red-900/30 text-red-400 border border-red-800/50'}`}>
                        {outlet.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm pt-3" style={{ borderTop: `1px solid ${th.outletCardDivider}` }}>
                      {outlet.phone && <div className="flex items-center gap-2" style={{ color: th.outletCardBody }}><Phone className="h-4 w-4" />{outlet.phone}</div>}
                      {outlet.address?.city && <div className="flex items-center gap-2" style={{ color: th.outletCardBody }}><MapPin className="h-4 w-4" />{outlet.address.city}, {outlet.address.country}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outlets.map(outlet => (
                  <div key={outlet._id} className="rounded-xl shadow-xl p-6 transition-all group"
                    style={{ background: `linear-gradient(135deg,${th.outletCardBgFrom},${th.outletCardBgTo})`, border: `1px solid ${th.outletCardBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = th.outletCardHover)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = th.outletCardBorder)}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg" style={{ background: th.outletIconBg, border: `1px solid ${th.outletIconBorder}` }}>
                        <Building2 className="h-6 w-6 text-[#E84545]" />
                      </div>
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${outlet.isActive ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-red-900/30 text-red-400 border border-red-800/50'}`}>
                        {outlet.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: th.outletCardTitle }}>{outlet.name}</h3>
                    <p className="text-sm mb-4" style={{ color: th.outletCardSub }}>Code: {outlet.code}</p>
                    <div className="space-y-3 text-sm pt-3" style={{ borderTop: `1px solid ${th.outletCardDivider}` }}>
                      {outlet.phone && <div className="flex items-center gap-2 transition-colors" style={{ color: th.outletCardBody }}><Phone className="h-4 w-4 flex-shrink-0" /><span className="truncate">{outlet.phone}</span></div>}
                      {outlet.email && <div className="flex items-center gap-2 transition-colors" style={{ color: th.outletCardBody }}><Mail className="h-4 w-4 flex-shrink-0" /><span className="truncate">{outlet.email}</span></div>}
                      {outlet.address?.city && <div className="flex items-center gap-2 transition-colors" style={{ color: th.outletCardBody }}><MapPin className="h-4 w-4 flex-shrink-0" /><span>{outlet.address.city}, {outlet.address.country}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:hidden h-24" />
      </div>

      {/* ── Add User Modal ─────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.80)' }}>
          <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transition-colors duration-500"
            style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-[#932222] via-[#411010] to-[#a20c0c]">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg"><UserPlus className="h-6 w-6 text-white" /></div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Add New User</h2>
                  <p className="text-white/80 text-sm">Create a new user account</p>
                </div>
              </div>
              <button onClick={() => setShowUserModal(false)} className="text-white/80 hover:text-white p-1"><X className="h-7 w-7" /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label:'First Name', key:'firstName', type:'text', placeholder:'John' },
                  { label:'Last Name',  key:'lastName',  type:'text', placeholder:'Doe'  },
                  { label:'Username',   key:'username',  type:'text', placeholder:'johndoe' },
                  { label:'Email',      key:'email',     type:'email',placeholder:'john@example.com' },
                  { label:'Password',   key:'password',  type:'password', placeholder:'Minimum 6 characters' },
                  { label:'Phone',      key:'phone',     type:'text', placeholder:'+974-XXXXXXXX' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>{f.label} {['firstName','email','username','password'].includes(f.key) && <span className="text-red-400">*</span>}</label>
                    <input type={f.type} value={(newUser as any)[f.key]} onChange={e => setNewUser({ ...newUser, [f.key]: e.target.value })}
                      placeholder={f.placeholder} className={modalInputCls} style={modalInputStyle} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Role <span className="text-red-400">*</span></label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRoleType })}
                    className={modalInputCls} style={modalInputStyle}>
                    {user?.role === 'SUPERADMIN' && <option value={UserRole.SUPERADMIN}>Super Admin</option>}
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.CASHIER}>Cashier</option>
                    <option value={UserRole.ACCOUNTANT}>Accountant</option>
                    <option value={UserRole.VIEWER}>Viewer</option>
                  </select>
                  <p className="text-xs mt-2" style={{ color: th.tableCellSecondary }}>{getRoleDescription(newUser.role)}</p>
                </div>
                {(user?.role === 'SUPERADMIN' || newUser.role !== 'SUPERADMIN') && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Outlet {newUser.role !== 'SUPERADMIN' && <span className="text-red-400">*</span>}</label>
                    <select value={newUser.outletId} onChange={e => setNewUser({ ...newUser, outletId: e.target.value })}
                      disabled={newUser.role === 'SUPERADMIN'} className={`${modalInputCls} disabled:opacity-50`} style={modalInputStyle}>
                      <option value="">{newUser.role === 'SUPERADMIN' ? 'All Outlets' : 'Select Outlet'}</option>
                      {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4" style={{ borderTop: `1px solid ${th.modalFtrBorder}` }}>
                <button onClick={() => setShowUserModal(false)}
                  className="px-6 py-2.5 rounded-lg transition-all font-medium"
                  style={{ border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>Cancel</button>
                <button onClick={handleCreateUser}
                  className="px-6 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all font-semibold shadow-lg">Create User</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Action Menu ─────────────────────────────────────────── */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom  transition-colors duration-500"
            style={{ background: th.menuBg, borderColor: th.menuBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.menuTitle }}>Settings Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.menuCloseBg, color: th.menuCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {activeTab === 'users' && canCreateUser && (
                <button onClick={() => { setShowUserModal(true); setShowMobileMenu(false); }}
                  className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.menuItemBg, border: `1px solid ${th.menuItemBorder}`, color: th.menuItemText }}>
                  <span>Add User</span><UserPlus className="h-5 w-5" />
                </button>
              )}
              {activeTab === 'outlets' && canCreateOutlet && (
                <button onClick={() => { setShowOutletModal(true); setShowMobileMenu(false); }}
                  className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.menuItemBg, border: `1px solid ${th.menuItemBorder}`, color: th.menuItemText }}>
                  <span>Add Outlet</span><Store className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => { fetchUsers(); fetchOutlets(); fetchOnlineUsers(); setShowMobileMenu(false); toast.success('Settings refreshed'); }}
                className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95"
                style={{ background: th.menuItemBg, border: `1px solid ${th.menuItemBorder}`, color: th.menuItemText }}>
                <span>Refresh Data</span><RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}