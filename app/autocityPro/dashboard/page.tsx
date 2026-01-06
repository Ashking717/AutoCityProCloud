'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Activity,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface DashboardStats {
  todaySales: number;
  monthSales: number;
  totalProfit: number;
  profitMargin: number;
  lowStockItems: number;
  totalCustomers: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingPayments: number;
  pendingCount: number;
}

interface PercentageChanges {
  salesChange: number;
  profitChange: number;
  customerChange: number;
  lowStockChange: number;
  todayVsYesterday: {
    sales: number;
    profit: number;
  };
}

interface SalesTrend {
  labels: string[];
  data: number[];
  profits: number[];
}

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  description: string;
  user: string;
  timestamp: string;
  type: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}

type PeriodType = 'today' | 'week' | 'month' | 'year';

interface DashboardData {
  stats: DashboardStats;
  salesTrend: SalesTrend;
  topProducts: TopProduct[];
  recentActivity: RecentActivity[];
  percentageChanges: PercentageChanges;
  period: string;
}

// Default values for empty states
const defaultStats: DashboardStats = {
  todaySales: 0,
  monthSales: 0,
  totalProfit: 0,
  profitMargin: 0,
  lowStockItems: 0,
  totalCustomers: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  pendingPayments: 0,
  pendingCount: 0,
};

const defaultPercentageChanges: PercentageChanges = {
  salesChange: 0,
  profitChange: 0,
  customerChange: 0,
  lowStockChange: 0,
  todayVsYesterday: {
    sales: 0,
    profit: 0,
  },
};

