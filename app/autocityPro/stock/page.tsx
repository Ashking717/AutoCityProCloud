'use client';

import { useTimeBasedTheme } from "@/lib/theme/appearanceMode";
import {
  useState,
  useEffect,
  useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  X,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Search,
  RefreshCw,
  Car,
  Palette,
  Calendar,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatProductQuantity,
  getProductUnitLabel,
  PRODUCT_UNIT_OPTIONS,
} from '@/lib/utils/productUnit';

// ─── Time-based theme hook ────────────────────────────────────────────────────
export default function StockPage() {
  const router   = useRouter();
  const isDark   = useTimeBasedTheme();

  const [user,             setUser]             = useState<any>(null);
  const [products,         setProducts]         = useState<any[]>([]);
  const [categories,       setCategories]       = useState<any[]>([]);
  const [stockLocations,   setStockLocations]   = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [showFilters,      setShowFilters]      = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [activeDesktopFilterMenu, setActiveDesktopFilterMenu] = useState<'search' | 'stock' | 'product' | 'vehicle' | 'active'>('search');
  const [filterStatus,     setFilterStatus]     = useState<string>('all');
  const [filterUnit,       setFilterUnit]       = useState('');
  const [filterLocationId, setFilterLocationId] = useState('');
  const [isMobile,         setIsMobile]         = useState(false);
  const [showMobileMenu,   setShowMobileMenu]   = useState(false);
  const [showDynamicIsland,setShowDynamicIsland]= useState(true);

  const [filterCategory,   setFilterCategory]   = useState('');
  const [filterMake,       setFilterMake]       = useState('');
  const [filterModel,      setFilterModel]      = useState('');
  const [filterVariant,    setFilterVariant]    = useState('');
  const [filterColor,      setFilterColor]      = useState('');
  const [filterYear,       setFilterYear]       = useState('');
  const [filterIsVehicle,  setFilterIsVehicle]  = useState<string>('all');

  const [currentPage,      setCurrentPage]      = useState(1);
  const [hasMoreProducts,  setHasMoreProducts]  = useState(true);
  const [totalProducts,    setTotalProducts]    = useState(0);
  const [isLoadingMore,    setIsLoadingMore]    = useState(false);
  const [globalStats,      setGlobalStats]      = useState({ totalValue: 0, lowStockCount: 0, outOfStockCount: 0, criticalCount: 0 });

  const bottomRef = useRef<HTMLDivElement>(null);
  const desktopFilterButtonRef = useRef<HTMLButtonElement>(null);
  const desktopFilterMenuRef = useRef<HTMLDivElement>(null);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:         isDark ? '#050505'                                                : '#f3f4f6',
    // Header
    headerBgFrom:   isDark ? 'var(--autocity-header-from-dark)'                                                : 'var(--autocity-header-from-light)',
    headerBgVia:    isDark ? 'var(--autocity-header-via-dark)'                                                : 'var(--autocity-header-via-light)',
    headerBgTo:     isDark ? 'var(--autocity-header-to-dark)'                                                : 'var(--autocity-header-to-light)',
    headerBorder:   isDark ? 'rgba(255,255,255,0.05)'                                 : 'rgba(0,0,0,0.06)',
    headerTitle:    isDark ? '#ffffff'                                                : 'var(--autocity-header-text-light)',
    headerSub:      isDark ? 'rgba(255,255,255,0.80)'                                 : 'var(--autocity-header-sub-light)',
    headerBtnBg:    isDark ? 'rgba(255,255,255,0.10)'                                 : 'rgba(0,0,0,0.08)',
    headerBtnBorder:isDark ? 'rgba(255,255,255,0.20)'                                 : 'rgba(0,0,0,0.15)',
    headerBtnText:  isDark ? '#ffffff'                                                : 'var(--autocity-header-text-light)',
    headerBtnHover: isDark ? 'rgba(255,255,255,0.20)'                                 : 'rgba(0,0,0,0.14)',
    // Mobile header
    mobileHeaderBg:  isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'       : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                                             : '#111827',
    mobileHeaderSub: isDark ? 'rgba(255,255,255,0.60)'                                : '#6b7280',
    mobileBtnBg:    isDark ? 'rgba(255,255,255,0.05)'                                 : 'rgba(0,0,0,0.05)',
    mobileBtnText:  isDark ? 'rgba(255,255,255,0.80)'                                 : '#374151',
    mobileSearchBg: isDark ? 'rgba(255,255,255,0.10)'                                 : 'rgba(0,0,0,0.06)',
    mobileSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    mobileSearchText:   isDark ? '#ffffff'                                            : '#111827',
    mobileSearchPH:     isDark ? 'rgba(255,255,255,0.70)'                             : '#9ca3af',
    // Stat cards
    cardBgFrom:     isDark ? '#0A0A0A'                                                : '#ffffff',
    cardBgTo:       isDark ? '#050505'                                                : '#f9fafb',
    cardBorder:     isDark ? 'rgba(255,255,255,0.10)'                                 : 'rgba(0,0,0,0.08)',
    cardLabel:      isDark ? '#94a3b8'                                                : '#6b7280',
    cardValue:      isDark ? '#ffffff'                                                : '#111827',
    cardValueRed:   'var(--autocity-accent)',
    cardSubText:    isDark ? '#64748b'                                                : '#9ca3af',
    cardIconBg:     isDark ? 'var(--autocity-accent-10)'                                   : 'var(--autocity-accent-08)',
    // Alert banner
    alertBg:        isDark ? 'var(--autocity-accent-10)'                                   : 'var(--autocity-accent-07)',
    alertBorder:    isDark ? 'var(--autocity-accent-20)'                                   : 'var(--autocity-accent-25)',
    alertTitle:     isDark ? '#ffffff'                                                : '#111827',
    alertSub:       isDark ? '#cbd5e1'                                                : '#374151',
    // Desktop filter panel
    filterPanelBg:  isDark ? '#1e293b'                                                : '#ffffff',
    filterPanelBorder: isDark ? '#334155'                                             : 'rgba(0,0,0,0.10)',
    filterInputBg:  isDark ? '#0f172a'                                                : '#ffffff',
    filterInputBorder: isDark ? '#334155'                                             : 'rgba(0,0,0,0.10)',
    filterInputText: isDark ? '#ffffff'                                               : '#111827',
    filterInputPH:  isDark ? '#64748b'                                                : '#9ca3af',
    filterInputIcon: isDark ? '#94a3b8'                                               : '#6b7280',
    filterTagBg:    isDark ? 'var(--autocity-accent-20)'                                   : 'var(--autocity-accent-10)',
    clearAllBg:     isDark ? '#0f172a'                                                : 'rgba(0,0,0,0.05)',
    clearAllBorder: isDark ? '#334155'                                                : 'rgba(0,0,0,0.10)',
    clearAllText:   isDark ? '#ffffff'                                                : '#374151',
    clearAllHover:  isDark ? '#1e293b'                                                : 'rgba(0,0,0,0.08)',
    // Stock list table
    stockContainerBg:     isDark ? '#1e293b'                                          : '#ffffff',
    stockContainerBorder: isDark ? '#334155'                                          : 'rgba(0,0,0,0.08)',
    stockTableHeadBg:     isDark ? '#0f172a'                                          : '#f3f4f6',
    stockTableHeadText:   isDark ? '#94a3b8'                                          : '#6b7280',
    stockRowDivider:      isDark ? '#334155'                                          : 'rgba(0,0,0,0.06)',
    stockRowHover:        isDark ? 'rgba(255,255,255,0.04)'                           : 'rgba(0,0,0,0.02)',
    stockCellPrimary:     isDark ? '#ffffff'                                          : '#111827',
    stockCellSecondary:   isDark ? '#cbd5e1'                                          : '#374151',
    stockCellMuted:       isDark ? '#64748b'                                          : '#9ca3af',
    // Mobile product cards
    mobileCardBgFrom: isDark ? '#1e293b'                                              : '#ffffff',
    mobileCardBgTo:   isDark ? '#0f172a'                                              : '#f9fafb',
    mobileCardBorder: isDark ? '#334155'                                              : 'rgba(0,0,0,0.08)',
    mobileCardLabel:  isDark ? '#64748b'                                              : '#9ca3af',
    mobileCardDivider: isDark ? 'rgba(255,255,255,0.07)'                              : 'rgba(0,0,0,0.06)',
    emptyIcon:        isDark ? '#475569'                                              : '#d1d5db',
    emptyText:        isDark ? '#94a3b8'                                              : '#6b7280',
    loaderText:       isDark ? '#94a3b8'                                              : '#6b7280',
    endText:          isDark ? '#64748b'                                              : '#9ca3af',
    endBorder:        isDark ? '#334155'                                              : 'rgba(0,0,0,0.08)',
    // Dynamic island
    islandBg:         isDark ? '#000000'                                              : '#ffffff',
    islandBorder:     isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.10)',
    islandText:       isDark ? '#ffffff'                                              : '#111827',
    islandDivider:    isDark ? 'rgba(255,255,255,0.20)'                              : 'rgba(0,0,0,0.12)',
    // Mobile menus
    modalBg:          isDark ? 'linear-gradient(180deg,#050505,#0A0A0A)'              : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:      isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    modalTitle:       isDark ? '#ffffff'                                              : '#111827',
    modalCloseBg:     isDark ? 'rgba(255,255,255,0.05)'                              : 'rgba(0,0,0,0.05)',
    modalCloseText:   isDark ? '#9ca3af'                                             : '#6b7280',
    modalItemBg:      isDark ? '#0A0A0A'                                             : 'rgba(0,0,0,0.04)',
    modalItemBorder:  isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    modalItemText:    isDark ? '#d1d5db'                                             : '#374151',
    // Mobile filter modal
    mobileFilterBg:   isDark ? 'linear-gradient(180deg,#050505,#0A0A0A)'              : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    mobileFilterBorder: isDark ? 'rgba(255,255,255,0.10)'                            : 'rgba(0,0,0,0.08)',
    mobileSelectBg:   isDark ? '#0A0A0A'                                             : '#ffffff',
    mobileSelectBorder: isDark ? 'rgba(255,255,255,0.10)'                            : 'rgba(0,0,0,0.10)',
    mobileSelectText: isDark ? '#ffffff'                                             : '#111827',
    mobileFilterLabel: isDark ? '#d1d5db'                                            : '#374151',
    mobileFilterSectionLabel: isDark ? '#d1d5db'                                     : '#374151',
    mobileClearBg:    isDark ? '#0A0A0A'                                             : 'rgba(0,0,0,0.04)',
    mobileClearBorder: isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    mobileClearText:  isDark ? '#d1d5db'                                             : '#374151',
  };

  const isYearInRange = (product: any, selectedYear: string) => {
    if (!selectedYear) return true;
    const year = parseInt(selectedYear);
    const from = product.yearFrom || year;
    const to   = product.yearTo   || from;
    return year >= from && year <= to;
  };

  const convertToStockCode = (value: number) => {
    const map: Record<number, string> = { 0:'R',1:'F',2:'I',3:'N',4:'D',5:'M',6:'O',7:'T',8:'H',9:'E' };
    return Math.floor(value).toString().split('').map(d => map[parseInt(d)] ?? d).join('');
  };

  const formatCompactCurrency = (n: number) =>
    n >= 1_000_000 ? `QR${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `QR${(n / 1_000).toFixed(1)}K` : `QR${n.toFixed(0)}`;

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (res.ok) setCategories((await res.json()).categories || []);
    } catch {}
  };

  const fetchStockLocations = async () => {
    try {
      const res = await fetch('/api/stock-locations', { credentials: 'include' });
      if (res.ok) setStockLocations((await res.json()).locations || []);
    } catch {}
  };

  const fetchProducts = async (page = 1, append = false) => {
    try {
      if (!append) { setCurrentPage(page); setProducts([]); setHasMoreProducts(true); setLoading(true); } else { setIsLoadingMore(true); }
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (searchTerm)   params.append('search',    searchTerm);
      if (filterCategory) params.append('categoryId', filterCategory);
      if (filterMake)   params.append('carMake',   filterMake);
      if (filterModel)  params.append('carModel',  filterModel);
      if (filterVariant)params.append('variant',   filterVariant);
      if (filterColor)  params.append('color',     filterColor);
      if (filterYear)   params.append('year',      filterYear);
      if (filterUnit)   params.append('unit',      filterUnit);
      if (filterLocationId) params.append('locationId', filterLocationId);
      if (filterStatus !== 'all') params.append('stockStatus', filterStatus);
      if (filterIsVehicle !== 'all') params.append('isVehicle', filterIsVehicle === 'vehicle' ? 'true' : 'false');

      const res = await fetch(`/api/products?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (append) setProducts(prev => [...prev, ...data.products]);
        else        setProducts(data.products || []);
        setTotalProducts(data.pagination.total);
        setHasMoreProducts(data.pagination.hasMore);
        setCurrentPage(page);
        if (data.stats) {
          setGlobalStats({ totalValue: data.stats.totalValue || 0, lowStockCount: data.stats.lowStockCount || 0, outOfStockCount: data.stats.outOfStockCount || 0, criticalCount: data.stats.criticalCount || 0 });
        } else {
          const all = append ? [...products, ...data.products] : data.products;
          const yf  = all.filter((p: any) => isYearInRange(p, filterYear));
          setGlobalStats({ totalValue: yf.reduce((s: number, p: any) => s + p.currentStock * p.costPrice, 0), lowStockCount: yf.filter((p: any) => p.currentStock <= p.reorderPoint).length, outOfStockCount: yf.filter((p: any) => p.currentStock <= 0).length, criticalCount: yf.filter((p: any) => p.currentStock > 0 && p.currentStock <= p.minStock).length });
        }
      } else { toast.error('Failed to load stock data'); setProducts([]); setHasMoreProducts(false); }
    } catch { toast.error('Failed to load stock data'); setProducts([]); setHasMoreProducts(false); }
    finally { setLoading(false); setIsLoadingMore(false); }
  };

  const loadMoreProducts = () => { if (!isLoadingMore && hasMoreProducts) fetchProducts(currentPage + 1, true); };
  const handleRefresh    = () => { fetchProducts(1, false); toast.success('Stock data refreshed'); };

  useEffect(() => {
    fetchUser(); fetchCategories(); fetchStockLocations(); fetchProducts(1, false);
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { fetchProducts(1, false); }, [searchTerm, filterStatus, filterUnit, filterLocationId, filterCategory, filterMake, filterModel, filterVariant, filterColor, filterYear, filterIsVehicle]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreProducts && !loading && !isLoadingMore) loadMoreProducts();
    }, { threshold: 0.1 });
    const ref = bottomRef.current;
    if (ref) observer.observe(ref);
    return () => { if (ref) observer.unobserve(ref); };
  }, [hasMoreProducts, loading, isLoadingMore, currentPage]);

  useEffect(() => {
    if (!showDesktopFilters) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        desktopFilterMenuRef.current?.contains(target) ||
        desktopFilterButtonRef.current?.contains(target)
      ) {
        return;
      }

      setShowDesktopFilters(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDesktopFilters]);

  const yearFilteredProducts = products.filter(p => isYearInRange(p, filterYear));
  const filteredProducts     = yearFilteredProducts.filter(p =>
    filterStatus === 'all' ||
    (filterStatus === 'low'      && p.currentStock <= p.reorderPoint && p.currentStock > 0) ||
    (filterStatus === 'out'      && p.currentStock <= 0) ||
    (filterStatus === 'critical' && p.currentStock > 0 && p.currentStock <= p.minStock)
  );

  const availableMakes   = [...new Set(products.filter(p => p.carMake).map(p => p.carMake))].sort() as string[];
  const availableModels  = filterMake ? [...new Set(products.filter(p => p.carMake === filterMake && p.carModel).map(p => p.carModel))].sort() as string[] : [];
  const availableVariants= [...new Set(products.filter(p => p.variant).map(p => p.variant))].sort() as string[];
  const availableColors  = [...new Set(products.filter(p => p.color).map(p => p.color))].sort() as string[];
  const availableYears   = (() => { const s = new Set<number>(); products.forEach(p => { if (p.yearFrom) { for (let y = p.yearFrom; y <= (p.yearTo || p.yearFrom); y++) s.add(y); } }); return Array.from(s).sort((a,b) => b - a); })();

  const clearFilters = () => { setFilterStatus('all'); setFilterUnit(''); setFilterLocationId(''); setFilterCategory(''); setFilterMake(''); setFilterModel(''); setFilterVariant(''); setFilterColor(''); setFilterYear(''); setFilterIsVehicle('all'); setSearchTerm(''); };

  const activeFilterCount = [filterCategory, filterUnit, filterLocationId, filterMake, filterModel, filterVariant, filterColor, filterYear, filterIsVehicle !== 'all', filterStatus !== 'all'].filter(Boolean).length;
  const stockFilterCount = [filterStatus !== 'all'].filter(Boolean).length;
  const productFilterCount = [filterCategory, filterUnit, filterLocationId, filterIsVehicle !== 'all'].filter(Boolean).length;
  const vehicleFilterCount = [filterMake, filterModel, filterVariant, filterColor, filterYear].filter(Boolean).length;
  const activeFilterTags = [
    filterStatus !== 'all' && { label: `Status: ${filterStatus === 'low' ? 'Low Stock' : filterStatus === 'critical' ? 'Critical' : 'Out of Stock'}`, clear: () => setFilterStatus('all') },
    filterUnit && { label: `Unit: ${getProductUnitLabel(filterUnit)}`, clear: () => setFilterUnit('') },
    filterLocationId && { label: `Location: ${stockLocations.find(location => String(location._id) === filterLocationId)?.name || 'Selected'}`, clear: () => setFilterLocationId('') },
    filterCategory && { label: `Category: ${categories.find(c => c._id === filterCategory)?.name || 'Selected'}`, clear: () => setFilterCategory('') },
    filterIsVehicle !== 'all' && { label: `Type: ${filterIsVehicle === 'vehicle' ? 'Vehicles/Parts' : 'Non-Vehicle'}`, clear: () => setFilterIsVehicle('all') },
    filterMake && { label: `Make: ${filterMake}`, clear: () => { setFilterMake(''); setFilterModel(''); } },
    filterModel && { label: `Model: ${filterModel}`, clear: () => setFilterModel('') },
    filterVariant && { label: `Variant: ${filterVariant}`, clear: () => setFilterVariant('') },
    filterColor && { label: `Color: ${filterColor}`, clear: () => setFilterColor('') },
    filterYear && { label: `Year: ${filterYear}`, clear: () => setFilterYear('') },
  ].filter(Boolean) as Array<{ label: string; clear: () => void }>;
  const desktopFilterMenuItems: Array<{
    id: 'search' | 'stock' | 'product' | 'vehicle' | 'active';
    label: string;
    description: string;
    count?: number;
  }> = [
    { id: 'search', label: 'Search', description: 'Name, SKU, location' },
    { id: 'stock', label: 'Stock Status', description: 'Low, critical, out', count: stockFilterCount },
    { id: 'product', label: 'Product & Area', description: 'Type, unit, category, location', count: productFilterCount },
    { id: 'vehicle', label: 'Vehicle Compatibility', description: 'Make, model, year', count: vehicleFilterCount },
    { id: 'active', label: 'Selected Filters', description: 'Review and clear', count: activeFilterTags.length },
  ];

  const downloadStockCSV = () => {
    if (!filteredProducts.length) { toast.error('No stock data to export'); return; }
    const headers = ['SKU','Name','Location','Unit','Current Stock','Min Stock','Reorder Point','Stock Value','Make','Model','Variant','Color','Year Range'];
    const rows    = filteredProducts.map(p => [p.sku||'', `"${(p.name||'').replace(/"/g,'""')}"`, p.location||'', p.unit||'pcs', p.currentStock||0, p.minStock||0, p.reorderPoint||0, (p.currentStock*p.costPrice)||0, p.carMake||'', p.carModel||'', p.variant||'', p.color||'', p.yearFrom ? `${p.yearFrom}${p.yearTo?`-${p.yearTo}`:''}` : '']);
    const csv     = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), download: `stock_${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${filteredProducts.length} items to CSV`);
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/autocityPro/login'; };

  const totalStockCode = convertToStockCode(globalStats.totalValue);

  const statusConfig = (p: any) => {
    if (p.currentStock <= 0)            return { text:'Out of Stock', mobileBg:'bg-red-900/20',    mobileText:'text-red-400',    desktopClass:'bg-white text-red-400 border border-red-800/50',    icon: <AlertTriangle className="h-4 w-4" /> };
    if (p.currentStock <= p.minStock)   return { text:'Critical',     mobileBg:'bg-orange-900/20', mobileText:'text-orange-400', desktopClass:'bg-white text-orange-400 border border-orange-800/50', icon: <AlertTriangle className="h-4 w-4" /> };
    if (p.currentStock <= p.reorderPoint)return { text:'Low Stock',   mobileBg:'bg-yellow-900/20', mobileText:'text-yellow-400', desktopClass:'bg-white text-yellow-400 border border-yellow-800/50', icon: <TrendingDown className="h-4 w-4" /> };
    return { text:'In Stock', mobileBg:'bg-green-900/20', mobileText:'text-green-400', desktopClass:'bg-white text-green-400 border border-green-800/50', icon: <TrendingUp className="h-4 w-4" /> };
  };

  // ── Shared select style ───────────────────────────────────────────────────
  const selectStyle = { background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText };
  const mobileSelectStyle = { background: th.mobileSelectBg, border: `1px solid ${th.mobileSelectBorder}`, color: th.mobileSelectText };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}
            >
              <div className="flex items-center gap-3">
                <Package className="h-3 w-3 text-[color:var(--autocity-accent)]" />
                <span className="text-xs font-semibold" style={{ color: th.islandText }}>{totalStockCode}</span>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                <span className="text-xs font-medium" style={{ color: th.islandText }}>{products.length} of {totalProducts}</span>
                {globalStats.lowStockCount > 0 && (
                  <>
                    <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    <span className="text-xs font-medium text-orange-400">{globalStats.lowStockCount}</span>
                  </>
                )}</div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><ChevronLeft className="h-5 w-5" /></button>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Stock</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>
                    {products.length} of {totalProducts} loaded{hasMoreProducts && ' • Scroll for more'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { id: 'refresh', action: handleRefresh, icon: <RefreshCw className="h-4 w-4" /> },
                ].map((btn) => (
                  <button key={btn.id} onClick={btn.action} className="p-2 rounded-xl active:scale-95 transition-all"
                    style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>{btn.icon}</button>
                ))}
                <button onClick={() => setShowFilters(true)} className="p-2 rounded-xl active:scale-95 transition-all relative"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[color:var(--autocity-accent)] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </button>
                <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><MoreVertical className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPH }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search stock..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent transition-colors duration-500"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}
        >
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Stock Management</h1>
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>
                  {products.length} of {totalProducts} products loaded{hasMoreProducts && ' • Scroll to load more'}
                  {activeFilterCount > 0 && ` • ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                </p>
              </div>
              <div className="flex space-x-3">
                <div className="relative">
                  <button
                    ref={desktopFilterButtonRef}
                    onClick={() => {
                      setShowDesktopFilters(prev => {
                        const next = !prev;
                        if (next) {
                          setActiveDesktopFilterMenu('search');
                        }
                        return next;
                      });
                    }}
                    className="group relative flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      background: showDesktopFilters ? th.headerBtnHover : th.headerBtnBg,
                      border: `1px solid ${th.headerBtnBorder}`,
                      color: th.headerBtnText
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = showDesktopFilters ? th.headerBtnHover : th.headerBtnBg)}
                  >
                    <Filter className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>{showDesktopFilters ? 'Hide Filters' : 'Filters'}</span>
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-[color:var(--autocity-accent)] text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {showDesktopFilters && (
                    <div
                      ref={desktopFilterMenuRef}
                      className="hidden md:flex absolute right-0 top-full mt-3 z-50 items-start"
                    >
                      <div
                        className="w-64 rounded-2xl shadow-2xl overflow-hidden"
                        style={{ background: th.stockContainerBg, border: `1px solid ${th.stockContainerBorder}` }}
                      >
                        <div className="p-2">
                          {desktopFilterMenuItems.map((item) => {
                            const active = activeDesktopFilterMenu === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => setActiveDesktopFilterMenu(item.id)}
                                onMouseEnter={() => setActiveDesktopFilterMenu(item.id)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                                style={{
                                  background: active ? th.headerBtnHover : 'transparent',
                                  color: active ? th.stockCellPrimary : th.stockCellSecondary
                                }}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{item.label}</p>
                                  <p className="text-xs mt-0.5 truncate" style={{ color: th.stockCellMuted }}>
                                    {item.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {!!item.count && (
                                    <span
                                      className="text-[10px] px-2 py-0.5 rounded-full"
                                      style={{ background: th.filterTagBg, color: 'var(--autocity-accent)' }}
                                    >
                                      {item.count}
                                    </span>
                                  )}
                                  <ChevronRight className="h-4 w-4" style={{ color: th.stockCellMuted }} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="px-4 py-3" style={{ borderTop: `1px solid ${th.stockRowDivider}` }}>
                          <button
                            onClick={clearFilters}
                            className="w-full px-3 py-2 rounded-xl text-sm transition-colors"
                            style={{ background: th.clearAllBg, border: `1px solid ${th.clearAllBorder}`, color: th.clearAllText }}
                            onMouseEnter={e => (e.currentTarget.style.background = th.clearAllHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = th.clearAllBg)}
                          >
                            Clear All Filters
                          </button>
                        </div>
                      </div>

                      <div
                        className="w-[360px] ml-2 rounded-2xl shadow-2xl overflow-hidden"
                        style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}
                      >
                        {activeDesktopFilterMenu === 'search' && (
                          <>
                            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.stockRowDivider}` }}>
                              <p className="text-sm font-semibold" style={{ color: th.stockCellPrimary }}>Search</p>
                              <p className="text-xs mt-1" style={{ color: th.stockCellMuted }}>Search stock by product name, SKU, location, make, or model.</p>
                            </div>
                            <div className="p-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: th.filterInputIcon }} />
                                <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={e => setSearchTerm(e.target.value)}
                                  placeholder="Search products..."
                                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                                  style={selectStyle}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {activeDesktopFilterMenu === 'stock' && (
                          <>
                            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.stockRowDivider}` }}>
                              <p className="text-sm font-semibold" style={{ color: th.stockCellPrimary }}>Stock Status</p>
                              <p className="text-xs mt-1" style={{ color: th.stockCellMuted }}>Filter by urgency and stock health.</p>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-2">
                              {[
                                ['all', 'All Status'],
                                ['low', 'Low Stock'],
                                ['critical', 'Critical'],
                                ['out', 'Out of Stock'],
                              ].map(([value, label]) => {
                                const active = filterStatus === value;
                                return (
                                  <button
                                    key={value}
                                    onClick={() => setFilterStatus(value)}
                                    className="px-3 py-2.5 rounded-xl text-sm text-left transition-colors"
                                    style={{
                                      background: active ? 'var(--autocity-accent-10)' : th.filterInputBg,
                                      border: active ? '1px solid var(--autocity-accent-30)' : `1px solid ${th.filterInputBorder}`,
                                      color: active ? 'var(--autocity-accent)' : th.filterInputText
                                    }}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {activeDesktopFilterMenu === 'product' && (
                          <>
                            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.stockRowDivider}` }}>
                              <p className="text-sm font-semibold" style={{ color: th.stockCellPrimary }}>Product & Area</p>
                              <p className="text-xs mt-1" style={{ color: th.stockCellMuted }}>Choose item type, unit, category, and stock location.</p>
                            </div>
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  ['all', 'All'],
                                  ['vehicle', 'Vehicles'],
                                  ['non-vehicle', 'Non-Vehicle'],
                                ].map(([value, label]) => {
                                  const active = filterIsVehicle === value;
                                  return (
                                    <button
                                      key={value}
                                      onClick={() => setFilterIsVehicle(value)}
                                      className="px-3 py-2.5 rounded-xl text-sm transition-colors"
                                      style={{
                                        background: active ? 'var(--autocity-accent-10)' : th.filterInputBg,
                                        border: active ? '1px solid var(--autocity-accent-30)' : `1px solid ${th.filterInputBorder}`,
                                        color: active ? 'var(--autocity-accent)' : th.filterInputText
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: th.stockCellMuted }}>Category</p>
                                <select
                                  value={filterCategory}
                                  onChange={e => setFilterCategory(e.target.value)}
                                  className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent appearance-none"
                                  style={selectStyle}
                                >
                                  <option value="">All Categories</option>
                                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: th.stockCellMuted }}>Unit</p>
                                <select
                                  value={filterUnit}
                                  onChange={e => setFilterUnit(e.target.value)}
                                  className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent appearance-none"
                                  style={selectStyle}
                                >
                                  <option value="">All Units</option>
                                  {PRODUCT_UNIT_OPTIONS.map(unit => (
                                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: th.stockCellMuted }}>Location / Area</p>
                                <select
                                  value={filterLocationId}
                                  onChange={e => setFilterLocationId(e.target.value)}
                                  className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent appearance-none"
                                  style={selectStyle}
                                >
                                  <option value="">All Locations</option>
                                  {stockLocations.map(location => (
                                    <option key={location._id} value={location._id}>
                                      {location.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        {activeDesktopFilterMenu === 'vehicle' && (
                          <>
                            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.stockRowDivider}` }}>
                              <p className="text-sm font-semibold" style={{ color: th.stockCellPrimary }}>Vehicle Compatibility</p>
                              <p className="text-xs mt-1" style={{ color: th.stockCellMuted }}>Narrow by make, model, variant, color, and year.</p>
                            </div>
                            <div className="p-4 grid grid-cols-1 gap-3">
                              <div className="relative">
                                <Car className="absolute left-3 top-3 h-4 w-4" style={{ color: th.filterInputIcon }} />
                                <select value={filterMake} onChange={e => { setFilterMake(e.target.value); setFilterModel(''); }}
                                  className="w-full pl-10 pr-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                  <option value="">All Makes</option>
                                  {availableMakes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>
                              <select value={filterModel} onChange={e => setFilterModel(e.target.value)} disabled={!filterMake}
                                className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none disabled:opacity-50" style={selectStyle}>
                                <option value="">All Models</option>
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <select value={filterVariant} onChange={e => setFilterVariant(e.target.value)}
                                className="w-full px-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                <option value="">All Variants</option>
                                {availableVariants.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                              <div className="relative">
                                <Palette className="absolute left-3 top-3 h-4 w-4" style={{ color: th.filterInputIcon }} />
                                <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
                                  className="w-full pl-10 pr-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                  <option value="">All Colors</option>
                                  {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4" style={{ color: th.filterInputIcon }} />
                                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                                  className="w-full pl-10 pr-3 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] appearance-none" style={selectStyle}>
                                  <option value="">All Years</option>
                                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        {activeDesktopFilterMenu === 'active' && (
                          <>
                            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${th.stockRowDivider}` }}>
                              <p className="text-sm font-semibold" style={{ color: th.stockCellPrimary }}>Selected Filters</p>
                              <p className="text-xs mt-1" style={{ color: th.stockCellMuted }}>Remove filters one by one or clear everything.</p>
                            </div>
                            <div className="p-4 space-y-4">
                              {activeFilterTags.length > 0 ? (
                                <>
                                  <div className="flex flex-wrap gap-2">
                                    {activeFilterTags.map((tag) => (
                                      <button
                                        key={tag.label}
                                        onClick={tag.clear}
                                        className="px-3 py-1.5 text-xs rounded-full flex items-center gap-2 transition-colors"
                                        style={{ background: th.filterTagBg, color: 'var(--autocity-accent)' }}
                                      >
                                        <span>{tag.label}</span>
                                        <X className="h-3 w-3" />
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    onClick={clearFilters}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
                                    style={{ background: th.clearAllBg, border: `1px solid ${th.clearAllBorder}`, color: th.clearAllText }}
                                    onMouseEnter={e => (e.currentTarget.style.background = th.clearAllHover)}
                                    onMouseLeave={e => (e.currentTarget.style.background = th.clearAllBg)}
                                  >
                                    Clear All
                                  </button>
                                </>
                              ) : (
                                <p className="text-sm" style={{ color: th.stockCellMuted }}>No filters selected yet.</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {[
                  { label: 'Refresh',     icon: <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />, action: handleRefresh },
                  { label: 'Export CSV',  icon: <FileDown  className="h-4 w-4 group-hover:scale-110 transition-transform" />,              action: downloadStockCSV },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    className="group flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all"
                    style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
                    onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}
                  >
                    {btn.icon}<span>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { label:'Total Value',   value: totalStockCode, sub: formatCompactCurrency(globalStats.totalValue), color: th.cardValue, status: 'all' },
              { label:'Low Stock',     value: globalStats.lowStockCount,    sub: null, color: th.cardValueRed, status: 'low' },
              { label:'Out of Stock',  value: globalStats.outOfStockCount,  sub: null, color: th.cardValueRed, status: 'out' },
              { label:'Critical',      value: globalStats.criticalCount,    sub: null, color: th.cardValueRed, status: 'critical' },
            ].map(({ label, value, sub, color, status }) => (
              <button key={label}
                type="button"
                onClick={() => setFilterStatus(status)}
                aria-pressed={filterStatus === status}
                className="rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg,${th.cardBgFrom},${th.cardBgTo})`, border: `1px solid ${th.cardBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--autocity-accent-30)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: th.cardIconBg }}>
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-[color:var(--autocity-accent)]" />
                  </div>
                </div>
                <p className="text-xs mb-1" style={{ color: th.cardLabel }}>{label}</p>
                <p className="text-lg md:text-xl font-bold truncate" style={{ color }}>{value}</p>
                {sub && <p className="text-xs mt-1 truncate" style={{ color: th.cardSubText }}>{sub}</p>}
              </button>
            ))}
          </div>

          {/* Low Stock Alert */}
          {globalStats.lowStockCount > 0 && (
            <div className="border-l-4 border-[color:var(--autocity-accent)] p-4 md:p-6 mb-6 rounded-xl transition-all active:scale-[0.98]"
              style={{ background: th.alertBg, border: `1px solid ${th.alertBorder}` }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[color:var(--autocity-accent)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold" style={{ color: th.alertTitle }}>{globalStats.lowStockCount} items need reordering</h3>
                  <p className="text-sm mt-1" style={{ color: th.alertSub }}>These products are running low on stock and need to be reordered soon.</p>
                </div>
              </div>
            </div>
          )}

          {activeFilterTags.length > 0 && (
            <div className="hidden md:flex items-start justify-between gap-4 rounded-2xl p-4 mb-4 transition-colors duration-500"
              style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}
            >
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: th.stockCellMuted }}>
                  Active Filters
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeFilterTags.map((tag) => (
                    <button
                      key={tag.label}
                      onClick={tag.clear}
                      className="px-3 py-1.5 text-xs rounded-full flex items-center gap-2 transition-colors"
                      style={{ background: th.filterTagBg, color: 'var(--autocity-accent)' }}
                    >
                      <span>{tag.label}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap"
                style={{ background: th.clearAllBg, border: `1px solid ${th.clearAllBorder}`, color: th.clearAllText }}
                onMouseEnter={e => (e.currentTarget.style.background = th.clearAllHover)}
                onMouseLeave={e => (e.currentTarget.style.background = th.clearAllBg)}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Stock List */}
          <div className="rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.stockContainerBg, border: `1px solid ${th.stockContainerBorder}` }}
          >
            {loading && !products.length ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--autocity-accent)]" />
              </div>
            ) : !filteredProducts.length ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg font-medium" style={{ color: th.emptyText }}>No products found</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-[color:var(--autocity-accent)] text-white rounded-lg hover:bg-[color:var(--autocity-accent-strong)] transition-colors">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y p-4 space-y-3" style={{ borderColor: th.stockRowDivider }}>
                  {filteredProducts.map(product => {
                    const s = statusConfig(product);
                    const pCode = convertToStockCode(product.currentStock * product.costPrice);
                    const yr    = product.yearFrom ? `${product.yearFrom}${product.yearTo ? `-${product.yearTo}` : ''}` : '';
                    return (
                      <div key={product._id} className="rounded-xl p-4 transition-all active:scale-[0.98]"
                        style={{ background: `linear-gradient(135deg,${th.mobileCardBgFrom},${th.mobileCardBgTo})`, border: `1px solid ${th.mobileCardBorder}` }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--autocity-accent-30)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = th.mobileCardBorder)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {product.isVehicle && <Car className="h-3 w-3 text-[color:var(--autocity-accent)]" />}
                              <p className="text-sm font-semibold truncate" style={{ color: th.stockCellPrimary }}>{product.name}</p>
                            </div>
                            <p className="text-xs mt-1" style={{ color: th.mobileCardLabel }}>{product.sku}</p>
                            {product.location && (
                              <p className="text-xs mt-1" style={{ color: th.stockCellSecondary }}>
                                Location: {product.location}
                              </p>
                            )}
                            {product.carMake && (
                              <div className="text-xs mt-1" style={{ color: th.stockCellSecondary }}>
                                <p>{product.carMake} {product.carModel} {product.variant}</p>
                                {yr && <p style={{ color: th.mobileCardLabel }}>Year: {yr}</p>}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.mobileBg} ${s.mobileText} flex-shrink-0 ml-2`}>{s.text}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 py-3" style={{ borderTop: `1px solid ${th.mobileCardDivider}` }}>
                          {[
                            { label:'Current',   value:formatProductQuantity(product.currentStock, product.unit),  color: th.stockCellPrimary },
                            { label:'Min Stock', value:formatProductQuantity(product.minStock, product.unit),       color: th.stockCellSecondary },
                            { label:'Reorder At',value:formatProductQuantity(product.reorderPoint, product.unit),  color: th.stockCellSecondary },
                            { label:'Value',     value: pCode,                                      color: th.cardValueRed },
                          ].map(row => (
                            <div key={row.label}>
                              <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileCardLabel }}>{row.label}</span>
                              <p className="text-sm font-semibold" style={{ color: row.color }}>{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead style={{ background: th.stockTableHeadBg }}>
                      <tr>
                        {['Product','Location','Vehicle Info','Current Stock','Min Stock','Reorder Point','Stock Value','Status'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: th.stockTableHeadText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => {
                        const s = statusConfig(product);
                        const pCode = convertToStockCode(product.currentStock * product.costPrice);
                        const yr    = product.yearFrom ? `${product.yearFrom}${product.yearTo ? `-${product.yearTo}` : ''}` : '';
                        return (
                          <tr key={product._id} className="transition-colors" style={{ borderTop: `1px solid ${th.stockRowDivider}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = th.stockRowHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {product.isVehicle && <Car className="h-4 w-4 text-[color:var(--autocity-accent)]" />}
                                <div>
                                  <p className="font-medium" style={{ color: th.stockCellPrimary }}>{product.name}</p>
                                  <p className="text-xs" style={{ color: th.stockCellMuted }}>{product.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm" style={{ color: th.stockCellSecondary }}>
                                {product.location || '-'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              {product.carMake ? (
                                <div className="text-xs">
                                  <p style={{ color: th.stockCellSecondary }}>{product.carMake} {product.carModel}</p>
                                  {product.variant && <p style={{ color: th.stockCellMuted }}>{product.variant}</p>}
                                  <div className="flex gap-2 mt-1">
                                    {product.color && <span style={{ color: th.stockCellMuted }}>{product.color}</span>}
                                    {yr            && <span style={{ color: th.stockCellMuted }}>• {yr}</span>}
                                  </div>
                                </div>
                              ) : <span className="text-xs" style={{ color: th.stockCellMuted }}>-</span>}
                            </td>
                            <td className="px-6 py-4 text-sm" style={{ color: th.stockCellSecondary }}>{formatProductQuantity(product.currentStock, product.unit)}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: th.stockCellSecondary }}>{formatProductQuantity(product.minStock, product.unit)}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: th.stockCellSecondary }}>{formatProductQuantity(product.reorderPoint, product.unit)}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-[color:var(--autocity-accent)]">{pCode}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 inline-flex items-center space-x-2 text-xs font-semibold rounded-full ${s.desktopClass}`}>
                                {s.icon}<span>{s.text}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isLoadingMore && (
                  <div className="flex justify-center py-6" style={{ borderTop: `1px solid ${th.endBorder}` }}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[color:var(--autocity-accent)]" />
                      <span className="text-sm" style={{ color: th.loaderText }}>Loading more products...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} className="h-1" />
                {!hasMoreProducts && products.length > 0 && (
                  <div className="text-center py-6" style={{ borderTop: `1px solid ${th.endBorder}` }}>
                    <p className="text-sm" style={{ color: th.endText }}>All {products.length} products loaded</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="md:hidden h-20" />
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
            style={{ background: th.mobileFilterBg, borderColor: th.mobileFilterBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters</h2>
                {activeFilterCount > 0 && <p className="text-xs mt-1" style={{ color: th.mobileCardLabel }}>{activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}</p>}
              </div>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label:'Stock Status', value: filterStatus, onChange: setFilterStatus, opts: [['all','All Status'],['low','Low Stock'],['critical','Critical'],['out','Out of Stock']] },
                { label:'Unit',         value: filterUnit, onChange: setFilterUnit, opts: [['','All Units'], ...PRODUCT_UNIT_OPTIONS.map(unit => [unit.value, unit.label])] },
                { label:'Location / Area', value: filterLocationId, onChange: setFilterLocationId, opts: [['','All Locations'], ...stockLocations.map(location => [String(location._id), location.name])] },
                { label:'Category',     value: filterCategory, onChange: setFilterCategory, opts: [['','All Categories'], ...categories.map(c => [c._id, c.name])] },
                { label:'Type',         value: filterIsVehicle, onChange: setFilterIsVehicle, opts: [['all','All Types'],['vehicle','Vehicles/Parts'],['non-vehicle','Non-Vehicle']] },
              ].map(s => (
                <div key={s.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.mobileFilterLabel }}>{s.label}</label>
                  <select value={s.value} onChange={e => s.onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg" style={mobileSelectStyle}>
                    {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="pt-4" style={{ borderTop: `1px solid ${th.mobileFilterBorder}` }}>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: th.mobileFilterSectionLabel }}>
                  <Car className="h-4 w-4" />Vehicle Filters
                </h3>
                <div className="space-y-3">
                  {[
                    { label:'Make',    value: filterMake,    onChange: (v: string) => { setFilterMake(v); setFilterModel(''); }, opts: [['','All Makes'],    ...availableMakes.map(m => [m,m])] },
                    { label:'Model',   value: filterModel,   onChange: setFilterModel,   opts: [['','All Models'],   ...availableModels.map(m => [m,m])],   disabled: !filterMake },
                    { label:'Variant', value: filterVariant, onChange: setFilterVariant, opts: [['','All Variants'], ...availableVariants.map(v => [v,v])] },
                    { label:'Color',   value: filterColor,   onChange: setFilterColor,   opts: [['','All Colors'],   ...availableColors.map(c => [c,c])] },
                    { label:'Year (filters by range)', value: filterYear, onChange: setFilterYear, opts: [['','All Years'], ...availableYears.map(y => [String(y), String(y)])] },
                  ].map((s) => (
                    <div key={s.label}>
                      <label className="block text-xs mb-1" style={{ color: th.mobileCardLabel }}>{s.label}</label>
                      <select value={s.value} onChange={e => s.onChange(e.target.value)} disabled={(s as any).disabled}
                        className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50" style={mobileSelectStyle}>
                        {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-lg transition-colors active:scale-95"
                  style={{ background: th.mobileClearBg, border: `1px solid ${th.mobileClearBorder}`, color: th.mobileClearText }}>
                  Clear All
                </button>
                <button onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] rounded-lg text-white font-semibold active:scale-95 transition-all">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label:'Export CSV',   icon: <FileDown className="h-5 w-5" />,  action: () => { downloadStockCSV(); setShowMobileMenu(false); } },
                { label:'Refresh Data', icon: <RefreshCw className="h-5 w-5" />, action: () => { handleRefresh();   setShowMobileMenu(false); } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}
                >
                  <span>{btn.label}</span>{btn.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
