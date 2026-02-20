// File: app/autocityPro/purchases/new/page.tsx - WITH TIME-BASED LIGHT/DARK THEME
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import AddProductModal from "@/components/products/AddProductModal";
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  X,
  ChevronLeft,
  Package,
  CreditCard,
  Users,
  CheckCircle,
  AlertCircle,
  Edit2,
  Save,
  Calculator,
  Sun,
  Moon,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Time-based theme hook ────────────────────────────────────────────────────
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

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const PaymentWarning = ({ total, paymentMethod, amountPaid, formatCurrency }: { total: number; paymentMethod: string; amountPaid: number; formatCurrency: (n: number) => string }) => {
  if (paymentMethod === "credit" && amountPaid === 0) return (
    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
      <div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" /><div>
        <p className="text-orange-400 text-sm font-semibold">Full Credit Purchase</p>
        <p className="text-orange-300 text-xs mt-1">You'll need to record payments later to clear the balance.</p>
      </div></div>
    </div>
  );
  if (amountPaid > 0 && amountPaid < total) return (
    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
      <div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><div>
        <p className="text-blue-400 text-sm font-semibold">Partial Payment</p>
        <p className="text-blue-300 text-xs mt-1">Paying {formatCurrency(amountPaid)} now. Balance of {formatCurrency(total - amountPaid)} will be on credit.</p>
      </div></div>
    </div>
  );
  if (amountPaid >= total && total > 0) return (
    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
      <div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /><div>
        <p className="text-green-400 text-sm font-semibold">Full Payment</p>
        <p className="text-green-300 text-xs mt-1">Purchase will be fully paid with no outstanding balance.</p>
      </div></div>
    </div>
  );
  return null;
};

const PctButtons = ({ th, total, setAmountPaid }: { th: any; total: number; setAmountPaid: (v: number) => void }) => (
  <div className="grid grid-cols-4 gap-2 mt-2">
    {[0, 25, 50, 100].map(pct => (
      <button key={pct} onClick={() => setAmountPaid(pct === 0 ? 0 : Math.round(total * (pct / 100) * 100) / 100)}
        className="px-2 py-1.5 rounded-lg text-xs transition-all"
        style={{ background: th.pctBtnBg, border: `1px solid ${th.pctBtnBorder}`, color: th.pctBtnText }}>
        {pct}%
      </button>
    ))}
  </div>
);

