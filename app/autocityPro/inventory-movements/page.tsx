'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Search, 
  Plus, 
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  Filter,
  Download,
  FileText,
  ShoppingCart,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Movement {
  _id: string;
  productName: string;
  sku: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  referenceType: string;
  referenceNumber: string;
  balanceAfter: number;
  date: string;
  notes?: string;
  ledgerEntriesCreated: boolean;
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function InventoryMovementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
  useEffect(() => {
    fetchUser();
    fetchMovements();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
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
  
  const fetchMovements = async () => {
    try {
      setLoading(true);
      const url = filterType === 'ALL' 
        ? '/api/inventory-movements'
        : `/api/inventory-movements?movementType=${filterType}`;
        
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Failed to fetch movements');
      toast.error('Failed to load inventory movements');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredMovements = movements.filter(m =>
    m.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ShoppingCart className="h-4 w-4" />;
      case 'SALE':
        return <FileText className="h-4 w-4" />;
      case 'ADJUSTMENT':
        return <RefreshCw className="h-4 w-4" />;
      case 'RETURN':
        return <ArrowDownRight className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };
  
  const getMovementColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'SALE':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'ADJUSTMENT':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'RETURN':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };
  
  const totalIn = stats
    .filter(s => ['PURCHASE', 'RETURN'].includes(s._id))
    .reduce((sum, s) => sum + s.totalValue, 0);
    
  const totalOut = stats
    .filter(s => ['SALE'].includes(s._id))
    .reduce((sum, s) => sum + Math.abs(s.totalValue), 0);
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{filteredMovements.length}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">Movements</span>
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
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Inventory</h1>
                  <p className="text-xs text-white/60">{filteredMovements.length} movements</p>
                </div>
              </div>
              <button
                onClick={() => fetchMovements()}
                className="p-2 rounded-xl bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white hover:shadow-lg hover:shadow-[#E84545]/20 active:scale-95 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search movements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#E84545]/50 focus:ring-1 focus:ring-[#E84545]/50"
              />
            </div>

            {/* Mobile Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {['ALL', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    filterType === type
                      ? 'bg-[#E84545] text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-3 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                  <Warehouse className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Inventory Movements</h1>
                  <p className="text-white/80 mt-1">{filteredMovements.length} movements found</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => fetchMovements()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => toast.success('Export coming soon!')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Desktop Search & Filter */}
            <div className="mt-6 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <input
                  type="text"
                  placeholder="Search by product, SKU, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                />
              </div>
              
              <div className="flex gap-2">
                {['ALL', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      filterType === type
                        ? 'bg-white text-[#932222]'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[260px] md:pt-6 pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Package className="h-5 w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Movements</p>
              <p className="text-xl font-bold text-white">{movements.length}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-400/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Stock In Value</p>
              <p className="text-xl font-bold text-green-400">QAR {totalIn.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-400/10 rounded-xl">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Stock Out Value</p>
              <p className="text-xl font-bold text-red-400">QAR {totalOut.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-400/10 rounded-xl">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Net Movement</p>
              <p className={`text-xl font-bold ${totalIn - totalOut >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                QAR {(totalIn - totalOut).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Movements List */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
                <p className="text-slate-300">Loading movements...</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg mb-2">No movements found</p>
                <p className="text-slate-500 text-sm">Try adjusting your filters or search</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[#050505]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Unit Cost</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Total Value</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => (
                        <tr key={movement._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-white">{movement.productName}</p>
                            <p className="text-xs text-slate-500">SKU: {movement.sku}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${getMovementColor(movement.movementType)}`}>
                              {getMovementIcon(movement.movementType)}
                              {movement.movementType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-sm font-bold ${movement.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-slate-300">
                            QAR {movement.unitCost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-sm font-semibold ${movement.totalValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              QAR {Math.abs(movement.totalValue).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-blue-400">
                              {movement.balanceAfter}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-400">{movement.referenceType}</p>
                            <p className="text-sm text-white font-mono">{movement.referenceNumber}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-400">{formatDate(movement.date)}</p>
                            {movement.ledgerEntriesCreated && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                Posted to GL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-white/10">
                  {filteredMovements.map((movement) => (
                    <div
                      key={movement._id}
                      className="p-4 hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{movement.productName}</h3>
                          <p className="text-xs text-slate-500">SKU: {movement.sku}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getMovementColor(movement.movementType)}`}>
                          {getMovementIcon(movement.movementType)}
                          {movement.movementType}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Quantity</p>
                          <p className={`text-sm font-bold ${movement.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Balance After</p>
                          <p className="text-sm font-bold text-blue-400">{movement.balanceAfter}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Unit Cost</p>
                          <p className="text-sm text-white">QAR {movement.unitCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Total Value</p>
                          <p className={`text-sm font-semibold ${movement.totalValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            QAR {Math.abs(movement.totalValue).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div>
                          <p className="text-xs text-slate-500">Reference</p>
                          <p className="text-xs text-white font-mono">{movement.referenceNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{formatDate(movement.date)}</p>
                          {movement.ledgerEntriesCreated && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              GL Posted
                            </span>
                          )}
                        </div>
                      </div>

                      {movement.notes && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-slate-500 mb-1">Notes</p>
                          <p className="text-xs text-slate-300">{movement.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>
    </MainLayout>
  );
}