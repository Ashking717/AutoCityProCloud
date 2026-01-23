// components/closings/ClosingPreview.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Wallet,
  ShoppingCart,
  Receipt,
  TrendingDown,
  Package,
} from "lucide-react";

interface ClosingPreviewProps {
  closingType: "day" | "month";
  closingDate: string;
  outletId: string;
}

interface PreviewData {
  isFirstClosing: boolean;
  periodStart: string;
  periodEnd: string;
  cutoffTime: string;
  
  openingCash: number;
  openingBank: number;
  
  projectedClosingCash: number;
  projectedClosingBank: number;
  
  totalRevenue: number;
  totalPurchases: number;
  totalExpenses: number;
  
  salesCount: number;
  historicalDaysIncluded: number | null;
}

export default function ClosingPreview({
  closingType,
  closingDate,
  outletId,
}: ClosingPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (closingDate) {
      fetchPreview();
    }
  }, [closingType, closingDate, outletId]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/closings/preview?type=${closingType}&date=${closingDate}`,
        { credentials: "include" }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error("Failed to fetch closing preview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#1a1a1a] border border-red-500/20 rounded-2xl">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  // Calculate cash and bank movements
  const cashMovement = preview.projectedClosingCash - preview.openingCash;
  const bankMovement = preview.projectedClosingBank - preview.openingBank;

  return (
    <div className="space-y-4">
      {/* First Closing Alert */}
      {preview.isFirstClosing && (
        <div className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-2xl">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-400 mb-2">
                First {closingType === "day" ? "Daily" : "Monthly"} Closing
              </h4>
              <p className="text-sm text-blue-300/80 mb-3">
                This is your first closing of this type. All historical transactions
                will be included.
              </p>
              {preview.historicalDaysIncluded !== null && (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Including {preview.historicalDaysIncluded} days of historical data
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Period Information */}
      <div className="p-5 bg-[#1a1a1a] border border-red-500/20 rounded-2xl">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-red-400" />
          Period Details
        </h4>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-[#0f0f0f] rounded-xl">
            <span className="text-xs text-gray-500 font-medium">Period Start</span>
            <span className="text-sm text-white font-semibold">
              {new Date(preview.periodStart).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-[#0f0f0f] rounded-xl">
            <span className="text-xs text-gray-500 font-medium">Period End</span>
            <span className="text-sm text-white font-semibold">
              {new Date(preview.periodEnd).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Late-Night Cutoff</span>
            </div>
            <span className="text-sm text-purple-300 font-semibold">
              {preview.cutoffTime}
            </span>
          </div>
        </div>
      </div>

      {/* Business Activity Summary */}
      <div className="p-5 bg-[#1a1a1a] border border-red-500/20 rounded-2xl">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Business Activity
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#0f0f0f] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Sales Count</span>
            </div>
            <p className="text-2xl font-black text-white">{preview.salesCount}</p>
          </div>

          <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Revenue</span>
            </div>
            <p className="text-lg font-black text-emerald-400">
              {preview.totalRevenue.toLocaleString("en-QA", {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-[9px] text-gray-600 mt-0.5">QAR</p>
          </div>

          <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Purchases</span>
            </div>
            <p className="text-lg font-black text-orange-400">
              {preview.totalPurchases.toLocaleString("en-QA", {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-[9px] text-gray-600 mt-0.5">QAR</p>
          </div>

          <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Expenses</span>
            </div>
            <p className="text-lg font-black text-red-400">
              {preview.totalExpenses.toLocaleString("en-QA", {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-[9px] text-gray-600 mt-0.5">QAR</p>
          </div>
        </div>
      </div>

      {/* Cash & Bank Balances */}
      <div className="p-5 bg-[#1a1a1a] border border-red-500/20 rounded-2xl">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-blue-400" />
          Cash & Bank Positions
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {/* Cash */}
          <div className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-blue-400" />
              <h5 className="text-xs font-bold text-blue-400 uppercase">Cash</h5>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Opening</span>
                <span className="text-gray-300 font-semibold">
                  {preview.openingCash.toLocaleString("en-QA", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Movement</span>
                <span className={`font-semibold ${cashMovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cashMovement >= 0 ? '+' : ''}{cashMovement.toLocaleString("en-QA", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="pt-2 border-t border-blue-500/20">
                <div className="flex justify-between">
                  <span className="text-blue-400 font-bold">Projected Closing</span>
                  <span className="text-blue-400 font-black text-sm">
                    {preview.projectedClosingCash.toLocaleString("en-QA", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank */}
          <div className="p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <h5 className="text-xs font-bold text-emerald-400 uppercase">Bank</h5>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Opening</span>
                <span className="text-gray-300 font-semibold">
                  {preview.openingBank.toLocaleString("en-QA", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Movement</span>
                <span className={`font-semibold ${bankMovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {bankMovement >= 0 ? '+' : ''}{bankMovement.toLocaleString("en-QA", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="pt-2 border-t border-emerald-500/20">
                <div className="flex justify-between">
                  <span className="text-emerald-400 font-bold">Projected Closing</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {preview.projectedClosingBank.toLocaleString("en-QA", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Closing Balance */}
        <div className="mt-3 p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
              Total Projected Closing Balance
            </span>
            <span className="text-2xl font-black text-purple-400">
              {(preview.projectedClosingCash + preview.projectedClosingBank).toLocaleString(
                "en-QA",
                { minimumFractionDigits: 0 }
              )}
            </span>
          </div>
          <p className="text-[9px] text-purple-300/60 mt-1">
            Cash + Bank combined balance
          </p>
        </div>
      </div>

      {/* Success Indicator */}
      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <div>
            <h5 className="text-sm font-bold text-emerald-400">Ready to Close</h5>
            <p className="text-xs text-emerald-300/70 mt-1">
              All validations passed. You can proceed with closing this period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}