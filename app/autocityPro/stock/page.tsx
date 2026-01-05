'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

export default function StockPage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser();
    fetchProducts();
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
  
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };
  
  const totalStockValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  const lowStockItems = products.filter(p => p.currentStock <= p.reorderPoint);
  const outOfStockItems = products.filter(p => p.currentStock <= 0);
  const criticalItems = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock);
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Stock Management</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-bold text-gray-900">QAR {totalStockValue.toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{criticalItems.length}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-6 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900">
                  {lowStockItems.length} items need reordering
                </h3>
                <p className="text-orange-700 mt-1">
                  These products are running low on stock and need to be reordered soon.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Stock Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Stock Levels</h2>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading stock data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  let statusColor = 'bg-green-100 text-green-800';
                  let statusText = 'In Stock';
                  let statusIcon = <TrendingUp className="h-4 w-4" />;
                  
                  if (product.currentStock <= 0) {
                    statusColor = 'bg-red-100 text-red-800';
                    statusText = 'Out of Stock';
                    statusIcon = <AlertTriangle className="h-4 w-4" />;
                  } else if (product.currentStock <= product.minStock) {
                    statusColor = 'bg-orange-100 text-orange-800';
                    statusText = 'Critical';
                    statusIcon = <AlertTriangle className="h-4 w-4" />;
                  } else if (product.currentStock <= product.reorderPoint) {
                    statusColor = 'bg-yellow-100 text-yellow-800';
                    statusText = 'Low Stock';
                    statusIcon = <TrendingDown className="h-4 w-4" />;
                  }
                  
                  return (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{product.currentStock} {product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{product.minStock} {product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{product.reorderPoint} {product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          QAR {(product.currentStock * product.costPrice).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex items-center space-x-1 text-xs font-semibold rounded-full ${statusColor}`}>
                          {statusIcon}
                          <span>{statusText}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
