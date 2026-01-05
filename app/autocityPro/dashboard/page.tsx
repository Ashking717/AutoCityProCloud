'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  Activity,
  Package,
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [salesTrend, setSalesTrend] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchDashboardData = async () => {
      try {
        const userRes = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
          
          const analyticsRes = await fetch('/api/analytics/dashboard', {
            credentials: 'include',
          });
          
          if (analyticsRes.ok) {
            const data = await analyticsRes.json();
            setStats(data.stats);
            setSalesTrend(data.salesTrend);
            setTopProducts(data.topProducts);
            setRecentActivity(data.recentActivity);
          }
          
          setLoading(false);
        } else {
          window.location.href = '/autocityPro/login';
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        window.location.href = '/autocityPro/login';
      }
    };

    fetchDashboardData();
  }, []);

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

  if (loading || !stats || !salesTrend) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: '#e2e8f0',
          font: {
            family: 'Inter, sans-serif',
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: '#334155',
        },
      },
      y: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: '#334155',
        },
      },
    },
  };

  const salesTrendConfig = {
    labels: salesTrend.labels,
    datasets: [
      {
        label: 'Sales (QAR)',
        data: salesTrend.data,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Profit (QAR)',
        data: salesTrend.profits,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const topProductsConfig = {
    labels: topProducts.map(p => p.name),
    datasets: [{
      label: 'Revenue (QAR)',
      data: topProducts.map(p => p.revenue),
      backgroundColor: [
        'rgba(168, 85, 247, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(126, 34, 206, 0.8)',
        'rgba(107, 33, 168, 0.8)',
        'rgba(88, 28, 135, 0.8)',
      ],
    }],
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: `QAR ${stats.todaySales.toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-green-600 to-emerald-600',
      change: '+12.5%',
      changePositive: true,
    },
    {
      title: 'Monthly Revenue',
      value: `QAR ${stats.monthSales.toLocaleString()}`,
      icon: TrendingUp,
      gradient: 'from-blue-600 to-cyan-600',
      change: '+8.2%',
      changePositive: true,
    },
    {
      title: 'Total Profit',
      value: `QAR ${stats.totalProfit.toLocaleString()}`,
      icon: Activity,
      gradient: 'from-purple-600 to-indigo-600',
      change: `${stats.profitMargin.toFixed(1)}% margin`,
      changePositive: true,
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertCircle,
      gradient: 'from-orange-600 to-red-600',
      change: 'Needs attention',
      changePositive: false,
    },
  ];

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user?.firstName}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div 
              key={index} 
              className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 hover:bg-slate-700/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-gradient-to-r ${stat.gradient} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <span className={`text-sm font-medium ${stat.changePositive ? 'text-green-400' : 'text-orange-400'}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">Sales & Profit Trend</h2>
            <Line data={salesTrendConfig} options={chartOptions} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">Top Selling Products</h2>
            {topProducts.length > 0 ? (
              <Bar data={topProductsConfig} options={chartOptions} />
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Package className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                <p>No sales data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start space-x-3 p-3 hover:bg-slate-700/50 rounded-lg transition"
                >
                  <Activity className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {activity.user} • {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}