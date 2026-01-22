// File: app/autocityPro/purchases/new/page.tsx
"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  CreditCard,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Minus,
  Edit2,
  Save,
  Calculator,
} from "lucide-react";
import toast from "react-hot-toast";

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

export default function NewPurchasePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
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
  
  // Add Product Modal States
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [nextSKU, setNextSKU] = useState<string>("10001");

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    contactPerson: "",
    taxNumber: "",
    creditLimit: 0,
    paymentTerms: "Net 30",
  });

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchSuppliers();
    fetchCategories();
    fetchNextSKU();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    }
  };

  // UPDATED: Fetch ALL products (no pagination for search)
  const fetchProducts = async () => {
    try {
      // Fetch with high limit to get all products for search
      const res = await fetch("/api/products?limit=10000", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        console.log(`✓ Loaded ${data.products?.length || 0} products for search`);
      }
    } catch (error) {
      console.error("Failed to fetch products");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories");
    }
  };

  const fetchNextSKU = async () => {
    try {
      const res = await fetch("/api/products/next-sku", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNextSKU(data.nextSKU);
        return data.nextSKU;
      }
    } catch (error) {
      console.error("Error fetching next SKU:", error);
    }
    return "10001";
  };

  const generateSupplierCode = (name: string) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 10);
    const timestamp = Date.now().toString().slice(-4);
    return `SUP${code}${timestamp}`;
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const code = generateSupplierCode(newSupplier.name);
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...newSupplier, code }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Supplier added!");
        setSuppliers([...suppliers, data.supplier]);
        setSelectedSupplier(data.supplier);
        setShowAddSupplier(false);
        setNewSupplier({
          name: "",
          phone: "",
          email: "",
          address: "",
          contactPerson: "",
          taxNumber: "",
          creditLimit: 0,
          paymentTerms: "Net 30",
        });
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add supplier");
      }
    } catch (error) {
      toast.error("Failed to add supplier");
    }
  };

  // NEW: Handle Quick Add Category
  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Category added successfully!");
        const newCategoryWithCount = {
          ...data.category,
          productCount: 0,
        };
        setCategories([...categories, newCategoryWithCount]);
        setNewCategoryName("");
        setShowQuickAddCategory(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add category");
      }
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  // NEW: Handle Add Product
  const handleAddProduct = async (productData: any) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        const responseData = await res.json();
        toast.success("Product added successfully!");
        setShowAddProduct(false);
        
        // Refresh products list and next SKU
        await fetchProducts();
        await fetchNextSKU();
        
        // Optionally add the new product to cart
        const newProduct = responseData.product;
        if (newProduct) {
          addToCart(newProduct);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add product");
      }
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.productId === product._id);
    if (existingItem) {
      updateCartItem(existingItem.productId, "quantity", existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit || "pcs",
        quantity: 1,
        unitPrice: product.costPrice || product.sellingPrice || 0,
        taxRate: 0,
        taxAmount: 0,
        total: product.costPrice || product.sellingPrice || 0,
      };
      setCart([...cart, newItem]);
    }
    toast.success("Added to cart");
    setSearchTerm("");
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    toast.success("Removed from cart");
  };

  const updateCartItem = (productId: string, field: string, value: any) => {
    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          const updated = { ...item, [field]: value };
          const subtotal = updated.unitPrice * updated.quantity;
          updated.taxAmount = (subtotal * updated.taxRate) / 100;
          updated.total = subtotal + updated.taxAmount;
          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const totalTax = cart.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + totalTax;
    return { subtotal, totalTax, total, totalPaid: amountPaid };
  };

  // Get effective payment method
  const getEffectivePaymentMethod = () => {
    const totals = calculateTotals();
    
    if (amountPaid >= totals.total) {
      return paymentMethod === 'credit' ? 'cash' : paymentMethod;
    }
    
    if (amountPaid === 0 && paymentMethod === 'credit') {
      return 'credit';
    }
    
    if (amountPaid > 0 && amountPaid < totals.total) {
      return paymentMethod === 'credit' ? 'cash' : paymentMethod;
    }
    
    return paymentMethod;
  };

  // Payment Warning Component
  const PaymentWarning = () => {
    const totals = calculateTotals();
    const hasPartialPayment = amountPaid > 0 && amountPaid < totals.total;
    const isFullCredit = paymentMethod === 'credit' && amountPaid === 0;
    const isFullPayment = amountPaid >= totals.total;
    
    if (isFullCredit) {
      return (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-orange-400 text-sm font-semibold">Full Credit Purchase</p>
              <p className="text-orange-300 text-xs mt-1">
                You'll need to record payments later to clear the balance.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (hasPartialPayment) {
      return (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-400 text-sm font-semibold">Partial Payment</p>
              <p className="text-blue-300 text-xs mt-1">
                Paying {formatCurrency(amountPaid)} now. Balance of {formatCurrency(totals.total - amountPaid)} will be on credit.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (isFullPayment) {
      return (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-semibold">Full Payment</p>
              <p className="text-green-300 text-xs mt-1">
                Purchase will be fully paid with no outstanding balance.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    const totals = calculateTotals();
    
    if (amountPaid > totals.total) {
      toast.error(`Amount paid cannot exceed total (${formatCurrency(totals.total)})`);
      return;
    }
    
    const effectivePaymentMethod = getEffectivePaymentMethod();
    
    const purchaseItems = cart.map((item) => ({
      productId: item.productId,
      name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
    }));

    setLoading(true);
    try {
      console.log('Creating purchase:', {
        total: totals.total,
        amountPaid,
        balanceDue: totals.total - amountPaid,
        selectedMethod: paymentMethod,
        effectiveMethod: effectivePaymentMethod,
      });
      
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplierId: selectedSupplier._id,
          supplierName: selectedSupplier.name,
          items: purchaseItems,
          paymentMethod: effectivePaymentMethod,
          amountPaid: amountPaid,
          notes: "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.purchase.balanceDue > 0) {
          toast.success(
            `Purchase ${data.purchase.purchaseNumber} created! Balance due: ${formatCurrency(data.purchase.balanceDue)}`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Purchase ${data.purchase.purchaseNumber} created successfully!`);
        }
        
        setCart([]);
        setSelectedSupplier(null);
        setAmountPaid(0);
        fetchProducts();
        router.push("/autocityPro/purchases");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create purchase");
      }
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("Failed to create purchase");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = searchTerm
    ? products.filter((p) =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      )
    : [];

  const totals = calculateTotals();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `QR${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 10000) {
      return `QR${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
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
                  <h1 className="text-xl font-bold text-white">New Purchase</h1>
                  <p className="text-xs text-white/60">{cart.length} items in cart</p>
                </div>
              </div>
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 rounded-lg bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white shadow-lg active:scale-95 transition-all"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-11 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8 text-[#E84545]" />
                  New Purchase
                </h1>
                <p className="text-white/90 mt-2">Create a new purchase order</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-[#0A0A0A]/50 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Cart Items</p>
                  <p className="text-white font-bold text-2xl text-center">{cart.length}</p>
                </div>
                <div className="bg-[#0A0A0A]/50 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Total Amount</p>
                  <p className="text-[#E84545] font-bold text-2xl text-center">{formatCurrency(totals.total)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-6 pt-[100px] md:pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column - Product Search & Cart */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Product Search */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center">
                    <Search className="h-5 w-5 mr-2 text-[#E84545]" />
                    Search Products
                  </h2>
                  <button
                    onClick={async () => {
                      await fetchNextSKU();
                      setShowAddProduct(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545] rounded-lg hover:bg-[#E84545]/20 transition-all text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Product</span>
                  </button>
                </div>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, SKU, or barcode..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  />
                </div>

                {searchTerm && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-2 text-center py-8">
                        <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                        <p className="text-gray-400">No products found</p>
                        <button
                          onClick={async () => {
                            await fetchNextSKU();
                            setShowAddProduct(true);
                          }}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545] rounded-lg hover:bg-[#E84545]/20 transition-all text-sm font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Create New Product
                        </button>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product._id}
                          onClick={() => addToCart(product)}
                          className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-[#E84545]/30 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate">{product.name}</h3>
                              <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-[#E84545] font-bold">
                              {formatCurrency(product.costPrice || product.sellingPrice)}
                            </span>
                            <span className="text-xs text-gray-500">Stock: {product.currentStock}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Desktop Cart */}
              <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-[#E84545]" />
                  Cart ({cart.length} items)
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-400">Your cart is empty</p>
                      <p className="text-sm text-gray-500 mt-2">Search and add products above</p>
                    </div>
                  ) : (
                    cart.map((item, index) => (
                      <div key={index} className="border border-white/10 rounded-xl p-4 bg-white/5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">{item.productName}</h3>
                            <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">Qty</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(item.productId, "quantity", parseFloat(e.target.value) || 1)}
                              min="1"
                              className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">Price</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateCartItem(item.productId, "unitPrice", parseFloat(e.target.value) || 0)}
                              min="0"
                              className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">Tax %</label>
                            <input
                              type="number"
                              value={item.taxRate}
                              onChange={(e) => updateCartItem(item.productId, "taxRate", parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">Unit</label>
                            <div className="px-2 py-2 bg-white/5 rounded-lg text-sm text-white flex items-center justify-center border border-white/10">
                              {item.unit}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                          {item.taxRate > 0 && (
                            <span className="text-xs text-gray-500">Tax: {formatCurrency(item.taxAmount)}</span>
                          )}
                          <span className="font-bold text-white ml-auto">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Supplier & Payment */}
            <div className="space-y-4 md:space-y-6">
              {/* Supplier Selection */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[#E84545]" />
                  Supplier
                </h2>

                <select
                  value={selectedSupplier?._id ? String(selectedSupplier._id) : ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const supplier = suppliers.find(
                      (s) => s && s._id && String(s._id) === selectedId
                    );
                    setSelectedSupplier(supplier || null);
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white mb-3"
                >
                  <option value="">Select Supplier</option>
                  {suppliers
                    .filter((s) => s && s._id)
                    .map((supplier) => (
                      <option key={String(supplier._id)} value={String(supplier._id)}>
                        {supplier.name} - {supplier.phone}
                      </option>
                    ))}
                </select>

                {selectedSupplier && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-3">
                    <p className="text-white font-semibold">{selectedSupplier.name}</p>
                    <p className="text-sm text-gray-400 mt-1">{selectedSupplier.phone}</p>
                    {selectedSupplier.email && (
                      <p className="text-xs text-gray-500 mt-1">{selectedSupplier.email}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setShowAddSupplier(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#E84545]/30 text-[#E84545] rounded-xl hover:border-[#E84545]/50 hover:bg-[#E84545]/5 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Quick Add Supplier</span>
                </button>
              </div>

              {/* Payment */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-[#E84545]" />
                  Payment
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const newMethod = e.target.value as any;
                        setPaymentMethod(newMethod);
                        
                        if (newMethod === 'credit' && amountPaid > 0) {
                          toast('Tip: Leave "Amount Paid" as 0 for full credit purchase', {
                            icon: '💡',
                            duration: 4000,
                          });
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Amount Paid Now
                      {paymentMethod === 'credit' && (
                        <span className="text-orange-400 text-xs ml-2">(Leave 0 for full credit)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          
                          if (value > totals.total) {
                            toast.error('Amount cannot exceed total');
                            setAmountPaid(totals.total);
                          } else {
                            setAmountPaid(value);
                          }
                        }}
                        placeholder="0.00"
                        max={totals.total}
                        step="0.01"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      />
                      {amountPaid < totals.total && amountPaid >= 0 && totals.total > 0 && (
                        <button
                          onClick={() => setAmountPaid(totals.total)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#E84545]/10 border border-[#E84545]/20 text-[#E84545] rounded-lg text-xs font-medium hover:bg-[#E84545]/20 transition-all"
                        >
                          Pay Full
                        </button>
                      )}
                    </div>
                    
                    {totals.total > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <button
                          onClick={() => setAmountPaid(0)}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                        >
                          0%
                        </button>
                        <button
                          onClick={() => setAmountPaid(Math.round(totals.total * 0.25 * 100) / 100)}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                        >
                          25%
                        </button>
                        <button
                          onClick={() => setAmountPaid(Math.round(totals.total * 0.5 * 100) / 100)}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => setAmountPaid(totals.total)}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                        >
                          100%
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-[#E84545]" />
                  Summary
                </h2>
                
                <PaymentWarning />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white font-semibold">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">Tax:</span>
                    <span className="text-white font-semibold">{formatCurrency(totals.totalTax)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t border-white/10">
                    <span className="text-white font-bold text-lg">Total:</span>
                    <span className="text-[#E84545] font-bold text-xl">{formatCurrency(totals.total)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-white/5 pt-4">
                    <span className="text-gray-400">Paid:</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(totals.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-white font-semibold">Balance:</span>
                    <span className={`font-bold ${totals.total - totals.totalPaid > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {formatCurrency(totals.total - totals.totalPaid)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || cart.length === 0 || !selectedSupplier}
                  className="w-full mt-6 py-3 md:py-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Complete Purchase
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Product Modal */}
        <AddProductModal
          show={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onAdd={handleAddProduct}
          categories={categories}
          nextSKU={nextSKU}
          onQuickAddCategory={() => setShowQuickAddCategory(true)}
        />

        {/* Quick Add Category Modal */}
        {showQuickAddCategory && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#E84545]" />
                  Quick Add Category
                </h2>
                <button
                  onClick={() => {
                    setShowQuickAddCategory(false);
                    setNewCategoryName("");
                  }}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      placeholder="Enter category name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleQuickAddCategory();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowQuickAddCategory(false);
                      setNewCategoryName("");
                    }}
                    className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickAddCategory}
                    className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Cart Modal */}
        {isMobile && showCart && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute inset-x-0 bottom-0 top-16 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#E84545]" />
                  Cart ({cart.length})
                </h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <ShoppingCart className="h-16 w-16 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg font-medium">Cart is empty</p>
                    <p className="text-gray-500 text-sm mt-2">Add products to get started</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-white truncate">{item.productName}</h3>
                          <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {editingItem === item.productId ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 mb-1 block">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateCartItem(item.productId, "quantity", parseFloat(e.target.value) || 1)}
                                min="1"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 mb-1 block">Unit Price</label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateCartItem(item.productId, "unitPrice", parseFloat(e.target.value) || 0)}
                                min="0"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 mb-1 block">Tax Rate %</label>
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={(e) => updateCartItem(item.productId, "taxRate", parseFloat(e.target.value) || 0)}
                                min="0"
                                max="100"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 mb-1 block">Unit</label>
                              <div className="px-3 py-2 bg-white/5 rounded-lg text-sm text-white flex items-center justify-center border border-white/10 h-[38px]">
                                {item.unit}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="w-full px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg font-medium active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Save Changes
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-white/5 rounded-lg">
                            <div className="text-center">
                              <p className="text-[10px] text-gray-500 mb-1">Qty</p>
                              <p className="text-white font-semibold text-sm">{item.quantity}</p>
                            </div>
                            <div className="text-center border-x border-white/10">
                              <p className="text-[10px] text-gray-500 mb-1">Price</p>
                              <p className="text-white font-semibold text-sm">{item.unitPrice.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-gray-500 mb-1">Tax</p>
                              <p className="text-white font-semibold text-sm">{item.taxRate}%</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <button
                              onClick={() => setEditingItem(item.productId)}
                              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                            <div className="text-right">
                              {item.taxRate > 0 && (
                                <p className="text-[10px] text-gray-500">Tax: {formatCurrency(item.taxAmount)}</p>
                              )}
                              <p className="text-white font-bold">{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-white/10 p-4 bg-[#0A0A0A]/50 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400">Total Amount:</span>
                    <span className="text-[#E84545] font-bold text-xl">{formatCurrency(totals.total)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowCart(false);
                      setShowPayment(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold active:scale-95 transition-all shadow-lg"
                  >
                    Proceed to Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Payment Modal - UPDATED */}
        {isMobile && showPayment && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Complete Purchase</h2>
                <button
                  onClick={() => setShowPayment(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Supplier *</label>
                  <select
                    value={selectedSupplier?._id || ""}
                    onChange={(e) => setSelectedSupplier(suppliers.find((s) => s._id === e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name} - {supplier.phone}
                      </option>
                    ))}
                  </select>
                  {selectedSupplier && (
                    <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white font-semibold">{selectedSupplier.name}</p>
                      <p className="text-sm text-gray-400 mt-1">{selectedSupplier.phone}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowPayment(false);
                      setShowAddSupplier(true);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#E84545]/30 text-[#E84545] rounded-xl hover:border-[#E84545]/50 active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add New Supplier</span>
                  </button>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const newMethod = e.target.value as any;
                      setPaymentMethod(newMethod);
                      
                      if (newMethod === 'credit' && amountPaid > 0) {
                        toast('Tip: Leave "Amount Paid" as 0 for full credit purchase', {
                          icon: '💡',
                          duration: 4000,
                        });
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Amount Paid Now
                    {paymentMethod === 'credit' && (
                      <span className="text-orange-400 text-xs ml-2">(Leave 0 for full credit)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      
                      if (value > totals.total) {
                        toast.error('Amount cannot exceed total');
                        setAmountPaid(totals.total);
                      } else {
                        setAmountPaid(value);
                      }
                    }}
                    placeholder="0.00"
                    max={totals.total}
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                  />
                  
                  {/* Quick amount buttons */}
                  {totals.total > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <button
                        onClick={() => setAmountPaid(0)}
                        className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                      >
                        0%
                      </button>
                      <button
                        onClick={() => setAmountPaid(Math.round(totals.total * 0.25 * 100) / 100)}
                        className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                      >
                        25%
                      </button>
                      <button
                        onClick={() => setAmountPaid(Math.round(totals.total * 0.5 * 100) / 100)}
                        className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                      >
                        50%
                      </button>
                      <button
                        onClick={() => setAmountPaid(totals.total)}
                        className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-all"
                      >
                        100%
                      </button>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-white font-semibold mb-3">Order Summary</h3>
                  
                  {/* Payment Warning for Mobile */}
                  <div className="mb-3">
                    <PaymentWarning />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Items:</span>
                      <span className="text-white">{cart.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tax:</span>
                      <span className="text-white">{formatCurrency(totals.totalTax)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 font-semibold">
                      <span className="text-white">Total:</span>
                      <span className="text-[#E84545]">{formatCurrency(totals.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Paid:</span>
                      <span className="text-green-400">{formatCurrency(totals.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Balance:</span>
                      <span className={totals.total - totals.totalPaid > 0 ? 'text-orange-400' : 'text-green-400'}>
                        {formatCurrency(totals.total - totals.totalPaid)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all font-medium active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0 || !selectedSupplier}
                    className="px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Complete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Supplier Modal */}
        {showAddSupplier && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-white/10">
              <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Add Supplier</h2>
                <button
                  onClick={() => setShowAddSupplier(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-white">
                      Supplier Name <span className="text-[#E84545]">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="Enter supplier name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Phone <span className="text-[#E84545]">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Email</label>
                    <input
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Contact Person</label>
                    <input
                      type="text"
                      value={newSupplier.contactPerson}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Tax Number</label>
                    <input
                      type="text"
                      value={newSupplier.taxNumber}
                      onChange={(e) => setNewSupplier({ ...newSupplier, taxNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="Tax ID"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-white">Address</label>
                    <textarea
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 resize-none"
                      placeholder="Supplier address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Credit Limit (QAR)</label>
                    <input
                      type="number"
                      value={newSupplier.creditLimit}
                      onChange={(e) => setNewSupplier({ ...newSupplier, creditLimit: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Payment Terms</label>
                    <input
                      type="text"
                      value={newSupplier.paymentTerms}
                      onChange={(e) => setNewSupplier({ ...newSupplier, paymentTerms: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      placeholder="e.g., Net 30"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(false)}
                    className="flex-1 px-4 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-all font-medium active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSupplier}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-all font-semibold shadow-lg active:scale-95"
                  >
                    Add Supplier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-6"></div>

      {/* Custom Styles */}
      <style jsx global>{`
        @supports (padding: max(0px)) {
          .md\\:hidden.fixed.top-16 {
            padding-top: max(12px, env(safe-area-inset-top));
          }
        }
      `}</style>
    </MainLayout>
  );
}