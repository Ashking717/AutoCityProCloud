"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ShoppingBag,
  CreditCard,
  ArrowRight,
  Package,
  Receipt,
  TrendingUp,
  BarChart3,
  DollarSign,
  FileText,
  PlusCircle,
  History,
  Settings,
  Users,
  Calendar,
  Tag,
  Truck,
  Grid,
  UserPlus,
  Layers,
  FolderPlus,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";

export default function PurchasesPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [quickActions, setQuickActions] = useState([
    {
      id: 1,
      title: "New Purchase",
      description: "Add new inventory purchase",
      icon: ShoppingBag,
      color: "from-blue-500 to-cyan-500",
      href: "/autocityPro/purchases/new",
      shortcut: "Ctrl+P",
    },
    {
      id: 2,
      title: "View/Record Expense",
      description: "Record business expense",
      icon: CreditCard,
      color: "from-orange-500 to-red-500",
      href: "/autocityPro/expenses",
      shortcut: "Ctrl+E",
    },
    {
      id: 3,
      title: "Manage Categories",
      description: "Add/edit product categories",
      icon: Tag,
      color: "from-purple-500 to-pink-500",
      href: "/autocityPro/categories",
      shortcut: "Ctrl+C",
    },
    {
      id: 4,
      title: "Manage Suppliers",
      description: "Add/edit supplier information",
      icon: Truck,
      color: "from-green-500 to-emerald-500",
      href: "/autocityPro/suppliers",
      shortcut: "Ctrl+S",
    },
    {
      id: 5,
      title: "View Purchases",
      description: "Browse purchase history",
      icon: History,
      color: "from-indigo-500 to-blue-500",
      href: "/autocityPro/purchases",
      shortcut: "Ctrl+Shift+P",
    },
    
  ]);

  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalExpenses: 0,
    pendingBills: 0,
    todayPurchases: 0,
    totalCategories: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
  });

  const [recentCategories, setRecentCategories] = useState<any[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchRecentCategories();
    fetchTopSuppliers();
    fetchRecentTransactions();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Mock data - replace with actual API calls
      setStats({
        totalPurchases: 154,
        totalExpenses: 23450,
        pendingBills: 12,
        todayPurchases: 8,
        totalCategories: 28,
        totalSuppliers: 42,
        activeSuppliers: 36,
      });
    } catch (error) {
      console.error("Failed to fetch stats");
    }
  };

  const fetchRecentCategories = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockCategories = [
        {
          id: 1,
          name: "Engine Parts",
          productCount: 156,
          createdAt: "2024-01-15",
        },
        {
          id: 2,
          name: "Brake Systems",
          productCount: 89,
          createdAt: "2024-01-14",
        },
        {
          id: 3,
          name: "Suspension",
          productCount: 67,
          createdAt: "2024-01-13",
        },
        {
          id: 4,
          name: "Electrical",
          productCount: 123,
          createdAt: "2024-01-12",
        },
        {
          id: 5,
          name: "Body Parts",
          productCount: 45,
          createdAt: "2024-01-11",
        },
      ];
      setRecentCategories(mockCategories);
    } catch (error) {
      console.error("Failed to fetch categories");
    }
  };

  const fetchTopSuppliers = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockSuppliers = [
        {
          id: 1,
          name: "Toyota Parts Center",
          totalPurchases: 45000,
          pendingAmount: 12000,
          rating: 4.8,
        },
        {
          id: 2,
          name: "BMW Spares Ltd",
          totalPurchases: 38000,
          pendingAmount: 8000,
          rating: 4.6,
        },
        {
          id: 3,
          name: "Mercedes Genuine Parts",
          totalPurchases: 52000,
          pendingAmount: 0,
          rating: 4.9,
        },
        {
          id: 4,
          name: "Honda Auto Parts",
          totalPurchases: 29000,
          pendingAmount: 5000,
          rating: 4.4,
        },
        {
          id: 5,
          name: "Ford Parts Distributor",
          totalPurchases: 34000,
          pendingAmount: 3000,
          rating: 4.7,
        },
      ];
      setTopSuppliers(mockSuppliers);
    } catch (error) {
      console.error("Failed to fetch suppliers");
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockTransactions = [
        {
          id: 1,
          type: "purchase",
          vendor: "Toyota Parts",
          amount: 4500,
          date: "2024-01-15",
          status: "paid",
        },
        {
          id: 2,
          type: "expense",
          category: "Utilities",
          amount: 1200,
          date: "2024-01-14",
          status: "paid",
        },
        {
          id: 3,
          type: "purchase",
          vendor: "BMW Spares",
          amount: 8900,
          date: "2024-01-13",
          status: "pending",
        },
        {
          id: 4,
          type: "expense",
          category: "Rent",
          amount: 8000,
          date: "2024-01-12",
          status: "paid",
        },
        {
          id: 5,
          type: "purchase",
          vendor: "Mercedes Parts",
          amount: 5600,
          date: "2024-01-11",
          status: "paid",
        },
      ];
      setRecentTransactions(mockTransactions);
    } catch (error) {
      console.error("Failed to fetch transactions");
    }
  };

  const handleQuickAction = (href: string) => {
    router.push(href);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      let handled = false;

      if (isCtrl && !isShift) {
        switch (e.key.toLowerCase()) {
          case "p":
            e.preventDefault();
            router.push("/autocityPro/purchases/new");
            handled = true;
            break;
          case "e":
            e.preventDefault();
            router.push("/autocityPro/expenses/new");
            handled = true;
            break;
          case "c":
            e.preventDefault();
            router.push("/autocityPro/categories");
            handled = true;
            break;
          case "s":
            e.preventDefault();
            router.push("/autocityPro/suppliers");
            handled = true;
            break;
        }
      } else if (isCtrl && isShift) {
        switch (e.key.toLowerCase()) {
          case "p":
            e.preventDefault();
            router.push("/autocityPro/purchases");
            handled = true;
            break;
          case "e":
            e.preventDefault();
            router.push("/autocityPro/expenses");
            handled = true;
            break;
          case "c":
            e.preventDefault();
            router.push("/autocityPro/categories/new");
            handled = true;
            break;
          case "s":
            e.preventDefault();
            router.push("/autocityPro/suppliers/new");
            handled = true;
            break;
        }
      }

      if (handled) {
        toast.success("Navigating...");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddCategory = () => {
    router.push("/autocityPro/categories/new");
  };

  const handleAddSupplier = () => {
    router.push("/autocityPro/suppliers/new");
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-purple-500/30 shadow-lg">
        <div className="px-8 py-9">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Purchases, Expenses & Inventory
              </h1>
              <p className="text-purple-100 mt-1">
                Manage purchases, expenses, categories, and suppliers in one place
              </p>
            </div>
            
          </div>
        </div>
      </div>
      <div className="p-6  bg-slate-900">

      {/* Main Content */}
      <div className="p-20 rounded-lg bg-slate-800 min-h-screen">
        

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <p className="text-sm text-slate-400">
              Press <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">?</kbd>{" "}
              for keyboard shortcuts
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.href)}
                className="bg-slate-900 rounded-lg p-5 border border-slate-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 group text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-r ${action.color}`}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  {action.description}
                </p>
                <div className="flex items-center text-purple-400 group-hover:text-purple-300 transition-colors">
                  <span className="text-xs font-medium">Go to</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      </div>
    </MainLayout>
  );
}