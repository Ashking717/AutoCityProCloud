"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ChevronLeft,
  Package,
  Car,
  Edit,
  Trash2,
  Eye,
  Tag,
  ArrowUpRight,
  Truck,
  Warehouse,
  DollarSign,
  Percent,
  Hash,
  Calendar,
  Palette,
  AlertCircle,
  TrendingDown,
  Zap,
  Box,
  MoreVertical,
  X,
  FileDown,
  Copy,
  QrCode,
  BarChart3,
  History,
  Plus,
  Minus,
  ShoppingCart,
  Share2,
  Star,
  Clock,
  RefreshCw,
  Shield,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  category?: {
    _id: string;
    name: string;
  };
  barcode?: string;
  partNumber?: string;
  unit: string;
  variant?: string;
  color?: string;
  carMake?: string;
  carModel?: string;
  yearFrom?: number;
  yearTo?: number;
  isVehicle: boolean;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  createdAt: string;
  updatedAt: string;
}

interface StockHistory {
  _id: string;
  productId: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
}

interface SaleHistory {
  _id: string;
  invoiceNumber: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName?: string;
  saleDate: string;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [saleHistory, setSaleHistory] = useState<SaleHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "stock" | "sales">("details");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({
    type: "in" as "in" | "out" | "adjustment",
    quantity: 0,
    reason: "",
  });

