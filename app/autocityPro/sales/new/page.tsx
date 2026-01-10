// app/autocityPro/sales/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search,
  Plus,
  Trash2,
  Car,
  ShoppingCart,
  User,
  Wrench,
  X,
  Star,
  Percent,
  Sparkles,
} from "lucide-react";
import {
  carMakesModels,
  carColors,
  carYears,
  CarMake,
} from "@/lib/data/carData";
import toast from "react-hot-toast";
import InvoicePrint from "@/components/InvoicePrint";
import { ChevronLeft, MoreVertical, DollarSign } from 'lucide-react';

interface ICustomer {
  _id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;
  createdAt: string;
  updatedAt: string;
}

interface IOutlet {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  taxInfo: {
    taxId: string;
  };
  settings: {
    currency: string;
  };
}

interface CartItem {
  productId?: string;
  productName: string;
  sku: string;
  isVehicle: boolean;
  isLabor?: boolean;
  unit: string;
  vin?: string;
  carMake?: string;
  carModel?: string;
  year?: number;
  color?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
  subtotal: number;
  total: number;
  profit: number;
}

interface Payment {
  method: "cash" | "card" | "bank_transfer" | "cheque";
  amount: number;
  reference?: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
const [showDynamicIsland, setShowDynamicIsland] = useState(true);
const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([
    { method: "cash", amount: 0 },
  ]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");

  // Invoice printing
  const [invoiceCustomer, setInvoiceCustomer] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Quick customer creation with vehicle info
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    vehicleRegistrationNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    vehicleVIN: "",
  });

  // Labor charge
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [laborCharge, setLaborCharge] = useState({
    description: "",
    hours: 1,
    rate: 0,
    taxRate: 0,
  });

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchFrequentProducts();
    fetchCustomers();
  }, []);

  useEffect(() => {
    const totals = calculateTotals();
    if (payments.length === 1 && cart.length > 0) {
      setPayments([{ ...payments[0], amount: totals.total }]);
    }
  }, [cart, overallDiscount, overallDiscountType]);
  useEffect(() => {
  const checkIfMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);
  return () => window.removeEventListener('resize', checkIfMobile);
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

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products");
    }
  };

  const fetchFrequentProducts = async () => {
    try {
      const res = await fetch("/api/products/frequent", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setFrequentProducts(data.products || []);
      } else {
        const res2 = await fetch("/api/products?limit=6", {
          credentials: "include",
        });
        if (res2.ok) {
          const data = await res2.json();
          setFrequentProducts((data.products || []).slice(0, 6));
        }
      }
    } catch (error) {
      console.error("Failed to fetch frequent products");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers");
    }
  };

  const generateCustomerCode = (name: string) => {
    const code = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 10);
    const timestamp = Date.now().toString().slice(-4);
    return `${code}${timestamp}`;
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const code = generateCustomerCode(newCustomer.name);

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newCustomer.name,
          code,
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: {
            street: newCustomer.address,
            city: "",
            state: "",
            country: "Qatar",
            postalCode: "",
          },
          vehicleRegistrationNumber: newCustomer.vehicleRegistrationNumber,
          vehicleMake: newCustomer.vehicleMake,
          vehicleModel: newCustomer.vehicleModel,
          vehicleYear: newCustomer.vehicleYear
            ? parseInt(newCustomer.vehicleYear)
            : undefined,
          vehicleColor: newCustomer.vehicleColor,
          vehicleVIN: newCustomer.vehicleVIN,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Customer added!");
        setCustomers([...customers, data.customer]);
        setSelectedCustomer(data.customer);
        setShowAddCustomer(false);
        setNewCustomer({
          name: "",
          phone: "",
          email: "",
          address: "",
          vehicleRegistrationNumber: "",
          vehicleMake: "",
          vehicleModel: "",
          vehicleYear: "",
          vehicleColor: "",
          vehicleVIN: "",
        });
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add customer");
      }
    } catch (error) {
      toast.error("Failed to add customer");
    }
  };

  const handleAddLabor = () => {
    if (!laborCharge.description) {
      toast.error("Labor description is required");
      return;
    }
    const formatCompactCurrency = (amount: number) => {
  if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
  return `QR${amount.toFixed(0)}`;
};
    const amount = laborCharge.hours * laborCharge.rate;
    const laborItem: CartItem = {
      productName: `Labor: ${laborCharge.description}`,
      sku: "LABOR",
      isVehicle: false,
      isLabor: true,
      unit: "job",
      quantity: laborCharge.hours,
      costPrice: 0,
      sellingPrice: laborCharge.rate,
      discount: 0,
      discountType: "percentage",
      taxRate: laborCharge.taxRate,
      subtotal: amount,
      total: amount * (1 + laborCharge.taxRate / 100),
      profit: amount,
    };

    setCart([...cart, laborItem]);
    setShowAddLabor(false);
    setLaborCharge({ description: "", hours: 1, rate: 0, taxRate: 0 });
    toast.success("Labor charge added!");
  };

  function isValidCarMake(make: any): make is CarMake {
    return Object.keys(carMakesModels).includes(make);
  }

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.productId === product._id);

    if (existingItem) {
      updateCartItem(
        existingItem.productId!,
        "quantity",
        existingItem.quantity + 1
      );
    } else {
      const newItem: CartItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        isVehicle: product.isVehicle || false,
        isLabor: false,
        unit: product.unit || "pcs",
        vin: product.vin,
        carMake: product.carMake,
        carModel: product.carModel,
        year: product.year,
        color: product.color,
        quantity: 1,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice,
        discount: 0,
        discountType: "percentage",
        taxRate: product.taxRate || 0,
        subtotal: product.sellingPrice,
        total: product.sellingPrice * (1 + (product.taxRate || 0) / 100),
        profit: product.sellingPrice - (product.costPrice || 0),
      };
      setCart([...cart, newItem]);
    }

    toast.success("Added to cart");
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

          let discountAmount = 0;
          if (updated.discountType === "percentage") {
            discountAmount =
              (updated.sellingPrice * updated.quantity * updated.discount) /
              100;
          } else {
            discountAmount = updated.discount;
          }

          const discountedPrice =
            updated.sellingPrice * updated.quantity - discountAmount;
          updated.subtotal = discountedPrice;
          updated.total = updated.subtotal * (1 + updated.taxRate / 100);
          updated.profit =
            (updated.sellingPrice - updated.costPrice) * updated.quantity -
            discountAmount;

          return updated;
        }
        return item;
      })
    );
  };

  const updatePayment = (index: number, field: string, value: any) => {
    setPayments(
      payments.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + item.sellingPrice * item.quantity;
    }, 0);

    const totalDiscount = cart.reduce((sum, item) => {
      if (item.discountType === "percentage") {
        return sum + (item.sellingPrice * item.quantity * item.discount) / 100;
      } else {
        return sum + item.discount;
      }
    }, 0);

    let overallDiscountAmount = 0;
    if (overallDiscountType === "percentage") {
      overallDiscountAmount =
        (subtotal - totalDiscount) * (overallDiscount / 100);
    } else {
      overallDiscountAmount = overallDiscount;
    }

    const subtotalAfterDiscount =
      subtotal - totalDiscount - overallDiscountAmount;
    const totalTax = cart.reduce((sum, item) => {
      let itemDiscountAmount = 0;
      if (item.discountType === "percentage") {
        itemDiscountAmount =
          (item.sellingPrice * item.quantity * item.discount) / 100;
      } else {
        itemDiscountAmount = item.discount;
      }
      const itemSubtotal =
        item.sellingPrice * item.quantity - itemDiscountAmount;
      return sum + (itemSubtotal * item.taxRate) / 100;
    }, 0);

    const total = subtotalAfterDiscount + totalTax;
    const totalProfit = cart.reduce((sum, item) => sum + item.profit, 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      subtotal,
      totalDiscount,
      overallDiscountAmount,
      totalTax,
      total,
      totalProfit,
      totalPaid,
    };
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    setInvoiceCustomer(selectedCustomer);

    const totals = calculateTotals();

    const saleItems = cart.map((item) => {
      let discountAmount = 0;
      let discountPercentage = 0;

      if (item.discountType === "percentage") {
        discountPercentage = item.discount;
        discountAmount =
          (item.sellingPrice * item.quantity * item.discount) / 100;
      } else {
        discountAmount = item.discount;
        discountPercentage =
          item.sellingPrice * item.quantity > 0
            ? (item.discount / (item.sellingPrice * item.quantity)) * 100
            : 0;
      }

      if (item.isLabor) {
        return {
          name: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit || "pcs",
          unitPrice: item.sellingPrice,
          taxRate: item.taxRate,
          discount: discountPercentage,
          discountAmount: discountAmount,
          discountType: item.discountType,
          isLabor: true,
        };
      }

      return {
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit || "pcs",
        unitPrice: item.sellingPrice,
        taxRate: item.taxRate,
        discount: discountPercentage,
        discountAmount: discountAmount,
        discountType: item.discountType,
        isLabor: false,
      };
    });

    setLoading(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          customerName: selectedCustomer.name,
          items: saleItems,
          paymentMethod: payments[0].method,
          amountPaid: totals.totalPaid,
          notes: "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Sale ${data.sale.invoiceNumber} created successfully!`);

        setInvoiceData({
          invoiceNumber: data.sale.invoiceNumber,
          saleDate: data.sale.saleDate,
          items: cart.map((item) => {
            let discountAmount = 0;
            if (item.discountType === "percentage") {
              discountAmount =
                (item.sellingPrice * item.quantity * item.discount) / 100;
            } else {
              discountAmount = item.discount;
            }

            const itemSubtotal =
              item.sellingPrice * item.quantity - discountAmount;
            return {
              name: item.productName,
              quantity: item.quantity,
              unitPrice: item.sellingPrice,
              discount: discountAmount,
              taxAmount: (itemSubtotal * item.taxRate) / 100,
              total: item.total,
              isLabor: item.isLabor,
            };
          }),
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount + totals.overallDiscountAmount,
          totalTax: totals.totalTax,
          grandTotal: totals.total,
          amountPaid: totals.totalPaid,
          balanceDue: totals.total - totals.totalPaid,
          paymentMethod: payments[0].method.toUpperCase(),
          notes: "",
        });

        setShowInvoice(true);

        setCart([]);
        setSelectedCustomer(null);
        setPayments([{ method: "cash", amount: 0 }]);
        setOverallDiscount(0);

        fetchProducts();
        fetchFrequentProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create sale");
      }
    } catch (error) {
      console.error("Error creating sale:", error);
      toast.error("Failed to create sale");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = searchTerm
    ? products.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode?.includes(searchTerm) ||
          p.vin?.includes(searchTerm)
      )
    : [];

  const totals = calculateTotals();
  // Helper function for compact currency
