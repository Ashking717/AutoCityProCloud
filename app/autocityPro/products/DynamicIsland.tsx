"use client";
import { useState, useEffect } from "react";
import { Box, Zap, AlertCircle } from "lucide-react";

interface DynamicIslandProps {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  isDark: boolean;
}

export default function DynamicIsland({ totalProducts, totalValue, lowStockCount, isDark }: DynamicIslandProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
      <div
        className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top  transition-colors duration-500"
        style={{
          background: isDark ? '#000000' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Box className="h-3 w-3 text-[#E84545]" />
            <span
              className="text-xs font-semibold transition-colors duration-500"
              style={{ color: isDark ? '#ffffff' : '#111827' }}
            >
              {totalProducts}
            </span>
          </div>
          <div
            className="h-3 w-px transition-colors duration-500"
            style={{ background: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)' }}
          />
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-green-500" />
            <span
              className="text-xs font-medium transition-colors duration-500"
              style={{ color: isDark ? '#ffffff' : '#111827' }}
            >
              QR{(totalValue / 1000).toFixed(0)}K
            </span>
          </div>
          {lowStockCount > 0 && (
            <>
              <div
                className="h-3 w-px transition-colors duration-500"
                style={{ background: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)' }}
              />
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