  // Add loading states for API calls
  const [loadingStockHistory, setLoadingStockHistory] = useState(false);
  const [loadingSaleHistory, setLoadingSaleHistory] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const fetchUserOnce = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserOnce();
  }, [fetchUserOnce]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/autocityPro/login");
    }
  }, [userLoading, user, router]);

  // Fetch product data when user is loaded - memoized
  const fetchProduct = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
      } else if (res.status === 404) {
        toast.error("Product not found");
        router.push("/autocityPro/products");
      } else {
        toast.error("Failed to load product");
      }
    } catch (error) {
      toast.error("Failed to load product");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user, productId, router]);

  // Fetch stock history - memoized
  const fetchStockHistory = useCallback(async () => {
    if (!user || !productId) return;
    
    try {
      setLoadingStockHistory(true);
      const res = await fetch(`/api/products/${productId}/stock-history`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setStockHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to load stock history:", error);
    } finally {
      setLoadingStockHistory(false);
    }
  }, [user, productId]);

  // Fetch sale history - memoized
  const fetchSaleHistory = useCallback(async () => {
    if (!user || !productId) return;
    
    try {
      setLoadingSaleHistory(true);
      const res = await fetch(`/api/products/${productId}/sales-history`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setSaleHistory(data.sales || []);
      }
    } catch (error) {
      console.error("Failed to load sale history:", error);
    } finally {
      setLoadingSaleHistory(false);
    }
  }, [user, productId]);

  // Initial data load - only once
  useEffect(() => {
    if (user && !initialLoadComplete) {
      const loadInitialData = async () => {
        await fetchProduct();
        setInitialLoadComplete(true);
      };
      
      loadInitialData();
    }
  }, [user, initialLoadComplete, fetchProduct]);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (!user || !initialLoadComplete) return;
    
    if (activeTab === "stock") {
      fetchStockHistory();
    } else if (activeTab === "sales") {
      fetchSaleHistory();
    }
  }, [activeTab, user, initialLoadComplete, fetchStockHistory, fetchSaleHistory]);

  const lowStockAlert = product ? product.currentStock <= product.minStock : false;
  const profitMargin = product && product.costPrice > 0
    ? ((product.sellingPrice - product.costPrice) / product.costPrice) * 100
    : 0;
  const totalValue = product ? product.sellingPrice * product.currentStock : 0;

  const handleDeleteProduct = async () => {
    if (!product) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Product deleted successfully!");
        router.push("/autocityPro/products");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!product || stockAdjustment.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}/stock-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: stockAdjustment.type,
          quantity: stockAdjustment.quantity,
          reason: stockAdjustment.reason || "Manual adjustment",
        }),
      });

      if (res.ok) {
        toast.success("Stock updated successfully!");
        setStockAdjustment({ type: "in", quantity: 0, reason: "" });
        
        // Refresh product and stock history
        await Promise.all([
          fetchProduct(),
          fetchStockHistory()
        ]);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update stock");
      }
    } catch (error) {
      toast.error("Failed to update stock");
    }
  };

  const handleCopySKU = () => {
    if (product?.sku) {
      navigator.clipboard.writeText(product.sku);
      toast.success("SKU copied to clipboard!");
    }
  };

  const handleCopyBarcode = () => {
    if (product?.barcode) {
      navigator.clipboard.writeText(product.barcode);
      toast.success("Barcode copied to clipboard!");
    }
  };

  const formatYearRange = (yearFrom?: number, yearTo?: number): string => {
    if (!yearFrom && !yearTo) return "";
    if (yearFrom && !yearTo) return `${yearFrom}+`;
    if (!yearFrom && yearTo) return `Up to ${yearTo}`;
    if (yearFrom === yearTo) return `${yearFrom}`;
    return `${yearFrom}-${yearTo}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/10 border-t-[#E84545] mx-auto"></div>
          <p className="mt-4 text-white text-lg font-medium">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Product Not Found
            </h2>
            <p className="text-gray-400 mb-6">
              The product you're looking for doesn't exist.
            </p>
            <button
              onClick={() => router.push("/autocityPro/products")}
              className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Back to Products
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-gradient-to-b from-[#050505] to-[#0A0A0A]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white truncate max-w-[180px]">
                    {product.name}
                  </h1>
                  <p className="text-xs text-white/60">{product.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Stock</p>
                <p
                  className={`text-sm font-bold ${
                    lowStockAlert ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {product.currentStock}
                </p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Value</p>
                <p className="text-sm font-bold text-white">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Margin</p>
                <p
                  className={`text-sm font-bold ${
                    profitMargin >= 30 ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/80 text-sm">{product.sku}</span>
                    {product.category && (
                      <>
                        <span className="text-white/40">•</span>
                        <span className="text-white/80 text-sm">
                          {product.category.name}
                        </span>
                      </>
                    )}
                    {product.isVehicle && (
                      <>
                        <span className="text-white/40">•</span>
                        <Car className="h-3 w-3 text-[#E84545]" />
                        <span className="text-white/80 text-sm">Vehicle</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 backdrop-blur-sm text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-[140px] md:pt-8 px-4 md:px-8 pb-24 md:pb-8">
          {/* Tabs Navigation */}
          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-[#E84545] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("stock")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "stock"
                  ? "border-[#E84545] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Warehouse className="h-4 w-4 inline mr-2" />
              Stock History
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "sales"
                  ? "border-[#E84545] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              Sales History
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Product Overview Card */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-bold text-white">
                        {product.name}
                      </h2>
                      {product.isVehicle && (
                        <Car className="h-4 w-4 text-[#E84545]" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {product.description || "No description"}
                    </p>
                  </div>
                  {lowStockAlert && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      <span className="text-xs text-red-400">Low Stock</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* SKU & Barcode */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">SKU</p>
                          <p className="text-white font-mono">{product.sku}</p>
                        </div>
                        <button
                          onClick={handleCopySKU}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                      {product.barcode && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Barcode</p>
                            <p className="text-white">{product.barcode}</p>
                          </div>
                          <button
                            onClick={handleCopyBarcode}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <Copy className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Category & Unit */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Category</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Tag className="h-3 w-3 text-[#E84545]" />
                          <span className="text-white">
                            {product.category?.name || "Uncategorized"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Unit</p>
                        <p className="text-white">{product.unit}</p>
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    {product.isVehicle && (
                      <div className="bg-[#E84545]/5 border border-[#E84545]/10 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Car className="h-4 w-4 text-[#E84545]" />
                          <h3 className="font-semibold text-white">
                            Vehicle Details
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {product.carMake && (
                            <div>
                              <p className="text-xs text-gray-500">Make</p>
                              <p className="text-white">{product.carMake}</p>
                            </div>
                          )}
                          {product.carModel && (
                            <div>
                              <p className="text-xs text-gray-500">Model</p>
                              <p className="text-white">{product.carModel}</p>
                            </div>
                          )}
                          {product.variant && (
                            <div>
                              <p className="text-xs text-gray-500">Variant</p>
                              <p className="text-white">{product.variant}</p>
                            </div>
                          )}
                          {product.color && (
                            <div>
                              <p className="text-xs text-gray-500">Color</p>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full border border-white/20"
                                  style={{ backgroundColor: product.color.toLowerCase() }}
                                />
                                <span className="text-white">{product.color}</span>
                              </div>
                            </div>
                          )}
                          {(product.yearFrom || product.yearTo) && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Year Range</p>
                              <p className="text-white">
                                {formatYearRange(product.yearFrom, product.yearTo)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Pricing & Stock */}
                  <div className="space-y-4">
                    {/* Pricing */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white">Pricing</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-white/5">
                          <p className="text-xs text-gray-500">Cost Price</p>
                          <p className="text-lg font-bold text-white">
                            {formatCurrency(product.costPrice)}
                          </p>
                        </div>
                        <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-white/5">
                          <p className="text-xs text-gray-500">Selling Price</p>
                          <p className="text-lg font-bold text-white">
                            {formatCurrency(product.sellingPrice)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Tax Rate</p>
                            <p className="text-white">{product.taxRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Profit Margin</p>
                            <p
                              className={`font-semibold ${
                                profitMargin >= 30
                                  ? "text-green-400"
                                  : profitMargin >= 20
                                  ? "text-yellow-400"
                                  : "text-red-400"
                              }`}
                            >
                              {profitMargin.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white">Stock Levels</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-white/5">
                          <p className="text-xs text-gray-500">Current</p>
                          <p
                            className={`text-lg font-bold ${
                              lowStockAlert ? "text-red-400" : "text-green-400"
                            }`}
                          >
                            {product.currentStock}
                          </p>
                        </div>
                        <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-white/5">
                          <p className="text-xs text-gray-500">Min</p>
                          <p className="text-white">{product.minStock}</p>
                        </div>
                        <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-white/5">
                          <p className="text-xs text-gray-500">Max</p>
                          <p className="text-white">{product.maxStock}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Stock Level</span>
                        <span>
                          {product.currentStock} / {product.maxStock}
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            product.currentStock <= product.minStock
                              ? "bg-red-500"
                              : product.currentStock <= product.maxStock * 0.3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (product.currentStock / product.maxStock) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => router.push(`/autocityPro/products/${productId}/edit`)}
                  className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-[#E84545]/30 transition-all group"
                >
                  <Edit className="h-5 w-5 text-[#E84545] mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-white">Edit Product</p>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-red-500/30 transition-all group"
                >
                  <Trash2 className="h-5 w-5 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-white">Delete</p>
                </button>
                <button
                  onClick={handleCopySKU}
                  className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition-all group"
                >
                  <Copy className="h-5 w-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-white">Copy SKU</p>
                </button>
                <button className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-green-500/30 transition-all group">
                  <ShoppingCart className="h-5 w-5 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-white">Quick Sale</p>
                </button>
              </div>
            </div>
          )}

          {/* Stock History Tab */}
          {activeTab === "stock" && (
            <div className="space-y-6">
              {/* Stock Adjustment Card */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Adjust Stock
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="stock-adjustment-type" className="block text-sm font-medium text-gray-300 mb-2">
                        Adjustment Type
                      </label>
                      <select
                        id="stock-adjustment-type"
                        value={stockAdjustment.type}
                        onChange={(e) =>
                          setStockAdjustment({
                            ...stockAdjustment,
                            type: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white"
                      >
                        <option value="in">Stock In</option>
                        <option value="out">Stock Out</option>
                        <option value="adjustment">Manual Adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="stock-adjustment-quantity" className="block text-sm font-medium text-gray-300 mb-2">
                        Quantity
                      </label>
                      <input
                        id="stock-adjustment-quantity"
                        type="number"
                        value={stockAdjustment.quantity || ""}
                        onChange={(e) =>
                          setStockAdjustment({
                            ...stockAdjustment,
                            quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        min="1"
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white"
                        placeholder="Enter quantity"
                      />
                    </div>
                    <div>
                      <label htmlFor="stock-adjustment-reason" className="block text-sm font-medium text-gray-300 mb-2">
                        Reason (Optional)
                      </label>
                      <input
                        id="stock-adjustment-reason"
                        type="text"
                        value={stockAdjustment.reason}
                        onChange={(e) =>
                          setStockAdjustment({
                            ...stockAdjustment,
                            reason: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white"
                        placeholder="Reason for adjustment"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAdjustStock}
                    disabled={stockAdjustment.quantity <= 0}
                    className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Stock
                  </button>
                </div>
              </div>

              {/* Stock History List */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">
                    Stock History
                  </h3>
                  <p className="text-sm text-gray-400">
                    Recent stock movements for {product.name}
                  </p>
                </div>
                <div className="divide-y divide-white/5">
                  {loadingStockHistory ? (
                    <div className="p-6 text-center text-gray-400">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"></div>
                      </div>
                      <p className="mt-2">Loading stock history...</p>
                    </div>
                  ) : stockHistory.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      <RefreshCw className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                      <p>No stock history available</p>
                    </div>
                  ) : (
                    stockHistory.map((item) => (
                      <div
                        key={item._id}
                        className="px-6 py-4 hover:bg-white/2 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                item.type === "in"
                                  ? "bg-green-500/10"
                                  : item.type === "out"
                                  ? "bg-red-500/10"
                                  : "bg-yellow-500/10"
                              }`}
                            >
                              {item.type === "in" ? (
                                <Plus className="h-4 w-4 text-green-400" />
                              ) : item.type === "out" ? (
                                <Minus className="h-4 w-4 text-red-400" />
                              ) : (
                                <RefreshCw className="h-4 w-4 text-yellow-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {item.type === "in"
                                  ? "Stock In"
                                  : item.type === "out"
                                  ? "Stock Out"
                                  : "Manual Adjustment"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(item.timestamp), "MMM d, yyyy HH:mm")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${
                                item.type === "in"
                                  ? "text-green-400"
                                  : item.type === "out"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              {item.type === "in" ? "+" : "-"}
                              {item.quantity}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.previousStock} → {item.newStock}
                            </p>
                          </div>
                        </div>
                        {item.reason && (
                          <p className="text-sm text-gray-400 mt-2">
                            Reason: {item.reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          By {item.performedByName} • {item.reference || "No reference"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sales History Tab */}
          {activeTab === "sales" && (
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Sales History
                    </h3>
                    <p className="text-sm text-gray-400">
                      Recent sales for {product.name}
                    </p>
                  </div>
                  {saleHistory.length > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Total Sales</p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(
                          saleHistory.reduce(
                            (sum, sale) => sum + sale.totalAmount,
                            0
                          )
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {loadingSaleHistory ? (
                  <div className="p-6 text-center text-gray-400">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"></div>
                    </div>
                    <p className="mt-2">Loading sales history...</p>
                  </div>
                ) : saleHistory.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                    <p>No sales history available</p>
                    <p className="text-sm mt-2">
                      This product hasn't been sold yet.
                    </p>
                  </div>
                ) : (
                  saleHistory.map((sale) => (
                    <div
                      key={sale._id}
                      className="px-6 py-4 hover:bg-white/2 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Invoice #{sale.invoiceNumber}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(sale.saleDate), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            {formatCurrency(sale.totalAmount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sale.quantity} × {formatCurrency(sale.unitPrice)}
                          </p>
                        </div>
                      </div>
                      {sale.customerName && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Shield className="h-3 w-3" />
                          <span>Customer: {sale.customerName}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Menu */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Actions</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    router.push(`/autocityPro/products/${productId}/edit`);
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-2xl text-white font-semibold hover:from-[#d63d3d] hover:to-[#b53535] transition-all flex items-center justify-between shadow-lg active:scale-95"
                >
                  <span>Edit Product</span>
                  <Edit className="h-5 w-5" />
                </button>

                <button
                  onClick={handleCopySKU}
                  className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Copy SKU</span>
                  <Copy className="h-5 w-5" />
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setActiveTab("stock");
                  }}
                  className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Stock History</span>
                  <History className="h-5 w-5" />
                </button>

                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-semibold hover:bg-red-500/20 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Delete Product</span>
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Delete Product
                    </h3>
                    <p className="text-sm text-gray-400">
                      Are you sure you want to delete{" "}
                      <strong className="text-white">{product.name}</strong>?
                      This action cannot be undone.
                    </p>
                    <div className="mt-3 p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400">
                        SKU: <span className="text-white">{product.sku}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Current Stock:{" "}
                        <span className="text-white">{product.currentStock}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProduct}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                  >
                    Delete Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0A0A0A] to-transparent backdrop-blur-sm border-t border-white/10 z-30">
            <div className="flex justify-around p-3">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  activeTab === "details"
                    ? "bg-[#E84545]/20 text-[#E84545]"
                    : "text-gray-400"
                }`}
              >
                <Package className="h-5 w-5" />
                <span className="text-xs mt-1">Details</span>
              </button>
              <button
                onClick={() => setActiveTab("stock")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  activeTab === "stock"
                    ? "bg-[#E84545]/20 text-[#E84545]"
                    : "text-gray-400"
                }`}
              >
                <Warehouse className="h-5 w-5" />
                <span className="text-xs mt-1">Stock</span>
              </button>
              <button
                onClick={() => setActiveTab("sales")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  activeTab === "sales"
                    ? "bg-[#E84545]/20 text-[#E84545]"
                    : "text-gray-400"
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-xs mt-1">Sales</span>
              </button>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="flex flex-col items-center p-2 rounded-xl text-gray-400"
              >
                <MoreVertical className="h-5 w-5" />
                <span className="text-xs mt-1">More</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}