export default function NewPurchasePage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [nextSKU, setNextSKU] = useState<string>("10001");

  const [newSupplier, setNewSupplier] = useState({
    name: "", phone: "", email: "", address: "",
    contactPerson: "", taxNumber: "", creditLimit: 0, paymentTerms: "Net 30",
  });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    // Page
    pageBg:           isDark ? '#050505'                                                    : '#f3f4f6',
    // Desktop header
    desktopHeaderBg:  isDark ? 'linear-gradient(135deg,#932222,#411010,#a20c0c)'           : 'linear-gradient(135deg,#fef2f2,#fee2e2,#fecaca)',
    desktopHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                 : 'rgba(0,0,0,0.08)',
    headerTitle:      isDark ? '#ffffff'                                                    : '#7f1d1d',
    headerSub:        isDark ? 'rgba(255,255,255,0.90)'                                    : '#991b1b',
    headerStatBg:     isDark ? 'rgba(10,10,10,0.50)'                                       : 'rgba(255,255,255,0.60)',
    headerStatBorder: isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(127,29,29,0.20)',
    headerStatLabel:  isDark ? 'rgba(255,255,255,0.60)'                                    : '#991b1b',
    headerStatValue:  isDark ? '#ffffff'                                                    : '#7f1d1d',
    // Mobile header
    mobileHeaderBg:   isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'          : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                  : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                                                   : '#111827',
    mobileHeaderSub:  isDark ? 'rgba(255,255,255,0.60)'                                    : '#6b7280',
    mobileBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    mobileBtnText:    isDark ? 'rgba(255,255,255,0.80)'                                    : '#374151',
    // Cards / panels
    cardBg:           isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    cardBorderHover:  isDark ? 'rgba(232,69,69,0.30)'                                      : 'rgba(232,69,69,0.25)',
    // Inner item (search result, cart item)
    itemBg:           isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.04)',
    itemBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    // Text
    textPrimary:      isDark ? '#ffffff'                                                    : '#111827',
    textSecondary:    isDark ? '#9ca3af'                                                    : '#6b7280',
    textMuted:        isDark ? '#6b7280'                                                    : '#9ca3af',
    // Inputs
    inputBg:          isDark ? 'rgba(255,255,255,0.05)'                                    : '#ffffff',
    inputBorder:      isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.12)',
    inputText:        isDark ? '#ffffff'                                                    : '#111827',
    inputPH:          isDark ? '#6b7280'                                                    : '#9ca3af',
    // Dividers
    divider:          isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.06)',
    dividerStrong:    isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.10)',
    // Modals
    modalOverlay:     isDark ? 'rgba(0,0,0,0.80)'                                          : 'rgba(0,0,0,0.50)',
    modalBg:          isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'                   : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:      isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    modalTitle:       isDark ? '#ffffff'                                                    : '#111827',
    modalCloseBg:     isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    modalCloseText:   isDark ? '#9ca3af'                                                    : '#6b7280',
    // Summary section
    summaryRowBorder: isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.06)',
    summaryTopBorder: isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.10)',
    // Percentage buttons
    pctBtnBg:         isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    pctBtnBorder:     isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.10)',
    pctBtnText:       isDark ? '#ffffff'                                                    : '#374151',
    // Empty state
    emptyIcon:        isDark ? '#4b5563'                                                    : '#d1d5db',
    emptyText:        isDark ? '#9ca3af'                                                    : '#6b7280',
    // Mobile cart bottom bar
    cartBottomBg:     isDark ? 'rgba(10,10,10,0.50)'                                       : 'rgba(255,255,255,0.80)',
    cartBottomBorder: isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
  };

  const inputStyle = {
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    color: th.inputText,
  };
  const inputClass = "focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetchUser(); fetchProducts(); fetchSuppliers(); fetchCategories(); fetchNextSKU();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await fetch("/api/products?searchMode=true", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.pagination?.total > data.products?.length) {
          toast(`Loaded ${data.products?.length} of ${data.pagination.total} products.`, { icon: "ℹ️", duration: 4000 });
        }
      }
    } catch { toast.error("Failed to load products"); }
    finally { setProductsLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (res.ok) setSuppliers((await res.json()).suppliers || []);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (res.ok) setCategories((await res.json()).categories || []);
    } catch {}
  };

  const fetchNextSKU = async () => {
    try {
      const res = await fetch("/api/products/next-sku", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setNextSKU(data.nextSKU); return data.nextSKU; }
    } catch {}
    return "10001";
  };

  const generateSupplierCode = (name: string) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 10);
    return `SUP${code}${Date.now().toString().slice(-4)}`;
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.phone) { toast.error("Name and phone are required"); return; }
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...newSupplier, code: generateSupplierCode(newSupplier.name) }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Supplier added!");
        setSuppliers([...suppliers, data.supplier]);
        setSelectedSupplier(data.supplier);
        setShowAddSupplier(false);
        setNewSupplier({ name:"", phone:"", email:"", address:"", contactPerson:"", taxNumber:"", creditLimit:0, paymentTerms:"Net 30" });
      } else toast.error((await res.json()).error || "Failed to add supplier");
    } catch { toast.error("Failed to add supplier"); }
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("Category name is required"); return; }
    try {
      const res = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Category added successfully!");
        setCategories([...categories, { ...data.category, productCount: 0 }]);
        setNewCategoryName(""); setShowQuickAddCategory(false);
      } else toast.error((await res.json()).error || "Failed to add category");
    } catch { toast.error("Failed to add category"); }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(productData),
      });
      if (res.ok) {
        const responseData = await res.json();
        toast.success("Product added successfully!");
        setShowAddProduct(false);
        await fetchProducts(); await fetchNextSKU();
        if (responseData.product) addToCart(responseData.product);
      } else toast.error((await res.json()).error || "Failed to add product");
    } catch { toast.error("Failed to add product"); }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(i => i.productId === product._id);
    if (existing) {
      updateCartItem(existing.productId, "quantity", existing.quantity + 1);
    } else {
      const price = product.costPrice || product.sellingPrice || 0;
      setCart([...cart, { productId: product._id, productName: product.name, sku: product.sku, unit: product.unit || "pcs", quantity: 1, unitPrice: price, taxRate: 0, taxAmount: 0, total: price }]);
    }
    toast.success("Added to cart");
    setSearchTerm("");
  };

  const removeFromCart = (index: number) => { setCart(cart.filter((_, i) => i !== index)); toast.success("Removed from cart"); };

  const updateCartItem = (productId: string, field: string, value: any) => {
    setCart(cart.map(item => {
      if (item.productId !== productId) return item;
      const updated = { ...item, [field]: value };
      const subtotal = updated.unitPrice * updated.quantity;
      updated.taxAmount = (subtotal * updated.taxRate) / 100;
      updated.total = subtotal + updated.taxAmount;
      return updated;
    }));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const totalTax = cart.reduce((s, i) => s + i.taxAmount, 0);
    const total = subtotal + totalTax;
    return { subtotal, totalTax, total, totalPaid: amountPaid };
  };

  const getEffectivePaymentMethod = () => {
    const { total } = calculateTotals();
    if (amountPaid >= total) return paymentMethod === "credit" ? "cash" : paymentMethod;
    if (amountPaid === 0 && paymentMethod === "credit") return "credit";
    if (amountPaid > 0 && amountPaid < total) return paymentMethod === "credit" ? "cash" : paymentMethod;
    return paymentMethod;
  };


  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (!selectedSupplier) { toast.error("Please select a supplier"); return; }
    const { total } = calculateTotals();
    if (amountPaid > total) { toast.error(`Amount paid cannot exceed total (${formatCurrency(total)})`); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplierId: selectedSupplier._id, supplierName: selectedSupplier.name,
          items: cart.map(i => ({ productId: i.productId, name: i.productName, sku: i.sku, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, taxRate: i.taxRate })),
          paymentMethod: getEffectivePaymentMethod(), amountPaid, notes: "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.purchase.balanceDue > 0) toast.success(`Purchase ${data.purchase.purchaseNumber} created! Balance: ${formatCurrency(data.purchase.balanceDue)}`, { duration: 5000 });
        else toast.success(`Purchase ${data.purchase.purchaseNumber} created!`);
        setCart([]); setSelectedSupplier(null); setAmountPaid(0);
        fetchProducts();
        router.push("/autocityPro/purchases");
      } else toast.error((await res.json()).error || "Failed to create purchase");
    } catch { toast.error("Failed to create purchase"); }
    finally { setLoading(false); }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const l = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(l) || p.sku?.toLowerCase().includes(l) ||
      p.barcode?.toLowerCase().includes(l) || p.carMake?.toLowerCase().includes(l) || p.carModel?.toLowerCase().includes(l)
    ).slice(0, 50);
  }, [products, searchTerm]);

  const totals = calculateTotals();
  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/autocityPro/login"; };
  const formatCurrency = (n: number) => new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);


  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl border-b transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderColor: th.mobileHeaderBorder }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-1.5" style={{ color: th.mobileHeaderTitle }}>
                    New Purchase
                    {isDark ? <Moon className="h-3.5 w-3.5 text-[#E84545]" /> : <Sun className="h-3.5 w-3.5 text-[#E84545]" />}
                  </h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{cart.length} items • {products.length} products</p>
                </div>
              </div>
              <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white shadow-lg active:scale-95 transition-all">
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full text-xs font-bold flex items-center justify-center">{cart.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-11 border-b shadow-xl transition-colors duration-500"
          style={{ background: th.desktopHeaderBg, borderColor: th.desktopHeaderBorder }}>
          <div className="px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: th.headerTitle }}>
                  <ShoppingCart className="h-8 w-8 text-[#E84545]" />
                  New Purchase
                  {isDark ? <Moon className="h-5 w-5 text-[#E84545]" /> : <Sun className="h-5 w-5 text-[#E84545]" />}
                </h1>
                <p className="mt-2" style={{ color: th.headerSub }}>Create a new purchase order • {products.length} products available</p>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { label: 'Cart Items', value: cart.length, valueClass: '' },
                  { label: 'Total Amount', value: formatCurrency(totals.total), valueClass: 'text-[#E84545]' },
                ].map(stat => (
                  <div key={stat.label} className="backdrop-blur-sm rounded-xl px-6 py-3 border"
                    style={{ background: th.headerStatBg, borderColor: th.headerStatBorder }}>
                    <p className="text-sm mb-1" style={{ color: th.headerStatLabel }}>{stat.label}</p>
                    <p className={`font-bold text-2xl text-center ${stat.valueClass}`} style={!stat.valueClass ? { color: th.headerStatValue } : {}}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-6 pt-[100px] md:pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">

              {/* Product Search */}
              <div className="rounded-2xl shadow-lg p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center" style={{ color: th.textPrimary }}>
                    <Search className="h-5 w-5 mr-2 text-[#E84545]" />
                    Search Products
                    {productsLoading && <span className="ml-3 text-xs animate-pulse" style={{ color: th.textSecondary }}>Loading...</span>}
                  </h2>
                  <button onClick={async () => { await fetchNextSKU(); setShowAddProduct(true); }}
                    className="flex items-center gap-2 px-3 py-2 bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545] rounded-lg hover:bg-[#E84545]/20 transition-all text-sm font-medium">
                    <Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Product</span>
                  </button>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: th.inputPH }} />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Type at least 2 characters to search..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl ${inputClass}`} style={inputStyle}
                    disabled={productsLoading} />
                  {searchTerm.length === 1 && (
                    <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: th.textMuted }}>Type 1 more...</p>
                  )}
                </div>

                {searchTerm.length >= 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-2 text-center py-8">
                        <Search className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                        <p style={{ color: th.textSecondary }}>No products found for "{searchTerm}"</p>
                        <button onClick={async () => { await fetchNextSKU(); setShowAddProduct(true); }}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545] rounded-lg hover:bg-[#E84545]/20 transition-all text-sm font-medium">
                          <Plus className="h-4 w-4" />Create New Product
                        </button>
                      </div>
                    ) : (
                      <>
                        {filteredProducts.map(product => (
                          <div key={product._id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') addToCart(product); }} onClick={() => addToCart(product)}
                            className="p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] border"
                            style={{ background: th.itemBg, borderColor: th.itemBorder }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = th.itemBorder)}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate" style={{ color: th.textPrimary }}>{product.name}</h3>
                                <p className="text-xs mt-1" style={{ color: th.textSecondary }}>SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div className="mt-2 space-y-0.5">
                              {(product.carMake || product.carModel) && <p className="text-xs truncate" style={{ color: th.textSecondary }}>{product.carMake} {product.carModel}</p>}
                              {product.color && <p className="text-[11px]" style={{ color: th.textSecondary }}>Color: {product.color}</p>}
                              {(product.yearFrom || product.yearTo) && <p className="text-[11px]" style={{ color: th.textSecondary }}>Years: {product.yearFrom || "—"} – {product.yearTo || "—"}</p>}
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t" style={{ borderColor: th.divider }}>
                              <span className="text-[#E84545] font-bold">{formatCurrency(product.costPrice || product.sellingPrice)}</span>
                              <span className="text-xs" style={{ color: th.textMuted }}>Stock: {product.currentStock}</span>
                            </div>
                          </div>
                        ))}
                        {filteredProducts.length >= 50 && (
                          <div className="col-span-2 text-center py-3 text-xs" style={{ color: th.textMuted }}>
                            Showing first 50 results. Be more specific to narrow down.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {searchTerm.length < 2 && !productsLoading && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                    <p style={{ color: th.textSecondary }}>Start typing to search {products.length} products</p>
                    <p className="text-xs mt-1" style={{ color: th.textMuted }}>Enter at least 2 characters</p>
                  </div>
                )}
              </div>

              {/* Desktop Cart */}
              <div className="hidden md:block rounded-2xl shadow-lg p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <ShoppingCart className="h-5 w-5 mr-2 text-[#E84545]" />Cart ({cart.length} items)
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3" style={{ color: th.emptyIcon }} />
                      <p style={{ color: th.textSecondary }}>Your cart is empty</p>
                      <p className="text-sm mt-2" style={{ color: th.textMuted }}>Search and add products above</p>
                    </div>
                  ) : (
                    cart.map((item, index) => (
                      <div key={item.productId} className="rounded-xl p-4 border" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate" style={{ color: th.textPrimary }}>{item.productName}</h3>
                            <p className="text-xs mt-1" style={{ color: th.textSecondary }}>SKU: {item.sku}</p>
                          </div>
                          <button onClick={() => removeFromCart(index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all ml-2">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {[
                            { label:'Qty', field:'quantity', value: item.quantity, min:1, max:undefined },
                            { label:'Price', field:'unitPrice', value: item.unitPrice, min:0, max:undefined },
                            { label:'Tax %', field:'taxRate', value: item.taxRate, min:0, max:100 },
                          ].map(f => (
                            <div key={f.field}>
                              <label className="text-[10px] mb-1 block" style={{ color: th.textMuted }}>{f.label}</label>
                              <input type="number" value={f.value}
                                onChange={e => updateCartItem(item.productId, f.field, parseFloat(e.target.value) || (f.min ?? 0))}
                                min={f.min} max={f.max}
                                className={`w-full px-2 py-2 rounded-lg text-sm ${inputClass}`} style={inputStyle} />
                            </div>
                          ))}
                          <div>
                            <span className="text-[10px] mb-1 block" style={{ color: th.textMuted }}>Unit</span>
                            <div className="px-2 py-2 rounded-lg text-sm flex items-center justify-center border"
                              style={{ background: th.itemBg, borderColor: th.itemBorder, color: th.textPrimary }}>{item.unit}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: th.divider }}>
                          {item.taxRate > 0 && <span className="text-xs" style={{ color: th.textMuted }}>Tax: {formatCurrency(item.taxAmount)}</span>}
                          <span className="font-bold ml-auto" style={{ color: th.textPrimary }}>{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 md:space-y-6">

              {/* Supplier */}
              <div className="rounded-2xl shadow-lg p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <Users className="h-5 w-5 mr-2 text-[#E84545]" />Supplier
                </h2>
                <select value={selectedSupplier?._id ? String(selectedSupplier._id) : ""}
                  onChange={e => setSelectedSupplier(suppliers.find(s => s && s._id && String(s._id) === e.target.value) || null)}
                  className={`w-full px-4 py-3 rounded-xl mb-3 ${inputClass}`} style={inputStyle}>
                  <option value="">Select Supplier</option>
                  {suppliers.filter(s => s && s._id).map(s => (
                    <option key={String(s._id)} value={String(s._id)}>{s.name} - {s.phone}</option>
                  ))}
                </select>
                {selectedSupplier && (
                  <div className="p-4 rounded-xl border mb-3" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                    <p className="font-semibold" style={{ color: th.textPrimary }}>{selectedSupplier.name}</p>
                    <p className="text-sm mt-1" style={{ color: th.textSecondary }}>{selectedSupplier.phone}</p>
                    {selectedSupplier.email && <p className="text-xs mt-1" style={{ color: th.textMuted }}>{selectedSupplier.email}</p>}
                  </div>
                )}
                <button onClick={() => setShowAddSupplier(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#E84545]/30 text-[#E84545] rounded-xl hover:border-[#E84545]/50 hover:bg-[#E84545]/5 transition-all active:scale-95">
                  <Plus className="h-4 w-4" /><span className="font-medium">Quick Add Supplier</span>
                </button>
              </div>

              {/* Payment */}
              <div className="rounded-2xl shadow-lg p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <CreditCard className="h-5 w-5 mr-2 text-[#E84545]" />Payment
                </h2>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="purchase-payment-method" className="text-sm mb-2 block" style={{ color: th.textSecondary }}>Payment Method</label>
                    <select id="purchase-payment-method" value={paymentMethod} onChange={e => { const m = e.target.value as any; setPaymentMethod(m); if (m === "credit" && amountPaid > 0) toast('Tip: Leave "Amount Paid" as 0 for full credit', { icon: "💡", duration: 4000 }); }}
                      className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle}>
                      <option value="cash">Cash</option><option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option><option value="credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: th.textSecondary }}>
                      Amount Paid Now{paymentMethod === "credit" && <span className="text-orange-400 text-xs ml-2">(Leave 0 for full credit)</span>}
                    </label>
                    <div className="relative">
                      <input type="number" value={amountPaid}
                        onChange={e => { const v = parseFloat(e.target.value) || 0; if (v > totals.total) { toast.error("Amount cannot exceed total"); setAmountPaid(totals.total); } else setAmountPaid(v); }}
                        placeholder="0.00" max={totals.total} step="0.01"
                        className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle} />
                      {amountPaid < totals.total && totals.total > 0 && (
                        <button onClick={() => setAmountPaid(totals.total)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#E84545]/10 border border-[#E84545]/20 text-[#E84545] rounded-lg text-xs font-medium hover:bg-[#E84545]/20 transition-all">
                          Pay Full
                        </button>
                      )}
                    </div>
                    {totals.total > 0 && <PctButtons th={th} total={totals.total} setAmountPaid={setAmountPaid} />}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl shadow-lg p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: th.textPrimary }}>
                  <Calculator className="h-5 w-5 mr-2 text-[#E84545]" />Summary
                </h2>
                <PaymentWarning total={totals.total} paymentMethod={paymentMethod} amountPaid={amountPaid} formatCurrency={formatCurrency} />
                <div className="space-y-3">
                  {[
                    { label:'Subtotal:', value: formatCurrency(totals.subtotal) },
                    { label:'Tax:', value: formatCurrency(totals.totalTax) },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: th.summaryRowBorder }}>
                      <span style={{ color: th.textSecondary }}>{row.label}</span>
                      <span className="font-semibold" style={{ color: th.textPrimary }}>{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 border-t" style={{ borderColor: th.summaryTopBorder }}>
                    <span className="font-bold text-lg" style={{ color: th.textPrimary }}>Total:</span>
                    <span className="text-[#E84545] font-bold text-xl">{formatCurrency(totals.total)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: th.summaryRowBorder }}>
                    <span style={{ color: th.textSecondary }}>Paid:</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(totals.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-semibold" style={{ color: th.textPrimary }}>Balance:</span>
                    <span className={`font-bold ${totals.total - totals.totalPaid > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {formatCurrency(totals.total - totals.totalPaid)}
                    </span>
                  </div>
                </div>
                <button onClick={handleSubmit} disabled={loading || cart.length === 0 || !selectedSupplier}
                  className="w-full mt-6 py-3 md:py-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95">
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />Processing...</span>
                    : <span className="flex items-center justify-center gap-2"><CheckCircle className="h-5 w-5" />Complete Purchase</span>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Product Modal */}
        <AddProductModal show={showAddProduct} onClose={() => setShowAddProduct(false)} onAdd={handleAddProduct}
          categories={categories} nextSKU={nextSKU} onQuickAddCategory={() => setShowQuickAddCategory(true)} />

        {/* Quick Add Category Modal */}
        {showQuickAddCategory && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[70] p-4" style={{ background: th.modalOverlay }}>
            <div className="rounded-2xl shadow-2xl max-w-md w-full border" style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b" style={{ borderColor: th.divider }}>
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                  <Package className="h-5 w-5 text-[#E84545]" />Quick Add Category
                </h2>
                <button onClick={() => { setShowQuickAddCategory(false); setNewCategoryName(""); }}
                  className="p-2 rounded-xl active:scale-95 transition-all" style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-category-name" className="block text-xs md:text-sm font-medium mb-1" style={{ color: th.textSecondary }}>Category Name *</label>
                    <input id="new-category-name" type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm md:text-base ${inputClass}`} style={inputStyle}
                      placeholder="Enter category name" onKeyDown={e => e.key === "Enter" && handleQuickAddCategory()} />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button onClick={() => { setShowQuickAddCategory(false); setNewCategoryName(""); }}
                    className="px-4 py-2 rounded-xl transition-colors active:scale-95 border" style={{ borderColor: th.dividerStrong, color: th.textSecondary }}>Cancel</button>
                  <button onClick={handleQuickAddCategory}
                    className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95">Add Category</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Cart Modal */}
        {isMobile && showCart && (
          <div className="fixed inset-0 backdrop-blur-md z-[60] animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
            <div className="absolute inset-x-0 bottom-0 top-16 rounded-t-3xl border-t shadow-2xl flex flex-col transition-colors duration-500"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: th.divider }}>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                  <ShoppingCart className="h-5 w-5 text-[#E84545]" />Cart ({cart.length})
                </h2>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <ShoppingCart className="h-16 w-16 mb-4" style={{ color: th.emptyIcon }} />
                    <p className="text-lg font-medium" style={{ color: th.textSecondary }}>Cart is empty</p>
                    <p className="text-sm mt-2" style={{ color: th.textMuted }}>Add products to get started</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={item.productId} className="rounded-2xl p-4 border" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold truncate" style={{ color: th.textPrimary }}>{item.productName}</h3>
                          <p className="text-xs mt-1" style={{ color: th.textSecondary }}>SKU: {item.sku}</p>
                        </div>
                        <button onClick={() => removeFromCart(index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {editingItem === item.productId ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label:'Quantity', field:'quantity', value: item.quantity, min:1, max:undefined },
                              { label:'Unit Price', field:'unitPrice', value: item.unitPrice, min:0, max:undefined },
                            ].map(f => (
                              <div key={f.field}>
                                <label className="text-[10px] mb-1 block" style={{ color: th.textMuted }}>{f.label}</label>
                                <input type="number" value={f.value}
                                  onChange={e => updateCartItem(item.productId, f.field, parseFloat(e.target.value) || (f.min ?? 0))}
                                  min={f.min} max={f.max}
                                  className={`w-full px-3 py-2 rounded-lg text-sm ${inputClass}`} style={inputStyle} />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor="cart-tax-rate" className="text-[10px] mb-1 block" style={{ color: th.textMuted }}>Tax Rate %</label>
                              <input id="cart-tax-rate" type="number" value={item.taxRate}
                                onChange={e => updateCartItem(item.productId, "taxRate", parseFloat(e.target.value) || 0)}
                                min={0} max={100}
                                className={`w-full px-3 py-2 rounded-lg text-sm ${inputClass}`} style={inputStyle} />
                            </div>
                            <div>
                              <span className="text-[10px] mb-1 block" style={{ color: th.textMuted }}>Unit</span>
                              <div className="px-3 py-2 rounded-lg text-sm flex items-center justify-center border h-[38px]"
                                style={{ background: th.itemBg, borderColor: th.itemBorder, color: th.textPrimary }}>{item.unit}</div>
                            </div>
                          </div>
                          <button onClick={() => setEditingItem(null)}
                            className="w-full px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg font-medium active:scale-95 transition-all flex items-center justify-center gap-2">
                            <Save className="h-4 w-4" />Save Changes
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-3 gap-2 mb-3 p-3 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                            {[
                              { label:'Qty', value: item.quantity },
                              { label:'Price', value: item.unitPrice.toFixed(2), border: true },
                              { label:'Tax', value: `${item.taxRate}%` },
                            ].map((s) => (
                              <div key={s.label} className={`text-center ${s.border ? 'border-x' : ''}`} style={s.border ? { borderColor: th.dividerStrong } : {}}>
                                <p className="text-[10px] mb-1" style={{ color: th.textMuted }}>{s.label}</p>
                                <p className="font-semibold text-sm" style={{ color: th.textPrimary }}>{s.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: th.divider }}>
                            <button onClick={() => setEditingItem(item.productId)}
                              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium active:scale-95 transition-all flex items-center gap-1">
                              <Edit2 className="h-3 w-3" />Edit
                            </button>
                            <div className="text-right">
                              {item.taxRate > 0 && <p className="text-[10px]" style={{ color: th.textMuted }}>Tax: {formatCurrency(item.taxAmount)}</p>}
                              <p className="font-bold" style={{ color: th.textPrimary }}>{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <div className="border-t p-4 backdrop-blur-xl" style={{ borderColor: th.cartBottomBorder, background: th.cartBottomBg }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ color: th.textSecondary }}>Total Amount:</span>
                    <span className="text-[#E84545] font-bold text-xl">{formatCurrency(totals.total)}</span>
                  </div>
                  <button onClick={() => { setShowCart(false); setShowPayment(true); }}
                    className="w-full py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold active:scale-95 transition-all shadow-lg">
                    Proceed to Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Payment Modal */}
        {isMobile && showPayment && (
          <div className="fixed inset-0 backdrop-blur-md z-[60] animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom  shadow-2xl max-h-[90vh] overflow-y-auto transition-colors duration-500"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Complete Purchase</h2>
                <button onClick={() => setShowPayment(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                {/* Supplier */}
                <div>
                  <label htmlFor="mobile-purchase-supplier" className="block text-sm font-medium mb-2" style={{ color: th.textSecondary }}>Supplier *</label>
                  <select id="mobile-purchase-supplier" value={selectedSupplier?._id || ""} onChange={e => setSelectedSupplier(suppliers.find(s => s._id === e.target.value))}
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name} - {s.phone}</option>)}
                  </select>
                  {selectedSupplier && (
                    <div className="mt-3 p-3 rounded-xl border" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                      <p className="font-semibold" style={{ color: th.textPrimary }}>{selectedSupplier.name}</p>
                      <p className="text-sm mt-1" style={{ color: th.textSecondary }}>{selectedSupplier.phone}</p>
                    </div>
                  )}
                  <button onClick={() => { setShowPayment(false); setShowAddSupplier(true); }}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#E84545]/30 text-[#E84545] rounded-xl hover:border-[#E84545]/50 active:scale-95 transition-all">
                    <Plus className="h-4 w-4" /><span className="text-sm font-medium">Add New Supplier</span>
                  </button>
                </div>
                {/* Payment Method */}
                <div>
                  <label htmlFor="mobile-payment-method" className="block text-sm font-medium mb-2" style={{ color: th.textSecondary }}>Payment Method</label>
                  <select id="mobile-payment-method" value={paymentMethod} onChange={e => { const m = e.target.value as any; setPaymentMethod(m); if (m === "credit" && amountPaid > 0) toast('Tip: Leave "Amount Paid" as 0 for full credit', { icon: "💡", duration: 4000 }); }}
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle}>
                    <option value="cash">Cash</option><option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option><option value="credit">Credit</option>
                  </select>
                </div>
                {/* Amount Paid */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.textSecondary }}>
                    Amount Paid Now{paymentMethod === "credit" && <span className="text-orange-400 text-xs ml-2">(Leave 0 for full credit)</span>}
                  </label>
                  <input type="number" value={amountPaid}
                    onChange={e => { const v = parseFloat(e.target.value) || 0; if (v > totals.total) { toast.error("Amount cannot exceed total"); setAmountPaid(totals.total); } else setAmountPaid(v); }}
                    placeholder="0.00" max={totals.total} step="0.01"
                    className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle} />
                  {totals.total > 0 && <PctButtons th={th} total={totals.total} setAmountPaid={setAmountPaid} />}
                </div>
                {/* Summary */}
                <div className="rounded-xl p-4 border" style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                  <h3 className="font-semibold mb-3" style={{ color: th.textPrimary }}>Order Summary</h3>
                  <div className="mb-3"><PaymentWarning total={totals.total} paymentMethod={paymentMethod} amountPaid={amountPaid} formatCurrency={formatCurrency} /></div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label:'Items:', value: cart.length },
                      { label:'Subtotal:', value: formatCurrency(totals.subtotal) },
                      { label:'Tax:', value: formatCurrency(totals.totalTax) },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between">
                        <span style={{ color: th.textSecondary }}>{row.label}</span>
                        <span style={{ color: th.textPrimary }}>{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-semibold" style={{ borderColor: th.dividerStrong }}>
                      <span style={{ color: th.textPrimary }}>Total:</span><span className="text-[#E84545]">{formatCurrency(totals.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: th.textSecondary }}>Paid:</span><span className="text-green-400">{formatCurrency(totals.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span style={{ color: th.textPrimary }}>Balance:</span>
                      <span className={totals.total - totals.totalPaid > 0 ? 'text-orange-400' : 'text-green-400'}>
                        {formatCurrency(totals.total - totals.totalPaid)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={() => setShowPayment(false)}
                    className="px-4 py-3 rounded-xl font-medium active:scale-95 transition-all border"
                    style={{ background: th.modalCloseBg, borderColor: th.dividerStrong, color: th.textSecondary }}>Back</button>
                  <button onClick={handleSubmit} disabled={loading || cart.length === 0 || !selectedSupplier}
                    className="px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />Processing...</>
                      : <><CheckCircle className="h-4 w-4" />Complete</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Supplier Modal */}
        {showAddSupplier && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[70] p-4 overflow-y-auto" style={{ background: th.modalOverlay }}>
            <div className="rounded-2xl shadow-2xl max-w-2xl w-full my-8 border transition-colors duration-500" style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: th.divider }}>
                <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>Add Supplier</h2>
                <button onClick={() => setShowAddSupplier(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { span: true, label:'Supplier Name', key:'name', type:'text', placeholder:'Enter supplier name', required: true },
                    { span: false, label:'Phone', key:'phone', type:'text', placeholder:'Phone number', required: true },
                    { span: false, label:'Email', key:'email', type:'email', placeholder:'email@example.com', required: false },
                    { span: false, label:'Contact Person', key:'contactPerson', type:'text', placeholder:'Contact person name', required: false },
                    { span: false, label:'Tax Number', key:'taxNumber', type:'text', placeholder:'Tax ID', required: false },
                    { span: false, label:'Credit Limit (QAR)', key:'creditLimit', type:'number', placeholder:'0.00', required: false },
                    { span: false, label:'Payment Terms', key:'paymentTerms', type:'text', placeholder:'e.g., Net 30', required: false },
                  ].map(f => (
                    <div key={f.key} className={f.span ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>
                        {f.label}{f.required && <span className="text-[#E84545]"> *</span>}
                      </label>
                      <input type={f.type}
                        value={(newSupplier as any)[f.key]}
                        onChange={e => setNewSupplier({ ...newSupplier, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${inputClass}`} style={inputStyle} placeholder={f.placeholder} />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label htmlFor="new-supplier-address" className="block text-sm font-medium mb-2" style={{ color: th.textPrimary }}>Address</label>
                    <textarea id="new-supplier-address" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      rows={3} className={`w-full px-4 py-3 rounded-xl resize-none ${inputClass}`} style={inputStyle} placeholder="Supplier address" />
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4 border-t mt-6" style={{ borderColor: th.divider }}>
                  <button onClick={() => setShowAddSupplier(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium active:scale-95 transition-all border"
                    style={{ borderColor: th.dividerStrong, color: th.textSecondary }}>Cancel</button>
                  <button onClick={handleAddSupplier}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-all font-semibold shadow-lg active:scale-95">
                    Add Supplier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden h-24" />
    </MainLayout>
  );
}