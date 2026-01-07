// app/autocityPro/vouchers/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, DollarSign, Calendar, FileText, CheckCircle, XCircle, Printer, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoucherViewPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  
  useEffect(() => {
    fetchUser();
    fetchVoucher();
  }, [params.id]);
  
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
  
  const fetchVoucher = async () => {
    try {
      const res = await fetch(`/api/vouchers/${params.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setVoucher(data.voucher);
      } else {
        toast.error('Failed to fetch voucher');
        router.push('/autocityPro/vouchers');
      }
    } catch (error) {
      console.error('Error fetching voucher:', error);
      toast.error('Failed to fetch voucher');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePostVoucher = async () => {
    if (!confirm('Are you sure you want to post this voucher? This cannot be undone.')) {
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/vouchers/${params.id}/post`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast.success('Voucher posted successfully!');
        fetchVoucher();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to post voucher');
      }
    } catch (error) {
      toast.error('Failed to post voucher');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleDeleteVoucher = async () => {
    if (!confirm('Are you sure you want to delete this voucher? This cannot be undone.')) {
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/vouchers/${params.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast.success('Voucher deleted successfully!');
        router.push('/autocityPro/vouchers');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete voucher');
      }
    } catch (error) {
      toast.error('Failed to delete voucher');
    } finally {
      setProcessing(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      draft: { color: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50', icon: <FileText className="h-4 w-4" /> },
      posted: { color: 'bg-blue-900/30 text-blue-400 border border-blue-800/50', icon: <CheckCircle className="h-4 w-4" /> },
      approved: { color: 'bg-green-900/30 text-green-400 border border-green-800/50', icon: <CheckCircle className="h-4 w-4" /> },
      void: { color: 'bg-red-900/30 text-red-400 border border-red-800/50', icon: <XCircle className="h-4 w-4" /> },
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`px-3 py-1.5 inline-flex items-center space-x-2 text-xs font-semibold rounded-full ${config.color}`}>
        {config.icon}
        <span className="capitalize">{status}</span>
      </span>
    );
  };
  
  const getVoucherTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-8 w-8 text-red-400" />;
      case 'receipt': return <DollarSign className="h-8 w-8 text-green-400" />;
      case 'journal': return <FileText className="h-8 w-8 text-blue-400" />;
      case 'contra': return <FileText className="h-8 w-8 text-purple-400" />;
      default: return <FileText className="h-8 w-8 text-slate-400" />;
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-slate-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
        </div>
      </MainLayout>
    );
  }
  
  if (!voucher) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 bg-slate-800 min-h-screen">
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-8 text-center">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Voucher Not Found</h2>
            <button
              onClick={() => router.push('/autocityPro/vouchers')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90"
            >
              Back to Vouchers
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/autocityPro/vouchers')}
                className="text-white hover:text-slate-200 mt-1"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  {getVoucherTypeIcon(voucher.voucherType)}
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {voucher.voucherType.charAt(0).toUpperCase() + voucher.voucherType.slice(1)} Voucher
                    </h1>
                    <p className="text-purple-100">{voucher.voucherNumber}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-3">
                  {getStatusBadge(voucher.status)}
                  <div className="flex items-center text-purple-100">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(voucher.date).toLocaleDateString()}
                  </div>
                  {voucher.referenceNumber && (
                    <div className="text-purple-100">
                      Ref: {voucher.referenceNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 border border-white/30"
              >
                <Printer className="h-5 w-5" />
                <span>Print</span>
              </button>
              {voucher.status === 'draft' && (
                <>
                  <button
                    onClick={() => router.push(`/autocityPro/vouchers/${params.id}/edit`)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 border border-white/30"
                  >
                    <Edit className="h-5 w-5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDeleteVoucher}
                    disabled={processing}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-8 bg-slate-800 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Narration */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">Narration</h2>
            <p className="text-slate-300">{voucher.narration}</p>
          </div>
          
          {/* Entries Table */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Narration</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Debit (QAR)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Credit (QAR)</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900 divide-y divide-slate-800">
                {voucher.entries.map((entry: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-100">{entry.accountName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{entry.narration || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-slate-100">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-slate-100">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-800">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                    Totals:
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-slate-100">
                      QAR {voucher.totalDebit?.toLocaleString() || '0'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-slate-100">
                      QAR {voucher.totalCredit?.toLocaleString() || '0'}
                    </p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Voucher Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Created By</p>
                  <p className="text-slate-100">
                    {voucher.createdBy?.firstName} {voucher.createdBy?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Created Date</p>
                  <p className="text-slate-100">
                    {new Date(voucher.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Actions</h3>
              <div className="space-y-3">
                {voucher.status === 'draft' && (
                  <button
                    onClick={handlePostVoucher}
                    disabled={processing}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {processing ? 'Posting...' : 'Post Voucher'}
                  </button>
                )}
                {voucher.status === 'posted' && (
                  <button
                    onClick={() => toast.success('Approval feature coming soon!')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Approve Voucher
                  </button>
                )}
                {(voucher.status === 'posted' || voucher.status === 'approved') && (
                  <button
                    onClick={() => toast.success('Void feature coming soon!')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Void Voucher
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}