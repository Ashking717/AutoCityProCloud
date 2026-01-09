'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  User,
  Mail,
  Building,
  Shield,
  Lock,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  outletId: string | null;
  outletName: string | null;
  isActive: boolean;
  outletCode: string | null;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    fetchUserProfile();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEditForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          username: data.user.username || '',
          email: data.user.email || '',
        });
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!editForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEditMode(false);
        toast.success('Profile updated successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!passwordForm.newPassword) {
      toast.error('New password is required');
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (res.ok) {
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        toast.success('Password changed successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
      email: user?.email || '',
    });
    setEditMode(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-[#E84545] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300 text-sm md:text-base">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-4" />
            <p className="text-slate-300 text-base md:text-lg">Failed to load profile</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">My Profile</h1>
                  <p className="text-xs text-white/60">@{user.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8 py-12">
            <div>
              <h1 className="text-3xl font-bold text-white">My Profile</h1>
              <p className="text-white/80 mt-1">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 md:p-8 pt-20 md:pt-8 bg-[#050505]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-6 text-center shadow-xl active:scale-[0.98] transition-all">
                  {/* Avatar */}
                  <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  </div>

                  {/* Name */}
                  <h2 className="text-lg md:text-xl font-bold text-white mb-1">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">@{user.username}</p>

                  {/* Role Badge */}
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#E84545]/10 border border-[#E84545]/30 rounded-full mb-6">
                    <Shield className="w-4 h-4 text-[#E84545]" />
                    <span className="text-xs md:text-sm font-medium text-[#E84545] uppercase">
                      {user.role}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">Account Active</span>
                  </div>
                </div>
              </div>

              {/* Profile Details & Settings */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {/* Personal Information Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-4 md:p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-white flex items-center space-x-2">
                      <User className="w-4 h-4 md:w-5 md:h-5 text-[#E84545]" />
                      <span>Personal Information</span>
                    </h3>

                    {!editMode && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:opacity-90 text-white rounded-lg flex items-center space-x-2 transition-all text-sm active:scale-95"
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Edit Profile</span>
                        <span className="sm:hidden">Edit</span>
                      </button>
                    )}
                  </div>

                  {editMode ? (
                    // Edit Mode
                    <div className="space-y-3 md:space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                            First Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, firstName: e.target.value })
                            }
                            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent outline-none"
                            placeholder="First name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, lastName: e.target.value })
                            }
                            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent outline-none"
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) =>
                            setEditForm({ ...editForm, username: e.target.value })
                          }
                          className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent outline-none"
                          placeholder="Username"
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent outline-none"
                          placeholder="email@example.com"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-700">
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="w-full sm:flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 transition-all text-sm active:scale-95"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="w-full sm:flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors text-sm active:scale-95"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-3 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                        <div className="bg-slate-800/50 rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all">
                          <p className="text-xs text-slate-400 mb-1">First Name</p>
                          <p className="text-white font-medium text-base md:text-lg">{user.firstName}</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all">
                          <p className="text-xs text-slate-400 mb-1">Last Name</p>
                          <p className="text-white font-medium text-base md:text-lg">{user.lastName || '-'}</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all">
                          <p className="text-xs text-slate-400 mb-1">Username</p>
                          <p className="text-white font-medium text-base md:text-lg">@{user.username}</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all">
                          <p className="text-xs text-slate-400 mb-1">Email Address</p>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
                            <p className="text-white font-medium text-sm md:text-base truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Outlet Information */}
                {user.outletId && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-4 md:p-6 shadow-xl">
                    <h3 className="text-base md:text-lg font-semibold text-white flex items-center space-x-2 mb-4 md:mb-6">
                      <Building className="w-4 h-4 md:w-5 md:h-5 text-[#E84545]" />
                      <span>Outlet Information</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                      <div className="bg-slate-800/50 rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all">
                        <p className="text-xs text-slate-400 mb-1">Assigned Outlet</p>
                        <p className="text-white font-medium text-base md:text-lg">{user.outletName || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 md:p-4 active:scale-[0.98] transition-all">
                        <p className="text-xs text-slate-400 mb-1">Outlet Code</p>
                        <p className="text-white font-medium text-base md:text-lg">{user.outletCode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-4 md:p-6 shadow-xl">
                  <h3 className="text-base md:text-lg font-semibold text-white flex items-center space-x-2 mb-4 md:mb-6">
                    <Lock className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                    <span>Security Settings</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                    <div className="bg-slate-800/50 rounded-lg p-4 active:scale-[0.98] transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="text-white font-medium mb-1 text-sm md:text-base">Password</p>
                          <p className="text-xs md:text-sm text-slate-400">
                            Last changed: Recently
                          </p>
                        </div>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white rounded-lg transition-all text-sm active:scale-95 flex-shrink-0"
                        >
                          Change
                        </button>
                      </div>
                      <div className="pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                          For security, change your password regularly
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4 active:scale-[0.98] transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="text-white font-medium mb-1 text-sm md:text-base">Account Status</p>
                          <p className="text-xs md:text-sm text-slate-400">
                            Active and verified
                          </p>
                        </div>
                        <div className="px-3 py-1 bg-green-900/30 border border-green-700 rounded-full flex-shrink-0">
                          <span className="text-xs font-medium text-green-400">ACTIVE</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                          Your account is in good standing
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Change Password Modal - Mobile Optimized */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-red-900/30 to-red-800/30 sticky top-0 z-10">
              <h3 className="text-lg md:text-xl font-semibold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                <span>Change Password</span>
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                  Current Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-12"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        current: !showPasswords.current,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white active:scale-95 transition-all"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                  New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-12"
                    placeholder="Enter new password (min 4 characters)"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        new: !showPasswords.new,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white active:scale-95 transition-all"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
                  Confirm New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-12"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        confirm: !showPasswords.confirm,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white active:scale-95 transition-all"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="p-3 md:p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <p className="text-xs md:text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  <span>Password Requirements</span>
                </p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                    <span>Minimum 4 characters</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                    <span>Can contain letters, numbers, and special characters</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                    <span>Don't reuse old passwords</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-700 flex flex-col sm:flex-row items-center gap-3 bg-slate-800/50 sticky bottom-0">
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={saving}
                className="w-full sm:flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg transition-colors disabled:opacity-50 text-sm active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full sm:flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 transition-all text-sm active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Changing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}