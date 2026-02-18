"use client";
import { useRouter } from "next/navigation";
import { Car, Edit, Trash2 } from "lucide-react";

interface ProductCardProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  formatYearRange: (yearFrom?: string | number, yearTo?: string | number) => string;
  isDark: boolean;
}

export default function ProductCard({ product, onEdit, onDelete, formatYearRange, isDark }: ProductCardProps) {
  const router = useRouter();

  const th = {
    cardBg:        'transparent',
    cardHover:     isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    textPrimary:   isDark ? '#ffffff'   : '#111827',
    textSecondary: isDark ? '#d1d5db'   : '#374151',
    textMuted:     isDark ? '#9ca3af'   : '#6b7280',
    textFaint:     isDark ? '#6b7280'   : '#9ca3af',
    vehiclePillBg: isDark ? 'rgba(10,10,10,0.50)' : 'rgba(0,0,0,0.04)',
    vehiclePillBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
  };

  return (
    <div
      className="p-4 transition-all active:opacity-80 cursor-pointer"
      style={{ background: th.cardBg }}
      onMouseEnter={e => (e.currentTarget.style.background = th.cardHover)}
      onMouseLeave={e => (e.currentTarget.style.background = th.cardBg)}
      onClick={() => router.push(`/autocityPro/products/${product._id}`)}
    >
      {/* Top row: name + stock */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {product.isVehicle && <Car className="h-4 w-4 text-[#E84545] flex-shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate transition-colors" style={{ color: th.textPrimary }}>
              {product.name}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: th.textMuted }}>
              <span className="font-mono">{product.sku}</span>
              {product.category?.name && (
                <>
                  <span>•</span>
                  <span className="truncate">{product.category.name}</span>
                </>
              )}
            </div>
            {product.partNumber && (
              <p className="text-xs mt-1" style={{ color: th.textFaint }}>
                Part#: {product.partNumber}
              </p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <span
            className={`text-sm font-bold ${
              (product.currentStock || 0) <= (product.minStock || 0) ? 'text-red-400' : ''
            }`}
            style={(product.currentStock || 0) > (product.minStock || 0) ? { color: th.textSecondary } : {}}
          >
            {product.currentStock || 0}
          </span>
          <div className="text-xs" style={{ color: th.textFaint }}>
            Min: {product.minStock || 0}
          </div>
        </div>
      </div>

      {/* Vehicle info pill */}
      {product.carMake && (
        <div
          className="mb-3 p-2 rounded-lg transition-colors"
          style={{ background: th.vehiclePillBg, border: `1px solid ${th.vehiclePillBorder}` }}
        >
          <div className="text-xs space-y-1">
            <div className="flex items-center font-medium" style={{ color: th.textSecondary }}>
              <Car className="h-3 w-3 mr-1 text-[#E84545]" />
              <span>{product.carMake}</span>
              {product.carModel && <span className="ml-1">• {product.carModel}</span>}
            </div>
            {product.variant && (
              <div className="pl-4" style={{ color: th.textMuted }}>
                Variant: {product.variant}
              </div>
            )}
            <div className="flex gap-3 pl-4" style={{ color: th.textFaint }}>
              {(product.yearFrom || product.yearTo) && (
                <span>Year: {formatYearRange(product.yearFrom, product.yearTo)}</span>
              )}
              {product.color && <span>Color: {product.color}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Bottom row: price + actions */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold" style={{ color: th.textPrimary }}>
          QAR {product.sellingPrice || 0}
        </span>
        <div className="flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); onEdit(product); }}
            className="p-2 rounded-lg bg-[#E84545]/10 text-[#E84545] hover:bg-[#E84545]/20 active:scale-95 transition-all"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(product); }}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}