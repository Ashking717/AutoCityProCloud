'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Car,
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
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['accounting', 'vouchers', 'reports']);
  const [showHelp, setShowHelp] = useState(false);

  // Define keyboard shortcuts
  const shortcuts = {
    'Dashboard': 'Ctrl+1',
    'New Sale': 'Ctrl+2',
    'Sales': 'Ctrl+3',
    'Products': 'Ctrl+4',
    'Categories': 'Ctrl+5',
    'Stock': 'Ctrl+6',
    'Customers': 'Ctrl+7',
    'Suppliers': 'Ctrl+8',
    'Vouchers': 'Ctrl+9',
    'All Vouchers': 'Ctrl+Shift+V',
    'Payment': 'Ctrl+Shift+P',
    'Receipt': 'Ctrl+Shift+R',
    'Journal': 'Ctrl+Shift+J',
    'Contra': 'Ctrl+Shift+C',
    'Accounts': 'Ctrl+A',
    'Ledgers': 'Ctrl+L',
    'Sales Report': 'Ctrl+Shift+S',
    'Profit & Loss': 'Ctrl+Shift+P',
    'Balance Sheet': 'Ctrl+Shift+B',
    'Stock Report': 'Ctrl+Shift+T',
    'Customer Ledger': 'Ctrl+Shift+C',
    'Daybook': 'Ctrl+Shift+D',
    'Cash Flow': 'Ctrl+Shift+F',
    'Day & Month Closing': 'Ctrl+M',
    'Settings': 'Ctrl+,',
    'Outlets': 'Ctrl+O',
    'Users': 'Ctrl+U',
    'Activity Logs': 'Ctrl+Alt+L',
    'Logout': 'Ctrl+Q',
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev =>
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const isParentActive = (paths: string[]) => paths.some(path => pathname.startsWith(path));

  const navigation = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/autocityPro/dashboard' },
        { name: 'New Sale', icon: Sparkles, href: '/autocityPro/sales/new' },
        { name: 'Sales', icon: ShoppingCart, href: '/autocityPro/sales' },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { name: 'Products', icon: Package, href: '/autocityPro/products' },
        { name: 'Categories', icon: List, href: '/autocityPro/categories' },
        { name: 'Stock', icon: TrendingUp, href: '/autocityPro/stock' },
      ],
    },
    {
      title: 'Parties',
      items: [
        { name: 'Customers', icon: Users, href: '/autocityPro/customers' },
        { name: 'Suppliers', icon: Truck, href: '/autocityPro/suppliers' },
      ],
    },
    {
      title: 'Accounting',
      items: [
        { 
          name: 'Vouchers', 
          icon: Receipt, 
          href: '#',
          submenu: [
            { name: 'All Vouchers', href: '/autocityPro/vouchers' },
            { name: 'Payment', href: '/autocityPro/vouchers/payment' },
            { name: 'Receipt', href: '/autocityPro/vouchers/receipt' },
            { name: 'Journal', href: '/autocityPro/vouchers/journal' },
            { name: 'Contra', href: '/autocityPro/vouchers/contra' },
          ]
        },
        { name: 'Accounts', icon: BookOpen, href: '/autocityPro/accounts' },
        { name: 'Ledgers', icon: DollarSign, href: '/autocityPro/ledgers' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { 
          name: 'Sales Report', 
          icon: BarChart3, 
          href: '#',
          submenu: [
            { name: 'Sales Report', href: '/autocityPro/reports/sales' },
            { name: 'Profit & Loss', href: '/autocityPro/reports/profit-loss' },
            { name: 'Balance Sheet', href: '/autocityPro/reports/balance-sheet' },
            { name: 'Stock Report', href: '/autocityPro/reports/stock' },
            { name: 'Customer Ledger', href: '/autocityPro/reports/customer-ledger' },
            { name: 'Daybook', href: '/autocityPro/reports/daybook' },
            { name: 'Cash Flow', href: '/autocityPro/reports/cash-flow' },
          ]
        },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Day & Month Closing', icon: Lock, href: '/autocityPro/closings' },
        { name: 'Settings', icon: Settings, href: '/autocityPro/settings' },
      ],
    },
  ];

  // Add Admin section for SUPERADMIN
  if (user?.role === 'SUPERADMIN') {
    navigation.push({
      title: 'Admin',
      items: [
        { name: 'Outlets', icon: LayoutDashboard, href: '/autocityPro/settings/outlets' },
        { name: 'Users', icon: Users, href: '/autocityPro/settings/users' },
        { name: 'Activity Logs', icon: Activity, href: '/autocityPro/settings/logs' },
      ],
    });
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check for Ctrl/Cmd combinations
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      
      // Toggle help with ? key
      if (e.key === '?' && !isCtrl && !isShift && !isAlt) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }

      // Define all keyboard shortcuts
      const keyMap: Record<string, () => void> = {
        // Ctrl + Number shortcuts
        'Ctrl+1': () => router.push('/autocityPro/dashboard'),
        'Ctrl+2': () => router.push('/autocityPro/sales/new'),
        'Ctrl+3': () => router.push('/autocityPro/sales'),
        'Ctrl+4': () => router.push('/autocityPro/products'),
        'Ctrl+5': () => router.push('/autocityPro/categories'),
        'Ctrl+6': () => router.push('/autocityPro/stock'),
        'Ctrl+7': () => router.push('/autocityPro/customers'),
        'Ctrl+8': () => router.push('/autocityPro/suppliers'),
        'Ctrl+9': () => toggleMenu('vouchers'),
        
        // Ctrl + Letter shortcuts
        'Ctrl+A': () => router.push('/autocityPro/accounts'),
        'Ctrl+L': () => router.push('/autocityPro/ledgers'),
        'Ctrl+,': () => router.push('/autocityPro/settings'),
        'Ctrl+M': () => router.push('/autocityPro/closings'),
        'Ctrl+O': () => router.push('/autocityPro/settings/outlets'),
        'Ctrl+U': () => router.push('/autocityPro/settings/users'),
        'Ctrl+Q': () => onLogout(),
        
        // Ctrl + Shift shortcuts
        'Ctrl+Shift+V': () => router.push('/autocityPro/vouchers'),
        'Ctrl+Shift+P': () => router.push('/autocityPro/vouchers/payment'),
        'Ctrl+Shift+R': () => router.push('/autocityPro/vouchers/receipt'),
        'Ctrl+Shift+J': () => router.push('/autocityPro/vouchers/journal'),
        'Ctrl+Shift+C': () => router.push('/autocityPro/vouchers/contra'),
        
        // Ctrl + Shift + Reports
        'Ctrl+Shift+S': () => router.push('/autocityPro/reports/sales'),
        'Ctrl+Shift+B': () => router.push('/autocityPro/reports/balance-sheet'),
        'Ctrl+Shift+T': () => router.push('/autocityPro/reports/stock'),
        'Ctrl+Shift+D': () => router.push('/autocityPro/reports/daybook'),
        'Ctrl+Shift+F': () => router.push('/autocityPro/reports/cash-flow'),
        
        // Ctrl + Alt shortcuts
        'Ctrl+Alt+L': () => router.push('/autocityPro/settings/logs'),
        
        // Alt shortcuts
        'Alt+H': () => router.push('/autocityPro/dashboard'),
        'Alt+N': () => router.push('/autocityPro/sales/new'),
      };

      // Determine which key combination was pressed
      let keyCombo = '';
      
      if (isCtrl && isShift) {
        // Ctrl + Shift combinations
        if (e.key === 'V') keyCombo = 'Ctrl+Shift+V';
        else if (e.key === 'P') keyCombo = 'Ctrl+Shift+P';
        else if (e.key === 'R') keyCombo = 'Ctrl+Shift+R';
        else if (e.key === 'J') keyCombo = 'Ctrl+Shift+J';
        else if (e.key === 'C') keyCombo = 'Ctrl+Shift+C';
        else if (e.key === 'S') keyCombo = 'Ctrl+Shift+S';
        else if (e.key === 'B') keyCombo = 'Ctrl+Shift+B';
        else if (e.key === 'T') keyCombo = 'Ctrl+Shift+T';
        else if (e.key === 'D') keyCombo = 'Ctrl+Shift+D';
        else if (e.key === 'F') keyCombo = 'Ctrl+Shift+F';
      } else if (isCtrl && isAlt) {
        // Ctrl + Alt combinations
        if (e.key === 'L') keyCombo = 'Ctrl+Alt+L';
      } else if (isCtrl) {
        // Ctrl only combinations
        if (e.key >= '1' && e.key <= '9') keyCombo = `Ctrl+${e.key}`;
        else if (e.key === 'a' || e.key === 'A') keyCombo = 'Ctrl+A';
        else if (e.key === 'l' || e.key === 'L') keyCombo = 'Ctrl+L';
        else if (e.key === ',') keyCombo = 'Ctrl+,';
        else if (e.key === 'm' || e.key === 'M') keyCombo = 'Ctrl+M';
        else if (e.key === 'o' || e.key === 'O') keyCombo = 'Ctrl+O';
        else if (e.key === 'u' || e.key === 'U') keyCombo = 'Ctrl+U';
        else if (e.key === 'q' || e.key === 'Q') keyCombo = 'Ctrl+Q';
      } else if (isAlt) {
        // Alt combinations
        if (e.key === 'h' || e.key === 'H') keyCombo = 'Alt+H';
        else if (e.key === 'n' || e.key === 'N') keyCombo = 'Alt+N';
      }

      // Execute the shortcut if found
      if (keyCombo && keyMap[keyCombo]) {
        e.preventDefault();
        keyMap[keyCombo]();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router, onLogout]);

  // Helper function to format shortcut display
  const formatShortcut = (shortcut: string) => {
    return shortcut
      .replace('Ctrl', '⌃')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('+', '');
  };

  return (
    <>
      <div className="w-64 bg-slate-800 text-white h-screen fixed left-0 top-0 overflow-y-auto flex flex-col z-40">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-xl font-bold">AutoCity Pro</h2>
              <p className="text-xs text-purple-200">Accounting System</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="mt-2 flex items-center space-x-1 text-xs text-purple-200 opacity-75 hover:opacity-100 transition"
          >
            <Keyboard className="h-3 w-3" />
            <span>Press <kbd className="px-1 py-0.5 bg-purple-800 rounded text-xs">?</kbd> for shortcuts</span>
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.role}</p>
              </div>
            </div>
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
                  const hasSubmenu = item.submenu && item.submenu.length > 0;
                  const isSubmenuExpanded = expandedMenus.includes(item.name.toLowerCase().replace(' ', '-'));
                  const hasActiveChild = hasSubmenu && isParentActive(item.submenu!.map(sub => sub.href));
                  const shortcutKey = shortcuts[item.name as keyof typeof shortcuts];

                  if (hasSubmenu) {
                    return (
                      <div key={item.name}>
                        <button
                          onClick={() => toggleMenu(item.name.toLowerCase().replace(' ', '-'))}
                          className={`w-full flex items-center justify-between space-x-3 px-4 py-3 text-sm transition-all group ${
                            hasActiveChild
                              ? 'bg-purple-600/20 text-white border-l-4 border-purple-600 pl-3'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white hover:pl-5'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {shortcutKey && (
                              <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded border border-slate-600 group-hover:bg-slate-600 transition-colors">
                                {formatShortcut(shortcutKey)}
                              </kbd>
                            )}
                            {isSubmenuExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {isSubmenuExpanded && (
                          <div className="ml-8 mt-1 space-y-1">
                            {item.submenu!.map((subItem) => {
                              const isSubActive = pathname === subItem.href;
                              const subShortcutKey = shortcuts[subItem.name as keyof typeof shortcuts];
                              return (
                                <button
                                  key={subItem.href}
                                  onClick={() => router.push(subItem.href)}
                                  className={`w-full flex items-center justify-between space-x-3 px-4 py-2 text-sm transition-all group ${
                                    isSubActive
                                      ? 'bg-purple-600/20 text-white border-l-2 border-purple-400 pl-3'
                                      : 'text-slate-300 hover:bg-white/5 hover:text-white hover:pl-5'
                                  }`}
                                >
                                  <span className="ml-5">{subItem.name}</span>
                                  {subShortcutKey && (
                                    <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded border border-slate-600 group-hover:bg-slate-600 transition-colors">
                                      {formatShortcut(subShortcutKey)}
                                    </kbd>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={`w-full flex items-center justify-between space-x-3 px-4 py-3 text-sm transition-all group ${
                        isActive
                          ? 'bg-purple-600/20 text-white border-l-4 border-purple-600 pl-3'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white hover:pl-5'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </div>
                      {shortcutKey && (
                        <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded border border-slate-600 group-hover:bg-slate-600 transition-colors">
                          {formatShortcut(shortcutKey)}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between space-x-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white rounded-lg transition group"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded border border-slate-600 group-hover:bg-slate-600 transition-colors">
              {formatShortcut('Ctrl+Q')}
            </kbd>
          </button>
        </div>
      </div>

      {/* Keyboard Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <Keyboard className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition"
              >
                <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">ESC</kbd>
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
                    <ShortcutRow shortcut="Ctrl+1" description="Dashboard" />
                    <ShortcutRow shortcut="Ctrl+2" description="New Sale" />
                    <ShortcutRow shortcut="Ctrl+3" description="Sales" />
                    <ShortcutRow shortcut="Ctrl+4" description="Products" />
                    <ShortcutRow shortcut="Ctrl+5" description="Categories" />
                    <ShortcutRow shortcut="Ctrl+6" description="Stock" />
                    <ShortcutRow shortcut="Ctrl+7" description="Customers" />
                    <ShortcutRow shortcut="Ctrl+8" description="Suppliers" />
                    <ShortcutRow shortcut="Ctrl+9" description="Toggle Vouchers" />
                    <ShortcutRow shortcut="Ctrl+A" description="Accounts" />
                    <ShortcutRow shortcut="Ctrl+L" description="Ledgers" />
                    <ShortcutRow shortcut="Ctrl+M" description="Month Closing" />
                    <ShortcutRow shortcut="Ctrl+," description="Settings" />
                  </div>
                </div>

                {/* Vouchers & Reports */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 pb-2 border-b border-slate-700">
                    Vouchers & Reports
                  </h3>
                  <div className="space-y-3">
                    <ShortcutRow shortcut="Ctrl+Shift+V" description="All Vouchers" />
                    <ShortcutRow shortcut="Ctrl+Shift+P" description="Payment Voucher" />
                    <ShortcutRow shortcut="Ctrl+Shift+R" description="Receipt Voucher" />
                    <ShortcutRow shortcut="Ctrl+Shift+J" description="Journal Voucher" />
                    <ShortcutRow shortcut="Ctrl+Shift+C" description="Contra Voucher" />
                    <ShortcutRow shortcut="Ctrl+Shift+S" description="Sales Report" />
                    <ShortcutRow shortcut="Ctrl+Shift+P" description="Profit & Loss" />
                    <ShortcutRow shortcut="Ctrl+Shift+B" description="Balance Sheet" />
                    <ShortcutRow shortcut="Ctrl+Shift+T" description="Stock Report" />
                    <ShortcutRow shortcut="Ctrl+Shift+D" description="Daybook" />
                    <ShortcutRow shortcut="Ctrl+Shift+F" description="Cash Flow" />
                  </div>

                  <h3 className="text-lg font-semibold text-purple-300 mb-4 pb-2 border-b border-slate-700 mt-6">
                    System
                  </h3>
                  <div className="space-y-3">
                    <ShortcutRow shortcut="Ctrl+Q" description="Logout" />
                    <ShortcutRow shortcut="Alt+H" description="Home (Dashboard)" />
                    <ShortcutRow shortcut="Alt+N" description="New Sale" />
                    <ShortcutRow shortcut="?" description="Show/Hide Help" />
                    <ShortcutRow shortcut="ESC" description="Close Help" />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Symbols Legend</h4>
                <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">⌃</kbd>
                    <span>Ctrl / Cmd</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">⇧</kbd>
                    <span>Shift</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">⌥</kbd>
                    <span>Alt / Option</span>
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

// Helper component for shortcut rows
function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  const formatDisplay = (s: string) => {
    return s
      .replace('Ctrl', '⌃')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('+', '');
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-700/50 transition">
      <span className="text-slate-300">{description}</span>
      <kbd className="px-3 py-1.5 bg-slate-700 rounded-lg border border-slate-600 text-sm font-medium">
        {formatDisplay(shortcut)}
      </kbd>
    </div>
  );
}