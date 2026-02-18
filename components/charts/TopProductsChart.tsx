import { Package } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface Props {
  products: TopProduct[];
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

export default function TopProductsChart({ products, isMobile, formatCurrency }: Props) {
  const isDark = useTimeBasedTheme();

  const th = {
    cardBg:       isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)' : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:   isDark ? 'rgba(255,255,255,0.10)'                  : 'rgba(0,0,0,0.08)',
    title:        isDark ? '#ffffff'                                 : '#111827',
    sub:          isDark ? '#9ca3af'                                 : '#6b7280',
    rowBg:        isDark ? 'rgba(10,10,10,0.50)'                     : 'rgba(0,0,0,0.03)',
    rowBorder:    isDark ? 'rgba(255,255,255,0.05)'                  : 'rgba(0,0,0,0.06)',
    rowHoverBorder: 'rgba(232,69,69,0.20)',
    rowHoverBg:   isDark ? '#0A0A0A'                                 : 'rgba(0,0,0,0.06)',
    productName:  isDark ? '#ffffff'                                 : '#111827',
    productMeta:  isDark ? '#9ca3af'                                 : '#6b7280',
    emptyIcon:    isDark ? '#4b5563'                                 : '#d1d5db',
    emptyText:    isDark ? '#9ca3af'                                 : '#6b7280',
  };

  return (
    <div
      className="rounded-2xl shadow-lg p-4 md:p-6 transition-colors duration-500"
      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm md:text-lg font-bold flex items-center" style={{ color: th.title }}>
            <Package className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
            Top Products
          </h2>
          <p className="text-[10px] md:text-sm mt-1" style={{ color: th.sub }}>Best sellers</p>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="space-y-2">
          {products.slice(0, 5).map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 rounded-xl transition-all duration-200"
              style={{ background: th.rowBg, border: `1px solid ${th.rowBorder}` }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = th.rowHoverBorder;
                (e.currentTarget as HTMLDivElement).style.background  = th.rowHoverBg;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = th.rowBorder;
                (e.currentTarget as HTMLDivElement).style.background  = th.rowBg;
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-semibold truncate" style={{ color: th.productName }}>
                    {product.name}
                  </p>
                  <p className="text-[10px] md:text-xs" style={{ color: th.productMeta }}>
                    {product.quantity} sold
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs md:text-sm font-bold text-[#E84545]">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-48 flex flex-col items-center justify-center">
          <Package className="h-10 w-10 mb-3" style={{ color: th.emptyIcon }} />
          <p className="font-medium text-sm" style={{ color: th.emptyText }}>No sales data</p>
        </div>
      )}
    </div>
  );
}