const formatCompactCurrency = (amount: number) => {
  if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
  return `QR${amount.toFixed(0)}`;
};

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const availableCarMakes = Object.keys(carMakesModels);

return (
  <MainLayout user={user} onLogout={handleLogout}>
    {/* Dynamic Island - Mobile Only */}
    {isMobile && showDynamicIsland && (
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
        <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-3 w-3 text-[#E84545]" />
              <span className="text-white text-xs font-semibold">{cart.length}</span>
            </div>
            <div className="h-3 w-px bg-white/20"></div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-400" />
              <span className="text-white text-xs font-medium">
                {totals.total > 0 ? formatCompactCurrency(totals.total) : 'QR0'}
              </span>
            </div>
            {selectedCustomer && (
              <>
                <div className="h-3 w-px bg-white/20"></div>
                <User className="h-3 w-3 text-blue-400" />
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Mobile Header - Compact & Fixed */}
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
              <h1 className="text-xl font-bold text-white">New Sale</h1>
              <p className="text-xs text-white/60">
                {cart.length} items • {formatCompactCurrency(totals.total)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
        
        {/* Mobile Quick Stats */}
        {cart.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <p className="text-[10px] text-white/60 uppercase">Cart Total</p>
              <p className="text-sm font-bold text-white truncate">
                {formatCompactCurrency(totals.total)}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <p className="text-[10px] text-white/60 uppercase">Items</p>
              <p className="text-sm font-bold text-white">{cart.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Desktop Header */}
    <div className="hidden md:block py-4 md:py-8 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
      
      <div className="px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Title Section */}
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white mb-1 flex items-center">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 mr-2 text-white" />
              New Sale
            </h1>
            <p className="text-sm md:text-base text-white/90">
              Create a new sales transaction
            </p>
          </div>

          {/* Stats Section */}
          <div className="flex gap-3 md:gap-5">
            {/* Cart Items */}
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 text-center">
              <p className="text-xs md:text-sm text-white/80">Cart Items</p>
              <p className="text-base md:text-lg font-semibold text-white">
                {cart.length}
              </p>
            </div>

            {/* Total */}
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 text-center">
              <p className="text-xs md:text-sm text-white/80">Total</p>
              <p className="text-lg md:text-xl font-bold text-white">
                QAR {totals.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
         
         {/* Main Content - ADD PADDING FOR MOBILE HEADER */}
    <div className="px-4 md:px-6 pt-[180px] md:pt-6 pb-6 bg-[#050505] min-h-screen">
      <div className="p-6 bg-[#050505] min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Frequent Products */}
            {!searchTerm && frequentProducts.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center text-white">
                  <Star className="h-5 w-5 mr-2 text-[#E84545]" />
                  Frequent Products
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {frequentProducts.map((product) => (
                    <div
                      key={product._id}
                      onClick={() => addToCart(product)}
                      className="p-4 bg-[#111111] border border-white/5 rounded-lg hover:border-[#E84545]/50 hover:shadow-[#E84545]/20 hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-white truncate group-hover:text-[#E84545] transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-400 truncate">
                            {product.sku}
                          </p>
                          {product.isVehicle && (
                            <div className="flex items-center mt-1">
                              <Car className="h-3 w-3 text-[#E84545] mr-1" />
                              <span className="text-xs text-[#E84545] truncate">
                                {product.carMake}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-sm text-[#E84545]">
                            QAR {product.sellingPrice}
                          </p>
                          <p className="text-xs text-gray-400">
                            Stock: {product.currentStock}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, SKU, barcode, or VIN..."
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                  />
                </div>
                <button
                  onClick={() => setShowAddLabor(true)}
                  className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] whitespace-nowrap transition-all shadow-lg hover:shadow-[#E84545]/30"
                >
                  <Wrench className="h-5 w-5" />
                  <span>Add Labor</span>
                </button>
              </div>

              {searchTerm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-400">
                      <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      No products found
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        onClick={() => addToCart(product)}
                        className="p-4 bg-[#111111] border border-white/5 rounded-lg hover:border-[#E84545]/50 hover:shadow-[#E84545]/20 hover:shadow-md cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white group-hover:text-[#E84545] transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              SKU: {product.sku}
                            </p>
                            {product.isVehicle && (
                              <div className="flex items-center mt-1">
                                <Car className="h-4 w-4 text-[#E84545] mr-1" />
                                <span className="text-xs text-[#E84545]">
                                  {product.carMake} {product.carModel}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#E84545]">
                              QAR {product.sellingPrice}
                            </p>
                            <p className="text-xs text-gray-400">
                              Stock: {product.currentStock}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <ShoppingCart className="h-5 w-5 mr-2 text-[#E84545]" />
                Cart ({cart.length} items)
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                    <p>Your cart is empty</p>
                    <p className="text-sm mt-2">Add products from above</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div
                      key={index}
                      className="border border-white/5 rounded-lg p-4 bg-[#111111] group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold flex items-center text-white">
                            {item.isLabor && (
                              <Wrench className="h-4 w-4 mr-2 text-[#E84545]" />
                            )}
                            {item.productName}
                          </h3>
                          {item.isVehicle && (
                            <p className="text-sm text-gray-300">
                              {item.carMake} {item.carModel} {item.year} -{" "}
                              {item.color}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-[#E84545] hover:text-[#cc3c3c] transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {!item.isLabor && (
                        <>
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateCartItem(
                                  item.productId!,
                                  "quantity",
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              placeholder="Qty"
                              min="1"
                              className="px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                            />
                            <input
                              type="number"
                              value={item.sellingPrice}
                              onChange={(e) =>
                                updateCartItem(
                                  item.productId!,
                                  "sellingPrice",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="Price"
                              min="0"
                              className="px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                            />
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) =>
                                updateCartItem(
                                  item.productId!,
                                  "discount",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder={
                                item.discountType === "percentage" ? "%" : "QAR"
                              }
                              min="0"
                              className="px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                            />
                            <button
                              onClick={() => {
                                const newType =
                                  item.discountType === "percentage"
                                    ? "fixed"
                                    : "percentage";
                                updateCartItem(
                                  item.productId!,
                                  "discountType",
                                  newType
                                );
                              }}
                              className="px-2 py-2 bg-[#111111] border border-white/5 rounded text-xs text-white hover:bg-[#E84545]/10 transition-colors flex items-center justify-center"
                              title={`Switch to ${
                                item.discountType === "percentage"
                                  ? "Fixed"
                                  : "Percentage"
                              }`}
                            >
                              {item.discountType === "percentage" ? (
                                <Percent className="h-4 w-4" />
                              ) : (
                                <span className="font-bold">QAR</span>
                              )}
                            </button>
                          </div>
                          {item.discount > 0 && (
                            <div className="mt-2 text-xs text-[#E84545]">
                              Discount:{" "}
                              {item.discountType === "percentage"
                                ? `${item.discount}% (QAR ${(
                                    (item.sellingPrice *
                                      item.quantity *
                                      item.discount) /
                                    100
                                  ).toFixed(2)})`
                                : `QAR ${item.discount.toFixed(2)} (${(
                                    (item.discount /
                                      (item.sellingPrice * item.quantity)) *
                                    100
                                  ).toFixed(1)}%)`}
                            </div>
                          )}
                        </>
                      )}

                      <div className="mt-3 flex justify-between items-center text-sm">
                        <div className="text-gray-300">
                          {item.discount > 0 && (
                            <span className="line-through text-gray-500 mr-2">
                              QAR{" "}
                              {(item.sellingPrice * item.quantity).toFixed(2)}
                            </span>
                          )}
                          <span>Total:</span>
                        </div>
                        <span className="font-bold text-white">
                          QAR {item.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Customer</h2>
              <div className="mb-3">
                <select
                  value={selectedCustomer?._id || ""}
                  onChange={(e) =>
                    setSelectedCustomer(
                      customers.find((c) => c._id === e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                >
                  <option value="" className="bg-[#0A0A0A]">
                    Select Customer
                  </option>
                  {customers.map((customer) => (
                    <option
                      key={customer._id}
                      value={customer._id}
                      className="bg-[#0A0A0A]"
                    >
                      {customer.name} - {customer.phone}
                      {customer.vehicleRegistrationNumber &&
                        ` - ${customer.vehicleRegistrationNumber}`}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-[#111111] rounded-lg border border-white/5">
                    <p className="text-white font-medium">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      {selectedCustomer.phone}
                    </p>
                    {selectedCustomer.vehicleRegistrationNumber && (
                      <p className="text-xs text-gray-400 mt-1">
                        Vehicle: {selectedCustomer.vehicleRegistrationNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-3 border-2 border-dashed border-[#E84545]/50 text-[#E84545] rounded-lg hover:border-[#E84545] hover:bg-[#E84545]/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Add Customer</span>
              </button>
            </div>

            {/* Overall Discount */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">
                Overall Discount
              </h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  value={overallDiscount}
                  onChange={(e) =>
                    setOverallDiscount(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  min="0"
                  className="flex-1 px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                />
                <select
                  value={overallDiscountType}
                  onChange={(e) =>
                    setOverallDiscountType(e.target.value as any)
                  }
                  className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="percentage" className="bg-[#0A0A0A]">
                    %
                  </option>
                  <option value="fixed" className="bg-[#0A0A0A]">
                    QAR
                  </option>
                </select>
              </div>
              {overallDiscount > 0 && (
                <div className="p-3 bg-gradient-to-r from-[#E84545]/10 to-[#cc3c3c]/10 rounded-lg border border-[#E84545]/30">
                  <p className="text-sm text-[#E84545] font-medium">
                    Discount: QAR {totals.overallDiscountAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {overallDiscountType === "percentage"
                      ? `${overallDiscount}% off subtotal`
                      : `Fixed discount of QAR ${overallDiscount}`}
                  </p>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Payment</h2>

              {payments.map((payment, index) => (
                <div
                  key={index}
                  className="mb-4 p-3 bg-[#111111] rounded-lg border border-white/5"
                >
                  <select
                    value={payment.method}
                    onChange={(e) =>
                      updatePayment(index, "method", e.target.value)
                    }
                    className="w-full px-3 py-2 mb-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                  >
                    <option value="cash" className="bg-[#0A0A0A]">
                      Cash
                    </option>
                    <option value="card" className="bg-[#0A0A0A]">
                      Card
                    </option>
                    <option value="bank_transfer" className="bg-[#0A0A0A]">
                      Bank Transfer
                    </option>
                    <option value="cheque" className="bg-[#0A0A0A]">
                      Cheque
                    </option>
                  </select>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) =>
                      updatePayment(
                        index,
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="Amount"
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                  />
                  {payment.reference && (
                    <input
                      type="text"
                      value={payment.reference}
                      onChange={(e) =>
                        updatePayment(index, "reference", e.target.value)
                      }
                      placeholder="Reference"
                      className="w-full px-3 py-2 mt-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545] focus:border-transparent"
                    />
                  )}
                </div>
              ))}

              <button
                onClick={() =>
                  setPayments([...payments, { method: "cash", amount: 0 }])
                }
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-dashed border-white/10 text-gray-400 rounded-lg hover:border-[#E84545] hover:text-[#E84545] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Payment Method</span>
              </button>
            </div>

            {/* Summary */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">
                    QAR {totals.subtotal.toFixed(2)}
                  </span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Item Discount:</span>
                    <span className="text-[#E84545]">
                      -QAR {totals.totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {totals.overallDiscountAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Overall Discount:</span>
                    <span className="text-[#E84545]">
                      -QAR {totals.overallDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Tax:</span>
                  <span className="text-white">
                    QAR {totals.totalTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-t border-white/10 font-bold text-lg">
                  <span className="text-white">Total:</span>
                  <span className="text-white">
                    QAR {totals.total.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-t border-white/10 pt-4">
                  <span className="text-gray-400">Paid:</span>
                  <span className="text-white">
                    QAR {totals.totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-gray-300">Balance:</span>
                  <span
                    className={
                      totals.total - totals.totalPaid > 0
                        ? "text-[#E84545]"
                        : "text-[#E84545]"
                    }
                  >
                    QAR {(totals.total - totals.totalPaid).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0 || !selectedCustomer}
                className="w-full mt-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg font-semibold hover:from-[#cc3c3c] hover:to-[#E84545] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[#E84545]/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Complete Sale"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
       {/* Mobile Action Menu - ADD BEFORE CLOSING </MainLayout> */}
    {showMobileMenu && (
      <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Quick Actions</h2>
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
                setShowAddLabor(true);
                setShowMobileMenu(false);
              }}
              className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
            >
              <span>Add Labor Charge</span>
              <Wrench className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setShowAddCustomer(true);
                setShowMobileMenu(false);
              }}
              className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
            >
              <span>Add New Customer</span>
              <User className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if (selectedCustomer) {
                  toast.success(`Customer: ${selectedCustomer.name}`);
                }
                setShowMobileMenu(false);
              }}
              className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
            >
              <span>View Cart Summary</span>
              <ShoppingCart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Mobile Safe Area Bottom Padding */}
    <div className="md:hidden h-6"></div>
    </div>
      {/* Add Customer Modal with Vehicle Info */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] rounded-lg shadow-2xl max-w-2xl w-full my-8 border border-white/5">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-gradient-to-r from-[#0A0A0A] to-[#111111]">
              <h2 className="text-xl font-bold text-white">
                Quick Add Customer
              </h2>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-white">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Phone *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-white">
                    Address
                  </label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        address: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Customer address"
                  />
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="border-t border-white/5 pt-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center text-white">
                  <Car className="h-4 w-4 mr-2 text-[#E84545]" />
                  Vehicle Information (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 text-white">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={newCustomer.vehicleRegistrationNumber}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          vehicleRegistrationNumber:
                            e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400 uppercase"
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">
                      Make
                    </label>
                    <select
                      value={newCustomer.vehicleMake}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          vehicleMake: e.target.value,
                          vehicleModel: "",
                        })
                      }
                      className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                    >
                      <option value="" className="bg-[#0A0A0A]">
                        Select Make
                      </option>
                      {availableCarMakes.map((make) => (
                        <option
                          key={make}
                          value={make}
                          className="bg-[#0A0A0A]"
                        >
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">
                      Model
                    </label>
                    <select
                      value={newCustomer.vehicleModel}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          vehicleModel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!newCustomer.vehicleMake}
                    >
                      <option value="" className="bg-[#0A0A0A]">
                        Select Model
                      </option>
                      {isValidCarMake(newCustomer.vehicleMake) &&
                        carMakesModels[newCustomer.vehicleMake].map((model) => (
                          <option
                            key={model}
                            value={model}
                            className="bg-[#0A0A0A]"
                          >
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">
                      Year
                    </label>
                    <select
                      value={newCustomer.vehicleYear}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          vehicleYear: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                    >
                      <option value="" className="bg-[#0A0A0A]">
                        Select Year
                      </option>
                      {carYears.map((year) => (
                        <option
                          key={year}
                          value={year}
                          className="bg-[#0A0A0A]"
                        >
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">
                      Color
                    </label>
                    <select
                      value={newCustomer.vehicleColor}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          vehicleColor: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                    >
                      <option value="" className="bg-[#0A0A0A]">
                        Select Color
                      </option>
                      {carColors.map((color) => (
                        <option
                          key={color}
                          value={color}
                          className="bg-[#0A0A0A]"
                        >
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 text-white">
                      VIN Number
                    </label>
                    <input
                      type="text"
                      value={newCustomer.vehicleVIN}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          vehicleVIN: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400 uppercase"
                      placeholder="Vehicle Identification Number"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-white/5">
                <button
                  onClick={() => setShowAddCustomer(false)}
                  className="px-4 py-2 border border-white/5 text-gray-300 rounded-lg hover:bg-[#111111] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] transition-all"
                >
                  Add Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Labor Modal */}
      {showAddLabor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] rounded-lg shadow-2xl max-w-md w-full border border-white/5">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-gradient-to-r from-[#0A0A0A] to-[#111111]">
              <h2 className="text-xl font-bold flex items-center text-white">
                <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />
                Add Labor Charge
              </h2>
              <button
                onClick={() => setShowAddLabor(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Description *
                </label>
                <input
                  type="text"
                  value={laborCharge.description}
                  onChange={(e) =>
                    setLaborCharge({
                      ...laborCharge,
                      description: e.target.value,
                    })
                  }
                  placeholder="e.g., Engine repair, Oil change"
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Hours
                  </label>
                  <input
                    type="number"
                    value={laborCharge.hours}
                    onChange={(e) =>
                      setLaborCharge({
                        ...laborCharge,
                        hours: parseFloat(e.target.value) || 1,
                      })
                    }
                    min="0.5"
                    step="0.5"
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Rate (QAR/hr)
                  </label>
                  <input
                    type="number"
                    value={laborCharge.rate}
                    onChange={(e) =>
                      setLaborCharge({
                        ...laborCharge,
                        rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={laborCharge.taxRate}
                  onChange={(e) =>
                    setLaborCharge({
                      ...laborCharge,
                      taxRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                />
              </div>
              <div className="bg-[#111111] p-4 rounded-lg border border-white/5">
                <p className="text-sm text-gray-300">
                  Total:{" "}
                  <span className="font-bold text-white">
                    QAR{" "}
                    {(
                      laborCharge.hours *
                      laborCharge.rate *
                      (1 + laborCharge.taxRate / 100)
                    ).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Base: {laborCharge.hours} × {laborCharge.rate} = QAR{" "}
                  {laborCharge.hours * laborCharge.rate}
                  {laborCharge.taxRate > 0 && (
                    <span> + {laborCharge.taxRate}% tax</span>
                  )}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddLabor(false)}
                  className="px-4 py-2 border border-white/5 text-gray-300 rounded-lg hover:bg-[#111111] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLabor}
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] transition-all"
                >
                  Add Labor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="md:hidden h-6"></div>
      {/* Invoice Print Modal */}
      {showInvoice && invoiceData && user?.outletId && invoiceCustomer && (
        <>
          <InvoicePrint
            invoice={invoiceData}
            outletId={user.outletId}
            customerId={invoiceCustomer._id}
            onClose={() => {
              setShowInvoice(false);
              setInvoiceCustomer(null);
            }}
          />
        </>
      )}
    </MainLayout>
  );
}
