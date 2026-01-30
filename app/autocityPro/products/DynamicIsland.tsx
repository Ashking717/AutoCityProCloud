// app/autocityPro/products/DynamicIsland.tsx
"use client";
import { Box, Zap, AlertCircle } from "lucide-react";

interface DynamicIslandProps {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
}

// ✅ FIX #4: This component is lazy-loaded and deferred
export default function DynamicIsland({ totalProducts, totalValue, lowStockCount }: DynamicIslandProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
      <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Box className="h-3 w-3 text-[#E84545]" />
            <span className="text-white text-xs font-semibold">{totalProducts}</span>
          </div>
          <div className="h-3 w-px bg-white/20"></div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-green-500" />
            <span className="text-white text-xs font-medium">QR{(totalValue / 1000).toFixed(0)}K</span>
          </div>
          {lowStockCount > 0 && (
            <>
              <div className="h-3 w-px bg-white/20"></div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                <span className="text-orange-400 text-xs font-medium">{lowStockCount}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}