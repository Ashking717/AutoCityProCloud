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
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

interface SidebarProps {
  user: any;
  onLogout: () => void;
  className?: string;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  // Helper function to check if user has access to a feature
  const hasAccess = (allowedRoles: string[]) => {
    return user?.role && allowedRoles.includes(user.role);
  };

  // Define all navigation items with role-based access
  const allNavigationSections = [
    {
      title: "Main",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
          href: "/autocityPro/dashboard",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "VIEWER", ],
        },
        {
          name: "New Sale",
          icon: Sparkles,
          href: "/autocityPro/sales/new",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "SALESPERSON", "CASHIER"],
        },
        {
          name: "Sales",
          icon: ShoppingCart,
          href: "/autocityPro/sales",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "SALESPERSON", "VIEWER", "CASHIER"],
        },
      ],
    },
    {
      title: "Inventory",
      items: [
        {
          name: "Products",
          icon: Package,
          href: "/autocityPro/products",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "SALESPERSON", ],
        },
        {
          name: "Stock",
          icon: TrendingUp,
          href: "/autocityPro/stock",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "VIEWER","CASHIER"],
        },
      ],
    },
    {
      title: "Parties",
      items: [
        {
          name: "Customers",
          icon: Users,
          href: "/autocityPro/customers",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "SALESPERSON", "CASHIER"],
        },
        {
          name: "Portal",
          icon: Truck,
          href: "/autocityPro/portal",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER","ACCOUNTANT" ],
        },
      ],
    },
    {
      title: "Accounting",
      items: [
        {
          name: "Vouchers",
          icon: Receipt,
          href: "/autocityPro/vouchers",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"],
        },
        {
          name: "Accounts",
          icon: BookOpen,
          href: "/autocityPro/accounts",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"],
        },
        {
          name: "Ledgers",
          icon: DollarSign,
          href: "/autocityPro/ledgers",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"],
        },
      ],
    },
    {
      title: "Reports",
      items: [
        {
          name: "Reports",
          icon: BarChart3,
          href: "/autocityPro/reports",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER", "VIEWER", "ACCOUNTANT"],
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          name: "Day & Month Closing",
          icon: Lock,
          href: "/autocityPro/closings",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN", "MANAGER","ACCOUNTANT"],
        },
        {
          name: "Settings",
          icon: Settings,
          href: "/autocityPro/settings",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN", "ADMIN"],
        },
      ],
    },
  ];

  // Add SUPERADMIN-only section
  if (user?.role === "SUPERADMIN") {
    allNavigationSections.push({
      title: "Admin",
      items: [
        {
          name: "Outlets",
          icon: Building,
          href: "/autocityPro/settings/outlets/new",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN"],
        },
        {
          name: "Users",
          icon: Users,
          href: "/autocityPro/settings/users",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN"],
        },
        {
          name: "Activity Logs",
          icon: ActivityIcon,
          href: "/autocityPro/settings/logs",
          badge: null,
          mobile: true,
          roles: ["SUPERADMIN"],
        },
      ],
    });
  }

  // Filter navigation based on user role
  const navigation = allNavigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasAccess(item.roles)),
    }))
    .filter((section) => section.items.length > 0); // Remove empty sections

  // Primary mobile navigation items (shown in bottom bar) - filtered by role
  const allPrimaryMobileNavItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "/autocityPro/dashboard",
      roles: ["SUPERADMIN", "ADMIN", "MANAGER", "VIEWER"],
    },
    {
      name: "New Sale",
      icon: Sparkles,
      href: "/autocityPro/sales/new",
      roles: ["SUPERADMIN", "ADMIN", "MANAGER", "SALESPERSON", "CASHIER"],
    },
    {
      name: "Sales",
      icon: ShoppingCart,
      href: "/autocityPro/sales",
      roles: ["SUPERADMIN", "ADMIN", "MANAGER", "SALESPERSON", "VIEWER", "CASHIER"],
    },
    {
      name: "Reports",
      icon: BarChart3,
      href: "/autocityPro/reports",
      roles: ["SUPERADMIN", "ADMIN", "MANAGER", "VIEWER", "ACCOUNTANT"],
    },
  ];

  const primaryMobileNavItems = allPrimaryMobileNavItems.filter((item) =>
    hasAccess(item.roles)
  );

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Handle scroll to prevent bottom bar movement
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Check if user is scrolling
      setIsScrolling(Math.abs(scrollTop - lastScrollTop) > 0);
      setLastScrollTop(scrollTop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollTop]);

  // Prevent URL bar hide/show on mobile
  useEffect(() => {
    if (isMobile) {
      // Lock viewport height to prevent resize on scroll
      const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setVH();
      window.addEventListener('resize', setVH);
      
      // Prevent pull-to-refresh behavior that moves bottom bar
      document.body.style.overscrollBehaviorY = 'none';
      
      return () => {
        window.removeEventListener('resize', setVH);
        document.body.style.overscrollBehaviorY = 'auto';
      };
    }
  }, [isMobile]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      if (e.key === "?" && !isCtrl && !isShift && !isAlt) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      if (e.key === "Escape" && showMobileMenu) {
        e.preventDefault();
        setShowMobileMenu(false);
        return;
      }

      const keyMap: Record<string, () => void> = {
        "Ctrl+1": () => router.push("/autocityPro/dashboard"),
        "Ctrl+2": () => router.push("/autocityPro/sales/new"),
        "Ctrl+3": () => router.push("/autocityPro/sales"),
        "Ctrl+4": () => router.push("/autocityPro/products"),
        "Ctrl+5": () => router.push("/autocityPro/categories"),
        "Ctrl+6": () => router.push("/autocityPro/stock"),
        "Ctrl+7": () => router.push("/autocityPro/customers"),
        "Ctrl+8": () => router.push("/autocityPro/portal"),
        "Ctrl+9": () => router.push("/autocityPro/vouchers"),
        "Ctrl+A": () => router.push("/autocityPro/accounts"),
        "Ctrl+L": () => router.push("/autocityPro/ledgers"),
        "Ctrl+,": () => router.push("/autocityPro/settings"),
        "Ctrl+M": () => router.push("/autocityPro/closings"),
        "Ctrl+O": () => router.push("/autocityPro/settings/outlets"),
        "Ctrl+U": () => router.push("/autocityPro/settings/users"),
        "Ctrl+Q": () => onLogout(),
        "Ctrl+Shift+S": () => router.push("/autocityPro/reports/sales"),
        "Ctrl+Shift+B": () => router.push("/autocityPro/reports/balance-sheet"),
        "Ctrl+Shift+T": () => router.push("/autocityPro/reports/stock"),
        "Ctrl+Shift+D": () => router.push("/autocityPro/reports/daybook"),
        "Ctrl+Shift+F": () => router.push("/autocityPro/reports/cash-flow"),
        "Ctrl+Alt+L": () => router.push("/autocityPro/settings/logs"),
        "Alt+H": () => router.push("/autocityPro/dashboard"),
        "Alt+N": () => router.push("/autocityPro/sales/new"),
      };

      let keyCombo = "";

      if (isCtrl && isShift) {
        if (e.key === "S") keyCombo = "Ctrl+Shift+S";
        else if (e.key === "B") keyCombo = "Ctrl+Shift+B";
        else if (e.key === "T") keyCombo = "Ctrl+Shift+T";
        else if (e.key === "D") keyCombo = "Ctrl+Shift+D";
        else if (e.key === "F") keyCombo = "Ctrl+Shift+F";
      } else if (isCtrl && isAlt) {
        if (e.key === "L") keyCombo = "Ctrl+Alt+L";
      } else if (isCtrl) {
        if (e.key >= "1" && e.key <= "9") keyCombo = `Ctrl+${e.key}`;
        else if (e.key === "a" || e.key === "A") keyCombo = "Ctrl+A";
        else if (e.key === "l" || e.key === "L") keyCombo = "Ctrl+L";
        else if (e.key === ",") keyCombo = "Ctrl+,";
        else if (e.key === "m" || e.key === "M") keyCombo = "Ctrl+M";
        else if (e.key === "o" || e.key === "O") keyCombo = "Ctrl+O";
        else if (e.key === "u" || e.key === "U") keyCombo = "Ctrl+U";
        else if (e.key === "q" || e.key === "Q") keyCombo = "Ctrl+Q";
      } else if (isAlt) {
        if (e.key === "h" || e.key === "H") keyCombo = "Alt+H";
        else if (e.key === "n" || e.key === "N") keyCombo = "Alt+N";
      }

      if (keyCombo && keyMap[keyCombo]) {
        e.preventDefault();
        keyMap[keyCombo]();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router, onLogout, showHelp, showMobileMenu]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showMobileMenu]);

  const handleNavigate = (href: string) => {
    router.push(href);
    setShowMobileMenu(false);
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className={`hidden md:flex w-64 bg-[#050505] text-white h-screen fixed left-0 top-0 overflow-y-auto flex-col z-40 border-r border-white/5 shadow-2xl`}>
        {/* Header with Logo */}
        <div className="p-6 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5">
          <div className="flex items-center space-x-3 mb-4">
            <div className="relative w-14 h-14 flex items-center justify-center bg-gray-100/90 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-[#E84545]/20">
              <Image
                src="/icon-192.png"
                alt="AutoCity Logo"
                width={60}
                height={60}
                className="rounded-lg"
                priority
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                AutoCity 
              </h2>
            </div>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center justify-center space-x-2 text-xs text-white/90 hover:text-white transition-all bg-[#E84545]/10 hover:bg-[#E84545]/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#E84545]/20 hover:border-[#E84545]/30 shadow-sm hover:shadow-md group"
          >
            <Keyboard className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Keyboard Shortcuts</span>
            <kbd className="ml-auto px-1.5 py-0.5 bg-[#E84545]/20 rounded text-xs font-mono border border-[#E84545]/30">
              ?
            </kbd>
          </button>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-b border-white/5 bg-[#0A0A0A]">
            <button
              onClick={() => router.push("/autocityPro/profile")}
              className="w-full flex items-center space-x-3 text-left rounded-xl p-3 hover:bg-white/5 transition-all duration-200 group"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E84545] via-[#cc3c3c] to-[#E84545] flex items-center justify-center shadow-lg ring-2 ring-slate-800 group-hover:ring-[#E84545]/50 transition-all">
                  <span className="text-sm font-bold text-white">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#050505] shadow-sm"></div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white group-hover:text-[#E84545] transition-colors">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-400 truncate font-medium">
                  {user.role}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-[#E84545] group-hover:translate-x-0.5 transition-all" />
            </button>
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
                  className="w-full flex items-center justify-between px-3 py-2 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors group rounded-lg hover:bg-white/5"
                >
                  <span className="flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-[#E84545] group-hover:bg-[#E84545] transition-colors"></div>
                    <span>{section.title}</span>
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 transition-transform" />
                  )}
                </button>

                <div
                  className={`space-y-0.5 transition-all duration-200 ${
                    isCollapsed
                      ? "max-h-0 opacity-0 overflow-hidden"
                      : "max-h-[500px] opacity-100"
                  }`}
                >
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-all duration-200 rounded-lg group relative overflow-hidden ${
                          isActive
                            ? "bg-gradient-to-r from-[#E84545]/20 via-[#cc3c3c]/20 to-[#E84545]/20 text-white shadow-lg shadow-[#E84545]/10 ring-1 ring-[#E84545]/30"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#E84545] to-[#cc3c3c] rounded-r-full"></div>
                        )}

                        <div className="flex items-center space-x-3 relative z-10">
                          <item.icon
                            className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                              isActive
                                ? "text-[#E84545] scale-110"
                                : "text-gray-400 group-hover:text-[#E84545] group-hover:scale-110"
                            }`}
                          />
                          <span
                            className={`font-medium ${
                              isActive ? "font-semibold" : ""
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>

                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-[#E84545]/20 text-[#E84545] rounded-full border border-[#E84545]/30">
                            {item.badge}
                          </span>
                        )}

                        {!isActive && (
                          <ChevronRight className="h-4 w-4 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
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
        <div className="p-4 border-t border-white/5 bg-[#0A0A0A]">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white rounded-xl transition-all duration-200 group hover:bg-gradient-to-r hover:from-[#E84545]/10 hover:to-[#cc3c3c]/10 hover:ring-1 hover:ring-[#E84545]/30"
          >
            <LogOut className="h-5 w-5 text-gray-400 group-hover:text-[#E84545] transition-colors" />
            <span className="font-medium">Logout</span>
            <kbd className="ml-auto px-2 py-1 bg-[#050505] rounded text-xs font-mono border border-gray-800 text-gray-400 group-hover:border-[#E84545]/30 group-hover:text-[#E84545] transition-all">
              Ctrl+Q
            </kbd>
          </button>
        </div>
      </div>

      {/* Apple-style Mobile Bottom Navigation Bar - FIXED */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className={`pointer-events-auto bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom transition-transform duration-300 ${
          isScrolling ? 'translate-y-0' : 'translate-y-0'
        }`}>
          <div className="flex justify-around items-center px-2 pt-2 pb-1">
            {/* Primary navigation items */}
            {primaryMobileNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigate(item.href)}
                  className="flex flex-col items-center justify-center flex-1 relative py-1 px-1 active:scale-95 transition-transform touch-manipulation"
                >
                  <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-red-500/15' : ''}`}>
                    <item.icon 
                      className={`h-6 w-6 transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={`text-[10px] font-medium mt-0.5 transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
            
            {/* More Menu Button */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="flex flex-col items-center justify-center flex-1 relative py-1 px-1 active:scale-95 transition-transform touch-manipulation"
            >
              <div className="p-2 rounded-2xl">
                <Grid3x3 className="h-6 w-6 text-gray-400" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium mt-0.5 text-gray-400">
                More
              </span>
            </button>
          </div>
          {/* Home indicator */}
          <div className="flex justify-center pb-1">
            <div className="w-32 h-1 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Mobile Full Menu Overlay */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[#050505] rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#E84545]/5 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Grid3x3 className="h-5 w-5 text-[#E84545]" />
                </div>
                <h3 className="text-lg font-bold text-white">All Pages</h3>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* User Profile in Mobile Menu */}
            {user && (
              <div className="p-4 border-b border-white/5">
                <button
                  onClick={() => handleNavigate("/autocityPro/profile")}
                  className="w-full flex items-center space-x-3 text-left rounded-xl p-3 bg-white/5 active:bg-white/10 transition-all"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center shadow-lg">
                      <span className="text-base font-bold text-white">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#050505]"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.role} • Tap to view profile
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}

            {/* Scrollable Menu Content */}
            <div className="flex-1 overflow-y-auto py-2 px-4">
              {navigation.map((section, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex items-center space-x-2 px-3 py-2 mb-2">
                    <div className="w-1 h-1 rounded-full bg-[#E84545]"></div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
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
                          className={`w-full flex items-center space-x-3 px-3 py-3 text-sm rounded-xl transition-all active:scale-98 ${
                            isActive
                              ? "bg-gradient-to-r from-[#E84545]/20 to-[#cc3c3c]/20 text-white ring-1 ring-[#E84545]/30"
                              : "text-gray-300 active:bg-white/10"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? 'bg-[#E84545]/20' : 'bg-white/5'}`}>
                            <item.icon
                              className={`h-5 w-5 ${isActive ? 'text-[#E84545]' : 'text-gray-400'}`}
                            />
                          </div>
                          <span className="font-medium">{item.name}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-[#E84545] rounded-full"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Menu Footer */}
            <div className="border-t border-white/10 p-4">
              <button
                onClick={() => {
                  setShowHelp(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center justify-center space-x-2 py-3 text-sm rounded-xl bg-white/5 active:bg-white/10 transition-all"
              >
                <Keyboard className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-300">Keyboard Shortcuts</span>
              </button>
              
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 text-sm rounded-xl bg-[#E84545]/10 active:bg-[#E84545]/20 text-[#E84545] mt-2 transition-all"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#050505] rounded-2xl border border-white/10 shadow-2xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-[#E84545]/5 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Keyboard className="h-5 w-5 text-[#E84545]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Keyboard Shortcuts</h3>
                  <p className="text-sm text-gray-400">
                    Quickly navigate and perform actions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Shortcuts Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Navigation */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Navigation
                  </h4>
                  <div className="space-y-2">
                    {[
                      { combo: "Ctrl + 1", desc: "Dashboard" },
                      { combo: "Ctrl + 2", desc: "New Sale" },
                      { combo: "Ctrl + 3", desc: "Sales" },
                      { combo: "Ctrl + 4", desc: "Products" },
                      { combo: "Ctrl + 5", desc: "Categories" },
                      { combo: "Ctrl + 6", desc: "Stock" },
                      { combo: "Ctrl + 7", desc: "Customers" },
                      { combo: "Ctrl + 8", desc: "Portal" },
                      { combo: "Ctrl + 9", desc: "Vouchers" },
                      { combo: "Ctrl + A", desc: "Accounts" },
                      { combo: "Ctrl + L", desc: "Ledgers" },
                      { combo: "Alt + H", desc: "Dashboard" },
                      { combo: "Alt + N", desc: "New Sale" },
                    ].map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <span className="text-sm text-gray-300">
                          {shortcut.desc}
                        </span>
                        <kbd className="px-2 py-1 bg-white/5 rounded text-xs font-mono border border-white/10 text-gray-400">
                          {shortcut.combo}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions & Reports */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Actions & Reports
                  </h4>
                  <div className="space-y-2">
                    {[
                      { combo: "Ctrl + Q", desc: "Logout" },
                      { combo: "Ctrl + ,", desc: "Settings" },
                      { combo: "Ctrl + M", desc: "Day & Month Closing" },
                      { combo: "Ctrl + O", desc: "Outlets" },
                      { combo: "Ctrl + U", desc: "Users" },
                      { combo: "Ctrl + Shift + S", desc: "Sales Reports" },
                      { combo: "Ctrl + Shift + B", desc: "Balance Sheet" },
                      { combo: "Ctrl + Shift + T", desc: "Stock Reports" },
                      { combo: "Ctrl + Shift + D", desc: "Daybook" },
                      { combo: "Ctrl + Shift + F", desc: "Cash Flow" },
                      { combo: "Ctrl + Alt + L", desc: "Activity Logs" },
                    ].map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <span className="text-sm text-gray-300">
                          {shortcut.desc}
                        </span>
                        <kbd className="px-2 py-1 bg-white/5 rounded text-xs font-mono border border-white/10 text-gray-400">
                          {shortcut.combo}
                        </kbd>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-6 mb-3">
                    Global
                  </h4>
                  <div className="space-y-2">
                    {[
                      { combo: "?", desc: "Show/Hide this dialog" },
                      { combo: "Esc", desc: "Close dialog/menu" },
                    ].map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <span className="text-sm text-gray-300">
                          {shortcut.desc}
                        </span>
                        <kbd className="px-2 py-1 bg-white/5 rounded text-xs font-mono border border-white/10 text-gray-400">
                          {shortcut.combo}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/50 text-center">
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-xs font-mono border border-white/10">Esc</kbd> or click outside to close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles + iOS Safe Area */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(10, 10, 10, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(232, 69, 69, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(232, 69, 69, 0.5);
        }
        
        /* iOS Safe Area Support */
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Prevent overscroll */
        body {
          overscroll-behavior-y: none;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
        }

        /* Touch improvements */
        .touch-manipulation {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
        }

        /* Active scale */
        .active\\:scale-98:active {
          transform: scale(0.98);
        }

        .active\\:scale-95:active {
          transform: scale(0.95);
        }

        /* Viewport height fix for mobile */
        :root {
          --vh: 1vh;
        }

        /* Prevent address bar hide/show on mobile */
        @supports (-webkit-touch-callout: none) {
          .h-screen {
            height: calc(var(--vh, 1vh) * 100);
          }
        }

        /* Hide bottom bar when keyboard is open */
        @media (max-height: 500px) {
          .md\\:hidden.fixed.bottom-0 {
            display: none !important;
          }
        }

        /* iOS specific fixes */
        @supports (padding: max(0px)) {
          .safe-area-bottom {
            padding-bottom: max(env(safe-area-inset-bottom), 8px);
          }
        }
      `}</style>
    </>
  );
}