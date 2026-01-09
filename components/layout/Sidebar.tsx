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

  const navigation = [
    {
      title: "Main",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
          href: "/autocityPro/dashboard",
          badge: null,
          mobile: true,
        },
        {
          name: "New Sale",
          icon: Sparkles,
          href: "/autocityPro/sales/new",
          badge: null,
          mobile: false,
        },
        {
          name: "Sales",
          icon: ShoppingCart,
          href: "/autocityPro/sales",
          badge: null,
          mobile: true,
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
          mobile: false,
        },
        {
          name: "Stock",
          icon: TrendingUp,
          href: "/autocityPro/stock",
          badge: null,
          mobile: true,
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
          mobile: false,
        },
        {
          name: "Portal",
          icon: Truck,
          href: "/autocityPro/portal",
          badge: null,
          mobile: true,
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
          mobile: false,
        },
        {
          name: "Accounts",
          icon: BookOpen,
          href: "/autocityPro/accounts",
          badge: null,
          mobile: false,
        },
        {
          name: "Ledgers",
          icon: DollarSign,
          href: "/autocityPro/ledgers",
          badge: null,
          mobile: false,
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
          mobile: false,
        },
        {
          name: "Settings",
          icon: Settings,
          href: "/autocityPro/settings",
          badge: null,
          mobile: false,
        },
      ],
    },
  ];

  if (user?.role === "SUPERADMIN") {
    navigation.push({
      title: "Admin",
      items: [
        {
          name: "Outlets",
          icon: Building,
          href: "/autocityPro/settings/outlets",
          badge: null,
          mobile: false,
        },
        {
          name: "Users",
          icon: Users,
          href: "/autocityPro/settings/users",
          badge: null,
          mobile: false,
        },
        {
          name: "Activity Logs",
          icon: ActivityIcon,
          href: "/autocityPro/settings/logs",
          badge: null,
          mobile: false,
        },
      ],
    });
  }

  // Mobile navigation items - 6 items: Dashboard, Portal, Stock, Sales, Reports, Profile + Logout
  const mobileNavItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "/autocityPro/dashboard",
    },
    {
      name: "Portal",
      icon: Truck,
      href: "/autocityPro/portal",
    },
    {
      name: "Stock",
      icon: TrendingUp,
      href: "/autocityPro/stock",
    },
    {
      name: "Sales",
      icon: ShoppingCart,
      href: "/autocityPro/sales",
    },
    {
      name: "Reports",
      icon: BarChart3,
      href: "/autocityPro/reports",
    },
    {
      name: "Profile",
      icon: User,
      href: "/autocityPro/profile",
    },
  ];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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

      const keyMap: Record<string, () => void> = {
        "Ctrl+1": () => router.push("/autocityPro/dashboard"),
        "Ctrl+2": () => router.push("/autocityPro/sales/new"),
        "Ctrl+3": () => router.push("/autocityPro/sales"),
        "Ctrl+4": () => router.push("/autocityPro/products"),
        "Ctrl+5": () => router.push("/autocityPro/categories"),
        "Ctrl+6": () => router.push("/autocityPro/stock"),
        "Ctrl+7": () => router.push("/autocityPro/customers"),
        "Ctrl+8": () => router.push("/autocityPro/suppliers"),
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
  }, [router, onLogout, showHelp]);

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
                alt="AutoCity Pro Logo"
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

      {/* Mobile Bottom Navigation Bar - 6 essential items + Logout */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/5 shadow-2xl z-50">
        <div className="flex justify-around items-center h-16 px-1">
          {/* Main navigation items */}
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                  isActive ? 'text-[#E84545]' : 'text-gray-400'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-b-full"></div>
                )}
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium truncate max-w-[60px]">
                  {item.name}
                </span>
              </button>
            );
          })}
          
          {/* Logout Button - Placed after Profile */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center flex-1 h-full relative text-gray-400 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium truncate max-w-[60px]">
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Add padding for mobile bottom bar */}
      <div className="md:hidden h-16"></div>

      {/* Custom Scrollbar Styles */}
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
      `}</style>
    </>
  );
}