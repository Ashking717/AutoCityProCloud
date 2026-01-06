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
} from "lucide-react";
import {
  carMakesModels,
  carColors,
  carYears,
  CarMake,
} from "@/lib/data/carData";
import toast from "react-hot-toast";
import InvoicePrint from "@/components/InvoicePrint";

// Add ICustomer and IOutlet imports if available, otherwise define types
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
  vin?: string;
  carMake?: string;
  carModel?: string;
  year?: number;
  color?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
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

const fetchUser = async () => {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      console.log("User data structure:", {
        user: data.user,
        outletId: data.user?.outletId,
        typeOfOutletId: typeof data.user?.outletId,
        isObject: typeof data.user?.outletId === 'object'
      });
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
      // Fetch top 6 most sold products
      const res = await fetch("/api/products/frequent", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setFrequentProducts(data.products || []);
      } else {
        // Fallback: get first 6 products
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

    const amount = laborCharge.hours * laborCharge.rate;
    const laborItem: CartItem = {
      productName: `Labor: ${laborCharge.description}`,
      sku: "LABOR",
      isVehicle: false,
      isLabor: true,
      quantity: laborCharge.hours,
      costPrice: 0,
      sellingPrice: laborCharge.rate,
      discount: 0,
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
  // Type guard function
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
        vin: product.vin,
        carMake: product.carMake,
        carModel: product.carModel,
        year: product.year,
        color: product.color,
        quantity: 1,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice,
        discount: 0,
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

          const discountedPrice =
            updated.sellingPrice * (1 - updated.discount / 100);
          updated.subtotal = discountedPrice * updated.quantity;
          updated.total = updated.subtotal * (1 + updated.taxRate / 100);
          updated.profit =
            (updated.sellingPrice - updated.costPrice) * updated.quantity;

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
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = cart.reduce(
      (sum, item) =>
        sum + (item.sellingPrice * item.quantity * item.discount) / 100,
      0
    );

    let overallDiscountAmount = 0;
    if (overallDiscountType === "percentage") {
      overallDiscountAmount = subtotal * (overallDiscount / 100);
    } else {
      overallDiscountAmount = overallDiscount;
    }

    const subtotalAfterDiscount =
      subtotal - totalDiscount - overallDiscountAmount;
    const totalTax = cart.reduce((sum, item) => {
      const itemSubtotal = item.subtotal * (1 - item.discount / 100);
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

  // Save customer data for invoice before resetting
  setInvoiceCustomer(selectedCustomer);

  const totals = calculateTotals();

  const saleItems = cart.map((item) => {
    if (item.isLabor) {
      return {
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        taxRate: item.taxRate,
        discount: item.discount,
        isLabor: true,
      };
    }

    return {
      productId: item.productId,
      name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.sellingPrice,
      taxRate: item.taxRate,
      discount: item.discount,
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

      // Prepare invoice data for printing
      setInvoiceData({
        invoiceNumber: data.sale.invoiceNumber,
        saleDate: data.sale.saleDate,
        items: cart.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          discount: (item.sellingPrice * item.quantity * item.discount) / 100,
          taxAmount: (item.subtotal * item.taxRate) / 100,
          total: item.total,
          isLabor: item.isLabor,
        })),
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount + totals.overallDiscountAmount,
        totalTax: totals.totalTax,
        grandTotal: totals.total,
        amountPaid: totals.totalPaid,
        balanceDue: totals.total - totals.totalPaid,
        paymentMethod: payments[0].method.toUpperCase(),
        notes: "",
      });

      // Show invoice print dialog
      setShowInvoice(true);

      // Reset form (but keep invoiceCustomer)
      setCart([]);
      setSelectedCustomer(null);
      setPayments([{ method: "cash", amount: 0 }]);
      setOverallDiscount(0);

      // Refresh products and frequent products
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const availableCarMakes = Object.keys(carMakesModels);

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header with Gradient */}
      <div className="py-2 bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden  relative">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjOUM5MkFDIiBmaWxsLW9wYWNpdHk9IjAuMDUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjMiLz48Y2lyY2xlIGN4PSIxMyIgY3k9IjEzIiByPSIzIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>

        <div className="p-6 relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">New Sale</h1>
              <p className="text-indigo-100">Create a new sales transaction</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white text-sm">Cart Items</p>
                <p className="text-white font-bold text-xl text-center">
                  {cart.length}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white text-sm">Total</p>
                <p className="text-white font-bold text-xl text-center">
                  QAR {totals.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="p-6 bg-slate-900 min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Frequent Products */}
            {!searchTerm && frequentProducts.length > 0 && (
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center text-white">
                  <Star className="h-5 w-5 mr-2 text-yellow-400" />
                  Frequent Products
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {frequentProducts.map((product) => (
                    <div
                      key={product._id}
                      onClick={() => addToCart(product)}
                      className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-purple-500 hover:shadow-purple-900/20 hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-white truncate">
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            {product.sku}
                          </p>
                          {product.isVehicle && (
                            <div className="flex items-center mt-1">
                              <Car className="h-3 w-3 text-purple-400 mr-1" />
                              <span className="text-xs text-purple-300 truncate">
                                {product.carMake}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-sm text-purple-300">
                            QAR {product.sellingPrice}
                          </p>
                          <p className="text-xs text-slate-400">
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
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, SKU, barcode, or VIN..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={() => setShowAddLabor(true)}
                  className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 whitespace-nowrap transition-all shadow-lg hover:shadow-emerald-900/30"
                >
                  <Wrench className="h-5 w-5" />
                  <span>Add Labor</span>
                </button>
              </div>

              {searchTerm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-slate-400">
                      <Search className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                      No products found
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        onClick={() => addToCart(product)}
                        className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg hover:border-purple-500 hover:shadow-purple-900/20 hover:shadow-md cursor-pointer transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">
                              {product.name}
                            </h3>
                            <p className="text-sm text-slate-400">
                              SKU: {product.sku}
                            </p>
                            {product.isVehicle && (
                              <div className="flex items-center mt-1">
                                <Car className="h-4 w-4 text-purple-400 mr-1" />
                                <span className="text-xs text-purple-300">
                                  {product.carMake} {product.carModel}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-300">
                              QAR {product.sellingPrice}
                            </p>
                            <p className="text-xs text-slate-400">
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
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <ShoppingCart className="h-5 w-5 mr-2 text-purple-400" />
                Cart ({cart.length} items)
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p>Your cart is empty</p>
                    <p className="text-sm mt-2">Add products from above</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div
                      key={index}
                      className="border border-slate-600 rounded-lg p-4 bg-slate-700/30"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold flex items-center text-white">
                            {item.isLabor && (
                              <Wrench className="h-4 w-4 mr-2 text-emerald-400" />
                            )}
                            {item.productName}
                          </h3>
                          {item.isVehicle && (
                            <p className="text-sm text-slate-300">
                              {item.carMake} {item.carModel} {item.year} -{" "}
                              {item.color}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {!item.isLabor && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
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
                            className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
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
                            className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
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
                            placeholder="Disc %"
                            min="0"
                            max="100"
                            className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      <div className="mt-3 flex justify-between items-center text-sm">
                        <div className="text-slate-300">
                          {item.discount > 0 && (
                            <span className="line-through text-slate-500 mr-2">
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
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Customer</h2>
              <div className="mb-3">
                <select
                  value={selectedCustomer?._id || ""}
                  onChange={(e) =>
                    setSelectedCustomer(
                      customers.find((c) => c._id === e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                >
                  <option value="" className="bg-slate-800">
                    Select Customer
                  </option>
                  {customers.map((customer) => (
                    <option
                      key={customer._id}
                      value={customer._id}
                      className="bg-slate-800"
                    >
                      {customer.name} - {customer.phone}
                      {customer.vehicleRegistrationNumber &&
                        ` - ${customer.vehicleRegistrationNumber}`}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                    <p className="text-white font-medium">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {selectedCustomer.phone}
                    </p>
                    {selectedCustomer.vehicleRegistrationNumber && (
                      <p className="text-xs text-slate-400 mt-1">
                        Vehicle: {selectedCustomer.vehicleRegistrationNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-3 border-2 border-dashed border-purple-500/50 text-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-900/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Add Customer</span>
              </button>
            </div>

            {/* Overall Discount */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
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
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                />
                <select
                  value={overallDiscountType}
                  onChange={(e) =>
                    setOverallDiscountType(e.target.value as any)
                  }
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="percentage" className="bg-slate-800">
                    %
                  </option>
                  <option value="fixed" className="bg-slate-800">
                    QAR
                  </option>
                </select>
              </div>
              {overallDiscount > 0 && (
                <div className="p-3 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-500/30">
                  <p className="text-sm text-emerald-400 font-medium">
                    Discount: QAR {totals.overallDiscountAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {overallDiscountType === "percentage"
                      ? `${overallDiscount}% off subtotal`
                      : `Fixed discount of QAR ${overallDiscount}`}
                  </p>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Payment</h2>

              {payments.map((payment, index) => (
                <div
                  key={index}
                  className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600"
                >
                  <select
                    value={payment.method}
                    onChange={(e) =>
                      updatePayment(index, "method", e.target.value)
                    }
                    className="w-full px-3 py-2 mb-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="cash" className="bg-slate-800">
                      Cash
                    </option>
                    <option value="card" className="bg-slate-800">
                      Card
                    </option>
                    <option value="bank_transfer" className="bg-slate-800">
                      Bank Transfer
                    </option>
                    <option value="cheque" className="bg-slate-800">
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
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  />
                  {payment.reference && (
                    <input
                      type="text"
                      value={payment.reference}
                      onChange={(e) =>
                        updatePayment(index, "reference", e.target.value)
                      }
                      placeholder="Reference"
                      className="w-full px-3 py-2 mt-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}

              <button
                onClick={() =>
                  setPayments([...payments, { method: "cash", amount: 0 }])
                }
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-dashed border-slate-600 text-slate-400 rounded-lg hover:border-purple-500 hover:text-purple-300 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Payment Method</span>
              </button>
            </div>

            {/* Summary */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="text-white">
                    QAR {totals.subtotal.toFixed(2)}
                  </span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Item Discount:</span>
                    <span className="text-emerald-400">
                      -QAR {totals.totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {totals.overallDiscountAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Overall Discount:</span>
                    <span className="text-emerald-400">
                      -QAR {totals.overallDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Tax:</span>
                  <span className="text-white">
                    QAR {totals.totalTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-t border-slate-600 font-bold text-lg">
                  <span className="text-white">Total:</span>
                  <span className="text-white">
                    QAR {totals.total.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-t border-slate-600 pt-4">
                  <span className="text-slate-400">Paid:</span>
                  <span className="text-white">
                    QAR {totals.totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-300">Balance:</span>
                  <span
                    className={
                      totals.total - totals.totalPaid > 0
                        ? "text-red-400"
                        : "text-emerald-400"
                    }
                  >
                    QAR {(totals.total - totals.totalPaid).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0 || !selectedCustomer}
                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-900/30"
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

      {/* Add Customer Modal with Vehicle Info */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full my-8 border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
              <h2 className="text-xl font-bold text-white">
                Quick Add Customer
              </h2>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="text-slate-400 hover:text-white transition-colors"
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
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
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
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
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
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
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
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Customer address"
                  />
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center text-white">
                  <Car className="h-4 w-4 mr-2 text-purple-400" />
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
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 uppercase"
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
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    >
                      <option value="" className="bg-slate-800">
                        Select Make
                      </option>
                      {availableCarMakes.map((make) => (
                        <option
                          key={make}
                          value={make}
                          className="bg-slate-800"
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
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!newCustomer.vehicleMake}
                    >
                      <option value="" className="bg-slate-800">
                        Select Model
                      </option>
                      {isValidCarMake(newCustomer.vehicleMake) &&
                        carMakesModels[newCustomer.vehicleMake].map((model) => (
                          <option
                            key={model}
                            value={model}
                            className="bg-slate-800"
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
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    >
                      <option value="" className="bg-slate-800">
                        Select Year
                      </option>
                      {carYears.map((year) => (
                        <option
                          key={year}
                          value={year}
                          className="bg-slate-800"
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
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    >
                      <option value="" className="bg-slate-800">
                        Select Color
                      </option>
                      {carColors.map((color) => (
                        <option
                          key={color}
                          value={color}
                          className="bg-slate-800"
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
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 uppercase"
                      placeholder="Vehicle Identification Number"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
                <button
                  onClick={() => setShowAddCustomer(false)}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
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
          <div className="bg-slate-800 rounded-lg shadow-2xl max-w-md w-full border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
              <h2 className="text-xl font-bold flex items-center text-white">
                <Wrench className="h-5 w-5 mr-2 text-emerald-400" />
                Add Labor Charge
              </h2>
              <button
                onClick={() => setShowAddLabor(false)}
                className="text-slate-400 hover:text-white transition-colors"
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
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
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
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
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
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
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
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                />
              </div>
              <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                <p className="text-sm text-slate-300">
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
                <p className="text-xs text-slate-400 mt-1">
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
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLabor}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
                >
                  Add Labor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* Invoice Print Modal */}
{showInvoice && invoiceData && user?.outletId && invoiceCustomer && (
  <>
    <InvoicePrint
      invoice={invoiceData}
      outletId={user.outletId} // Direct string, not ._id
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
