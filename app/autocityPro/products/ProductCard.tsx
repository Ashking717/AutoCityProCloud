// app/autocityPro/products/ProductCard.tsx
"use client";
import { useRouter } from "next/navigation";
import { Car, Edit, Trash2 } from "lucide-react";

interface ProductCardProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  formatYearRange: (yearFrom?: string | number, yearTo?: string | number) => string;
}

// ✅ FIX #5: Separate component makes it easier to virtualize later
export default function ProductCard({ product, onEdit, onDelete, formatYearRange }: ProductCardProps) {
  const router = useRouter();

  return (
    <div
      className="p-4 hover:bg-white/2 transition-all active:bg-white/5"
      onClick={() => router.push(`/autocityPro/products/${product._id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {product.isVehicle && <Car className="h-4 w-4 text-[#E84545] flex-shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span className="font-mono">{product.sku}</span>
              {product.category?.name && (
                <>
                  <span>•</span>
                  <span className="truncate">{product.category.name}</span>
                </>
              )}
            </div>
            {product.partNumber && <p className="text-xs text-gray-500 mt-1">Part#: {product.partNumber}</p>}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <span
            className={`text-sm font-bold ${
              (product.currentStock || 0) <= (product.minStock || 0) ? "text-red-400" : "text-gray-300"
            }`}
          >
            {product.currentStock || 0}
          </span>
          <div className="text-xs text-gray-500">Min: {product.minStock || 0}</div>
        </div>
      </div>

      {product.carMake && (
        <div className="mb-3 p-2 bg-[#0A0A0A]/50 rounded-lg border border-white/5">
          <div className="text-xs space-y-1">
            <div className="flex items-center text-gray-300 font-medium">
              <Car className="h-3 w-3 mr-1 text-[#E84545]" />
              <span>{product.carMake}</span>
              {product.carModel && <span className="ml-1">• {product.carModel}</span>}
            </div>
            {product.variant && <div className="text-gray-400 pl-4">Variant: {product.variant}</div>}
            <div className="flex gap-3 text-gray-500 pl-4">
              {(product.yearFrom || product.yearTo) && (
                <span>Year: {formatYearRange(product.yearFrom, product.yearTo)}</span>
              )}
              {product.color && <span>Color: {product.color}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-white">QAR {product.sellingPrice || 0}</span>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
            className="p-2 rounded-lg bg-[#E84545]/10 text-[#E84545] hover:bg-[#E84545]/20 active:scale-95 transition-all"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
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