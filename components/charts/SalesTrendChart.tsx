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

export default function SalesTrendChart({ data, period, isMobile, formatCurrency }: Props) {

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          font: { family: 'Inter, sans-serif', size: isMobile ? 10 : 12 },
          padding: isMobile ? 12 : 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
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
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: '#94a3b8',
          font: { size: isMobile ? 9 : 11 },
          maxRotation: isMobile ? 45 : 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: '#94a3b8',
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
        backgroundColor: 'rgba(232, 69, 69, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#E84545',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
      {
        label: 'Profit',
        data: data.profits,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
    ],
  };

  return (
    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm md:text-lg font-bold text-white flex items-center">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
            Sales Trend
          </h2>
          <p className="text-[10px] md:text-sm text-gray-400 mt-1">
            {period === 'today' ? 'Hourly' : period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'Monthly'}
          </p>
        </div>
      </div>
      <div className="h-48 md:h-64">
        {data.data.length > 0 ? (
          <Line data={salesTrendConfig} options={chartOptions} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium text-sm">No sales data</p>
          </div>
        )}
      </div>
    </div>
  );
}