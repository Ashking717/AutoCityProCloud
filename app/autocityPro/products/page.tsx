"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  Car,
  X,
  Filter,
  Eye,
  Tag,
  FileDown,
  ChevronLeft,
  Menu,
  MoreVertical,
  ChevronDown,
  AlertCircle,
  TrendingDown,
  Zap,
  Box,
} from "lucide-react";
import { CarMake, carMakesModels } from "@/lib/data/carData";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isVehicle, setIsVehicle] = useState(false);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMake, setFilterMake] = useState("");
  const [filterIsVehicle, setFilterIsVehicle] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Mobile states
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
  // Quick Add Category
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<{
    name: string;
    description: string;
    categoryId: string;
    barcode: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    taxRate: number;
    currentStock: number;
    minStock: number;
    maxStock: number;
    carMake: CarMake | "";
    carModel: string;
    variant: string;
    year: string;
    partNumber: string;
    color: string;
  }>({
    name: "",
    description: "",
    categoryId: "",
    barcode: "",
    unit: "pcs",
    costPrice: 0,
    sellingPrice: 0,
    taxRate: 0,
    currentStock: 0,
    minStock: 0,
    maxStock: 1000,
    carMake: "",
    carModel: "",
    variant: "",
    year: "",
    partNumber: "",
    color: "",
  });

  // Common vehicle variants
  const vehicleVariants = [
    "Base", "LX", "EX", "Sport", "Limited", "Premium", "Touring", "SE", "LE", "XLE", 
    "SR", "TRD", "GT", "R/T", "SXT", "Gx", "Gxr", "Vx", "Vxr", "Vxs", "Twin turbo",
    "Platinium", "Lx470", "Lx570", "Lx600", "V8", "V6"
  ];

  // Common vehicle colors
  const vehicleColors = [
    "White", "Black", "Gray", "Silver", "Red", "Blue", "Green", "Brown", "Yellow",
    "Orange", "Purple", "Gold", "Beige", "Maroon", "Navy", "Burgundy", "Teal",
    "Champagne", "Bronze", "Pearl White", "Metallic Black", "Graphite Gray",
    "Midnight Blue", "Racing Red", "Forest Green"
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchUser();
        await fetchProducts();
        await fetchCategories();
      } finally {
        setUserLoading(false);
      }
    };

    loadData();
   
    // Check if mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
   
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
   
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/autocityPro/login");
    }
  }, [userLoading, user, router]);

  // Generate next SKU based on existing products
  const generateNextSKU = (): string => {
    if (products.length === 0) {
      return "10001";
    }
    const numericSKUs = products
      .map(p => p.sku)
      .filter((sku: string) => /^\d+$/.test(sku))
      .map((sku: string) => parseInt(sku, 10));
    if (numericSKUs.length === 0) {
      return "10001";
    }
    const maxSKU = Math.max(...numericSKUs);
    const nextSKU = Math.max(maxSKU + 1, 10001);
    return nextSKU.toString();
  };

  const fetchUser = async () => {
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
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else {
        toast.error("Failed to load products");
        setProducts([]);
      }
    } catch (error) {
      toast.error("Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      } else {
        toast.error("Failed to load categories");
      }
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

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
          productCount: 0
        };
        setCategories([...categories, newCategoryWithCount]);
        setNewProduct(prev => ({ ...prev, categoryId: data.category._id }));
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

  const handleAddProduct = async () => {
    if (!newProduct.name) {
      toast.error("Product name is required");
      return;
    }
    try {
      const generatedSKU = generateNextSKU();
      const productData: any = {
        name: newProduct.name,
        description: newProduct.description,
        categoryId: newProduct.categoryId || undefined,
        sku: generatedSKU,
        barcode: newProduct.barcode || undefined,
        unit: newProduct.unit,
        costPrice: parseFloat(newProduct.costPrice as any) || 0,
        sellingPrice: parseFloat(newProduct.sellingPrice as any) || 0,
        taxRate: parseFloat(newProduct.taxRate as any) || 0,
        currentStock: parseFloat(newProduct.currentStock as any) || 0,
        minStock: parseFloat(newProduct.minStock as any) || 0,
        maxStock: parseFloat(newProduct.maxStock as any) || 1000,
      };

      if (isVehicle && newProduct.carMake) {
        productData.carMake = newProduct.carMake;
        productData.carModel = newProduct.carModel;
        productData.variant = newProduct.variant;
        productData.year = newProduct.year;
        productData.partNumber = newProduct.partNumber;
        productData.color = newProduct.color;
        productData.isVehicle = true;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        toast.success(`Product added successfully! SKU: ${generatedSKU}`);
        setShowAddModal(false);
        resetNewProduct();
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add product");
      }
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;
    if (!editingProduct.name || !editingProduct.sku) {
      toast.error("Name and SKU are required");
      return;
    }
    try {
      const productData: any = {
        name: editingProduct.name,
        description: editingProduct.description,
        categoryId: editingProduct.categoryId || undefined,
        sku: editingProduct.sku.toUpperCase(),
        barcode: editingProduct.barcode || undefined,
        unit: editingProduct.unit,
        costPrice: parseFloat(editingProduct.costPrice as any) || 0,
        sellingPrice: parseFloat(editingProduct.sellingPrice as any) || 0,
        taxRate: parseFloat(editingProduct.taxRate as any) || 0,
        currentStock: parseFloat(editingProduct.currentStock as any) || 0,
        minStock: parseFloat(editingProduct.minStock as any) || 0,
        maxStock: parseFloat(editingProduct.maxStock as any) || 1000,
      };

      if (editingProduct.isVehicle && editingProduct.carMake) {
        productData.carMake = editingProduct.carMake;
        productData.carModel = editingProduct.carModel;
        productData.variant = editingProduct.variant;
        productData.year = editingProduct.year;
        productData.partNumber = editingProduct.partNumber;
        productData.color = editingProduct.color;
        productData.isVehicle = true;
      } else {
        productData.isVehicle = false;
      }

      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        toast.success("Product updated successfully!");
        setShowEditModal(false);
        setEditingProduct(null);
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update product");
      }
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Product deleted successfully!");
        setProductToDelete(null);
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct({
      ...product,
      categoryId: product.category?._id || "",
      costPrice: product.costPrice || 0,
      sellingPrice: product.sellingPrice || 0,
      taxRate: product.taxRate || 0,
      currentStock: product.currentStock || 0,
      minStock: product.minStock || 0,
      maxStock: product.maxStock || 1000,
      variant: product.variant || "",
      color: product.color || "",
    });
    setIsVehicle(product.isVehicle || false);
    setShowEditModal(true);
  };

  const resetNewProduct = () => {
    setNewProduct({
      name: "",
      description: "",
      categoryId: "",
      barcode: "",
      unit: "pcs",
      costPrice: 0,
      sellingPrice: 0,
      taxRate: 0,
      currentStock: 0,
      minStock: 0,
      maxStock: 1000,
      carMake: "",
      carModel: "",
      variant: "",
      year: "",
      partNumber: "",
      color: "",
    });
    setIsVehicle(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm) ||
      p.carMake?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.carModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.color?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || p.category?._id === filterCategory;
    const matchesMake = !filterMake || p.carMake === filterMake;
    const matchesVehicleType =
      filterIsVehicle === "all" ||
      (filterIsVehicle === "vehicle" && p.isVehicle) ||
      (filterIsVehicle === "non-vehicle" && !p.isVehicle);
    return matchesSearch && matchesCategory && matchesMake && matchesVehicleType;
  });

  const availableMakes = [
    ...new Set(products.filter((p) => p.carMake).map((p) => p.carMake)),
  ].sort();

  const clearFilters = () => {
    setFilterCategory("");
    setFilterMake("");
    setFilterIsVehicle("all");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const downloadProductsCSV = () => {
    if (filteredProducts.length === 0) {
      toast.error("No products to export");
      return;
    }
    const headers = [
      "SKU", "Name", "Category", "Barcode", "Selling Price", "Current Stock",
      "Car Make", "Car Model", "Variant", "Year", "Part Number", "Color"
    ];
    const rows = filteredProducts.map(product => [
      product.sku || "",
      product.name || "",
      product.category?.name || "",
      product.barcode || "",
      product.sellingPrice || 0,
      product.currentStock || 0,
      product.carMake || "",
      product.carModel || "",
      product.variant || "",
      product.year || "",
      product.partNumber || "",
      product.color || ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",")
      )
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredProducts.length} products to CSV`);
  };

  // Calculate stats for dynamic island
  const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStock || 0)).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.sellingPrice || 0) * (p.currentStock || 0)), 0);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/10 border-t-[#E84545] mx-auto"></div>
          <p className="mt-4 text-white text-lg font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Box className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{products.length}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span className="text-white text-xs font-medium">QR{(totalValue / 1000).toFixed(0)}K</span>
                </div>
                {lowStockCount > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">{lowStockCount}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header - Compact */}
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
                  <h1 className="text-xl font-bold text-white">Products</h1>
                  <p className="text-xs text-white/60">{filteredProducts.length} items</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>

            {/* Quick Stats - Mobile */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Total</p>
                <p className="text-sm font-bold text-white">{products.length}</p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Value</p>
                <p className="text-sm font-bold text-green-400">QR{(totalValue / 1000).toFixed(0)}K</p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-lg p-2 border border-white/5">
                <p className="text-[10px] text-gray-400">Low Stock</p>
                <p className={`text-sm font-bold ${lowStockCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {lowStockCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Products</h1>
                <p className="text-white/80 mt-1">
                  {filteredProducts.length} products
                  {(filterCategory || filterMake || filterIsVehicle !== "all") &&
                    ` (filtered from ${products.length})`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={downloadProductsCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  <FileDown className="h-5 w-5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white text-[#E84545] rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className='px-4 md:px-6 pt-[220px] md:pt-6 pb-6 bg-[#050505]'>
          {/* Search and Filters - Desktop */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#E84545]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, barcode, make, model, variant, or color..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border border-white/10 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-[#E84545]/20 backdrop-blur-sm text-white border-[#E84545]/30"
                    : "hover:bg-white/5 text-white"
                }`}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                  <span className="ml-2 px-2 py-0.5 bg-[#E84545] text-white text-xs rounded-full">
                    {[filterCategory, filterMake, filterIsVehicle !== "all"].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Options - Desktop */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    value={filterIsVehicle}
                    onChange={(e) => setFilterIsVehicle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="all" className="text-[#050505]">All Products</option>
                    <option value="vehicle" className="text-[#050505]">Vehicles/Parts Only</option>
                    <option value="non-vehicle" className="text-[#050505]">Non-Vehicle Products</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="" className="text-[#050505]">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id} className="text-[#050505]">
                        {cat.name} ({cat.productCount})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Car Make</label>
                  <select
                    value={filterMake}
                    onChange={(e) => setFilterMake(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="" className="text-[#050505]">All Makes</option>
                    {availableMakes.map((make) => (
                      <option key={make} value={make} className="text-[#050505]">{make}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-[#E84545]/10 backdrop-blur-sm border border-[#E84545]/30 rounded-lg hover:bg-[#E84545]/20 text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Filter Modal */}
          {showFilters && (
            <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={filterIsVehicle}
                      onChange={(e) => setFilterIsVehicle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="all" className="text-[#050505]">All Products</option>
                      <option value="vehicle" className="text-[#050505]">Vehicles Only</option>
                      <option value="non-vehicle" className="text-[#050505]">Non-Vehicle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="" className="text-[#050505]">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="text-[#050505]">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Car Make</label>
                    <select
                      value={filterMake}
                      onChange={(e) => setFilterMake(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="" className="text-[#050505]">All Makes</option>
                      {availableMakes.map((make) => (
                        <option key={make} value={make} className="text-[#050505]">{make}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={clearFilters}
                      className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors active:scale-95"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-xl overflow-hidden border border-white/10">
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5 md:table hidden">
                <thead className="bg-[#050505]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle Info</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"></div>
                        </div>
                        <p className="mt-2">Loading products...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No products found</p>
                        {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                          <button
                            onClick={clearFilters}
                            className="mt-2 text-[#E84545] hover:text-[#cc3c3c] text-sm transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {product.isVehicle && (
                              <Car className="h-4 w-4 mr-2 text-[#E84545] flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">{product.name}</p>
                              {product.partNumber && (
                                <p className="text-xs text-gray-500">Part#: {product.partNumber}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{product.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{product.category?.name || "N/A"}</td>
                        <td className="px-6 py-4 text-sm">
                          {product.carMake ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-gray-300 font-medium">
                                <Car className="h-3 w-3 mr-1 text-[#E84545] flex-shrink-0" />
                                <span>{product.carMake}</span>
                              </div>
                              {product.carModel && (
                                <div className="text-gray-400 text-xs pl-4">
                                  Model: {product.carModel}
                                  {product.variant && ` (${product.variant})`}
                                </div>
                              )}
                              {product.year && (
                                <div className="text-gray-500 text-xs pl-4">Year: {product.year}</div>
                              )}
                              {product.color && (
                                <div className="text-gray-500 text-xs pl-4">Color: {product.color}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              {product.isVehicle ? "Vehicle (no details)" : "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span
                            className={`${
                              (product.currentStock || 0) <= (product.minStock || 0)
                                ? "text-red-400 font-semibold"
                                : "text-gray-300"
                            }`}
                          >
                            {product.currentStock || 0}
                          </span>
                          <div className="text-xs text-gray-500">Min: {product.minStock || 0}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-white">
                          QAR {product.sellingPrice || 0}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => router.push(`/autocityPro/products/${product._id}`)}
                              className="text-blue-400 hover:text-blue-300 p-2 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-[#E84545] hover:text-[#cc3c3c] p-2 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(product)}
                              className="text-red-400 hover:text-red-300 p-2 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-white/5">
                {loading ? (
                  <div className="p-6 text-center text-gray-400">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E84545] border-t-transparent"></div>
                    </div>
                    <p className="mt-2 text-sm">Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">No products found</p>
                    {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-[#E84545] hover:text-[#cc3c3c] text-sm transition-colors active:scale-95"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className="p-4 hover:bg-white/2 transition-all active:bg-white/5"
                      onClick={() => router.push(`/autocityPro/products/${product._id}`)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {product.isVehicle && (
                            <Car className="h-4 w-4 text-[#E84545] flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <span className="font-mono">{product.sku}</span>
                              {product.category?.name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{product.category.name}</span>
                                </>
                              )}
                            </div>
                            {product.partNumber && (
                              <p className="text-xs text-gray-500 mt-1">Part#: {product.partNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <span
                            className={`text-sm font-bold ${
                              (product.currentStock || 0) <= (product.minStock || 0)
                                ? "text-red-400"
                                : "text-gray-300"
                            }`}
                          >
                            {product.currentStock || 0}
                          </span>
                          <div className="text-xs text-gray-500">Min: {product.minStock || 0}</div>
                        </div>
                      </div>

                      {product.carMake && (
                        <div className="mb-3 p-2 bg-[#0A0A0A]/50 rounded-lg border border-white/5">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center text-gray-300 font-medium">
                              <Car className="h-3 w-3 mr-1 text-[#E84545]" />
                              <span>{product.carMake}</span>
                              {product.carModel && <span className="ml-1">• {product.carModel}</span>}
                            </div>
                            {product.variant && (
                              <div className="text-gray-400 pl-4">Variant: {product.variant}</div>
                            )}
                            <div className="flex gap-3 text-gray-500 pl-4">
                              {product.year && <span>Year: {product.year}</span>}
                              {product.color && <span>Color: {product.color}</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white">QAR {product.sellingPrice || 0}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(product);
                            }}
                            className="p-2 rounded-lg bg-[#E84545]/10 text-[#E84545] hover:bg-[#E84545]/20 active:scale-95 transition-all"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product);
                            }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
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
                  setShowAddModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-2xl text-white font-semibold hover:from-[#d63d3d] hover:to-[#b53535] transition-all flex items-center justify-between shadow-lg active:scale-95"
              >
                <span>Add Product</span>
                <Plus className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => {
                  downloadProductsCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => {
                  setShowFilters(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Filters</span>
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-white/10 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5 sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">Add New Product</h2>
                <p className="text-xs md:text-sm text-gray-400 mt-1">
                  SKU: {generateNextSKU()}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewProduct();
                }}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    placeholder="Product name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    placeholder="Product description"
                  />
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="text-[#050505]">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowQuickAddCategory(true)}
                      className="px-3 py-2 bg-[#E84545]/10 border border-[#E84545]/30 rounded-lg hover:bg-[#E84545]/20 transition-colors text-white active:scale-95"
                      title="Quick Add Category"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    placeholder="Barcode"
                  />
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Unit</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  >
                    <option value="pcs" className="text-[#050505]">Pieces</option>
                    <option value="kg" className="text-[#050505]">Kilogram</option>
                    <option value="liter" className="text-[#050505]">Liter</option>
                    <option value="meter" className="text-[#050505]">Meter</option>
                    <option value="box" className="text-[#050505]">Box</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Toggle */}
              <div className="flex items-center space-x-2 p-3 bg-[#E84545]/10 rounded-xl border border-[#E84545]/20">
                <input
                  type="checkbox"
                  id="isVehicle"
                  checked={isVehicle}
                  onChange={(e) => setIsVehicle(e.target.checked)}
                  className="h-4 w-4 text-[#E84545]"
                />
                <label
                  htmlFor="isVehicle"
                  className="text-xs md:text-sm font-medium text-white flex items-center cursor-pointer"
                >
                  <Car className="h-4 w-4 mr-2 text-[#E84545]" />
                  This is a vehicle or vehicle part
                </label>
              </div>

              {/* Vehicle Details */}
              {isVehicle && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#E84545]/5 rounded-xl border border-[#E84545]/10">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Make *</label>
                    <select
                      value={newProduct.carMake}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          carMake: e.target.value as CarMake | "",
                          carModel: "",
                        })
                      }
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Make</option>
                      {Object.keys(carMakesModels).map((make) => (
                        <option key={make} value={make} className="text-[#050505]">
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Model</label>
                    <select
                      value={newProduct.carModel}
                      onChange={(e) => setNewProduct({ ...newProduct, carModel: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      disabled={!newProduct.carMake}
                    >
                      <option value="" className="text-[#050505]">Select Model</option>
                      {newProduct.carMake &&
                        carMakesModels[newProduct.carMake]?.map((model: string) => (
                          <option key={model} value={model} className="text-[#050505]">
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Variant</label>
                    <select
                      value={newProduct.variant}
                      onChange={(e) => setNewProduct({ ...newProduct, variant: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Variant</option>
                      {vehicleVariants.map((variant) => (
                        <option key={variant} value={variant} className="text-[#050505]">
                          {variant}
                        </option>
                      ))}
                      <option value="custom" className="text-[#050505]">Custom...</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Color</label>
                    <select
                      value={newProduct.color}
                      onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Color</option>
                      {vehicleColors.map((color) => (
                        <option key={color} value={color} className="text-[#050505]">
                          {color}
                        </option>
                      ))}
                      <option value="custom" className="text-[#050505]">Custom...</option>
                    </select>
                  </div>

                  {newProduct.variant === "custom" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                        Custom Variant
                      </label>
                      <input
                        type="text"
                        value={newProduct.variant === "custom" ? "" : newProduct.variant}
                        onChange={(e) => setNewProduct({ ...newProduct, variant: e.target.value })}
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        placeholder="Enter custom variant"
                      />
                    </div>
                  )}

                  {newProduct.color === "custom" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                        Custom Color
                      </label>
                      <input
                        type="text"
                        value={newProduct.color === "custom" ? "" : newProduct.color}
                        onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        placeholder="Enter custom color"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Year</label>
                    <input
                      type="text"
                      value={newProduct.year}
                      onChange={(e) => setNewProduct({ ...newProduct, year: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      placeholder="e.g., 2024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={newProduct.partNumber}
                      onChange={(e) => setNewProduct({ ...newProduct, partNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      placeholder="Part number"
                    />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={newProduct.taxRate}
                    onChange={(e) => setNewProduct({ ...newProduct, taxRate: parseFloat(e.target.value) })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.currentStock}
                    onChange={(e) => setNewProduct({ ...newProduct, currentStock: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.maxStock}
                    onChange={(e) => setNewProduct({ ...newProduct, maxStock: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 md:px-6 py-4 border-t border-white/5 sticky bottom-0 bg-[#050505]/95 backdrop-blur-sm">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewProduct();
                }}
                className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-white/10 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5 sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10">
              <h2 className="text-lg md:text-xl font-bold text-white">Edit Product</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editingProduct.categoryId}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="text-[#050505]">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowQuickAddCategory(true)}
                      className="px-3 py-2 bg-[#E84545]/10 border border-[#E84545]/30 rounded-lg hover:bg-[#E84545]/20 transition-colors text-white active:scale-95"
                      title="Quick Add Category"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">SKU *</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Unit</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  >
                    <option value="pcs" className="text-[#050505]">Pieces</option>
                    <option value="kg" className="text-[#050505]">Kilogram</option>
                    <option value="liter" className="text-[#050505]">Liter</option>
                    <option value="meter" className="text-[#050505]">Meter</option>
                    <option value="box" className="text-[#050505]">Box</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Toggle for Edit */}
              <div className="flex items-center space-x-2 p-3 bg-[#E84545]/10 rounded-xl border border-[#E84545]/20">
                <input
                  type="checkbox"
                  id="editIsVehicle"
                  checked={isVehicle}
                  onChange={(e) => setIsVehicle(e.target.checked)}
                  className="h-4 w-4 text-[#E84545]"
                />
                <label
                  htmlFor="editIsVehicle"
                  className="text-xs md:text-sm font-medium text-white flex items-center cursor-pointer"
                >
                  <Car className="h-4 w-4 mr-2 text-[#E84545]" />
                  This is a vehicle or vehicle part
                </label>
              </div>

              {/* Vehicle Details for Edit */}
              {isVehicle && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#E84545]/5 rounded-xl border border-[#E84545]/10">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Make *</label>
                    <select
                      value={editingProduct.carMake}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          carMake: e.target.value as CarMake | "",
                          carModel: "",
                        })
                      }
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Make</option>
                      {Object.keys(carMakesModels).map((make) => (
                        <option key={make} value={make} className="text-[#050505]">
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Model</label>
                    <select
                      value={editingProduct.carModel}
                      onChange={(e) => setEditingProduct({ ...editingProduct, carModel: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      disabled={!editingProduct.carMake}
                    >
                      <option value="" className="text-[#050505]">Select Model</option>
                      {editingProduct.carMake &&
                        carMakesModels[editingProduct.carMake as CarMake]?.map((model: string) => (
                          <option key={model} value={model} className="text-[#050505]">
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Variant</label>
                    <select
                      value={editingProduct.variant}
                      onChange={(e) => setEditingProduct({ ...editingProduct, variant: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Variant</option>
                      {vehicleVariants.map((variant) => (
                        <option key={variant} value={variant} className="text-[#050505]">
                          {variant}
                        </option>
                      ))}
                      <option value="custom" className="text-[#050505]">Custom...</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Color</label>
                    <select
                      value={editingProduct.color}
                      onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                    >
                      <option value="" className="text-[#050505]">Select Color</option>
                      {vehicleColors.map((color) => (
                        <option key={color} value={color} className="text-[#050505]">
                          {color}
                        </option>
                      ))}
                      <option value="custom" className="text-[#050505]">Custom...</option>
                    </select>
                  </div>

                  {editingProduct.variant === "custom" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                        Custom Variant
                      </label>
                      <input
                        type="text"
                        value={editingProduct.variant === "custom" ? "" : editingProduct.variant}
                        onChange={(e) => setEditingProduct({ ...editingProduct, variant: e.target.value })}
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        placeholder="Enter custom variant"
                      />
                    </div>
                  )}

                  {editingProduct.color === "custom" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                        Custom Color
                      </label>
                      <input
                        type="text"
                        value={editingProduct.color === "custom" ? "" : editingProduct.color}
                        onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                        className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                        placeholder="Enter custom color"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">Year</label>
                    <input
                      type="text"
                      value={editingProduct.year}
                      onChange={(e) => setEditingProduct({ ...editingProduct, year: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      placeholder="e.g., 2024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={editingProduct.partNumber}
                      onChange={(e) => setEditingProduct({ ...editingProduct, partNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                      placeholder="Part number"
                    />
                  </div>
                </div>
              )}

              {/* Pricing for Edit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.taxRate}
                    onChange={(e) => setEditingProduct({ ...editingProduct, taxRate: parseFloat(e.target.value) })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock for Edit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.currentStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, currentStock: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.maxStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, maxStock: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 md:px-6 py-4 border-t border-white/5 sticky bottom-0 bg-[#050505]/95 backdrop-blur-sm">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleEditProduct}
                className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
              >
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showQuickAddCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#E84545]" />
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
                      if (e.key === 'Enter') {
                        handleQuickAddCategory();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This will create a new category and automatically select it
                  </p>
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

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="p-4 md:p-6">
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
                    <strong className="text-white">{productToDelete.name}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setProductToDelete(null)}
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
      
      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-6"></div>

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