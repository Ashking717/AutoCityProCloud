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
} from "lucide-react";
import { carMakesModels, carColors, carYears } from "@/lib/data/carData";
import toast from "react-hot-toast";

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

  // Quick customer creation
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
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
    fetchCustomers();
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
          ...newCustomer,
          code,
          address: {
            street: newCustomer.address,
            city: "",
            state: "",
            country: "",
            postalCode: "",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Customer added!");
        setCustomers([...customers, data.customer]);
        setSelectedCustomer(data.customer);
        setShowAddCustomer(false);
        setNewCustomer({ name: "", phone: "", email: "", address: "" });
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
      isLabor: true, // ✅ Make sure this is set to true
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
        isLabor: false, // ✅ Add this for regular products
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

    // Overall discount
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

    const totals = calculateTotals();

    // Prepare sale items for the API - FIXED VERSION
    const saleItems = cart.map((item) => {
      if (item.isLabor) {
        return {
          // Don't include productId at all for labor items
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
    console.log("Sending sale items:", JSON.stringify(saleItems, null, 2)); // Debug log

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

        // Reset form
        setCart([]);
        setSelectedCustomer(null);
        setPayments([{ method: "cash", amount: 0 }]);
        setOverallDiscount(0);

        // Refresh products to update stock
        fetchProducts();
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

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm) ||
      p.vin?.includes(searchTerm)
  );

  const totals = calculateTotals();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">New Sale</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, SKU, barcode, or VIN..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowAddLabor(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                >
                  <Wrench className="h-5 w-5" />
                  <span>Add Labor</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-600 hover:shadow-md cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          SKU: {product.sku}
                        </p>
                        {product.isVehicle && (
                          <div className="flex items-center mt-1">
                            <Car className="h-4 w-4 text-purple-600 mr-1" />
                            <span className="text-xs text-purple-600">
                              {product.carMake} {product.carModel}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">
                          QAR {product.sellingPrice}
                        </p>
                        <p className="text-xs text-gray-500">
                          Stock: {product.currentStock}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({cart.length} items)
              </h2>

              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold flex items-center">
                          {item.isLabor && (
                            <Wrench className="h-4 w-4 mr-2 text-green-600" />
                          )}
                          {item.productName}
                        </h3>
                        {item.isVehicle && (
                          <p className="text-sm text-gray-600">
                            {item.carMake} {item.carModel} {item.year} -{" "}
                            {item.color}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    {!item.isLabor && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
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
                          className="px-2 py-1 border rounded text-sm"
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
                          className="px-2 py-1 border rounded text-sm"
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
                          className="px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    )}

                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-gray-600">
                        Total: QAR {item.total.toFixed(2)}
                      </span>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Customer</h2>
              <select
                value={selectedCustomer?._id || ""}
                onChange={(e) =>
                  setSelectedCustomer(
                    customers.find((c) => c._id === e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 mb-3"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg hover:border-purple-600 hover:bg-purple-50"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Add Customer</span>
              </button>
            </div>

            {/* Overall Discount */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Overall Discount</h2>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={overallDiscount}
                  onChange={(e) =>
                    setOverallDiscount(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  min="0"
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <select
                  value={overallDiscountType}
                  onChange={(e) =>
                    setOverallDiscountType(e.target.value as any)
                  }
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">QAR</option>
                </select>
              </div>
              {overallDiscount > 0 && (
                <p className="text-sm text-green-600">
                  Discount: QAR {totals.overallDiscountAmount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Payment</h2>

              {payments.map((payment, index) => (
                <div key={index} className="mb-4">
                  <select
                    value={payment.method}
                    onChange={(e) =>
                      updatePayment(index, "method", e.target.value)
                    }
                    className="w-full px-2 py-1 border rounded text-sm mb-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
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
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>QAR {totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Item Discount:</span>
                    <span className="text-red-600">
                      -QAR {totals.totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {totals.overallDiscountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overall Discount:</span>
                    <span className="text-red-600">
                      -QAR {totals.overallDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span>QAR {totals.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>QAR {totals.total.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Paid:</span>
                  <span>QAR {totals.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance:</span>
                  <span
                    className={
                      totals.total - totals.totalPaid > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }
                  >
                    QAR {(totals.total - totals.totalPaid).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0 || !selectedCustomer}
                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Quick Add Customer</h2>
              <button onClick={() => setShowAddCustomer(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Address
                </label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, address: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Customer address"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddCustomer(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-green-600" />
                Add Labor Charge
              </h2>
              <button onClick={() => setShowAddLabor(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Total:{" "}
                  <span className="font-bold text-gray-900">
                    QAR{" "}
                    {(
                      laborCharge.hours *
                      laborCharge.rate *
                      (1 + laborCharge.taxRate / 100)
                    ).toFixed(2)}
                  </span>
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddLabor(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLabor}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Labor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
