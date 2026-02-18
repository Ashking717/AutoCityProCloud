'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Search, Plus, Edit, Trash2, Phone, Mail, User, ChevronLeft,
  MoreVertical, X, MapPin, FileText, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function CustomersPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:             isDark ? "#050505"                                          : "#f3f4f6",
    headerBgFrom:       isDark ? "#932222"                                          : "#fef2f2",
    headerBgVia:        isDark ? "#411010"                                          : "#fee2e2",
    headerBgTo:         isDark ? "#a20c0c"                                          : "#fecaca",
    headerBorder:       isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.06)",
    headerTitle:        isDark ? "#ffffff"                                          : "#7f1d1d",
    headerSub:          isDark ? "rgba(255,255,255,0.80)"                           : "#991b1b",
    headerIconBg:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(127,29,29,0.10)",
    headerIconBorder:   isDark ? "rgba(255,255,255,0.20)"                           : "rgba(127,29,29,0.20)",
    headerBtnBg:        isDark ? "rgba(255,255,255,0.10)"                           : "#7f1d1d",
    headerBtnText:      isDark ? "#ffffff"                                          : "#ffffff",
    headerBtnHover:     isDark ? "rgba(255,255,255,0.20)"                           : "#991b1b",
    headerBtnBorder:    isDark ? "rgba(255,255,255,0.20)"                           : "rgba(127,29,29,0.20)",
    mobileHdrBg:        isDark ? "linear-gradient(to br,#0A0A0A,#050505,#0A0A0A)"  : "linear-gradient(to br,#ffffff,#f9fafb,#ffffff)",
    mobileHdrBorder:    isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.08)",
    mobileHdrTitle:     isDark ? "#ffffff"                                          : "#111827",
    mobileHdrSub:       isDark ? "rgba(255,255,255,0.60)"                           : "#6b7280",
    mobileBtnBg:        isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.05)",
    mobileBtnText:      isDark ? "rgba(255,255,255,0.80)"                           : "#374151",
    mobileBtnHover:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    searchBg:           isDark ? "rgba(255,255,255,0.05)"                           : "#ffffff",
    searchBorder:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.10)",
    searchText:         isDark ? "#ffffff"                                          : "#111827",
    searchPlaceholder:  isDark ? "rgba(255,255,255,0.40)"                           : "#9ca3af",
    searchIcon:         isDark ? "rgba(255,255,255,0.40)"                           : "#9ca3af",
    searchFocusBorder:  isDark ? "rgba(232,69,69,0.50)"                             : "rgba(232,69,69,0.40)",
    searchFocusRing:    isDark ? "rgba(232,69,69,0.50)"                             : "rgba(232,69,69,0.30)",
    statCardBg:         isDark ? "linear-gradient(to br,#0A0A0A,#050505)"          : "#ffffff",
    statCardBorder:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    statIconBg:         isDark ? "rgba(232,69,69,0.10)"                             : "rgba(232,69,69,0.08)",
    statLabel:          isDark ? "#9ca3af"                                          : "#6b7280",
    statValue:          isDark ? "#ffffff"                                          : "#111827",
    statValueGreen:     isDark ? "#86efac"                                          : "#15803d",
    mainCardBg:         isDark ? "linear-gradient(to br,#0A0A0A,#050505)"          : "#ffffff",
    mainCardBorder:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    tblHdrBg:           isDark ? "#050505"                                          : "#f9fafb",
    tblHdrText:         isDark ? "#cbd5e1"                                          : "#6b7280",
    tblRowHover:        isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.02)",
    tblRowBorder:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    tblCellName:        isDark ? "#ffffff"                                          : "#111827",
    tblCellCode:        isDark ? "#64748b"                                          : "#9ca3af",
    tblCellText:        isDark ? "#cbd5e1"                                          : "#374151",
    iconRed:            isDark ? "#E84545"                                          : "#dc2626",
    iconBlue:           isDark ? "#60a5fa"                                          : "#2563eb",
    iconGreen:          isDark ? "#86efac"                                          : "#15803d",
    actionBtnBlueBg:    isDark ? "rgba(59,130,246,0.10)"                            : "rgba(59,130,246,0.06)",
    actionBtnBlueText:  isDark ? "#93c5fd"                                          : "#1d4ed8",
    actionBtnBlueBorder:isDark ? "rgba(59,130,246,0.20)"                            : "rgba(59,130,246,0.20)",
    actionBtnBlueHover: isDark ? "rgba(59,130,246,0.30)"                            : "rgba(59,130,246,0.08)",
    actionBtnRedBg:     isDark ? "rgba(239,68,68,0.10)"                             : "rgba(239,68,68,0.06)",
    actionBtnRedText:   isDark ? "#f87171"                                          : "#dc2626",
    actionBtnRedBorder: isDark ? "rgba(239,68,68,0.20)"                             : "rgba(239,68,68,0.20)",
    actionBtnRedHover:  isDark ? "rgba(239,68,68,0.30)"                             : "rgba(239,68,68,0.08)",
    cardRowHover:       isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.02)",
    cardBorder:         isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    emptyIcon:          isDark ? "#475569"                                          : "#d1d5db",
    emptyText:          isDark ? "#9ca3af"                                          : "#6b7280",
    emptySubtext:       isDark ? "#64748b"                                          : "#9ca3af",
    islandBg:           isDark ? "#000000"                                          : "#ffffff",
    islandBorder:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.10)",
    islandText:         isDark ? "#ffffff"                                          : "#111827",
    islandDivider:      isDark ? "rgba(255,255,255,0.20)"                           : "rgba(0,0,0,0.10)",
  };
  
  useEffect(() => {
    fetchUser();
    fetchCustomers();
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };
  
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { credentials: 'include' });
      if (res.ok) setCustomers((await res.json()).customers || []);
    } catch {}
    finally { setLoading(false); }
  };
  
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address || 'N/A';
    const parts = [address.street, address.city, address.state, address.country, address.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500 transition-colors"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-[#E84545]" />
                  <span className="text-xs font-semibold" style={{ color: th.islandText }}>{filteredCustomers.length}</span>
                </div>
                <div className="h-3 w-px" style={{ background: th.islandDivider }}></div>
                <span className="text-xs font-medium" style={{ color: th.islandText }}>Customers</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: th.mobileHdrTitle }}>
                    Customers
                    {isDark ? <Moon className="h-4 w-4 text-[#E84545]" /> : <Sun className="h-4 w-4 text-[#E84545]" />}
                  </h1>
                  <p className="text-xs" style={{ color: th.mobileHdrSub }}>{filteredCustomers.length} customers</p>
                </div>
              </div>
              <button onClick={() => toast.success('Add Customer coming soon!')}
                className="p-2 rounded-xl text-white active:scale-95 transition-all"
                style={{ background: "linear-gradient(to r,#E84545,#cc3c3c)" }}>
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: th.searchIcon }} />
              <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm transition-colors duration-300"
                style={{ background: th.searchBg, border: `1px solid ${th.searchBorder}`, color: th.searchText }}
                onFocus={e => { e.target.style.borderColor = th.searchFocusBorder; e.target.style.outline = `1px solid ${th.searchFocusRing}`; }}
                onBlur={e => { e.target.style.borderColor = th.searchBorder; e.target.style.outline = 'none'; }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-3 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(to br,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl backdrop-blur-sm transition-colors"
                  style={{ background: th.headerIconBg, border: `1px solid ${th.headerIconBorder}` }}>
                  <User className="h-8 w-8" style={{ color: th.headerTitle }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Customers</h1>
                    
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>{filteredCustomers.length} customers found</p>
                </div>
              </div>
              
              <button onClick={() => toast.success('Add Customer coming soon!')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                style={{ background: th.headerBtnBg, color: th.headerBtnText, border: `1px solid ${th.headerBtnBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                <Plus className="h-4 w-4" /><span>Add Customer</span>
              </button>
            </div>

            {/* Desktop Search */}
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: th.searchIcon }} />
                <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-12 pr-4 py-3 backdrop-blur-sm transition-colors duration-300"
                  style={{ background: th.searchBg, border: `1px solid ${th.searchBorder}`, color: th.searchText }}
                  onFocus={e => { e.target.style.borderColor = th.searchFocusBorder; e.target.style.outline = `2px solid ${th.searchFocusRing}`; }}
                  onBlur={e => { e.target.style.borderColor = th.searchBorder; e.target.style.outline = 'none'; }} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[200px] md:pt-6 pb-6">
          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            {[
              { icon: <User className="h-5 w-5 text-[#E84545]" />, label: "Total Customers", value: customers.length, bg: th.statIconBg },
              { icon: <FileText className="h-5 w-5" style={{ color: th.iconGreen }} />, label: "Active", value: customers.length, color: th.statValueGreen, bg: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)" },
              { icon: <Search className="h-5 w-5" style={{ color: th.iconBlue }} />, label: "Search Results", value: filteredCustomers.length, bg: isDark ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.08)" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl p-4 transition-colors duration-500"
                style={{ background: th.statCardBg, border: `1px solid ${th.statCardBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: stat.bg }}>{stat.icon}</div>
                </div>
                <p className="text-xs mb-1" style={{ color: th.statLabel }}>{stat.label}</p>
                <p className="text-xl font-bold" style={{ color: stat.color || th.statValue }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Customers List */}
          <div className="rounded-2xl overflow-hidden transition-colors duration-500"
            style={{ background: th.mainCardBg, border: `1px solid ${th.mainCardBorder}` }}>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
                <p style={{ color: th.emptyText }}>Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <User className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg mb-2" style={{ color: th.emptyText }}>No customers found</p>
                <p className="text-sm" style={{ color: th.emptySubtext }}>Try adjusting your search</p>
              </div>
            ) : (
              <div style={{ borderTop: `1px solid ${th.tblRowBorder}` }}>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead style={{ background: th.tblHdrBg }}>
                      <tr>
                        {["Name","Contact","Address","Actions"].map(h => (
                          <th key={h} className={`px-6 py-3 ${h === "Actions" ? "text-right" : "text-left"} text-xs font-semibold uppercase`}
                            style={{ color: th.tblHdrText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer._id} className="transition-colors"
                          style={{ borderTop: `1px solid ${th.tblRowBorder}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = th.tblRowHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold" style={{ color: th.tblCellName }}>{customer.name}</p>
                            {customer.code && <p className="text-xs" style={{ color: th.tblCellCode }}>Code: {customer.code}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              {customer.phone && (
                                <div className="flex items-center text-sm" style={{ color: th.tblCellText }}>
                                  <Phone className="h-4 w-4 mr-2" style={{ color: th.iconRed }} /><span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center text-sm" style={{ color: th.tblCellText }}>
                                  <Mail className="h-4 w-4 mr-2" style={{ color: th.iconBlue }} /><span className="truncate">{customer.email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start text-sm" style={{ color: th.tblCellText }}>
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" style={{ color: th.iconGreen }} />
                              <span>{formatAddress(customer.address)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => toast.success('Edit coming soon!')}
                                className="p-2 rounded-lg transition-all"
                                style={{ color: th.actionBtnBlueText, background: th.actionBtnBlueBg }}
                                onMouseEnter={e => (e.currentTarget.style.background = th.actionBtnBlueHover)}
                                onMouseLeave={e => (e.currentTarget.style.background = th.actionBtnBlueBg)}>
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => toast.error('Delete coming soon!')}
                                className="p-2 rounded-lg transition-all"
                                style={{ color: th.actionBtnRedText, background: th.actionBtnRedBg }}
                                onMouseEnter={e => (e.currentTarget.style.background = th.actionBtnRedHover)}
                                onMouseLeave={e => (e.currentTarget.style.background = th.actionBtnRedBg)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {filteredCustomers.map((customer) => (
                    <div key={customer._id} className="p-4 transition-all active:scale-[0.98]"
                      style={{ borderTop: `1px solid ${th.cardBorder}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = th.cardRowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate" style={{ color: th.tblCellName }}>{customer.name}</h3>
                          {customer.code && <p className="text-xs" style={{ color: th.tblCellCode }}>Code: {customer.code}</p>}
                        </div>
                        <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                          style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {customer.phone && (
                          <div className="flex items-center text-xs" style={{ color: th.tblCellText }}>
                            <Phone className="h-3 w-3 mr-2" style={{ color: th.iconRed }} /><span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center text-xs" style={{ color: th.tblCellText }}>
                            <Mail className="h-3 w-3 mr-2" style={{ color: th.iconBlue }} /><span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {formatAddress(customer.address) !== 'N/A' && (
                          <div className="flex items-start text-xs" style={{ color: th.tblCellText }}>
                            <MapPin className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" style={{ color: th.iconGreen }} />
                            <span className="line-clamp-2">{formatAddress(customer.address)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${th.cardBorder}` }}>
                        <button onClick={() => toast.success('Edit coming soon!')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                          style={{ background: th.actionBtnBlueBg, color: th.actionBtnBlueText, border: `1px solid ${th.actionBtnBlueBorder}` }}>
                          <Edit className="h-3 w-3" /><span>Edit</span>
                        </button>
                        <button onClick={() => toast.error('Delete coming soon!')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                          style={{ background: th.actionBtnRedBg, color: th.actionBtnRedText, border: `1px solid ${th.actionBtnRedBorder}` }}>
                          <Trash2 className="h-3 w-3" /><span>Delete</span>
                        </button>
                      </div>
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