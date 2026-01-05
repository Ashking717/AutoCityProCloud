'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'byCategory' | 'alerts'>('summary');
  
  useEffect(() => {
    fetchUser();
    fetchReport();
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
  
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/stock', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (loading || !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating stock report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const summary = reportData.summary || {
    totalStockValue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    overStockItems: 0,
    deadStockItems: 0,
  };
  
  const products = reportData.products || [];
  const stockByCategory = reportData.stockByCategory || {};
  const deadStock = reportData.deadStock || [];
  
  const getStockStatus = (product: any) => {
    const currentStock = product.currentStock || 0;
    const minStock = product.minStock || 0;
    const maxStock = product.maxStock || 1000;
    
    if (currentStock <= 0) return 'out';
    if (currentStock <= minStock) return 'low';
    if (currentStock > maxStock) return 'over';
    return 'normal';
  };
  
  const stockHealth = {
    normal: products.filter((p: any) => getStockStatus(p) === 'normal').length,
    low: summary.lowStockItems,
    out: summary.outOfStockItems,
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Report</h1>
              <p className="text-gray-600 mt-1">Inventory valuation and alerts</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Refresh
            </button>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => toast.success('PDF export coming soon!')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalProducts}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-green-600">QAR {summary.totalStockValue.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{summary.lowStockItems}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{summary.outOfStockItems}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'summary', label: 'Summary' },
                { key: 'detailed', label: 'Detailed Stock' },
                { key: 'byCategory', label: 'By Category' },
                { key: 'alerts', label: 'Stock Alerts' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as any)}
                  className={`${
                    viewMode === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {viewMode === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Stock Health</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border-l-4 border-green-500 pl-4">
                      <p className="text-sm text-gray-600">Normal Stock</p>
                      <p className="text-2xl font-bold text-gray-900">{stockHealth.normal}</p>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-4">
                      <p className="text-sm text-gray-600">Low Stock</p>
                      <p className="text-2xl font-bold text-orange-600">{stockHealth.low}</p>
                    </div>
                    <div className="border-l-4 border-red-500 pl-4">
                      <p className="text-sm text-gray-600">Out of Stock</p>
                      <p className="text-2xl font-bold text-red-600">{stockHealth.out}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="text-sm text-gray-600">Total Inventory Value</p>
                  <p className="text-3xl font-bold text-indigo-600">QAR {summary.totalStockValue.toLocaleString()}</p>
                </div>
              </div>
            )}
            
            {viewMode === 'detailed' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product: any) => {
                      const status = getStockStatus(product);
                      const stockValue = (product.currentStock || 0) * (product.costPrice || 0);
                      
                      return (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{product.sku}</td>
                          <td className="px-4 py-3 text-sm text-right">{product.currentStock || 0}</td>
                          <td className="px-4 py-3 text-sm text-right">{product.minStock || 0}</td>
                          <td className="px-4 py-3 text-sm text-right">QAR {(product.costPrice || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">QAR {stockValue.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              status === 'out' ? 'bg-red-100 text-red-800' :
                              status === 'low' ? 'bg-orange-100 text-orange-800' :
                              status === 'over' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {status === 'out' ? 'Out of Stock' :
                               status === 'low' ? 'Low Stock' :
                               status === 'over' ? 'Overstock' :
                               'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {viewMode === 'byCategory' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Products</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(stockByCategory).map(([category, data]: [string, any]) => (
                      <tr key={category} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{category}</td>
                        <td className="px-4 py-3 text-sm text-right">{data.count}</td>
                        <td className="px-4 py-3 text-sm text-right">{data.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">QAR {data.value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {viewMode === 'alerts' && (
              <div className="space-y-6">
                {summary.outOfStockItems > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Out of Stock ({summary.outOfStockItems})
                    </h3>
                    <div className="space-y-2">
                      {products
                        .filter((p: any) => getStockStatus(p) === 'out')
                        .map((product: any) => (
                          <div key={product._id} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div>
                              <p className="font-semibold text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                            </div>
                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">
                              Reorder Now
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {summary.lowStockItems > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Low Stock ({summary.lowStockItems})
                    </h3>
                    <div className="space-y-2">
                      {products
                        .filter((p: any) => getStockStatus(p) === 'low')
                        .map((product: any) => (
                          <div key={product._id} className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div>
                              <p className="font-semibold text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-600">
                                Current: {product.currentStock || 0} | Min: {product.minStock || 0}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full">
                              Low Stock
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {summary.outOfStockItems === 0 && summary.lowStockItems === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-gray-600 text-lg">All stock levels are healthy!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
