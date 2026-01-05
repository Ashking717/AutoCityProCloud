'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody } from '@/components/ui/card';

interface Outlet {
  _id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
    manager: string;
  };
  taxInfo: {
    taxId: string;
    gstNumber?: string;
  };
  settings: {
    currency: string;
    timezone: string;
  };
  isActive: boolean;
  createdAt: string;
}

export default function OutletsPage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchOutlets();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Only SUPERADMIN can manage outlets
        if (data.user.role !== 'SUPERADMIN') {
          alert('Access denied. Only SUPERADMIN can manage outlets.');
          router.push('/autocityPro/dashboard');
        }
      } else {
        router.push('/autocityPro/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/autocityPro/login');
    }
  };

  const fetchOutlets = async () => {
    try {
      const response = await fetch('/api/outlets');
      if (response.ok) {
        const data = await response.json();
        setOutlets(data.outlets);
      }
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this outlet?')) return;

    try {
      const response = await fetch(`/api/outlets/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Outlet deactivated successfully');
        fetchOutlets();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to deactivate outlet');
      }
    } catch (error) {
      console.error('Deactivate error:', error);
      alert('An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading outlets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/autocityPro/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Outlet Management</h1>
                <p className="text-sm text-gray-500">Manage all outlet locations</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/autocityPro/settings/outlets/new')}
              className="flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Outlet</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {outlets.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Outlets Yet</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first outlet</p>
              <Button onClick={() => router.push('/autocityPro/settings/outlets/new')}>
                <Plus className="h-5 w-5 mr-2" />
                Create First Outlet
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outlets.map((outlet) => (
              <Card key={outlet._id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{outlet.name}</h3>
                      <p className="text-sm text-gray-500">Code: {outlet.code}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      outlet.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {outlet.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </CardHeader>
                
                <CardBody className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {outlet.address.street}
                      </p>
                      <p className="text-sm text-gray-600">
                        {outlet.address.city}, {outlet.address.state}
                      </p>
                      <p className="text-sm text-gray-600">
                        {outlet.address.country} - {outlet.address.postalCode}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{outlet.contact.phone}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{outlet.contact.email}</span>
                  </div>

                  {/* Manager */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Manager</p>
                    <p className="text-sm font-medium text-gray-900">{outlet.contact.manager}</p>
                  </div>

                  {/* Tax Info */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Tax ID</p>
                    <p className="text-sm font-medium text-gray-900">{outlet.taxInfo.taxId}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => router.push(`/autocityPro/settings/outlets/${outlet._id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {outlet.isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeactivate(outlet._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
