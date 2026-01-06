// types/dashboard.ts
export interface DashboardStats {
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

export interface PercentageChanges {
  salesChange: number;
  profitChange: number;
  customerChange: number;
  lowStockChange: number;
  todayVsYesterday: {
    sales: number;
    profit: number;
  };
}

export interface SalesTrend {
  labels: string[];
  data: number[];
  profits: number[];
}

export interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface RecentActivity {
  id: string;
  description: string;
  user: string;
  timestamp: string;
  type: string;
}

export interface DashboardData {
  stats: DashboardStats;
  salesTrend: SalesTrend;
  topProducts: TopProduct[];
  recentActivity: RecentActivity[];
  percentageChanges: PercentageChanges;
  period: string;
}