'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Calendar, Lock, Check, X, FileText, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClosingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  const [newClosing, setNewClosing] = useState({
    closingType: 'day' as 'day' | 'month',
    closingDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  useEffect(() => {
    fetchUser();
    fetchClosings();
  }, [filterType]);
  
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
  
  const fetchClosings = async () => {
    try {
      const url = filterType === 'all' 
        ? '/api/closings'
        : `/api/closings?closingType=${filterType}`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClosings(data.closings || []);
      }
    } catch (error) {
      console.error('Failed to fetch closings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = async () => {
    try {
      const res = await fetch('/api/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newClosing),
      });
      
      if (res.ok) {
        toast.success(`${newClosing.closingType === 'day' ? 'Day' : 'Month'} closed successfully!`);
        setShowCloseModal(false);
        setNewClosing({
          closingType: 'day',
          closingDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchClosings();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to close period');
      }
    } catch (error) {
      toast.error('Failed to close period');
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <Lock className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Day & Month Closing</h1>
              <p className="text-gray-600 mt-1">{closings.length} closings recorded</p>
            </div>
          </div>
          <button
            onClick={() => setShowCloseModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90"
          >
            <Lock className="h-5 w-5" />
            <span>Close Period</span>
          </button>
        </div>
        
        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Closings
            </button>
            <button
              onClick={() => setFilterType('day')}
              className={`px-4 py-2 rounded-lg ${
                filterType === 'day'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day Closings
            </button>
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-lg ${
                filterType === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month Closings
            </button>
          </div>
        </div>
        
        {/* Closings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading closings...</p>
            </div>
          ) : closings.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No closings found</p>
            </div>
          ) : (
            closings.map((closing) => (
              <div
                key={closing._id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 ${
                  closing.status === 'locked'
                    ? 'border-red-500'
                    : closing.status === 'closed'
                    ? 'border-green-500'
                    : 'border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                      {closing.closingType === 'day' ? 'Day' : 'Month'} Closing
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(closing.closingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      closing.status === 'locked'
                        ? 'bg-red-100 text-red-800'
                        : closing.status === 'closed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {closing.status}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-semibold text-green-600">
                      QAR {closing.totalSales.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sales Count:</span>
                    <span className="font-semibold">{closing.salesCount}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Net Profit:</span>
                    <span
                      className={`font-semibold ${
                        closing.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      QAR {closing.netProfit.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600">Opening Cash:</span>
                    <span className="font-medium">QAR {closing.openingCash.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Closing Cash:</span>
                    <span className="font-semibold text-indigo-600">
                      QAR {closing.closingCash.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600">Closed By:</span>
                    <span className="text-gray-900">
                      {closing.closedBy?.firstName} {closing.closedBy?.lastName}
                    </span>
                  </div>
                </div>
                
                {closing.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                    <FileText className="h-4 w-4 inline mr-1" />
                    {closing.notes}
                  </div>
                )}
                
                <button
                  onClick={() => router.push(`/autocityPro/closings/${closing._id}`)}
                  className="w-full mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Close Period Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <Lock className="h-5 w-5 mr-2 text-indigo-600" />
                Close Period
              </h2>
              <button onClick={() => setShowCloseModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Closing Type *
                </label>
                <select
                  value={newClosing.closingType}
                  onChange={(e) =>
                    setNewClosing({
                      ...newClosing,
                      closingType: e.target.value as 'day' | 'month',
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="day">Day Closing</option>
                  <option value="month">Month Closing</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Closing Date *
                </label>
                <input
                  type="date"
                  value={newClosing.closingDate}
                  onChange={(e) =>
                    setNewClosing({ ...newClosing, closingDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Notes
                </label>
                <textarea
                  value={newClosing.notes}
                  onChange={(e) =>
                    setNewClosing({ ...newClosing, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Add any notes or observations..."
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Closing a period will lock all transactions
                  for that period and calculate final balances. This action should be
                  verified before proceeding.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Close Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
