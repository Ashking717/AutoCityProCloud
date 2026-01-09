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
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

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
        },
        {
          name: "New Sale",
          icon: Sparkles,
          href: "/autocityPro/sales/new",
          badge: null,
        },
        {
          name: "Sales",
          icon: ShoppingCart,
          href: "/autocityPro/sales",
          badge: null,
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
        },
        {
          name: "Stock",
          icon: TrendingUp,
          href: "/autocityPro/stock",
          badge: null,
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
        },
        {
          name: "Portal",
          icon: Truck,
          href: "/autocityPro/portal",
          badge: null,
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
        },
        {
          name: "Accounts",
          icon: BookOpen,
          href: "/autocityPro/accounts",
          badge: null,
        },
        {
          name: "Ledgers",
          icon: DollarSign,
          href: "/autocityPro/ledgers",
          badge: null,
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
        },
        {
          name: "Settings",
          icon: Settings,
          href: "/autocityPro/settings",
          badge: null,
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
          icon: LayoutDashboard,
          href: "/autocityPro/settings/outlets",
          badge: null,
        },
        {
          name: "Users",
          icon: Users,
          href: "/autocityPro/settings/users",
          badge: null,
        },
        {
          name: "Activity Logs",
          icon: Activity,
          href: "/autocityPro/settings/logs",
          badge: null,
        },
      ],
    });
  }

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
      <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white h-screen fixed left-0 top-0 overflow-y-auto flex flex-col z-40 border-r border-slate-800/50 shadow-2xl">
        {/* Header with Logo */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 border-b border-indigo-500/20 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="relative w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/20">
              <Image
                src="/logo.png"
                alt="AutoCity Pro Logo"
                width={32}
                height={32}
                className="rounded-lg"
                priority
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                AutoCity Pro
              </h2>
              <p className="text-xs text-indigo-100/70 font-medium">
                Business Management
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center justify-center space-x-2 text-xs text-white/90 hover:text-white transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md group"
          >
            <Keyboard className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Keyboard Shortcuts</span>
            <kbd className="ml-auto px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono border border-white/30">
              ?
            </kbd>
          </button>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-b border-slate-800/50 bg-slate-800/30 backdrop-blur-sm">
            <button
              onClick={() => router.push("/autocityPro/profile")}
              className="w-full flex items-center space-x-3 text-left rounded-xl p-3 hover:bg-slate-800/50 transition-all duration-200 group"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg ring-2 ring-slate-800 group-hover:ring-indigo-500/50 transition-all">
                  <span className="text-sm font-bold text-white">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-sm"></div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white group-hover:text-indigo-300 transition-colors">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate font-medium">
                  {user.role}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
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
                  className="w-full flex items-center justify-between px-3 py-2 mb-1 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-300 transition-colors group rounded-lg hover:bg-slate-800/30"
                >
                  <span className="flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors"></div>
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
                            ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"></div>
                        )}

                        <div className="flex items-center space-x-3 relative z-10">
                          <item.icon
                            className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                              isActive
                                ? "text-indigo-400 scale-110"
                                : "text-slate-400 group-hover:text-indigo-400 group-hover:scale-110"
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
                          <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                            {item.badge}
                          </span>
                        )}

                        {!isActive && (
                          <ChevronRight className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
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
        <div className="p-4 border-t border-slate-800/50 bg-slate-800/30 backdrop-blur-sm">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-slate-300 hover:text-white rounded-xl transition-all duration-200 group hover:bg-gradient-to-r hover:from-red-600/10 hover:to-rose-600/10 hover:ring-1 hover:ring-red-500/30"
          >
            <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-400 transition-colors" />
            <span className="font-medium">Logout</span>
            <kbd className="ml-auto px-2 py-1 bg-slate-800 rounded text-xs font-mono border border-slate-700 text-slate-400 group-hover:border-red-500/30 group-hover:text-red-400 transition-all">
              Ctrl+Q
            </kbd>
          </button>
        </div>
      </div>

      {/* Keyboard Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-slate-800/50 ring-1 ring-white/5">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-800/50 bg-gradient-to-br from-indigo-600/10 to-purple-600/10">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Keyboard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Navigate faster with keyboard shortcuts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
              >
                <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(85vh-140px)] custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Navigation Shortcuts */}
                <div className="space-y-6">
                  <ShortcutSection
                    title="Navigation"
                    icon={<LayoutDashboard className="h-5 w-5" />}
                    shortcuts={[
                      { keys: ["Ctrl", "1"], description: "Dashboard" },
                      { keys: ["Ctrl", "2"], description: "New Sale" },
                      { keys: ["Ctrl", "3"], description: "Sales" },
                      { keys: ["Ctrl", "4"], description: "Products" },
                      { keys: ["Ctrl", "5"], description: "Categories" },
                      { keys: ["Ctrl", "6"], description: "Stock" },
                      { keys: ["Ctrl", "7"], description: "Customers" },
                      { keys: ["Ctrl", "8"], description: "Suppliers" },
                    ]}
                  />

                  <ShortcutSection
                    title="Accounting"
                    icon={<DollarSign className="h-5 w-5" />}
                    shortcuts={[
                      { keys: ["Ctrl", "9"], description: "Vouchers" },
                      { keys: ["Ctrl", "A"], description: "Accounts" },
                      { keys: ["Ctrl", "L"], description: "Ledgers" },
                    ]}
                  />
                </div>

                {/* Reports & System */}
                <div className="space-y-6">
                  <ShortcutSection
                    title="Reports"
                    icon={<BarChart3 className="h-5 w-5" />}
                    shortcuts={[
                      {
                        keys: ["Ctrl", "Shift", "S"],
                        description: "Sales Report",
                      },
                      {
                        keys: ["Ctrl", "Shift", "B"],
                        description: "Balance Sheet",
                      },
                      {
                        keys: ["Ctrl", "Shift", "T"],
                        description: "Stock Report",
                      },
                      {
                        keys: ["Ctrl", "Shift", "D"],
                        description: "Daybook",
                      },
                      {
                        keys: ["Ctrl", "Shift", "F"],
                        description: "Cash Flow",
                      },
                    ]}
                  />

                  <ShortcutSection
                    title="System"
                    icon={<Settings className="h-5 w-5" />}
                    shortcuts={[
                      { keys: ["Ctrl", "M"], description: "Month Closing" },
                      { keys: ["Ctrl", ","], description: "Settings" },
                      { keys: ["Ctrl", "Q"], description: "Logout" },
                      { keys: ["Alt", "H"], description: "Home (Dashboard)" },
                      { keys: ["Alt", "N"], description: "New Sale" },
                      { keys: ["?"], description: "Show/Hide Help" },
                      { keys: ["ESC"], description: "Close Help" },
                    ]}
                  />
                </div>
              </div>

              {/* Key Legend */}
              <div className="mt-8 p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Key Symbols Guide</span>
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KeySymbol symbol="Ctrl" description="Control / Command" />
                  <KeySymbol symbol="Shift" description="Shift" />
                  <KeySymbol symbol="Alt" description="Alt / Option" />
                  <KeySymbol symbol="+" description="Press together" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </>
  );
}

