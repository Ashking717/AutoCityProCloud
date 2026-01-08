// app/autocityPro/purchases/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { Search, Plus, Trash2, ShoppingCart, X } from "lucide-react";
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

export default function NewPurchasePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState<number>(0);

  const [showAddSupplier, setShowAddSupplier] = useState(false);
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

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchSuppliers();
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
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplierId: selectedSupplier._id,
          supplierName: selectedSupplier.name,
          items: purchaseItems,
          paymentMethod: paymentMethod,
          amountPaid: amountPaid,
          notes: "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Purchase ${data.purchase.purchaseNumber} created successfully!`);
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

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border border-cyan-500/30 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjOUM5MkFDIiBmaWxsLW9wYWNpdHk9IjAuMDUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjMiLz48Y2lyY2xlIGN4PSIxMyIgY3k9IjEzIiByPSIzIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        <div className="p-6 relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">New Purchase</h1>
              <p className="text-blue-100">Create a new purchase order</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white text-sm">Cart Items</p>
                <p className="text-white font-bold text-xl text-center">{cart.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white text-sm">Total</p>
                <p className="text-white font-bold text-xl text-center">QAR {totals.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-900 min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name, SKU, or barcode..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
              {searchTerm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto mt-4">
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
                        className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg hover:border-blue-500 hover:shadow-blue-900/20 hover:shadow-md cursor-pointer transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{product.name}</h3>
                            <p className="text-sm text-slate-400">SKU: {product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-300">QAR {product.costPrice || product.sellingPrice}</p>
                            <p className="text-xs text-slate-400">Stock: {product.currentStock}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-400" />
                Cart ({cart.length} items)
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p>Your cart is empty</p>
                    <p className="text-sm mt-2">Search and add products above</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="border border-slate-600 rounded-lg p-4 bg-slate-700/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{item.productName}</h3>
                          <p className="text-xs text-slate-400 mt-1">SKU: {item.sku}</p>
                        </div>
                        <button onClick={() => removeFromCart(index)} className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(item.productId, "quantity", parseFloat(e.target.value) || 1)}
                          placeholder="Qty"
                          min="1"
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateCartItem(item.productId, "unitPrice", parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                          min="0"
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateCartItem(item.productId, "taxRate", parseFloat(e.target.value) || 0)}
                          placeholder="Tax %"
                          min="0"
                          max="100"
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="px-3 py-2 bg-slate-600/50 rounded text-sm text-white flex items-center justify-center">{item.unit}</div>
                      </div>
                      <div className="mt-3 flex justify-between items-center text-sm">
                        <div className="text-slate-300">
                          {item.taxRate > 0 && <span className="text-xs text-slate-500 mr-2">Tax: QAR {item.taxAmount.toFixed(2)}</span>}
                          <span>Total:</span>
                        </div>
                        <span className="font-bold text-white">QAR {item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Supplier</h2>
              <div className="mb-3">
                <select
                  value={selectedSupplier?._id || ""}
                  onChange={(e) => setSelectedSupplier(suppliers.find((s) => s._id === e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="" className="bg-slate-800">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id} className="bg-slate-800">
                      {supplier.name} - {supplier.phone}
                    </option>
                  ))}
                </select>
                {selectedSupplier && (
                  <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                    <p className="text-white font-medium">{selectedSupplier.name}</p>
                    <p className="text-sm text-slate-400">{selectedSupplier.phone}</p>
                    {selectedSupplier.email && <p className="text-xs text-slate-400 mt-1">{selectedSupplier.email}</p>}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAddSupplier(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-3 border-2 border-dashed border-blue-500/50 text-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-900/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Add Supplier</span>
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Payment</h2>
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 mb-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash" className="bg-slate-800">Cash</option>
                  <option value="card" className="bg-slate-800">Card</option>
                  <option value="bank_transfer" className="bg-slate-800">Bank Transfer</option>
                  <option value="credit" className="bg-slate-800">Credit</option>
                </select>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="text-white">QAR {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Tax:</span>
                  <span className="text-white">QAR {totals.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-t border-slate-600 font-bold text-lg">
                  <span className="text-white">Total:</span>
                  <span className="text-white">QAR {totals.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-600 pt-4">
                  <span className="text-slate-400">Paid:</span>
                  <span className="text-white">QAR {totals.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-300">Balance:</span>
                  <span className={totals.total - totals.totalPaid > 0 ? "text-red-400" : "text-emerald-400"}>
                    QAR {(totals.total - totals.totalPaid).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0 || !selectedSupplier}
                className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-900/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Complete Purchase"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full my-8 border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
              <h2 className="text-xl font-bold text-white">Quick Add Supplier</h2>
              <button onClick={() => setShowAddSupplier(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-white">Supplier Name *</label>
                  <input
                    type="text"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Phone *</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Tax Number</label>
                  <input
                    type="text"
                    value={newSupplier.taxNumber}
                    onChange={(e) => setNewSupplier({ ...newSupplier, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Tax ID"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-white">Address</label>
                  <textarea
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Supplier address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Credit Limit (QAR)</label>
                  <input
                    type="number"
                    value={newSupplier.creditLimit}
                    onChange={(e) => setNewSupplier({ ...newSupplier, creditLimit: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Payment Terms</label>
                  <input
                    type="text"
                    value={newSupplier.paymentTerms}
                    onChange={(e) => setNewSupplier({ ...newSupplier, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="e.g., Net 30"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(false)}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSupplier}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
                >
                  Add Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}