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

  const isParentActive = (paths: string[]) =>
    paths.some((path) => pathname.startsWith(path));

  const navigation = [
    {
      title: "Main",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
          href: "/autocityPro/dashboard",
        },
        { name: "New Sale", icon: Sparkles, href: "/autocityPro/sales/new" },
        { name: "Sales", icon: ShoppingCart, href: "/autocityPro/sales" },
      ],
    },
    {
      title: "Inventory",
      items: [
        { name: "Products", icon: Package, href: "/autocityPro/products" },
        { name: "Stock", icon: TrendingUp, href: "/autocityPro/stock" },
      ],
    },
    {
      title: "Parties",
      items: [
        { name: "Customers", icon: Users, href: "/autocityPro/customers" },
        { name: "Portal", icon: Truck, href: "/autocityPro/portal" },
      ],
    },
    {
      title: "Accounting",
      items: [
        {
          name: "Vouchers",
          icon: Receipt,
          href: "/autocityPro/vouchers", // Direct link to vouchers
        },
        { name: "Accounts", icon: BookOpen, href: "/autocityPro/accounts" },
        { name: "Ledgers", icon: DollarSign, href: "/autocityPro/ledgers" },
      ],
    },
    {
      title: "Reports",
      items: [{ name: "Reports", icon: Users, href: "/autocityPro/reports" }],
    },
    {
      title: "System",
      items: [
        {
          name: "Day & Month Closing",
          icon: Lock,
          href: "/autocityPro/closings",
        },
        { name: "Settings", icon: Settings, href: "/autocityPro/settings" },
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
        },
        { name: "Users", icon: Users, href: "/autocityPro/settings/users" },
        {
          name: "Activity Logs",
          icon: Activity,
          href: "/autocityPro/settings/logs",
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

      const keyMap: Record<string, () => void> = {
        "Ctrl+1": () => router.push("/autocityPro/dashboard"),
        "Ctrl+2": () => router.push("/autocityPro/sales/new"),
        "Ctrl+3": () => router.push("/autocityPro/sales"),
        "Ctrl+4": () => router.push("/autocityPro/products"),
        "Ctrl+5": () => router.push("/autocityPro/categories"),
        "Ctrl+6": () => router.push("/autocityPro/stock"),
        "Ctrl+7": () => router.push("/autocityPro/customers"),
        "Ctrl+8": () => router.push("/autocityPro/suppliers"),
        "Ctrl+9": () => router.push("/autocityPro/vouchers"), // Direct to vouchers
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
  }, [router, onLogout]);

  return (
    <>
      <div className="w-64 bg-slate-800 text-white h-screen fixed left-0 top-0 overflow-y-auto flex flex-col z-40 border-slate-900">
        {/* Header with Logo */}
        <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="AutoCity Pro Logo"
                width={160}
                height={160}
                className="rounded-lg"
                priority
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AutoCity Pro</h2>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="mt-3 flex items-center space-x-2 text-xs text-purple-200 opacity-80 hover:opacity-100 transition bg-purple-700/30 px-3 py-1.5 rounded-lg border border-purple-500/30"
          >
            <Keyboard className="h-3 w-3" />
            <span>
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-purple-800 rounded text-xs">
                ?
              </kbd>{" "}
              for shortcuts
            </span>
          </button>
        </div>

        {user && (
          <div className="p-4 border-b border-white/10 bg-slate-700/10">
            <button
              onClick={() => router.push("/autocityPro/profile")}
              className="w-full flex items-center space-x-3 text-left rounded-lg hover:bg-slate-700"
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-300 truncate">{user.role}</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navigation.map((section, idx) => (
            <div key={idx} className="mb-4">
              <div className="px-4 mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-all group ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-white border-l-4 border-purple-500 pl-3"
                          : "text-slate-300 hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-indigo-600/10 hover:text-white hover:pl-5"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10 bg-slate-700/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-indigo-600/10 hover:text-white rounded-lg transition group"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </div>
          </button>
        </div>
      </div>

      {/* Keyboard Help Modal with text keys */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-purple-600/20 to-indigo-600/20">
              <div className="flex items-center space-x-3">
                <Keyboard className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition"
              >
                <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">
                  ESC
                </kbd>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Main Navigation */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 pb-2 border-b border-slate-700">
                    Navigation
                  </h3>
                  <div className="space-y-3">
                    <ShortcutRow shortcut="Ctrl + 1" description="Dashboard" />
                    <ShortcutRow shortcut="Ctrl + 2" description="New Sale" />
                    <ShortcutRow shortcut="Ctrl + 3" description="Sales" />
                    <ShortcutRow shortcut="Ctrl + 4" description="Products" />
                    <ShortcutRow shortcut="Ctrl + 5" description="Categories" />
                    <ShortcutRow shortcut="Ctrl + 6" description="Stock" />
                    <ShortcutRow shortcut="Ctrl + 7" description="Customers" />
                    <ShortcutRow shortcut="Ctrl + 8" description="Suppliers" />
                    <ShortcutRow
                      shortcut="Ctrl + 9"
                      description="Vouchers"
                    />
                    <ShortcutRow shortcut="Ctrl + A" description="Accounts" />
                    <ShortcutRow shortcut="Ctrl + L" description="Ledgers" />
                    <ShortcutRow
                      shortcut="Ctrl + M"
                      description="Month Closing"
                    />
                    <ShortcutRow shortcut="Ctrl + ," description="Settings" />
                  </div>
                </div>

                {/* Vouchers & Reports */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 pb-2 border-b border-slate-700">
                    Reports
                  </h3>
                  <div className="space-y-3">
                    <ShortcutRow
                      shortcut="Ctrl + Shift + S"
                      description="Sales Report"
                    />
                    <ShortcutRow
                      shortcut="Ctrl + Shift + B"
                      description="Balance Sheet"
                    />
                    <ShortcutRow
                      shortcut="Ctrl + Shift + T"
                      description="Stock Report"
                    />
                    <ShortcutRow
                      shortcut="Ctrl + Shift + D"
                      description="Daybook"
                    />
                    <ShortcutRow
                      shortcut="Ctrl + Shift + F"
                      description="Cash Flow"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-purple-300 mb-4 pb-2 border-b border-slate-700 mt-6">
                    System
                  </h3>
                  <div className="space-y-3">
                    <ShortcutRow shortcut="Ctrl + Q" description="Logout" />
                    <ShortcutRow
                      shortcut="Alt + H"
                      description="Home (Dashboard)"
                    />
                    <ShortcutRow shortcut="Alt + N" description="New Sale" />
                    <ShortcutRow shortcut="?" description="Show/Hide Help" />
                    <ShortcutRow shortcut="ESC" description="Close Help" />
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Key Symbols
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">
                      Ctrl
                    </kbd>
                    <span>Control / Command</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">
                      Shift
                    </kbd>
                    <span>Shift</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">
                      Alt
                    </kbd>
                    <span>Alt / Option</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">
                      +
                    </kbd>
                    <span>Press keys together</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper component for shortcut rows showing text keys
function ShortcutRow({
  shortcut,
  description,
}: {
  shortcut: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-700/50 transition">
      <span className="text-slate-300">{description}</span>
      <div className="flex items-center space-x-1">
        {shortcut.split(" + ").map((key, index) => (
          <span key={index} className="flex items-center">
            <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-sm font-medium mx-0.5">
              {key}
            </kbd>
            {index < shortcut.split(" + ").length - 1 && (
              <span className="text-slate-500 mx-1">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}