import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesTrend {
  labels: string[];
  data: number[];
  profits: number[];
}

interface Props {
  data: SalesTrend;
  period: string;
  isMobile: boolean;
  formatCurrency: (amount: number) => string;
}

function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function SalesTrendChart({ data, period, isMobile, formatCurrency }: Props) {
  const isDark = useTimeBasedTheme();

  const th = {
    cardBg:        isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)' : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:    isDark ? 'rgba(255,255,255,0.10)'                  : 'rgba(0,0,0,0.08)',
    title:         isDark ? '#ffffff'                                 : '#111827',
    sub:           isDark ? '#9ca3af'                                 : '#6b7280',
    emptyIcon:     isDark ? '#4b5563'                                 : '#d1d5db',
    emptyText:     isDark ? '#9ca3af'                                 : '#6b7280',
    // Chart.js tokens
    legendText:    isDark ? '#e2e8f0'                                 : '#374151',
    tooltipBg:     isDark ? 'rgba(10,10,10,0.95)'                     : 'rgba(255,255,255,0.97)',
    tooltipTitle:  isDark ? '#e2e8f0'                                 : '#111827',
    tooltipBody:   isDark ? '#cbd5e1'                                 : '#374151',
    gridLine:      isDark ? 'rgba(255,255,255,0.03)'                  : 'rgba(0,0,0,0.06)',
    tickColor:     isDark ? '#94a3b8'                                 : '#6b7280',
    pointBorder:   isDark ? '#ffffff'                                 : '#ffffff',
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: th.legendText,
          font: { family: 'Inter, sans-serif', size: isMobile ? 10 : 12 },
          padding: isMobile ? 12 : 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: th.tooltipBg,
        titleColor: th.tooltipTitle,
        bodyColor: th.tooltipBody,
        borderColor: '#E84545',
        borderWidth: 1,
        padding: isMobile ? 8 : 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: th.gridLine },
        ticks: {
          color: th.tickColor,
          font: { size: isMobile ? 9 : 11 },
          maxRotation: isMobile ? 45 : 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: th.gridLine },
        ticks: {
          color: th.tickColor,
          font: { size: isMobile ? 9 : 11 },
          callback: (value: any) => isMobile ? `${value / 1000}K` : formatCurrency(value),
        },
      },
    },
  };

  const salesTrendConfig = {
    labels: data.labels,
    datasets: [
      {
        label: 'Sales',
        data: data.data,
        borderColor: '#E84545',
        backgroundColor: isDark ? 'rgba(232,69,69,0.10)' : 'rgba(232,69,69,0.07)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#E84545',
        pointBorderColor: th.pointBorder,
        pointBorderWidth: 2,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
      {
        label: 'Profit',
        data: data.profits,
        borderColor: '#10b981',
        backgroundColor: isDark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.07)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointBorderColor: th.pointBorder,
        pointBorderWidth: 2,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
    ],
  };

  return (
    <div
      className="rounded-2xl shadow-lg p-4 md:p-6 transition-colors duration-500"
      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm md:text-lg font-bold flex items-center" style={{ color: th.title }}>
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
            Sales Trend
          </h2>
          <p className="text-[10px] md:text-sm mt-1" style={{ color: th.sub }}>
            {period === 'today' ? 'Hourly' : period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'Monthly'}
          </p>
        </div>
      </div>

      <div className="h-48 md:h-64">
        {data.data.length > 0 ? (
          <Line data={salesTrendConfig} options={chartOptions} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <AlertTriangle className="h-10 w-10 mb-3" style={{ color: th.emptyIcon }} />
            <p className="font-medium text-sm" style={{ color: th.emptyText }}>No sales data</p>
          </div>
        )}
      </div>
    </div>
  );
}