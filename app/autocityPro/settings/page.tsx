'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { UserRole, UserRoleType } from '@/lib/types/roles';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);

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
    } finally {
      setLoading(false);
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

    // Validate outlet for non-superadmin users
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'CASHIER':
        return 'bg-green-100 text-green-800';
      case 'ACCOUNTANT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage users and outlets</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Building2 className="h-5 w-5 inline mr-2" />
                  Outlets
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              {canCreateUser && (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add User</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Outlet
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No users found</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {u.firstName?.[0]}{u.lastName?.[0]}
                              </span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-xs text-gray-500">@{u.username}</p>
                              {u._id === user?._id && (
                                <span className="text-xs text-green-600">(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{u.email}</p>
                          {u.phone && (
                            <p className="text-xs text-gray-500">{u.phone}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                              u.role
                            )}`}
                          >
                            <Shield className="h-3 w-3 inline mr-1" />
                            {getRoleDisplayName(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {u.outletId?.name || 'All Outlets'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canCreateUser && u._id !== user?._id && (
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outlets Tab */}
        {activeTab === 'outlets' && canCreateOutlet && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Outlet Management</h2>
              <button
                onClick={() => setShowOutletModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5" />
                <span>Add Outlet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {outlets.map((outlet) => (
                <div
                  key={outlet._id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Building2 className="h-8 w-8 text-indigo-600" />
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        outlet.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {outlet.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {outlet.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Code: {outlet.code}</p>

                  <div className="space-y-2 text-sm">
                    {outlet.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {outlet.phone}
                      </div>
                    )}
                    {outlet.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {outlet.email}
                      </div>
                    )}
                    {outlet.address?.city && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {outlet.address.city}, {outlet.address.country}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                Add New User
              </h2>
              <button onClick={() => setShowUserModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="johndoe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="+974-XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as UserRoleType,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
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
                  <p className="text-xs text-gray-500 mt-1">
                    {getRoleDescription(newUser.role)}
                  </p>
                </div>

                {(user?.role === 'SUPERADMIN' || newUser.role !== 'SUPERADMIN') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Outlet {newUser.role !== 'SUPERADMIN' && '*'}
                    </label>
                    <select
                      value={newUser.outletId}
                      onChange={(e) =>
                        setNewUser({ ...newUser, outletId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
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

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Outlet Modal - keeping previous implementation */}
      {showOutletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
                Add New Outlet
              </h2>
              <button onClick={() => setShowOutletModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Outlet Name *
                  </label>
                  <input
                    type="text"
                    value={newOutlet.name}
                    onChange={(e) =>
                      setNewOutlet({ ...newOutlet, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Main Branch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={newOutlet.code}
                    onChange={(e) =>
                      setNewOutlet({
                        ...newOutlet,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg uppercase"
                    placeholder="MAIN001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={newOutlet.phone}
                    onChange={(e) =>
                      setNewOutlet({ ...newOutlet, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="+974-XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newOutlet.email}
                    onChange={(e) =>
                      setNewOutlet({ ...newOutlet, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="outlet@example.com"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Tax Number
                  </label>
                  <input
                    type="text"
                    value={newOutlet.taxNumber}
                    onChange={(e) =>
                      setNewOutlet({ ...newOutlet, taxNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="TAX123456"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Street
                    </label>
                    <input
                      type="text"
                      value={newOutlet.address.street}
                      onChange={(e) =>
                        setNewOutlet({
                          ...newOutlet,
                          address: { ...newOutlet.address, street: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={newOutlet.address.city}
                      onChange={(e) =>
                        setNewOutlet({
                          ...newOutlet,
                          address: { ...newOutlet.address, city: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Doha"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={newOutlet.address.state}
                      onChange={(e) =>
                        setNewOutlet({
                          ...newOutlet,
                          address: { ...newOutlet.address, state: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={newOutlet.address.country}
                      onChange={(e) =>
                        setNewOutlet({
                          ...newOutlet,
                          address: { ...newOutlet.address, country: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Qatar"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={newOutlet.address.postalCode}
                      onChange={(e) =>
                        setNewOutlet({
                          ...newOutlet,
                          address: {
                            ...newOutlet.address,
                            postalCode: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="00000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowOutletModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOutlet}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Outlet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
