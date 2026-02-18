"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Truck,
  DollarSign,
  BookOpen,
  Activity,
  BarChart3,
  Sparkles,
  Receipt,
  List,
  Lock,
  ChevronDown,
  ChevronRight,
  Keyboard,
  X,
  HelpCircle,
  Home,
  Building,
  Activity as ActivityIcon,
  Menu,
  User,
  Grid3x3,
  ChevronUp,
  MessageCircle,
  Briefcase,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";

interface SidebarProps {
  user: any;
  onLogout: () => void;
  className?: string;
}

// ─── Static data moved outside component ────────────────────────────────────

const ALL_NAVIGATION_SECTIONS = [
  {
    title: "Main",
    items: [
      { name: "Dashboard",  icon: LayoutDashboard, href: "/autocityPro/dashboard",  roles: ["SUPERADMIN","ADMIN","MANAGER","VIEWER"] },
      { name: "New Sale",   icon: Sparkles,        href: "/autocityPro/sales/new",  roles: ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON","CASHIER"] },
      { name: "Sales",      icon: ShoppingCart,    href: "/autocityPro/sales",      roles: ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON","VIEWER","CASHIER"] },
      { name: "Jobs",       icon: Briefcase,       href: "/autocityPro/jobs",       roles: ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON","VIEWER","CASHIER"] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { name: "Products", icon: Package,    href: "/autocityPro/products", roles: ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON"] },
      { name: "Stock",    icon: TrendingUp, href: "/autocityPro/stock",    roles: ["SUPERADMIN","ADMIN","MANAGER","VIEWER","CASHIER"] },
    ],
  },
  {
    title: "Parties",
    items: [
      { name: "Customers", icon: Users, href: "/autocityPro/customers", roles: ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON","CASHIER"] },
      { name: "Portal",    icon: Truck, href: "/autocityPro/portal",    roles: ["SUPERADMIN","ADMIN","MANAGER","ACCOUNTANT"] },
    ],
  },
  {
    title: "Accounting",
    items: [
      { name: "Vouchers", icon: Receipt,    href: "/autocityPro/vouchers", roles: ["SUPERADMIN","ADMIN","MANAGER","ACCOUNTANT"] },
      { name: "Accounts", icon: BookOpen,   href: "/autocityPro/accounts", roles: ["SUPERADMIN","ADMIN","MANAGER","ACCOUNTANT"] },
      { name: "Ledgers",  icon: DollarSign, href: "/autocityPro/ledgers",  roles: ["SUPERADMIN","ADMIN","MANAGER","ACCOUNTANT"] },
    ],
  },
  {
    title: "Reports",
    items: [
      { name: "Reports", icon: BarChart3, href: "/autocityPro/reports", roles: ["SUPERADMIN","ADMIN","MANAGER","VIEWER","ACCOUNTANT"] },
    ],
  },
  {
    title: "System",
    items: [
      { name: "Day & Month Closing", icon: Lock,     href: "/autocityPro/closings", roles: ["SUPERADMIN","ADMIN","MANAGER","ACCOUNTANT"] },
      { name: "Settings",            icon: Settings, href: "/autocityPro/settings", roles: ["SUPERADMIN","ADMIN"] },
    ],
  },
];

const SUPERADMIN_SECTION = {
  title: "Admin",
  items: [
    { name: "Outlets",       icon: Building,     href: "/autocityPro/settings/outlets/new", roles: ["SUPERADMIN"] },
    { name: "Users",         icon: Users,        href: "/autocityPro/settings/users",       roles: ["SUPERADMIN"] },
    { name: "Activity Logs", icon: ActivityIcon, href: "/autocityPro/settings/logs",        roles: ["SUPERADMIN"] },
  ],
};

const ALL_PRIMARY_MOBILE_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/autocityPro/dashboard", roles: ["SUPERADMIN","ADMIN","MANAGER","VIEWER"] },
  { name: "New Sale",  icon: Sparkles,        href: "/autocityPro/sales/new", roles: ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON","CASHIER"] },
  { name: "Portal",    icon: Truck,           href: "/autocityPro/portal",    roles: ["SUPERADMIN","ADMIN","MANAGER","ACCOUNTANT"] },
];

const MESSAGES_ROLES = ["SUPERADMIN","ADMIN","MANAGER","SALESPERSON","VIEWER","CASHIER","ACCOUNTANT"];

// ─── Keyboard shortcuts map ──────────────────────────────────────────────────
const buildKeyMap = (router: ReturnType<typeof useRouter>, onLogout: () => void) => ({
  "Ctrl+1": () => router.push("/autocityPro/dashboard"),
  "Ctrl+2": () => router.push("/autocityPro/messages"),
  "Ctrl+3": () => router.push("/autocityPro/sales/new"),
  "Ctrl+4": () => router.push("/autocityPro/sales"),
  "Ctrl+5": () => router.push("/autocityPro/products"),
  "Ctrl+6": () => router.push("/autocityPro/categories"),
  "Ctrl+7": () => router.push("/autocityPro/stock"),
  "Ctrl+8": () => router.push("/autocityPro/customers"),
  "Ctrl+9": () => router.push("/autocityPro/portal"),
  "Ctrl+0": () => router.push("/autocityPro/vouchers"),
  "Ctrl+A": () => router.push("/autocityPro/accounts"),
  "Ctrl+L": () => router.push("/autocityPro/ledgers"),
  "Ctrl+,": () => router.push("/autocityPro/settings"),
  "Ctrl+M": () => router.push("/autocityPro/closings"),
  "Ctrl+O": () => router.push("/autocityPro/settings/outlets"),
  "Ctrl+U": () => router.push("/autocityPro/settings/users"),
  "Ctrl+Q": onLogout,
  "Ctrl+Shift+S": () => router.push("/autocityPro/reports/sales"),
  "Ctrl+Shift+B": () => router.push("/autocityPro/reports/balance-sheet"),
  "Ctrl+Shift+T": () => router.push("/autocityPro/reports/stock"),
  "Ctrl+Shift+D": () => router.push("/autocityPro/reports/daybook"),
  "Ctrl+Shift+F": () => router.push("/autocityPro/reports/cash-flow"),
  "Ctrl+Alt+L": () => router.push("/autocityPro/settings/logs"),
  "Alt+H": () => router.push("/autocityPro/dashboard"),
  "Alt+M": () => router.push("/autocityPro/messages"),
  "Alt+N": () => router.push("/autocityPro/sales/new"),
});

// ─── Time-based theme hook ────────────────────────────────────────────────────
// Dark: 6 PM (18:00) → 6 AM (06:00)  |  Light: 6 AM → 6 PM  — matches HomePage
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    // Re-check every 60 s (same cadence as HomePage)
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  return isDark;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const isDark   = useTimeBasedTheme();

  const [showHelp,          setShowHelp]          = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showMobileMenu,    setShowMobileMenu]    = useState(false);
  const [unreadCount,       setUnreadCount]       = useState(0);

  // Keep latest values available inside stable callback refs
  const showHelpRef       = useRef(showHelp);
  const showMobileMenuRef = useRef(showMobileMenu);
  useEffect(() => { showHelpRef.current       = showHelp; },       [showHelp]);
  useEffect(() => { showMobileMenuRef.current = showMobileMenu; }, [showMobileMenu]);

  // ── Unread count ─────────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const total: number = data.conversations?.reduce(
        (sum: number, conv: any) => sum + (conv.unreadCount ?? 0), 0
      ) ?? 0;
      setUnreadCount(total);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  // ── Role helpers ─────────────────────────────────────────────────────────
  const userRole = user?.role as string | undefined;

  const hasAccess = useCallback(
    (allowedRoles: string[]) => !!userRole && allowedRoles.includes(userRole),
    [userRole]
  );

  const navigation = useMemo(() => {
    const sections = userRole === "SUPERADMIN"
      ? [...ALL_NAVIGATION_SECTIONS, SUPERADMIN_SECTION]
      : ALL_NAVIGATION_SECTIONS;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => hasAccess(item.roles)),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole, hasAccess]);

  const primaryMobileNavItems = useMemo(
    () => ALL_PRIMARY_MOBILE_ITEMS.filter((item) => hasAccess(item.roles)),
    [hasAccess]
  );

  const hasMessagesAccess = useMemo(() => hasAccess(MESSAGES_ROLES), [hasAccess]);

  // ── Section toggle ────────────────────────────────────────────────────────
  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const keyMapRef = useRef<Record<string, () => void>>({});
  useEffect(() => {
    keyMapRef.current = buildKeyMap(router, onLogout);
  }, [router, onLogout]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt   = e.altKey;

      if (e.key === "?" && !ctrl && !shift && !alt) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (showHelpRef.current)       { e.preventDefault(); setShowHelp(false); return; }
        if (showMobileMenuRef.current) { e.preventDefault(); setShowMobileMenu(false); return; }
      }

      let combo = "";
      if (ctrl && shift) {
        if      (e.key === "S") combo = "Ctrl+Shift+S";
        else if (e.key === "B") combo = "Ctrl+Shift+B";
        else if (e.key === "T") combo = "Ctrl+Shift+T";
        else if (e.key === "D") combo = "Ctrl+Shift+D";
        else if (e.key === "F") combo = "Ctrl+Shift+F";
      } else if (ctrl && alt) {
        if (e.key === "L") combo = "Ctrl+Alt+L";
      } else if (ctrl) {
        if      (e.key >= "0" && e.key <= "9") combo = `Ctrl+${e.key}`;
        else if (e.key === "a" || e.key === "A") combo = "Ctrl+A";
        else if (e.key === "l" || e.key === "L") combo = "Ctrl+L";
        else if (e.key === ",")                  combo = "Ctrl+,";
        else if (e.key === "m" || e.key === "M") combo = "Ctrl+M";
        else if (e.key === "o" || e.key === "O") combo = "Ctrl+O";
        else if (e.key === "u" || e.key === "U") combo = "Ctrl+U";
        else if (e.key === "q" || e.key === "Q") combo = "Ctrl+Q";
      } else if (alt) {
        if      (e.key === "h" || e.key === "H") combo = "Alt+H";
        else if (e.key === "m" || e.key === "M") combo = "Alt+M";
        else if (e.key === "n" || e.key === "N") combo = "Alt+N";
      }

      if (combo) {
        const action = keyMapRef.current[combo];
        if (action) { e.preventDefault(); action(); }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // ── Body scroll lock for mobile menu ─────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = showMobileMenu ? "hidden" : "unset";
  }, [showMobileMenu]);

  // ── Navigate helper ───────────────────────────────────────────────────────
  const handleNavigate = useCallback((href: string) => {
    router.push(href);
    setShowMobileMenu(false);
  }, [router]);

  // ── Theme-derived tokens ──────────────────────────────────────────────────
  // These mirror the exact variables used in HomePage so both surfaces stay in sync.
  const th = {
    // Sidebar shell
    sidebarBg:        isDark ? "#050505"                        : "#ffffff",
    sidebarBorder:    isDark ? "rgba(255,255,255,0.05)"         : "rgba(0,0,0,0.07)",
    // Header gradient
    headerFrom:       isDark ? "#932222"                        : "#fef2f2",
    headerVia:        isDark ? "#411010"                        : "#fee2e2",
    headerTo:         isDark ? "#a20c0c"                        : "#fecaca",
    // Shortcut button
    shortcutText:     isDark ? "rgba(255,255,255,0.9)"          : "#7f1d1d",
    shortcutBg:       isDark ? "rgba(232,69,69,0.10)"           : "rgba(232,69,69,0.08)",
    shortcutBgHover:  isDark ? "rgba(232,69,69,0.20)"           : "rgba(232,69,69,0.14)",
    shortcutBorder:   isDark ? "rgba(232,69,69,0.20)"           : "rgba(232,69,69,0.30)",
    // User profile strip
    profileBg:        isDark ? "#0A0A0A"                        : "#f9fafb",
    profileHover:     isDark ? "rgba(255,255,255,0.05)"         : "rgba(0,0,0,0.04)",
    nameColor:        isDark ? "#ffffff"                        : "#111827",
    roleColor:        isDark ? "#9ca3af"                        : "#6b7280",
    chevronColor:     isDark ? "#4b5563"                        : "#9ca3af",
    msgActiveBg:      isDark ? "rgba(232,69,69,0.20)"           : "rgba(232,69,69,0.10)",
    msgInactiveBg:    isDark ? "rgba(255,255,255,0.05)"         : "rgba(0,0,0,0.04)",
    msgText:          isDark ? "#d1d5db"                        : "#374151",
    // Nav section header
    sectionLabel:     isDark ? "#9ca3af"                        : "#6b7280",
    sectionHover:     isDark ? "rgba(255,255,255,0.05)"         : "rgba(0,0,0,0.04)",
    // Nav item
    navItemText:      isDark ? "#d1d5db"                        : "#374151",
    navItemHoverBg:   isDark ? "rgba(255,255,255,0.05)"         : "rgba(0,0,0,0.04)",
    navItemActiveBg:  isDark ? "rgba(232,69,69,0.20)"           : "rgba(232,69,69,0.10)",
    navItemActiveRing: isDark ? "rgba(232,69,69,0.30)"          : "rgba(232,69,69,0.25)",
    iconInactive:     isDark ? "#9ca3af"                        : "#6b7280",
    // Logout strip
    logoutStripBg:    isDark
      ? "linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)"
      : "linear-gradient(135deg,rgba(0,0,0,0.03) 0%,rgba(0,0,0,0.01) 100%)",
    logoutStripBorder: isDark ? "rgba(255,255,255,0.08)"        : "rgba(0,0,0,0.08)",
    logoutBtnBg:       isDark ? "rgba(255,255,255,0.03)"        : "rgba(0,0,0,0.03)",
    logoutBtnBorder:   isDark ? "rgba(255,255,255,0.07)"        : "rgba(0,0,0,0.07)",
    logoutText:        isDark ? "#d1d5db"                       : "#374151",
    logoutKbdBg:       isDark ? "rgba(255,255,255,0.05)"        : "rgba(0,0,0,0.05)",
    logoutKbdBorder:   isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.10)",
    // Mobile bottom bar
    mobileBarBg:       isDark
      ? "linear-gradient(180deg,rgba(10,10,12,0.55) 0%,rgba(5,5,7,0.85) 100%)"
      : "linear-gradient(180deg,rgba(255,255,255,0.80) 0%,rgba(248,248,250,0.97) 100%)",
    mobileBarBorder:   isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.08)",
    mobileBarShadow:   isDark ? "0 -12px 40px rgba(0,0,0,0.5)" : "0 -4px 24px rgba(0,0,0,0.08)",
    mobileIconInactive: isDark ? "#9ca3af"                      : "#6b7280",
    mobileLabelInactive: isDark ? "#6b7280"                     : "#9ca3af",
    mobileIndicatorBg:  isDark ? "rgba(255,255,255,0.15)"       : "rgba(0,0,0,0.12)",
    // Mobile overlay menu
    overlayMenuBg:     isDark ? "#050505"                       : "#ffffff",
    overlayMenuBorder: isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.08)",
    overlayItemBg:     isDark ? "rgba(255,255,255,0.05)"        : "rgba(0,0,0,0.04)",
    overlayItemHover:  isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.07)",
    overlayItemActiveBg: isDark ? "rgba(232,69,69,0.20)"        : "rgba(232,69,69,0.10)",
    overlayText:       isDark ? "#d1d5db"                       : "#374151",
    overlayRole:       isDark ? "#9ca3af"                       : "#6b7280",
    // Shortcuts modal
    modalBg:           isDark ? "#050505"                       : "#ffffff",
    modalBorder:       isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.08)",
    modalText:         isDark ? "#d1d5db"                       : "#374151",
    modalLabel:        isDark ? "#9ca3af"                       : "#6b7280",
    modalKbdBg:        isDark ? "rgba(255,255,255,0.05)"        : "rgba(0,0,0,0.05)",
    modalKbdBorder:    isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.10)",
    modalKbdText:      isDark ? "#9ca3af"                       : "#6b7280",
    modalRowHover:     isDark ? "rgba(255,255,255,0.05)"        : "rgba(0,0,0,0.03)",
    modalFooterBg:     isDark ? "rgba(0,0,0,0.50)"             : "rgba(0,0,0,0.03)",
    modalSubText:      isDark ? "#6b7280"                       : "#9ca3af",
    // Scrollbar
    scrollTrack:       isDark ? "rgba(10,10,10,0.3)"            : "rgba(240,240,240,0.8)",
    scrollThumb:       isDark ? "rgba(232,69,69,0.3)"           : "rgba(232,69,69,0.25)",
    scrollThumbHover:  isDark ? "rgba(232,69,69,0.5)"           : "rgba(232,69,69,0.45)",
  };

  // ── Theme indicator label (shown in header) ──────────────────────────────
  const themeHour = new Date().getHours();
  const isDayTime = themeHour >= 6 && themeHour < 18;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex w-64 h-screen fixed left-0 top-0 overflow-y-auto flex-col z-40 shadow-2xl transition-colors duration-500"
        style={{
          background: th.sidebarBg,
          color: isDark ? "#ffffff" : "#111827",
          borderRight: `1px solid ${th.sidebarBorder}`,
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b transition-colors duration-500"
          style={{
            background: `linear-gradient(135deg, ${th.headerFrom}, ${th.headerVia}, ${th.headerTo})`,
            borderColor: th.sidebarBorder,
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="relative w-14 h-14 flex items-center justify-center rounded-xl shadow-lg ring-2"
              style={{
                background: isDark ? "rgba(245,245,245,0.9)" : "rgba(255,255,255,0.95)",
                
              }}
            >
              <Image src="/sidebar.png" alt="AutoCity Logo" width={60} height={60} className="rounded-lg" priority />
            </div>
            <div className="flex-1">
              <h2
                className="text-xl font-bold tracking-tight"
                style={{ color: isDark ? "#ffffff" : "#7f1d1d" }}
              >
                AutoCity
              </h2>
            </div>
            {/* Time-based theme pill */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-500"
              style={{
                background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)",
                color:      isDark ? "rgba(255,255,255,0.7)" : "#7f1d1d",
                border:     `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(127,29,29,0.2)"}`,
              }}
              title={isDayTime ? "Light theme (day)" : "Dark theme (night)"}
            >
              {isDark
                ? <Moon className="h-3 w-3" />
                : <Sun  className="h-3 w-3" />}
            </div>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center justify-center space-x-2 text-xs px-3 py-2 rounded-lg border transition-all group"
            style={{
              color: th.shortcutText,
              background: th.shortcutBg,
              borderColor: th.shortcutBorder,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = th.shortcutBgHover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = th.shortcutBg;
            }}
          >
            <Keyboard className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Keyboard Shortcuts</span>
            <kbd
              className="ml-auto px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: th.shortcutBg,
                border: `1px solid ${th.shortcutBorder}`,
                color: th.shortcutText,
              }}
            >
              ?
            </kbd>
          </button>
        </div>

        {/* User Profile */}
        {user && (
          <div
            className="p-4 border-b transition-colors duration-500"
            style={{ background: th.profileBg, borderColor: th.sidebarBorder }}
          >
            <button
              onClick={() => router.push("/autocityPro/profile")}
              className="w-full flex items-center space-x-3 text-left rounded-xl p-3 transition-all duration-200 group"
              style={{ background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = th.profileHover)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ring-2 transition-all"
                  style={{
                    background: "linear-gradient(135deg, #E84545, #cc3c3c)",
                    
                  }}
                >
                  <span className="text-sm font-bold text-white">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2"
                  style={{ borderColor: th.profileBg }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate transition-colors" style={{ color: th.nameColor }}>
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs truncate font-medium" style={{ color: th.roleColor }}>{user.role}</p>
              </div>
              <ChevronRight className="h-4 w-4 group-hover:text-[#E84545] group-hover:translate-x-0.5 transition-all"
                style={{ color: th.chevronColor }}
              />
            </button>

            {hasMessagesAccess && (
              <button
                onClick={() => router.push("/autocityPro/messages")}
                className="w-full flex items-center justify-between mt-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 group"
                style={{
                  background: pathname === "/autocityPro/messages" ? th.msgActiveBg : th.msgInactiveBg,
                  color: pathname === "/autocityPro/messages" ? (isDark ? "#ffffff" : "#111827") : th.msgText,
                  boxShadow: pathname === "/autocityPro/messages"
                    ? `0 0 0 1px ${th.navItemActiveRing}`
                    : "none",
                }}
              >
                <div className="flex items-center space-x-3">
                  <MessageCircle
                    className="h-5 w-5 transition-all"
                    style={{ color: pathname === "/autocityPro/messages" ? "#E84545" : th.iconInactive }}
                  />
                  <span className="font-medium">Chat+</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-[#E84545] text-white rounded-full animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto custom-scrollbar">
          {navigation.map((section, idx) => {
            const isCollapsed = collapsedSections.has(section.title);
            return (
              <div key={idx} className="mb-3">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2 mb-1 text-xs font-bold uppercase tracking-wider transition-colors rounded-lg"
                  style={{ color: th.sectionLabel }}
                  onMouseEnter={e => (e.currentTarget.style.background = th.sectionHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-[#E84545]" />
                    <span>{section.title}</span>
                  </span>
                  {isCollapsed
                    ? <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                    : <ChevronDown  className="h-3.5 w-3.5 transition-transform" />}
                </button>

                <div className={`space-y-0.5 transition-all duration-200 ${isCollapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[500px] opacity-100"}`}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg relative overflow-hidden group transition-all duration-200"
                        style={{
                          background: isActive ? th.navItemActiveBg : "transparent",
                          color: isActive ? (isDark ? "#ffffff" : "#111827") : th.navItemText,
                          boxShadow: isActive ? `0 0 0 1px ${th.navItemActiveRing}` : "none",
                        }}
                        onMouseEnter={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = th.navItemHoverBg;
                        }}
                        onMouseLeave={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#E84545] to-[#cc3c3c] rounded-r-full" />
                        )}
                        <div className="flex items-center space-x-3 relative z-10">
                          <item.icon
                            className="h-5 w-5 flex-shrink-0 transition-all duration-200"
                            style={{ color: isActive ? "#E84545" : th.iconInactive }}
                          />
                          <span className={`font-medium ${isActive ? "font-semibold" : ""}`}>{item.name}</span>
                        </div>
                        {!isActive && (
                          <ChevronRight
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                            style={{ color: th.chevronColor }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          className="p-4 relative overflow-hidden transition-colors duration-500"
          style={{
            background: th.logoutStripBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${th.logoutStripBorder}`,
            boxShadow: isDark
              ? "0 -8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 -4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div
            className="absolute top-0 left-4 right-4 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)" }}
          />
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm rounded-xl transition-all duration-300 group relative overflow-hidden"
            style={{
              background: th.logoutBtnBg,
              border: `1px solid ${th.logoutBtnBorder}`,
              color: th.logoutText,
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(232,69,69,0.12)";
              el.style.border = "1px solid rgba(232,69,69,0.25)";
              el.style.boxShadow = "0 4px 20px rgba(232,69,69,0.15), inset 0 1px 0 rgba(255,255,255,0.08)";
              el.style.color = isDark ? "#ffffff" : "#111827";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = th.logoutBtnBg;
              el.style.border = `1px solid ${th.logoutBtnBorder}`;
              el.style.boxShadow = "none";
              el.style.color = th.logoutText;
            }}
          >
            <LogOut className="h-5 w-5 transition-colors duration-200 group-hover:text-[#E84545]"
              style={{ color: th.iconInactive }}
            />
            <span className="font-medium">Logout</span>
            <kbd
              className="ml-auto px-2 py-1 rounded text-xs font-mono transition-all duration-200 group-hover:text-[#E84545]"
              style={{
                background: th.logoutKbdBg,
                border: `1px solid ${th.logoutKbdBorder}`,
                backdropFilter: "blur(4px)",
                color: th.modalKbdText,
              }}
            >
              Ctrl+Q
            </kbd>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Bar ───────────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="relative overflow-hidden transition-colors duration-500"
          style={{
            background: th.mobileBarBg,
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            borderTop: `1px solid ${th.mobileBarBorder}`,
            boxShadow: th.mobileBarShadow,
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${th.mobileBarBorder}, transparent)` }}
          />

          <div className="flex justify-around items-center px-2 pt-2 pb-1">
            {primaryMobileNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigate(item.href)}
                  className="flex flex-col items-center justify-center flex-1 relative py-1 px-1 active:scale-95 transition-transform touch-manipulation"
                >
                  <div
                    className="p-2 rounded-2xl transition-all duration-200 relative"
                    style={isActive ? {
                      background: "rgba(232,69,69,0.18)",
                      boxShadow: "0 2px 12px rgba(232,69,69,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                      border: "1px solid rgba(232,69,69,0.25)",
                    } : { background: "transparent", border: "1px solid transparent" }}
                  >
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    )}
                    <item.icon
                      className={`h-6 w-6 transition-colors duration-200 ${isActive ? "text-red-400" : ""}`}
                      style={{ color: isActive ? undefined : th.mobileIconInactive }}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium mt-0.5 transition-colors duration-200 ${isActive ? "text-red-400" : ""}`}
                    style={{ color: isActive ? undefined : th.mobileLabelInactive }}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}

            {hasMessagesAccess && (
              <button
                onClick={() => handleNavigate("/autocityPro/messages")}
                className="flex flex-col items-center justify-center flex-1 relative py-1 px-1 active:scale-95 transition-transform touch-manipulation"
              >
                {(() => {
                  const isActive = pathname === "/autocityPro/messages";
                  return (
                    <>
                      <div
                        className="p-2 rounded-2xl transition-all duration-200 relative"
                        style={isActive ? {
                          background: "rgba(232,69,69,0.18)",
                          boxShadow: "0 2px 12px rgba(232,69,69,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                          border: "1px solid rgba(232,69,69,0.25)",
                        } : { background: "transparent", border: "1px solid transparent" }}
                      >
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        )}
                        <MessageCircle
                          className={`h-6 w-6 transition-colors duration-200 ${isActive ? "text-red-400" : ""}`}
                          style={{ color: isActive ? undefined : th.mobileIconInactive }}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        {unreadCount > 0 && (
                          <span
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-white text-[10px] font-bold rounded-full px-1"
                            style={{
                              background: "linear-gradient(135deg,#E84545,#cc3c3c)",
                              boxShadow: "0 2px 8px rgba(232,69,69,0.5)",
                            }}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium mt-0.5 transition-colors duration-200 ${isActive ? "text-red-400" : ""}`}
                        style={{ color: isActive ? undefined : th.mobileLabelInactive }}
                      >
                        Chat+
                      </span>
                    </>
                  );
                })()}
              </button>
            )}

            <button
              onClick={() => setShowMobileMenu(true)}
              className="flex flex-col items-center justify-center flex-1 relative py-1 px-1 active:scale-95 transition-transform touch-manipulation"
            >
              <div className="p-2 rounded-2xl" style={{ background: "transparent", border: "1px solid transparent" }}>
                <Grid3x3 className="h-6 w-6" style={{ color: th.mobileIconInactive }} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium mt-0.5" style={{ color: th.mobileLabelInactive }}>More</span>
            </button>
          </div>

          {/* iOS home indicator */}
          <div className="flex justify-center pb-1">
            <div className="w-32 h-1 rounded-full" style={{ background: th.mobileIndicatorBg }} />
          </div>
        </div>
      </div>

      {/* ── Mobile Full Menu Overlay ────────────────────────────────────────── */}
      {showMobileMenu && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl flex flex-col transition-colors duration-500"
            style={{
              maxHeight: "85vh",
              paddingBottom: "env(safe-area-inset-bottom)",
              background: th.overlayMenuBg,
              color: isDark ? "#ffffff" : "#111827",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div
              className="flex items-center justify-between p-4 border-b flex-shrink-0"
              style={{
                borderColor: th.overlayMenuBorder,
                background: isDark ? "rgba(232,69,69,0.05)" : "rgba(232,69,69,0.04)",
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl" style={{ background: "rgba(232,69,69,0.10)" }}>
                  <Grid3x3 className="h-5 w-5 text-[#E84545]" />
                </div>
                <h3 className="text-lg font-bold">All Pages</h3>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl transition-colors active:scale-95 touch-manipulation"
                style={{ background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = th.overlayItemHover)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronDown className="h-5 w-5" style={{ color: th.iconInactive }} />
              </button>
            </div>

            {user && (
              <div className="p-4 border-b flex-shrink-0" style={{ borderColor: th.overlayMenuBorder }}>
                <button
                  onClick={() => handleNavigate("/autocityPro/profile")}
                  className="w-full flex items-center space-x-3 text-left rounded-xl p-3 transition-all touch-manipulation"
                  style={{ background: th.overlayItemBg }}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ background: "linear-gradient(135deg,#E84545,#cc3c3c)" }}
                    >
                      <span className="text-base font-bold text-white">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2"
                      style={{ borderColor: th.overlayMenuBg }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs truncate" style={{ color: th.overlayRole }}>{user.role} • Tap to view profile</p>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: th.chevronColor }} />
                </button>

                {hasMessagesAccess && (
                  <button
                    onClick={() => handleNavigate("/autocityPro/messages")}
                    className="w-full flex items-center justify-between mt-3 px-3 py-2.5 text-sm rounded-xl transition-all touch-manipulation"
                    style={{
                      background: pathname === "/autocityPro/messages" ? th.msgActiveBg : th.overlayItemBg,
                      color: pathname === "/autocityPro/messages" ? (isDark ? "#ffffff" : "#111827") : th.overlayText,
                      boxShadow: pathname === "/autocityPro/messages" ? `0 0 0 1px ${th.navItemActiveRing}` : "none",
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg"
                        style={{ background: pathname === "/autocityPro/messages" ? "rgba(232,69,69,0.20)" : th.overlayItemBg }}
                      >
                        <MessageCircle
                          className="h-5 w-5"
                          style={{ color: pathname === "/autocityPro/messages" ? "#E84545" : th.iconInactive }}
                        />
                      </div>
                      <span className="font-medium">Chat+</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-[#E84545] text-white rounded-full animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-2 px-4" style={{ WebkitOverflowScrolling: "touch" }}>
              {navigation.map((section, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex items-center space-x-2 px-3 py-2 mb-2">
                    <div className="w-1 h-1 rounded-full bg-[#E84545]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: th.sectionLabel }}>
                      {section.title}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <button
                          key={item.href}
                          onClick={() => handleNavigate(item.href)}
                          className="w-full flex items-center space-x-3 px-3 py-3 text-sm rounded-xl transition-all active:scale-98 touch-manipulation"
                          style={{
                            background: isActive ? th.overlayItemActiveBg : "transparent",
                            color: isActive ? (isDark ? "#ffffff" : "#111827") : th.overlayText,
                            boxShadow: isActive ? `0 0 0 1px ${th.navItemActiveRing}` : "none",
                          }}
                        >
                          <div className="p-2 rounded-lg"
                            style={{ background: isActive ? "rgba(232,69,69,0.20)" : th.overlayItemBg }}
                          >
                            <item.icon
                              className="h-5 w-5"
                              style={{ color: isActive ? "#E84545" : th.iconInactive }}
                            />
                          </div>
                          <span className="font-medium">{item.name}</span>
                          {isActive && <div className="ml-auto w-2 h-2 bg-[#E84545] rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-4 flex-shrink-0" style={{ borderColor: th.overlayMenuBorder }}>
              <button
                onClick={() => { setShowHelp(true); setShowMobileMenu(false); }}
                className="w-full flex items-center justify-center space-x-2 py-3 text-sm rounded-xl transition-all touch-manipulation"
                style={{ background: th.overlayItemBg, color: th.overlayText }}
              >
                <Keyboard className="h-5 w-5" style={{ color: th.iconInactive }} />
                <span className="font-medium">Keyboard Shortcuts</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 text-sm rounded-xl text-[#E84545] mt-2 transition-all touch-manipulation"
                style={{ background: "rgba(232,69,69,0.10)" }}
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="relative w-full max-w-2xl rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden transition-colors duration-500"
            style={{
              background: th.modalBg,
              border: `1px solid ${th.modalBorder}`,
              color: isDark ? "#ffffff" : "#111827",
            }}
          >
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{
                borderColor: th.modalBorder,
                background: isDark ? "rgba(232,69,69,0.05)" : "rgba(232,69,69,0.03)",
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl" style={{ background: "rgba(232,69,69,0.10)" }}>
                  <Keyboard className="h-5 w-5 text-[#E84545]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Keyboard Shortcuts</h3>
                  <p className="text-sm" style={{ color: th.modalLabel }}>Quickly navigate and perform actions</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-xl transition-colors touch-manipulation"
                style={{ background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = th.overlayItemHover)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <X className="h-5 w-5" style={{ color: th.iconInactive }} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: th.modalLabel }}>
                    Navigation
                  </h4>
                  <div className="space-y-2">
                    {[
                      { combo: "Ctrl + 1", desc: "Dashboard" }, { combo: "Ctrl + 2", desc: "Messages" },
                      { combo: "Ctrl + 3", desc: "New Sale" },  { combo: "Ctrl + 4", desc: "Sales" },
                      { combo: "Ctrl + 5", desc: "Products" },  { combo: "Ctrl + 6", desc: "Categories" },
                      { combo: "Ctrl + 7", desc: "Stock" },     { combo: "Ctrl + 8", desc: "Customers" },
                      { combo: "Ctrl + 9", desc: "Portal" },    { combo: "Ctrl + A", desc: "Accounts" },
                      { combo: "Ctrl + L", desc: "Ledgers" },   { combo: "Alt + H",  desc: "Dashboard" },
                      { combo: "Alt + M",  desc: "Messages" },  { combo: "Alt + N",  desc: "New Sale" },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors"
                        style={{ color: th.modalText }}
                        onMouseEnter={e => (e.currentTarget.style.background = th.modalRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="text-sm">{s.desc}</span>
                        <kbd
                          className="px-2 py-1 rounded text-xs font-mono"
                          style={{ background: th.modalKbdBg, border: `1px solid ${th.modalKbdBorder}`, color: th.modalKbdText }}
                        >
                          {s.combo}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: th.modalLabel }}>
                    Actions &amp; Reports
                  </h4>
                  <div className="space-y-2">
                    {[
                      { combo: "Ctrl + Q",         desc: "Logout" },
                      { combo: "Ctrl + ,",         desc: "Settings" },
                      { combo: "Ctrl + M",         desc: "Day & Month Closing" },
                      { combo: "Ctrl + O",         desc: "Outlets" },
                      { combo: "Ctrl + U",         desc: "Users" },
                      { combo: "Ctrl + Shift + S", desc: "Sales Reports" },
                      { combo: "Ctrl + Shift + B", desc: "Balance Sheet" },
                      { combo: "Ctrl + Shift + T", desc: "Stock Reports" },
                      { combo: "Ctrl + Shift + D", desc: "Daybook" },
                      { combo: "Ctrl + Shift + F", desc: "Cash Flow" },
                      { combo: "Ctrl + Alt + L",   desc: "Activity Logs" },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors"
                        style={{ color: th.modalText }}
                        onMouseEnter={e => (e.currentTarget.style.background = th.modalRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="text-sm">{s.desc}</span>
                        <kbd
                          className="px-2 py-1 rounded text-xs font-mono"
                          style={{ background: th.modalKbdBg, border: `1px solid ${th.modalKbdBorder}`, color: th.modalKbdText }}
                        >
                          {s.combo}
                        </kbd>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-sm font-bold uppercase tracking-wider mt-6 mb-3" style={{ color: th.modalLabel }}>
                    Global
                  </h4>
                  <div className="space-y-2">
                    {[{ combo: "?", desc: "Show/Hide this dialog" }, { combo: "Esc", desc: "Close dialog/menu" }].map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors"
                        style={{ color: th.modalText }}
                        onMouseEnter={e => (e.currentTarget.style.background = th.modalRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="text-sm">{s.desc}</span>
                        <kbd
                          className="px-2 py-1 rounded text-xs font-mono"
                          style={{ background: th.modalKbdBg, border: `1px solid ${th.modalKbdBorder}`, color: th.modalKbdText }}
                        >
                          {s.combo}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="p-4 border-t text-center"
              style={{ borderColor: th.modalBorder, background: th.modalFooterBg }}
            >
              <p className="text-xs" style={{ color: th.modalSubText }}>
                Press{" "}
                <kbd
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{ background: th.modalKbdBg, border: `1px solid ${th.modalKbdBorder}` }}
                >
                  Esc
                </kbd>{" "}
                or click outside to close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${th.scrollTrack};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${th.scrollThumb};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${th.scrollThumbHover};
        }
        .touch-manipulation {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
        }
        .active\\:scale-98:active { transform: scale(0.98); }
        .active\\:scale-95:active { transform: scale(0.95); }
      `}</style>
    </>
  );
}