'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { UserRole, UserRoleType } from '@/lib/types/roles';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  Plus,
  Trash2,
  X,
  Shield,
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  ChevronLeft,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Key,
  LogOut,
  CheckCircle,
  AlertCircle,
  Search,
  Lock,
  UserPlus,
  Store,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OnlineUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  outletId?: { name: string; code: string };
  lastActiveAt: string;
}

export default function SettingsPage() {
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

  // Enable activity tracking
  useActivityTracker(true);

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    role: UserRole.VIEWER as UserRoleType,
    outletId: '',
  });

  const [newOutlet, setNewOutlet] = useState({
    name: '',
    code: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Qatar',
      postalCode: '',
    },
    phone: '',
    email: '',
    taxNumber: '',
  });

  useEffect(() => {
    fetchUser();
    fetchUsers();
    fetchOutlets();
    fetchOnlineUsers();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    // Refresh online users every 30 seconds
    const interval = setInterval(() => {
      fetchOnlineUsers();
    }, 30000);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
      clearInterval(interval);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.role !== 'SUPERADMIN') {
          setNewUser(prev => ({ ...prev, outletId: data.user.outletId }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users');
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch('/api/users/activity', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.onlineUsers || []);
      }
    } catch (error) {
      console.error('Failed to fetch online users');
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await fetch('/api/outlets', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOutlets(data.outlets || []);
      }
    } catch (error) {
      console.error('Failed to fetch outlets');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.email || !newUser.username || !newUser.password) {
      toast.error('Please fill all required fields');
      return;
    }

    if (newUser.role !== 'SUPERADMIN' && !newUser.outletId) {
      toast.error('Please select an outlet');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        toast.success('User created successfully!');
        setShowUserModal(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          password: '',
          phone: '',
          role: UserRole.VIEWER,
          outletId: user.role === 'SUPERADMIN' ? '' : user.outletId,
        });
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleCreateOutlet = async () => {
    if (!newOutlet.name || !newOutlet.code) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch('/api/outlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newOutlet),
      });

      if (res.ok) {
        toast.success('Outlet created successfully!');
        setShowOutletModal(false);
        setNewOutlet({
          name: '',
          code: '',
          address: {
            street: '',
            city: '',
            state: '',
            country: 'Qatar',
            postalCode: '',
          },
          phone: '',
          email: '',
          taxNumber: '',
        });
        fetchOutlets();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create outlet');
      }
    } catch (error) {
      toast.error('Failed to create outlet');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(ou => ou._id === userId);
  };

  const getUserLastActive = (userId: string) => {
    const onlineUser = onlineUsers.find(ou => ou._id === userId);
    if (!onlineUser) return null;
    return new Date(onlineUser.lastActiveAt);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-red-900/30 text-red-400 border border-red-800/50';
      case 'ADMIN':
        return 'bg-purple-900/30 text-purple-400 border border-purple-800/50';
      case 'MANAGER':
        return 'bg-blue-900/30 text-blue-400 border border-blue-800/50';
      case 'CASHIER':
        return 'bg-green-900/30 text-green-400 border border-green-800/50';
      case 'ACCOUNTANT':
        return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50';
      default:
        return 'bg-gray-800/50 text-gray-400 border border-gray-700';
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'SUPERADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'MANAGER': 'Manager',
      'CASHIER': 'Cashier',
      'ACCOUNTANT': 'Accountant',
      'VIEWER': 'Viewer',
    };
    return roleMap[role] || role;
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      'SUPERADMIN': 'Full system access across all outlets',
      'ADMIN': 'Can manage users and operations in assigned outlet',
      'MANAGER': 'Can manage inventory and operations in assigned outlet',
      'CASHIER': 'Can process sales and transactions',
      'ACCOUNTANT': 'Can manage accounting and view financial reports',
      'VIEWER': 'View-only access to reports and data',
    };
    return descriptions[role] || '';
  };

  const canCreateOutlet = user?.role === 'SUPERADMIN';
  const canCreateUser = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesOnline = !showOnlineOnly || isUserOnline(u._id);
    
    return matchesSearch && matchesRole && matchesOnline;
  });

  const onlineCount = users.filter(u => isUserOnline(u._id)).length;

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-white">Settings</h1>
                <p className="text-xs text-white/60">
                  {activeTab === 'users' ? (
                    <>
                      {filteredUsers.length} users
                      <span className="mx-1">•</span>
                      <span className="inline-flex items-center">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse"></span>
                        {onlineCount} online
                      </span>
                    </>
                  ) : (
                    `${outlets.length} outlets`
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'users' && (
                  <>
                    <button
                      onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                      className={`p-2 rounded-xl transition-all ${
                        showOnlineOnly
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Wifi className="h-4 w-4" />
                    </button>
                    {canCreateUser && (
                      <button
                        onClick={() => setShowUserModal(true)}
                        className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
                {activeTab === 'outlets' && canCreateOutlet && (
                  <button
                    onClick={() => setShowOutletModal(true)}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Store className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Mobile Tabs */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-[#E84545] text-white'
                    : 'bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Users
              </button>
              {canCreateOutlet && (
                <button
                  onClick={() => setActiveTab('outlets')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'outlets'
                      ? 'bg-[#E84545] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Outlets
                </button>
              )}
            </div>

            {/* Search - Mobile */}
            {activeTab === 'users' && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <SettingsIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Settings</h1>
                  <p className="text-white/80 mt-1">
                    Manage users and outlets
                    {activeTab === 'users' && onlineCount > 0 && (
                      <span className="ml-3 inline-flex items-center">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
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
          {/* Desktop Tabs and Controls */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-[#E84545] text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-400'
                }`}
              >
                <Users className="h-5 w-5 inline mr-2" />
                Users
              </button>
              {canCreateOutlet && (
                <button
                  onClick={() => setActiveTab('outlets')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'outlets'
                      ? 'border-[#E84545] text-white'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-400'
                  }`}
                >
                  <Building2 className="h-5 w-5 inline mr-2" />
                  Outlets
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {activeTab === 'users' && canCreateUser && (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group"
                >
                  <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Add User</span>
                </button>
              )}
              {activeTab === 'outlets' && canCreateOutlet && (
                <button
                  onClick={() => setShowOutletModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group"
                >
                  <Store className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Add Outlet</span>
                </button>
              )}
            </div>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {/* Desktop Search and Filters */}
              <div className="hidden md:block bg-black border border-gray-800 rounded-xl shadow-xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-8 pr-3 py-2 text-sm bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-500"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                    >
                      <option value="all">All Roles</option>
                      {user?.role === 'SUPERADMIN' && <option value="SUPERADMIN">Super Admin</option>}
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="CASHIER">Cashier</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <div className="absolute right-2 top-2.5 pointer-events-none">
                      <Shield className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                      showOnlineOnly
                        ? 'bg-emerald-900/30 border-2 border-emerald-600 text-emerald-400 font-semibold'
                        : 'bg-black border border-gray-800 text-white hover:bg-gray-900 hover:border-[#E84545]'
                    }`}
                  >
                    <Wifi className="h-4 w-4" />
                    {showOnlineOnly ? 'Online Only' : 'All Users'}
                  </button>

                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterRole('all');
                      setShowOnlineOnly(false);
                    }}
                    className="px-4 py-2 text-sm bg-black border border-gray-800 rounded-lg hover:bg-gray-900 hover:border-[#E84545] transition-colors text-white"
                  >
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
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-2xl p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-400 text-lg font-medium">No users found</p>
                    <p className="text-gray-600 text-sm mt-1">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((u) => {
                      const online = isUserOnline(u._id);
                      const lastActive = getUserLastActive(u._id);
                      
                      return (
                        <div
                          key={u._id}
                          className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl p-4 hover:border-[#E84545] transition-all"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30">
                                  <span className="text-[#E84545] font-semibold">
                                    {u.firstName?.[0]}{u.lastName?.[0]}
                                  </span>
                                </div>
                                {online && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse"></div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white flex items-center gap-2">
                                  {u.firstName} {u.lastName}
                                  {u._id === user?._id && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">You</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">@{u.username}</p>
                                {online && lastActive && (
                                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3" />
                                    {getRelativeTime(lastActive)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                              disabled={!canCreateUser || u._id === user?._id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-800">
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase block mb-1">Role</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(u.role)}`}>
                                {getRoleDisplayName(u.role)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase block mb-1">Outlet</span>
                              <p className="text-sm font-semibold text-gray-300">
                                {u.outletId?.name || 'All Outlets'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop Users Table */}
              <div className="hidden md:block bg-black border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-[#0A0A0A]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Outlet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-black divide-y divide-gray-800">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          <div className="flex justify-center">
                            <RefreshCw className="h-8 w-8 animate-spin text-[#E84545]" />
                          </div>
                          <p className="mt-2">Loading users...</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          <Users className="h-16 w-16 mx-auto mb-4 text-gray-700" />
                          <p className="text-gray-400 text-lg font-medium">No users found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const online = isUserOnline(u._id);
                        const lastActive = getUserLastActive(u._id);
                        
                        return (
                          <tr key={u._id} className="hover:bg-gray-900 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="relative">
                                  <div className="h-10 w-10 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30">
                                    <span className="text-[#E84545] font-semibold">
                                      {u.firstName?.[0]}{u.lastName?.[0]}
                                    </span>
                                  </div>
                                  {online && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse"></div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <p className="text-sm font-medium text-white flex items-center gap-2">
                                    {u.firstName} {u.lastName}
                                    {u._id === user?._id && (
                                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">You</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">@{u.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-white">{u.email}</p>
                              {u.phone && (
                                <p className="text-xs text-gray-500">{u.phone}</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(u.role)}`}>
                                <Shield className="h-3 w-3" />
                                {getRoleDisplayName(u.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              {u.outletId?.name || 'All Outlets'}
                            </td>
                            <td className="px-6 py-4">
                              {online ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-800/50">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    Online
                                  </div>
                                  {lastActive && (
                                    <span className="text-xs text-gray-500">
                                      {getRelativeTime(lastActive)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 text-gray-500 rounded-full text-xs">
                                  <WifiOff className="h-3 w-3" />
                                  Offline
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {canCreateUser && u._id !== user?._id && (
                                <button
                                  onClick={() => handleDeleteUser(u._id)}
                                  className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Outlets Tab - Keep existing code */}
          {activeTab === 'outlets' && canCreateOutlet && (
            <div>
              <div className="md:hidden mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
                  <input
                    type="text"
                    placeholder="Search outlets..."
                    className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Mobile Outlets List */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {outlets.map((outlet) => (
                  <div
                    key={outlet._id}
                    className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl p-4 hover:border-[#E84545] transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-[#E84545]" />
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {outlet.name}
                          </h3>
                          <p className="text-xs text-gray-500">Code: {outlet.code}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          outlet.isActive
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-900/30 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {outlet.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm pt-3 border-t border-gray-800">
                      {outlet.phone && (
                        <div className="flex items-center text-gray-400">
                          <Phone className="h-4 w-4 mr-2" />
                          {outlet.phone}
                        </div>
                      )}
                      {outlet.address?.city && (
                        <div className="flex items-center text-gray-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          {outlet.address.city}, {outlet.address.country}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Outlets Grid */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outlets.map((outlet) => (
                  <div
                    key={outlet._id}
                    className="bg-gradient-to-br from-black to-gray-900 border border-gray-800 rounded-xl shadow-xl hover:border-[#E84545] transition-all p-6 group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-[#E84545]/20 rounded-lg border border-[#E84545]/30">
                        <Building2 className="h-6 w-6 text-[#E84545]" />
                      </div>
                      <span
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                          outlet.isActive
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-900/30 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {outlet.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">
                      {outlet.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">Code: {outlet.code}</p>

                    <div className="space-y-3 text-sm pt-3 border-t border-gray-800">
                      {outlet.phone && (
                        <div className="flex items-center text-gray-400 group-hover:text-gray-300 transition-colors">
                          <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{outlet.phone}</span>
                        </div>
                      )}
                      {outlet.email && (
                        <div className="flex items-center text-gray-400 group-hover:text-gray-300 transition-colors">
                          <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{outlet.email}</span>
                        </div>
                      )}
                      {outlet.address?.city && (
                        <div className="flex items-center text-gray-400 group-hover:text-gray-300 transition-colors">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{outlet.address.city}, {outlet.address.country}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Keep existing modals - Add User Modal, Add Outlet Modal, Mobile Menu */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-800 bg-gradient-to-r from-[#932222] via-[#411010] to-[#a20c0c]">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Add New User</h2>
                  <p className="text-white/80 text-sm">Create a new user account</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                    placeholder="johndoe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                    placeholder="+974-XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Role *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as UserRoleType,
                      })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white"
                  >
                    {user?.role === 'SUPERADMIN' && (
                      <option value={UserRole.SUPERADMIN}>Super Admin</option>
                    )}
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.CASHIER}>Cashier</option>
                    <option value={UserRole.ACCOUNTANT}>Accountant</option>
                    <option value={UserRole.VIEWER}>Viewer</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {getRoleDescription(newUser.role)}
                  </p>
                </div>

                {(user?.role === 'SUPERADMIN' || newUser.role !== 'SUPERADMIN') && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Outlet {newUser.role !== 'SUPERADMIN' && '*'}
                    </label>
                    <select
                      value={newUser.outletId}
                      onChange={(e) =>
                        setNewUser({ ...newUser, outletId: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg focus:border-[#E84545] focus:ring-2 focus:ring-red-900/30 transition-all text-white disabled:opacity-50"
                      disabled={newUser.role === 'SUPERADMIN'}
                    >
                      <option value="">
                        {newUser.role === 'SUPERADMIN' ? 'All Outlets' : 'Select Outlet'}
                      </option>
                      {outlets.map((outlet) => (
                        <option key={outlet._id} value={outlet._id}>
                          {outlet.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-6 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all font-semibold shadow-lg"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Settings Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {activeTab === 'users' && canCreateUser && (
                <button
                  onClick={() => {
                    setShowUserModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Add User</span>
                  <UserPlus className="h-5 w-5" />
                </button>
              )}
              {activeTab === 'outlets' && canCreateOutlet && (
                <button
                  onClick={() => {
                    setShowOutletModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Add Outlet</span>
                  <Store className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => {
                  fetchUsers();
                  fetchOutlets();
                  fetchOnlineUsers();
                  setShowMobileMenu(false);
                  toast.success('Settings refreshed');
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Refresh Data</span>
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}