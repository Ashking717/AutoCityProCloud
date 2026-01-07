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
  
  // Function to convert stock value to code format
  const convertToStockCode = (value: number) => {
    const valueStr = Math.floor(value).toString();
    let result = '';
    
    // Correct mapping based on examples: 0->R, 9->E
    for (let i = 0; i < valueStr.length; i++) {
      const digit = parseInt(valueStr[i]);
      switch (digit) {
        case 0: result += 'R'; break;  // 0 -> R
        case 1: result += 'F'; break;  // 1 -> F
        case 2: result += 'I'; break;  // 2 -> I
        case 3: result += 'N'; break;  // 3 -> N
        case 4: result += 'D'; break;  // 4 -> D
        case 5: result += 'M'; break;  // 5 -> M
        case 6: result += 'O'; break;  // 6 -> O
        case 7: result += 'T'; break;  // 7 -> T
        case 8: result += 'H'; break;  // 8 -> H
        case 9: result += 'E'; break;  // 9 -> E
        default: result += digit;
      }
    }
    
    // DO NOT remove duplicate consecutive letters
    return result;
  };
  
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
  
  // Convert total stock value
  const totalStockCode = convertToStockCode(totalStockValue);
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Stock Management</h1>
            <p className="text-purple-100 mt-1">Monitor and manage your inventory levels</p>
          </div>
        </div>
      </div>
      <div className='p-6 bg-slate-900 border-b border-slate-700'>
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen rounded-xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Stock Value</p>
                <p className="text-2xl font-bold text-slate-100">{totalStockCode}</p>
                <p className="text-xs text-slate-500 mt-1">QAR {totalStockValue.toLocaleString()}</p>
              </div>
              <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-800/50">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-400">{lowStockItems.length}</p>
              </div>
              <div className="bg-orange-900/30 p-3 rounded-lg border border-orange-800/50">
                <TrendingDown className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Out of Stock</p>
                <p className="text-2xl font-bold text-red-400">{outOfStockItems.length}</p>
              </div>
              <div className="bg-red-900/30 p-3 rounded-lg border border-red-800/50">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Stock</p>
                <p className="text-2xl font-bold text-yellow-400">{criticalItems.length}</p>
              </div>
              <div className="bg-yellow-900/30 p-3 rounded-lg border border-yellow-800/50">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-orange-900/20 border-l-4 border-orange-500 p-6 mb-6 rounded-lg border border-orange-800/30">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-orange-300">
                  {lowStockItems.length} items need reordering
                </h3>
                <p className="text-orange-400/90 mt-1">
                  These products are running low on stock and need to be reordered soon.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Stock Table */}
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-slate-100">Stock Levels</h2>
          </div>
          
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Min Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Reorder Point</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stock Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading stock data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Package className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  let statusColor = 'bg-green-900/30 text-green-400 border border-green-800/50';
                  let statusText = 'In Stock';
                  let statusIcon = <TrendingUp className="h-4 w-4" />;
                  
                  if (product.currentStock <= 0) {
                    statusColor = 'bg-red-900/30 text-red-400 border border-red-800/50';
                    statusText = 'Out of Stock';
                    statusIcon = <AlertTriangle className="h-4 w-4" />;
                  } else if (product.currentStock <= product.minStock) {
                    statusColor = 'bg-orange-900/30 text-orange-400 border border-orange-800/50';
                    statusText = 'Critical';
                    statusIcon = <AlertTriangle className="h-4 w-4" />;
                  } else if (product.currentStock <= product.reorderPoint) {
                    statusColor = 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50';
                    statusText = 'Low Stock';
                    statusIcon = <TrendingDown className="h-4 w-4" />;
                  }
                  
                  // Calculate individual product stock value
                  const productStockValue = product.currentStock * product.costPrice;
                  const productStockCode = convertToStockCode(productStockValue);
                  
                  return (
                    <tr key={product._id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-100">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sku}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-200">{product.currentStock} {product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-200">{product.minStock} {product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-200">{product.reorderPoint} {product.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-100">
                          {productStockCode}
                        </p>
                        
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex items-center space-x-2 text-xs font-semibold rounded-full ${statusColor}`}>
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
      </div>
    </MainLayout>
  );
}