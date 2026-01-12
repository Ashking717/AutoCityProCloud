// app/autocityPro/vouchers/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowLeft, DollarSign, Calendar, FileText, CheckCircle, XCircle, Printer, Edit, Trash2, MoreVertical, X, ChevronLeft, Clock, User, CreditCard, Download, Share2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoucherViewPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
  useEffect(() => {
    fetchUser();
    fetchVoucher();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
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
      case 'payment': return <DollarSign className="h-5 w-5 text-red-400" />;
      case 'receipt': return <DollarSign className="h-5 w-5 text-green-400" />;
      case 'journal': return <FileText className="h-5 w-5 text-blue-400" />;
      case 'contra': return <CreditCard className="h-5 w-5 text-purple-400" />;
      default: return <FileText className="h-5 w-5 text-slate-400" />;
    }
  };
  
  const getVoucherTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return 'text-red-400 bg-red-900/20 border-red-800/30';
      case 'receipt': return 'text-green-400 bg-green-900/20 border-green-800/30';
      case 'journal': return 'text-blue-400 bg-blue-900/20 border-blue-800/30';
      case 'contra': return 'text-purple-400 bg-purple-900/20 border-purple-800/30';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-800/30';
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const downloadVoucherPDF = () => {
    toast.success('PDF export feature coming soon!');
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QAR ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QAR ${(amount / 1000).toFixed(1)}K`;
    return `QAR ${amount.toFixed(0)}`;
  };
  
  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#E84545]"></div>
        </div>
      </MainLayout>
    );
  }
  
  if (!voucher) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 bg-[#050505] min-h-screen">
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Voucher Not Found</h2>
            <button
              onClick={() => router.push('/autocityPro/vouchers')}
              className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 active:scale-95 transition-all"
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
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getVoucherTypeIcon(voucher.voucherType)}
                  <span className="text-white text-xs font-semibold">
                    {voucher.voucherType.charAt(0).toUpperCase() + voucher.voucherType.slice(1)}
                  </span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{voucher.voucherNumber}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#E84545]" />
                  <span className="text-[#E84545] text-xs font-medium capitalize">{voucher.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/autocityPro/vouchers')}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {voucher.voucherType.charAt(0).toUpperCase() + voucher.voucherType.slice(1)}
                  </h1>
                  <p className="text-xs text-white/60">{voucher.voucherNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/autocityPro/vouchers')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getVoucherTypeColor(voucher.voucherType)}`}>
                    {getVoucherTypeIcon(voucher.voucherType)}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {voucher.voucherType.charAt(0).toUpperCase() + voucher.voucherType.slice(1)} Voucher
                    </h1>
                    <p className="text-white/80 mt-1">{voucher.voucherNumber}</p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Print</span>
                </button>
                {voucher.status === 'draft' && (
                  <>
                    <button
                      onClick={() => router.push(`/autocityPro/vouchers/${params.id}/edit`)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                    >
                      <Edit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleDeleteVoucher}
                      disabled={processing}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all group"
                    >
                      <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              {getStatusBadge(voucher.status)}
              <div className="flex items-center text-white/80">
                <Calendar className="h-4 w-4 mr-2" />
                {new Date(voucher.date).toLocaleDateString()}
              </div>
              {voucher.referenceNumber && (
                <div className="text-white/80">
                  Ref: {voucher.referenceNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          <div className="max-w-6xl mx-auto">
            {/* Summary Cards - Mobile */}
            <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-red-900/20 rounded-xl">
                    <DollarSign className="h-4 w-4 text-red-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-1">Total Debit</p>
                <p className="text-lg font-bold text-red-400 truncate">
                  QAR {voucher.totalDebit?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-900/20 rounded-xl">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-1">Total Credit</p>
                <p className="text-lg font-bold text-green-400 truncate">
                  QAR {voucher.totalCredit?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-900/20 rounded-xl">
                    <Calendar className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-1">Date</p>
                <p className="text-lg font-bold text-white">
                  {new Date(voucher.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-900/20 rounded-xl">
                    <User className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-1">Created By</p>
                <p className="text-lg font-bold text-white truncate">
                  {voucher.createdBy?.firstName?.[0]}{voucher.createdBy?.lastName?.[0]}
                </p>
              </div>
            </div>

            {/* Narration - Mobile */}
            <div className="md:hidden bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-[#E84545]" />
                <span className="text-white text-sm font-semibold">Narration</span>
              </div>
              <p className="text-sm text-slate-300">{voucher.narration}</p>
            </div>

            {/* Narration - Desktop */}
            <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">Narration</h2>
              <p className="text-slate-300">{voucher.narration}</p>
            </div>
            
            {/* Entries Table - Mobile */}
            <div className="md:hidden space-y-3 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Entries</h2>
                <span className="text-sm text-slate-500">{voucher.entries.length} entries</span>
              </div>
              
              {voucher.entries.map((entry: any, index: number) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-br from-[#0A0A0A] to-slate-900 border border-white/10 rounded-xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{entry.accountName}</h3>
                      <p className="text-xs text-slate-400 mt-1 truncate">{entry.narration || 'No description'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      {entry.debit > 0 ? (
                        <span className="text-sm font-semibold text-red-400">QAR {entry.debit.toLocaleString()}</span>
                      ) : (
                        <span className="text-sm font-semibold text-green-400">QAR {entry.credit.toLocaleString()}</span>
                      )}
                      <span className="text-xs text-slate-500 mt-1">
                        {entry.debit > 0 ? 'Debit' : 'Credit'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Entries Table - Desktop */}
            <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden mb-6">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Entries</h2>
                <p className="text-sm text-slate-400">{voucher.entries.length} entries</p>
              </div>
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-[#0A0A0A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Narration</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Debit (QAR)</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Credit (QAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {voucher.entries.map((entry: any, index: number) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{entry.accountName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300">{entry.narration || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`text-sm font-medium ${entry.debit > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`text-sm font-medium ${entry.credit > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                          {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#0A0A0A] border-t border-white/10">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                      Totals:
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-red-400">
                        QAR {voucher.totalDebit?.toLocaleString() || '0'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-green-400">
                        QAR {voucher.totalCredit?.toLocaleString() || '0'}
                      </p>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Voucher Details */}
              <div className="bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Voucher Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-slate-400">Created By</span>
                    <span className="text-sm font-medium text-white">
                      {voucher.createdBy?.firstName} {voucher.createdBy?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-slate-400">Created Date</span>
                    <span className="text-sm text-white">
                      {new Date(voucher.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-slate-400">Last Updated</span>
                    <span className="text-sm text-white">
                      {new Date(voucher.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  {voucher.referenceNumber && (
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-sm text-slate-400">Reference Number</span>
                      <span className="text-sm text-white font-mono">{voucher.referenceNumber}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                <div className="space-y-3">
                  {voucher.status === 'draft' && (
                    <button
                      onClick={handlePostVoucher}
                      disabled={processing}
                      className="w-full px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white font-semibold rounded-lg hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {processing ? 'Posting...' : 'Post Voucher'}
                    </button>
                  )}
                  {voucher.status === 'posted' && (
                    <button
                      onClick={() => toast.success('Approval feature coming soon!')}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all"
                    >
                      Approve Voucher
                    </button>
                  )}
                  {(voucher.status === 'posted' || voucher.status === 'approved') && (
                    <button
                      onClick={() => toast.success('Void feature coming soon!')}
                      className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all"
                    >
                      Void Voucher
                    </button>
                  )}
                  <button
                    onClick={downloadVoucherPDF}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {voucher.status === 'draft' && (
                <>
                  <button
                    onClick={() => {
                      router.push(`/autocityPro/vouchers/${params.id}/edit`);
                      setShowMobileMenu(false);
                    }}
                    className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
                  >
                    <span>Edit Voucher</span>
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      handlePostVoucher();
                      setShowMobileMenu(false);
                    }}
                    disabled={processing}
                    className="w-full p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-between active:scale-95"
                  >
                    <span>{processing ? 'Posting...' : 'Post Voucher'}</span>
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteVoucher();
                      setShowMobileMenu(false);
                    }}
                    disabled={processing}
                    className="w-full p-4 bg-red-900/30 border border-red-800/50 text-red-400 font-semibold rounded-xl hover:bg-red-900/40 transition-all flex items-center justify-between active:scale-95"
                  >
                    <span>Delete Voucher</span>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  handlePrint();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Print Voucher</span>
                <Printer className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadVoucherPDF();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Download PDF</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  toast.success('Share feature coming soon!');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Share Voucher</span>
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}