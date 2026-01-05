'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardHeader, CardBody } from '@/components/ui/card';

export default function NewOutletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Qatar',
      postalCode: '',
    },
    contact: {
      phone: '',
      email: '',
      manager: '',
    },
    taxInfo: {
      taxId: '',
      gstNumber: '',
    },
    settings: {
      currency: 'QAR',
      timezone: 'Asia/Qatar',
    },
  });

  const handleChange = (section: string, field: string, value: string) => {
    if (section === 'root') {
      setFormData({ ...formData, [field]: value });
    } else {
      setFormData({
        ...formData,
        [section]: {
          ...(formData as any)[section],
          [field]: value,
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/outlets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Outlet created successfully!');
        router.push('/autocityPro/settings/outlets');
      } else {
        alert(data.error || 'Failed to create outlet');
      }
    } catch (error) {
      console.error('Create outlet error:', error);
      alert('An error occurred while creating the outlet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/autocityPro/settings/outlets')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Register New Outlet</h1>
                <p className="text-sm text-gray-500">Create a new outlet location</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Outlet Name *"
                  value={formData.name}
                  onChange={(e) => handleChange('root', 'name', e.target.value)}
                  placeholder="e.g., AutoCity Main Branch"
                  required
                />
                <Input
                  label="Outlet Code *"
                  value={formData.code}
                  onChange={(e) => handleChange('root', 'code', e.target.value.toUpperCase())}
                  placeholder="e.g., MAIN"
                  maxLength={10}
                  required
                />
              </div>
            </CardBody>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold text-gray-900">Address</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Street Address *"
                value={formData.address.street}
                onChange={(e) => handleChange('address', 'street', e.target.value)}
                placeholder="e.g., Industrial Area Street 47"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="City *"
                  value={formData.address.city}
                  onChange={(e) => handleChange('address', 'city', e.target.value)}
                  placeholder="e.g., Doha"
                  required
                />
                <Input
                  label="State/Province *"
                  value={formData.address.state}
                  onChange={(e) => handleChange('address', 'state', e.target.value)}
                  placeholder="e.g., Doha"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Country *"
                  value={formData.address.country}
                  onChange={(e) => handleChange('address', 'country', e.target.value)}
                  required
                >
                  <option value="Qatar">Qatar</option>
                  <option value="UAE">UAE</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Kuwait">Kuwait</option>
                  <option value="Bahrain">Bahrain</option>
                  <option value="Oman">Oman</option>
                </Select>
                <Input
                  label="Postal Code *"
                  value={formData.address.postalCode}
                  onChange={(e) => handleChange('address', 'postalCode', e.target.value)}
                  placeholder="e.g., 00000"
                  required
                />
              </div>
            </CardBody>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold text-gray-900">Contact Information</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number *"
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => handleChange('contact', 'phone', e.target.value)}
                  placeholder="+974 XXXX XXXX"
                  required
                />
                <Input
                  label="Email Address *"
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => handleChange('contact', 'email', e.target.value)}
                  placeholder="outlet@autocityqatar.com"
                  required
                />
              </div>
              <Input
                label="Manager Name *"
                value={formData.contact.manager}
                onChange={(e) => handleChange('contact', 'manager', e.target.value)}
                placeholder="e.g., John Doe"
                required
              />
            </CardBody>
          </Card>

          {/* Tax Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold text-gray-900">Tax Information</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Tax ID *"
                  value={formData.taxInfo.taxId}
                  onChange={(e) => handleChange('taxInfo', 'taxId', e.target.value)}
                  placeholder="e.g., QAT-123456789"
                  required
                />
                <Input
                  label="GST Number (Optional)"
                  value={formData.taxInfo.gstNumber}
                  onChange={(e) => handleChange('taxInfo', 'gstNumber', e.target.value)}
                  placeholder="GST registration number"
                />
              </div>
            </CardBody>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold text-gray-900">Outlet Settings</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Currency *"
                  value={formData.settings.currency}
                  onChange={(e) => handleChange('settings', 'currency', e.target.value)}
                  required
                >
                  <option value="QAR">QAR - Qatari Riyal</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="KWD">KWD - Kuwaiti Dinar</option>
                  <option value="BHD">BHD - Bahraini Dinar</option>
                  <option value="OMR">OMR - Omani Rial</option>
                </Select>
                <Select
                  label="Timezone *"
                  value={formData.settings.timezone}
                  onChange={(e) => handleChange('settings', 'timezone', e.target.value)}
                  required
                >
                  <option value="Asia/Qatar">Asia/Qatar (UTC+3)</option>
                  <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                  <option value="Asia/Kuwait">Asia/Kuwait (UTC+3)</option>
                </Select>
              </div>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/autocityPro/settings/outlets')}
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-5 w-5 mr-2" />
              {loading ? 'Creating...' : 'Create Outlet'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
