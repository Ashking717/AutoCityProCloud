import { Package } from 'lucide-react';

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

export default function TopProductsChart({ products, isMobile, formatCurrency }: Props) {
  return (
    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm md:text-lg font-bold text-white flex items-center">
            <Package className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
            Top Products
          </h2>
          <p className="text-[10px] md:text-sm text-gray-400 mt-1">Best sellers</p>
        </div>
      </div>
      {products.length > 0 ? (
        <div className="space-y-2">
          {products.slice(0, 5).map((product, index) => (
            <div 
              key={product.id} 
              className="flex items-center justify-between p-3 bg-[#0A0A0A]/50 rounded-xl border border-white/5 hover:border-[#E84545]/20 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-semibold text-white truncate">{product.name}</p>
                  <p className="text-[10px] md:text-xs text-gray-400">{product.quantity} sold</p>
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
          <Package className="h-10 w-10 text-gray-600 mb-3" />
          <p className="text-gray-400 font-medium text-sm">No sales data</p>
        </div>
      )}
    </div>
  );
}