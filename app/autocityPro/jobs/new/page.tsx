// app/autocityPro/jobs/new/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search,
  Plus,
  Trash2,
  Car,
  User,
  Wrench,
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ChevronLeft,
  MoreVertical,
  UserCog,
} from "lucide-react";
import {
  carMakesModels,
  carColors,
  carYears,
  CarMake,
} from "@/lib/data/carData";
import toast from "react-hot-toast";

interface ICustomer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;
}

interface JobItem {
  productId?: string;
  productName: string;
  sku: string;
  isLabor?: boolean;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  actualPrice?: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
  notes?: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Job Data
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(
    null
  );
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [items, setItems] = useState<JobItem[]>([]);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [status, setStatus] = useState<"DRAFT" | "PENDING">("DRAFT");
  const [assignedTo, setAssignedTo] = useState("");
  const [estimatedStartDate, setEstimatedStartDate] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Vehicle Info (optional override from customer)
  const [vehicleInfo, setVehicleInfo] = useState({
    registrationNumber: "",
    make: "",
    model: "",
    year: "",
    color: "",
    vin: "",
    mileage: "",
  });

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // New Customer
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

  // Labor Charge
  const [laborCharge, setLaborCharge] = useState({
    description: "",
    hours: 1,
    notes: "",
  });

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchCustomers();
    fetchStaff();
  }, []);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Auto-populate vehicle info when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setVehicleInfo({
        registrationNumber:
          selectedCustomer.vehicleRegistrationNumber || "",
        make: selectedCustomer.vehicleMake || "",
        model: selectedCustomer.vehicleModel || "",
        year: selectedCustomer.vehicleYear?.toString() || "",
        color: selectedCustomer.vehicleColor || "",
        vin: selectedCustomer.vehicleVIN || "",
        mileage: "",
      });
    }
  }, [selectedCustomer]);

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
      const res = await fetch("/api/products?limit=100", {
        credentials: "include",
      });
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

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch staff");
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const code = newCustomer.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10) + Date.now().toString().slice(-4);

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

    const laborItem: JobItem = {
      productName: `Labor: ${laborCharge.description}`,
      sku: "LABOR",
      isLabor: true,
      unit: "hours",
      quantity: laborCharge.hours,
      estimatedPrice: 0, // Price will be set later when converting to sale
      discount: 0,
      discountType: "percentage",
      taxRate: 0,
      notes: laborCharge.notes,
    };

    setItems([...items, laborItem]);
    setShowAddLabor(false);
    setLaborCharge({ description: "", hours: 1, notes: "" });
    toast.success("Labor charge added!");
  };

  const addToItems = (product: any) => {
    const existingItem = items.find((item) => item.productId === product._id);

    if (existingItem) {
      updateItem(items.indexOf(existingItem), "quantity", existingItem.quantity + 1);
    } else {
      const newItem: JobItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        isLabor: false,
        unit: product.unit || "pcs",
        quantity: 1,
        estimatedPrice: product.sellingPrice,
        discount: 0,
        discountType: "percentage",
        taxRate: product.taxRate || 0,
      };
      setItems([...items, newItem]);
    }

    toast.success("Added to job");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("Removed from job");
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const itemTotal = item.estimatedPrice * item.quantity;
      subtotal += itemTotal;

      let itemDiscount = 0;
      if (item.discountType === "percentage") {
        itemDiscount = (itemTotal * item.discount) / 100;
      } else {
        itemDiscount = item.discount;
      }
      totalDiscount += itemDiscount;

      const itemAfterDiscount = itemTotal - itemDiscount;
      totalTax += (itemAfterDiscount * item.taxRate) / 100;
    });

    const total = subtotal - totalDiscount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total,
    };
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (!jobTitle.trim()) {
      toast.error("Please enter a job title");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item or labor charge");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          customerName: selectedCustomer.name,
          vehicleInfo: {
            registrationNumber: vehicleInfo.registrationNumber || undefined,
            make: vehicleInfo.make || undefined,
            model: vehicleInfo.model || undefined,
            year: vehicleInfo.year ? parseInt(vehicleInfo.year) : undefined,
            color: vehicleInfo.color || undefined,
            vin: vehicleInfo.vin || undefined,
            mileage: vehicleInfo.mileage ? parseInt(vehicleInfo.mileage) : undefined,
          },
          title: jobTitle,
          description: jobDescription || undefined,
          items: items.map((item) => ({
            productId: item.productId || undefined,
            name: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unit: item.unit,
            estimatedPrice: item.estimatedPrice,
            discount: item.discount,
            discountType: item.discountType,
            taxRate: item.taxRate,
            isLabor: item.isLabor || false,
            notes: item.notes || undefined,
          })),
          priority,
          status,
          assignedTo: assignedTo || undefined,
          estimatedStartDate: estimatedStartDate || undefined,
          estimatedCompletionDate: estimatedCompletionDate || undefined,
          internalNotes: internalNotes || undefined,
          customerNotes: customerNotes || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Job ${data.job.jobNumber} created successfully!`);
        router.push("/autocityPro/jobs");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create job");
      }
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.partNumber?.toLowerCase().includes(term)
    );
  });

  const totals = calculateTotals();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  function isValidCarMake(make: any): make is CarMake {
    return Object.keys(carMakesModels).includes(make);
  }

  const availableCarMakes = Object.keys(carMakesModels);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "LOW":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "URGENT":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
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
                <h1 className="text-xl font-bold text-white">New Job</h1>
                <p className="text-xs text-white/60">
                  {items.length} item{items.length !== 1 ? 's' : ''}
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
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                <p className="text-[10px] text-white/60 uppercase">Items</p>
                <p className="text-sm font-bold text-white">{items.length}</p>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                <p className="text-[10px] text-white/60 uppercase">Priority</p>
                <p className="text-sm font-bold text-white">{priority}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
        <div className="px-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 flex items-center">
                <Wrench className="h-6 w-6 mr-2" />
                Create New Job
              </h1>
              <p className="text-base text-white/90">
                Create a new service job or work order
              </p>
            </div>

            <div className="flex gap-5">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 text-center">
                <p className="text-sm text-white/80">Items</p>
                <p className="text-lg font-semibold text-white">
                  {items.length}
                </p>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 text-center">
                <p className="text-sm text-white/80">Priority</p>
                <p className="text-lg font-semibold text-white">
                  {priority}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-6 pt-[180px] md:pt-6 pb-24 bg-[#050505] min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Items & Search */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Title & Description */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#E84545]" />
                Job Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Oil Change & Brake Inspection"
                    className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Description (Optional)
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Additional details about the job..."
                    rows={3}
                    className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Product Search */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search parts by name, SKU..."
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>

                <button
                  onClick={() => setShowAddLabor(true)}
                  className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] whitespace-nowrap transition-all shadow-lg"
                >
                  <Wrench className="h-5 w-5" />
                  <span className="hidden md:inline">Add Labor</span>
                </button>
              </div>

              {/* Search Results */}
              {searchTerm && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-3">
                    {filteredProducts.length} product
                    {filteredProducts.length !== 1 ? "s" : ""} found
                  </p>

                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                        <p>No products found</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product._id}
                          onClick={() => addToItems(product)}
                          className="p-4 bg-[#111111] border border-white/5 rounded-lg hover:border-[#E84545]/50 hover:shadow-[#E84545]/20 hover:shadow-md cursor-pointer transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1">
                                SKU: {product.sku}
                                {product.partNumber &&
                                  ` | Part#: ${product.partNumber}`}
                              </p>
                            </div>
                            <div className="text-right ml-3">
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
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center text-white">
                <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />
                Job Items ({items.length})
              </h2>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                    <p>No items added yet</p>
                    <p className="text-sm mt-2">
                      Search for parts or add labor charges
                    </p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={index}
                      className="border border-white/5 rounded-lg p-3 md:p-4 bg-[#111111]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm md:text-base flex items-center">
                            {item.isLabor && (
                              <Wrench className="h-4 w-4 mr-2 text-[#E84545]" />
                            )}
                            {item.productName}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-[#E84545] hover:text-[#cc3c3c] transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 1
                            )
                          }
                          placeholder="Qty"
                          min="1"
                          className="px-2 md:px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545]"
                        />
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) =>
                            updateItem(index, "notes", e.target.value)
                          }
                          placeholder="Notes (optional)"
                          className="px-2 md:px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545]"
                        />
                      </div>

                      <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-gray-400">Quantity: {item.quantity} {item.unit}</span>
                        {item.notes && (
                          <span className="text-xs text-gray-500 italic truncate max-w-[200px]">{item.notes}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Customer & Settings */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Customer *</h2>

              <select
                value={selectedCustomer?._id || ""}
                onChange={(e) =>
                  setSelectedCustomer(
                    customers.find((c) => c._id === e.target.value) || null
                  )
                }
                className="w-full px-3 py-2 mb-3 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white text-sm md:text-base"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} - {customer.phone}
                    {customer.vehicleRegistrationNumber &&
                      ` - ${customer.vehicleRegistrationNumber}`}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="mb-3 p-3 bg-[#111111] rounded-lg border border-white/5">
                  <p className="text-white font-medium text-sm md:text-base">
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

              <button
                onClick={() => setShowAddCustomer(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border-2 border-dashed border-[#E84545]/50 text-[#E84545] rounded-lg hover:border-[#E84545] hover:bg-[#E84545]/10 transition-colors text-sm md:text-base"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Add Customer</span>
              </button>
            </div>

            {/* Vehicle Info */}
            {selectedCustomer && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                  <Car className="h-5 w-5 mr-2 text-[#E84545]" />
                  Vehicle Info
                </h2>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={vehicleInfo.registrationNumber}
                    onChange={(e) =>
                      setVehicleInfo({
                        ...vehicleInfo,
                        registrationNumber: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Registration Number"
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] text-sm uppercase"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={vehicleInfo.make}
                      onChange={(e) =>
                        setVehicleInfo({
                          ...vehicleInfo,
                          make: e.target.value,
                          model: "",
                        })
                      }
                      className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] text-sm"
                    >
                      <option value="">Make</option>
                      {availableCarMakes.map((make) => (
                        <option key={make} value={make}>
                          {make}
                        </option>
                      ))}
                    </select>

                    <select
                      value={vehicleInfo.model}
                      onChange={(e) =>
                        setVehicleInfo({
                          ...vehicleInfo,
                          model: e.target.value,
                        })
                      }
                      disabled={!vehicleInfo.make}
                      className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] disabled:opacity-50 text-sm"
                    >
                      <option value="">Model</option>
                      {isValidCarMake(vehicleInfo.make) &&
                        carMakesModels[vehicleInfo.make].map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={vehicleInfo.year}
                      onChange={(e) =>
                        setVehicleInfo({
                          ...vehicleInfo,
                          year: e.target.value,
                        })
                      }
                      className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] text-sm"
                    >
                      <option value="">Year</option>
                      {carYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={vehicleInfo.mileage}
                      onChange={(e) =>
                        setVehicleInfo({
                          ...vehicleInfo,
                          mileage: e.target.value,
                        })
                      }
                      placeholder="Mileage (km)"
                      className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Priority & Status */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white">
                Priority & Status
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Priority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          priority === p
                            ? getPriorityColor(p)
                            : "border-white/5 text-gray-400 hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStatus("DRAFT")}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        status === "DRAFT"
                          ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
                          : "border-white/5 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      DRAFT
                    </button>
                    <button
                      onClick={() => setStatus("PENDING")}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        status === "PENDING"
                          ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                          : "border-white/5 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      PENDING
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Assign Staff (Admin/Manager only) */}
            {isAdmin && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-[#E84545]/20 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-2 text-white flex items-center">
                  <UserCog className="h-5 w-5 mr-2 text-[#E84545]" />
                  Assign Staff
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  💡 Admin/Manager feature - Assign this job to a technician
                </p>

                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white text-sm"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName} ({s.role})
                    </option>
                  ))}
                </select>
                
                {staff.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ No staff members found
                  </p>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#E84545]" />
                Schedule
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Estimated Start
                  </label>
                  <input
                    type="date"
                    value={estimatedStartDate}
                    onChange={(e) => setEstimatedStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Estimated Completion
                  </label>
                  <input
                    type="date"
                    value={estimatedCompletionDate}
                    onChange={(e) =>
                      setEstimatedCompletionDate(e.target.value)
                    }
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !selectedCustomer ||
                  !jobTitle.trim() ||
                  items.length === 0
                }
                className="w-full py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg font-semibold hover:from-[#cc3c3c] hover:to-[#E84545] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
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
                    Creating Job...
                  </span>
                ) : (
                  "Create Job"
                )}
              </button>
              
              <p className="text-xs text-gray-400 mt-3 text-center">
                Job will be created with {items.length} item{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60]">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Quick Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400"
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
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between"
              >
                <span>Add Labor Charge</span>
                <Wrench className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setShowAddCustomer(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between"
              >
                <span>Add New Customer</span>
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] rounded-lg shadow-2xl max-w-2xl w-full my-8 border border-white/5 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#0A0A0A] z-10">
              <h2 className="text-xl font-bold text-white">
                Quick Add Customer
              </h2>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-white">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white"
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
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white"
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
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="border-t border-white/5 pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center text-white">
                  <Car className="h-4 w-4 mr-2 text-[#E84545]" />
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newCustomer.vehicleRegistrationNumber}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        vehicleRegistrationNumber: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Registration Number"
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white uppercase md:col-span-2"
                  />
                  <select
                    value={newCustomer.vehicleMake}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        vehicleMake: e.target.value,
                        vehicleModel: "",
                      })
                    }
                    className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white"
                  >
                    <option value="">Select Make</option>
                    {availableCarMakes.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newCustomer.vehicleModel}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        vehicleModel: e.target.value,
                      })
                    }
                    disabled={!newCustomer.vehicleMake}
                    className="px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white disabled:opacity-50"
                  >
                    <option value="">Select Model</option>
                    {isValidCarMake(newCustomer.vehicleMake) &&
                      carMakesModels[newCustomer.vehicleMake].map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddCustomer(false)}
                  className="px-4 py-2 border border-white/5 text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg"
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
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h2 className="text-xl font-bold flex items-center text-white">
                <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />
                Add Labor Charge
              </h2>
              <button
                onClick={() => setShowAddLabor(false)}
                className="text-gray-400 hover:text-white"
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
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Hours/Quantity
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
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Notes
                </label>
                <textarea
                  value={laborCharge.notes}
                  onChange={(e) =>
                    setLaborCharge({
                      ...laborCharge,
                      notes: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Additional details about the work..."
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddLabor(false)}
                  className="px-4 py-2 border border-white/5 text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLabor}
                  className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg"
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