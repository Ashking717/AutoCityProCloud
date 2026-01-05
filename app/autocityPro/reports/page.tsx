'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  TrendingUp,
  Scale,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Calendar,
  Activity,
  BarChart3,
} from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    fetchUser();
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
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const reports = [
    {
      id: 'profit-loss',
      name: 'Profit & Loss',
      description: 'Income statement with revenue and expenses',
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      path: '/autocityPro/reports/profit-loss',
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity statement',
      icon: Scale,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      path: '/autocityPro/reports/balance-sheet',
    },
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'Detailed sales analysis by product and customer',
      icon: DollarSign,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      path: '/autocityPro/reports/sales',
    },
    {
      id: 'purchases',
      name: 'Purchase Report',
      description: 'Purchase analysis by supplier and category',
      icon: ShoppingCart,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      path: '/autocityPro/reports/purchases',
    },
    {
      id: 'stock',
      name: 'Stock Report',
      description: 'Inventory valuation and stock alerts',
      icon: Package,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      path: '/autocityPro/reports/stock',
    },
    {
      id: 'customer-ledger',
      name: 'Customer Ledger',
      description: 'Customer account statements and balances',
      icon: Users,
      color: 'pink',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200',
      path: '/autocityPro/reports/customer-ledger',
    },
    {
      id: 'daybook',
      name: 'Daybook',
      description: 'Daily transaction summary',
      icon: Calendar,
      color: 'teal',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-200',
      path: '/autocityPro/reports/daybook',
    },
    {
      id: 'cashflow',
      name: 'Cash Flow',
      description: 'Operating, investing, and financing activities',
      icon: Activity,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      path: '/autocityPro/reports/cashflow',
    },
  ];
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center space-x-3 mb-8">
          <BarChart3 className="h-10 w-10 text-purple-600" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-600 mt-1">Comprehensive business insights and analytics</p>
          </div>
        </div>
        
        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => router.push(report.path)}
              className={`${report.bgColor} ${report.borderColor} border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-200 text-left group`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`${report.iconColor} p-3 rounded-lg bg-white`}>
                  <report.icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {report.name}
              </h3>
              <p className="text-sm text-gray-600">{report.description}</p>
            </button>
          ))}
        </div>
        
        {/* Report Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Report Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Date Range Filtering</h3>
                <p className="text-sm text-gray-600">Filter reports by custom date ranges</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Export Options</h3>
                <p className="text-sm text-gray-600">Download as PDF or Excel</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Real-time Data</h3>
                <p className="text-sm text-gray-600">Live updates from your transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