const defaultSalesTrend: SalesTrend = {
  labels: [],
  data: [],
  profits: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasFetched = useRef(false);

  // Safe data getters
  const stats = dashboardData?.stats || defaultStats;
  const percentageChanges = dashboardData?.percentageChanges || defaultPercentageChanges;
  const salesTrend = dashboardData?.salesTrend || defaultSalesTrend;
  const topProducts = dashboardData?.topProducts || [];
  const recentActivity = dashboardData?.recentActivity || [];

  const fetchDashboardData = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }

      // Fetch user data
      const userRes = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!userRes.ok) {
        throw new Error('Unauthorized');
      }
      
      const userData = await userRes.json();
      setUser(userData.user);
      
      // Fetch dashboard analytics
      const analyticsRes = await fetch(`/api/analytics/dashboard?period=${period}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!analyticsRes.ok) {
        throw new Error(`Failed to fetch analytics: ${analyticsRes.status}`);
      }
      
      const data = await analyticsRes.json();
      setDashboardData(data);
      setLastUpdated(new Date());
      
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      
      // Redirect to login if unauthorized
      if (error.message === 'Unauthorized') {
        window.location.href = '/autocityPro/login';
      }
    }
  }, [period]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchDashboardData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/autocityPro/login';
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/autocityPro/login';
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(false);
  };

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    // Reset dashboard data to show loading state
    setDashboardData(null);
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    if (value === 0) return '0%';
    const isPositive = value > 0;
    const formatted = Math.abs(value).toFixed(1);
    return `${isPositive ? '+' : '-'}${formatted}%`;
  };

  const getChangeDescription = (change: number, type: 'sales' | 'profit' | 'customers') => {
    if (change === 0) {
      switch (type) {
        case 'sales': return 'No change from previous period';
        case 'profit': return 'Profit unchanged';
        case 'customers': return 'Customer growth stable';
      }
    }
    
    const isPositive = change > 0;
    const absChange = Math.abs(change);
    
    if (absChange < 5) {
      return isPositive ? 'Slight increase' : 'Slight decrease';
    } else if (absChange < 20) {
      return isPositive ? 'Moderate growth' : 'Moderate decline';
    } else if (absChange < 50) {
      return isPositive ? 'Strong growth' : 'Significant decline';
    } else {
      return isPositive ? 'Exceptional growth' : 'Major decline';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-5 w-5 text-green-400" />;
      case 'inventory':
        return <Package className="h-5 w-5 text-blue-400" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-purple-400" />;
      case 'customer':
        return <Users className="h-5 w-5 text-yellow-400" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-purple-600 mx-auto"></div>
          <p className="mt-4 text-slate-300 text-lg font-medium">Loading dashboard...</p>
          <p className="text-slate-500 text-sm mt-2">Calculating real-time metrics</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="text-center max-w-md p-8 bg-slate-800/50 rounded-2xl border border-slate-700">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Dashboard</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#475569',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
  };

  const salesTrendConfig = {
    labels: salesTrend.labels,
    datasets: [
      {
        label: 'Sales',
        data: salesTrend.data,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: 'rgb(168, 85, 247)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Profit',
        data: salesTrend.profits,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const topProductsConfig = {
    labels: topProducts.map(p => p.name),
    datasets: [{
      label: 'Revenue',
      data: topProducts.map(p => p.revenue),
      backgroundColor: [
        'rgba(168, 85, 247, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(126, 34, 206, 0.8)',
        'rgba(107, 33, 168, 0.8)',
        'rgba(88, 28, 135, 0.8)',
      ],
      borderColor: [
        'rgb(168, 85, 247)',
        'rgb(147, 51, 234)',
        'rgb(126, 34, 206)',
        'rgb(107, 33, 168)',
        'rgb(88, 28, 135)',
      ],
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
      change: formatPercentage(percentageChanges.todayVsYesterday.sales),
      changePositive: percentageChanges.todayVsYesterday.sales >= 0,
      description: 'Compared to yesterday',
      showTrendIcon: true,
    },
    {
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} Revenue`,
      value: formatCurrency(stats.monthSales),
      icon: TrendingUp,
      gradient: 'from-blue-500 to-cyan-500',
      change: formatPercentage(percentageChanges.salesChange),
      changePositive: percentageChanges.salesChange >= 0,
      description: getChangeDescription(percentageChanges.salesChange, 'sales'),
      showTrendIcon: true,
    },
    {
      title: 'Total Profit',
      value: formatCurrency(stats.totalProfit),
      icon: Activity,
      gradient: 'from-purple-500 to-indigo-500',
      change: `${formatPercentage(percentageChanges.profitChange)} • ${stats.profitMargin.toFixed(1)}% margin`,
      changePositive: percentageChanges.profitChange >= 0,
      description: getChangeDescription(percentageChanges.profitChange, 'profit'),
      showTrendIcon: true,
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertCircle,
      gradient: 'from-orange-500 to-red-500',
      change: stats.lowStockItems > 0 ? 'Needs attention' : 'All good',
      changePositive: stats.lowStockItems === 0,
      description: 'Products below reorder point',
      alert: stats.lowStockItems > 0,
      showTrendIcon: false,
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      gradient: 'from-yellow-500 to-amber-500',
      change: formatPercentage(percentageChanges.customerChange),
      changePositive: percentageChanges.customerChange >= 0,
      description: getChangeDescription(percentageChanges.customerChange, 'customers'),
      showTrendIcon: true,
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(stats.pendingPayments),
      icon: CreditCard,
      gradient: 'from-rose-500 to-pink-500',
      change: `${stats.pendingCount} outstanding invoices`,
      changePositive: false,
      description: 'Total unpaid amount',
      alert: stats.pendingPayments > 0,
      showTrendIcon: false,
    },
  ];

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-slate-800">
        {/* Header */}
  <div className="ml-1  mb-6 py-9  bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="ml-2 text-2xl font-bold text-white">Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="ml-2 text-slate-300">
                  Welcome back, <span className="text-slate-300 font-medium">{user?.lastName}!</span>
                </p>
                {lastUpdated && (
                  <span className="text-xs text-gray-300">
                    • Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      period === option.value
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Error Banner */}
          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-red-400 hover:text-red-300 text-sm font-medium mt-1"
                >
                  Try refreshing
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {statCards.map((stat, index) => {
              const isPositive = stat.changePositive;
              const changeValue = stat.change;
              
              return (
                <div 
                  key={index} 
                  className="group bg-slate-800/30 border border-slate-700/50 rounded-xl shadow-lg p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-r ${stat.gradient} p-2.5 rounded-lg shadow-lg`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-xs font-medium text-gray-400 px-2 py-1 rounded-full flex items-center gap-1 
                    `}>
                      {stat.showTrendIcon && (
                        isPositive 
                          ? <ArrowUpRight className="h-3 w-3" />
                          : <ArrowDownRight className="h-3 w-3" />
                      )}
                      {changeValue}
                    </span>
                  </div>
                  
                  <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                    {stat.title}
                  </h3>
                  <p className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-500 truncate">
                      {stat.description}
                    </p>
                    {stat.alert && (
                      <div className="animate-pulse h-2 w-2 rounded-full bg-red-500"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Summary */}
          <div className="mb-8 p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-4">Performance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Sales Growth</span>
                  <span className={`text-sm font-medium ${percentageChanges.salesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(percentageChanges.salesChange)}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${percentageChanges.salesChange >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ 
                      width: `${Math.min(Math.abs(percentageChanges.salesChange), 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Compared to previous {period}
                </p>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Profit Margin</span>
                  <span className={`text-sm font-medium ${stats.profitMargin > 20 ? 'text-green-400' : stats.profitMargin > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stats.profitMargin > 20 ? 'bg-green-500' : stats.profitMargin > 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ 
                      width: `${Math.min(stats.profitMargin, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Net profit percentage
                </p>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Avg Order Value</span>
                  <span className="text-sm font-medium text-slate-300">
                    {formatCurrency(stats.averageOrderValue)}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ 
                      width: `${Math.min(stats.averageOrderValue / 5000 * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Per transaction average
                </p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales & Profit Trend */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Sales & Profit Trend</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {period === 'today' ? 'Hourly performance' : 
                     period === 'week' ? 'Last 7 days performance' :
                     period === 'month' ? 'Last 30 days performance' : 'Monthly performance for the year'}
                  </p>
                </div>
                <Calendar className="h-5 w-5 text-slate-500" />
              </div>
              <div className="h-80">
                {salesTrend.data.length > 0 ? (
                  <Line 
                    data={salesTrendConfig} 
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: {
                          display: false,
                        },
                      },
                    }} 
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <AlertTriangle className="h-12 w-12 text-slate-600 mb-4" />
                    <p className="text-slate-400">No sales data available</p>
                    <p className="text-slate-500 text-sm">Sales will appear here</p>
                  </div>
                )}
              </div>
              {salesTrend.data.length > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
                  <span>
                    Total: {formatCurrency(salesTrend.data.reduce((a, b) => a + b, 0))}
                  </span>
                  <span className={`text-xs ${percentageChanges.salesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(percentageChanges.salesChange)} vs previous {period}
                  </span>
                </div>
              )}
            </div>

{/* Top Products */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Top Products</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Best selling products by revenue
                  </p>
                </div>
                <Package className="h-5 w-5 text-slate-500" />
              </div>
              {topProducts.length > 0 ? (
                <>
                  <div className="h-80">
                    <Bar 
                      data={topProductsConfig} 
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: false,
                          },
                        },
                      }} 
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{product.name}</p>
                            <p className="text-xs text-slate-400">{product.quantity} units sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{formatCurrency(product.revenue)}</p>
                          <p className="text-xs text-slate-400">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                    <Package className="h-12 w-12 text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-medium">No sales data available</p>
                  <p className="text-slate-500 text-sm mt-1">Start selling to see top products here</p>
                </div>
              )}
            </div>
          </div>
          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Latest actions in your system
                  </p>
                </div>
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all group"
                    >
                      <div className="pt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 group-hover:text-white transition-colors">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400">
                            {activity.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            by {activity.user}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {activity.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No recent activity</p>
                    <p className="text-slate-500 text-sm mt-1">Activities will appear here</p>
                  </div>
                )}
              </div>
              
              {recentActivity.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <button
                    onClick={() => router.push('/activities')}
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-2"
                  >
                    View all activities
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-white mb-6">Quick Actions</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/sales/new')}
                  className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-medium hover:opacity-90 transition-all flex items-center justify-between"
                >
                  <span>New Sale</span>
                  <ShoppingCart className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => router.push('/inventory')}
                  className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center justify-between"
                >
                  <span>Manage Inventory</span>
                  <Package className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => router.push('/customers')}
                  className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center justify-between"
                >
                  <span>View Customers</span>
                  <Users className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => router.push('/reports')}
                  className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center justify-between"
                >
                  <span>Generate Reports</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </div>
              
              {/* Period Summary */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Period Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Orders</span>
                    <span className="text-sm font-medium text-white">{stats.totalOrders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Avg Order Value</span>
                    <span className="text-sm font-medium text-white">{formatCurrency(stats.averageOrderValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Profit Margin</span>
                    <span className={`text-sm font-medium ${stats.profitMargin > 20 ? 'text-green-400' : stats.profitMargin > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {stats.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Low Stock Items</span>
                    <span className={`text-sm font-medium ${stats.lowStockItems === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                      {stats.lowStockItems}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}