// Helper Components
interface ShortcutSectionProps {
  title: string;
  icon: React.ReactNode;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

function ShortcutSection({ title, icon, shortcuts }: ShortcutSectionProps) {
  return (
    <div className="bg-slate-800/20 rounded-xl p-5 border border-slate-700/30">
      <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-3 pb-3 border-b border-slate-700/50">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
          {icon}
        </div>
        <span>{title}</span>
      </h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, idx) => (
          <ShortcutRow
            key={idx}
            keys={shortcut.keys}
            description={shortcut.description}
          />
        ))}
      </div>
    </div>
  );
}

function ShortcutRow({
  keys,
  description,
}: {
  keys: string[];
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-700/30 transition-all duration-150 group">
      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
        {description}
      </span>
      <div className="flex items-center space-x-1">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            <kbd className="px-2.5 py-1.5 bg-slate-900 rounded-lg border border-slate-700 text-xs font-mono font-semibold text-slate-300 shadow-sm group-hover:border-indigo-500/30 group-hover:text-indigo-300 transition-all">
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-slate-500 mx-1 text-xs font-bold">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function KeySymbol({
  symbol,
  description,
}: {
  symbol: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
      <kbd className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-mono font-bold text-slate-300 shadow-sm">
        {symbol}
      </kbd>
      <span className="text-xs text-slate-400 text-center">{description}</span>
    </div>
  );
}