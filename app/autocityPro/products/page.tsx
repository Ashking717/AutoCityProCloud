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
} from "lucide-react";
import { CarMake, carMakesModels } from "@/lib/data/carData";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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

  // Quick Add Category
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [newProduct, setNewProduct] = useState<{
    name: string;
    description: string;
    categoryId: string;
    sku: string;
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
    sku: "",
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
    "Base",
    "LX",
    "EX",
    "Sport",
    "Limited",
    "Premium",
    "Touring",
    "SE",
    "LE",
    "XLE",
    "SR",
    "TRD",
    "GT",
    "R/T",
    "SXT",
    "Gx",
    "Gxr",
    "Vx",
    "Vxr",
    "Vxs",
    "Twin turbo",
    "Platinium",
    "Lx470",
    "Lx570",
    "Lx600",
    "V8",
    "V6"
  ];

  // Common vehicle colors
  const vehicleColors = [
    "White",
    "Black",
    "Gray",
    "Silver",
    "Red",
    "Blue",
    "Green",
    "Brown",
    "Yellow",
    "Orange",
    "Purple",
    "Gold",
    "Beige",
    "Maroon",
    "Navy",
    "Burgundy",
    "Teal",
    "Champagne",
    "Bronze",
    "Pearl White",
    "Metallic Black",
    "Graphite Gray",
    "Midnight Blue",
    "Racing Red",
    "Forest Green"
  ];

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchCategories();
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
      setLoading(true);
      const res = await fetch("/api/products", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products");
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
      }
    } catch (error) {
      console.error("Failed to fetch categories");
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
        
        // Add the new category to the list
        const newCategoryWithCount = {
          ...data.category,
          productCount: 0
        };
        
        setCategories([...categories, newCategoryWithCount]);
        
        // Set the new category as selected in the product form
        setNewProduct(prev => ({ ...prev, categoryId: data.category._id }));
        
        // Reset and close
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
    if (!newProduct.name || !newProduct.sku) {
      toast.error("Name and SKU are required");
      return;
    }

    try {
      const productData: any = {
        name: newProduct.name,
        description: newProduct.description,
        categoryId: newProduct.categoryId || undefined,
        sku: newProduct.sku.toUpperCase(),
        barcode: newProduct.barcode || undefined,
        unit: newProduct.unit,
        costPrice: parseFloat(newProduct.costPrice as any) || 0,
        sellingPrice: parseFloat(newProduct.sellingPrice as any) || 0,
        taxRate: parseFloat(newProduct.taxRate as any) || 0,
        currentStock: parseFloat(newProduct.currentStock as any) || 0,
        minStock: parseFloat(newProduct.minStock as any) || 0,
        maxStock: parseFloat(newProduct.maxStock as any) || 1000,
      };

      // Add vehicle fields if it's a vehicle
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
        toast.success("Product added successfully!");
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

      // Add vehicle fields if it's a vehicle
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
        productData.carMake = undefined;
        productData.carModel = undefined;
        productData.variant = undefined;
        productData.year = undefined;
        productData.partNumber = undefined;
        productData.color = undefined;
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
      sku: "",
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

    const matchesCategory =
      !filterCategory || p.category?._id === filterCategory;
    const matchesMake = !filterMake || p.carMake === filterMake;
    const matchesVehicleType =
      filterIsVehicle === "all" ||
      (filterIsVehicle === "vehicle" && p.isVehicle) ||
      (filterIsVehicle === "non-vehicle" && !p.isVehicle);

    return (
      matchesSearch && matchesCategory && matchesMake && matchesVehicleType
    );
  });

  // Get unique makes from products
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

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border border-purple-500/30 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Products</h1>
              <p className="text-purple-100 mt-1">
                {filteredProducts.length} products
                {(filterCategory || filterMake || filterIsVehicle !== "all") &&
                  ` (filtered from ${products.length})`}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className='p-6 bg-slate-900 border-b border-slate-700'>
        {/* Main Content */}
        <div className="p-8 bg-slate-800 min-h-screen">
          {/* Search and Filters in Header */}
          <div className="mt-2 space-y-4 mb-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, barcode, make, model, variant, or color..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent text-white placeholder-purple-200"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border border-white/30 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-white/20 backdrop-blur-sm text-white"
                    : "hover:bg-white/10 text-white"
                }`}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {(filterCategory || filterMake || filterIsVehicle !== "all") && (
                  <span className="ml-2 px-2 py-0.5 bg-white text-slate-800 text-xs rounded-full">
                    {
                      [
                        filterCategory,
                        filterMake,
                        filterIsVehicle !== "all",
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/20">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Type
                  </label>
                  <select
                    value={filterIsVehicle}
                    onChange={(e) => setFilterIsVehicle(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
                  >
                    <option value="all" className="text-slate-800">All Products</option>
                    <option value="vehicle" className="text-slate-800">Vehicles/Parts Only</option>
                    <option value="non-vehicle" className="text-slate-800">Non-Vehicle Products</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
                  >
                    <option value="" className="text-slate-800">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id} className="text-slate-800">
                        {cat.name} ({cat.productCount})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Car Make
                  </label>
                  <select
                    value={filterMake}
                    onChange={(e) => setFilterMake(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
                  >
                    <option value="" className="text-slate-800">All Makes</option>
                    {availableMakes.map((make) => (
                      <option key={make} value={make} className="text-slate-800">
                        {make}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Products Table */}
          <div className="bg-slate-900 rounded-lg shadow overflow-hidden border border-slate-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Vehicle Info
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        <Package className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                        <p>No products found</p>
                        {(filterCategory ||
                          filterMake ||
                          filterIsVehicle !== "all") && (
                          <button
                            onClick={clearFilters}
                            className="mt-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-750 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {product.isVehicle && (
                              <Car className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-100">
                                {product.name}
                              </p>
                              {product.partNumber && (
                                <p className="text-xs text-slate-400">
                                  Part#: {product.partNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-200">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {product.category?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {product.carMake ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-slate-200 font-medium">
                                <Car className="h-3 w-3 mr-1 text-purple-400 flex-shrink-0" />
                                <span>{product.carMake}</span>
                              </div>
                              {product.carModel && (
                                <div className="text-slate-400 text-xs pl-4">
                                  Model: {product.carModel}
                                  {product.variant &&
                                    ` (${product.variant})`}
                                </div>
                              )}
                              {product.year && (
                                <div className="text-slate-500 text-xs pl-4">
                                  Year: {product.year}
                                </div>
                              )}
                              {product.color && (
                                <div className="text-slate-500 text-xs pl-4">
                                  Color: {product.color}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">
                              {product.isVehicle ? "Vehicle (no details)" : "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span
                            className={`${
                              (product.currentStock || 0) <=
                              (product.minStock || 0)
                                ? "text-red-400 font-semibold"
                                : "text-slate-200"
                            }`}
                          >
                            {product.currentStock || 0}
                          </span>
                          <div className="text-xs text-slate-500">
                            Min: {product.minStock || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-slate-300">
                          QAR {product.costPrice?.toFixed(0) || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-100">
                          QAR {product.sellingPrice || 0}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/autocityPro/products/${product._id}`
                                )
                              }
                              className="text-blue-400 hover:text-blue-300 p-1 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-indigo-400 hover:text-indigo-300 p-1 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(product)}
                              className="text-red-400 hover:text-red-300 p-1 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full my-8 border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100">Add New Product</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewProduct();
                }}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Product name"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newProduct.categoryId}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          categoryId: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="text-slate-800">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowQuickAddCategory(true)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors text-slate-200"
                      title="Quick Add Category"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                    placeholder="SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, barcode: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Barcode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="pcs" className="text-slate-800">Pieces</option>
                    <option value="kg" className="text-slate-800">Kilogram</option>
                    <option value="liter" className="text-slate-800">Liter</option>
                    <option value="meter" className="text-slate-800">Meter</option>
                    <option value="box" className="text-slate-800">Box</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Toggle */}
              <div className="flex items-center space-x-2 p-3 bg-blue-900/30 rounded-lg border border-blue-800/50">
                <input
                  type="checkbox"
                  id="isVehicle"
                  checked={isVehicle}
                  onChange={(e) => setIsVehicle(e.target.checked)}
                  className="h-4 w-4 text-purple-600"
                />
                <label
                  htmlFor="isVehicle"
                  className="text-sm font-medium text-slate-300 flex items-center"
                >
                  <Car className="h-4 w-4 mr-2 text-blue-400" />
                  This is a vehicle or vehicle part
                </label>
              </div>

              {/* Vehicle Details */}
              {isVehicle && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Make *
                    </label>
                    <select
                      value={newProduct.carMake}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          carMake: e.target.value as CarMake | "",
                          carModel: "",
                          variant: "",
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Make</option>
                      {Object.keys(carMakesModels).map((make) => (
                        <option key={make} value={make} className="text-slate-800">
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Model
                    </label>
                    <select
                      value={newProduct.carModel}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          carModel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!newProduct.carMake}
                    >
                      <option value="" className="text-slate-800">Select Model</option>
                      {newProduct.carMake &&
                        carMakesModels[newProduct.carMake]?.map(
                          (model: string) => (
                            <option key={model} value={model} className="text-slate-800">
                              {model}
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Variant
                    </label>
                    <select
                      value={newProduct.variant}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          variant: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Variant</option>
                      {vehicleVariants.map((variant) => (
                        <option key={variant} value={variant} className="text-slate-800">
                          {variant}
                        </option>
                      ))}
                      <option value="custom" className="text-slate-800">Custom...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Color
                    </label>
                    <select
                      value={newProduct.color}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          color: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Color</option>
                      {vehicleColors.map((color) => (
                        <option key={color} value={color} className="text-slate-800">
                          {color}
                        </option>
                      ))}
                      <option value="custom" className="text-slate-800">Custom...</option>
                    </select>
                  </div>

                  {newProduct.variant === "custom" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Custom Variant
                      </label>
                      <input
                        type="text"
                        value={
                          newProduct.variant === "custom"
                            ? ""
                            : newProduct.variant
                        }
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            variant: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter custom variant"
                      />
                    </div>
                  )}

                  {newProduct.color === "custom" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Custom Color
                      </label>
                      <input
                        type="text"
                        value={
                          newProduct.color === "custom"
                            ? ""
                            : newProduct.color
                        }
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            color: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter custom color"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={newProduct.year}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, year: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={newProduct.partNumber}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          partNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Part number"
                    />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={newProduct.costPrice}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        costPrice: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    value={newProduct.sellingPrice}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        sellingPrice: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={newProduct.taxRate}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        taxRate: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.currentStock}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        currentStock: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        minStock: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    value={newProduct.maxStock}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        maxStock: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewProduct();
                }}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showQuickAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Quick Add Category
              </h2>
              <button
                onClick={() => {
                  setShowQuickAddCategory(false);
                  setNewCategoryName("");
                }}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter category name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleQuickAddCategory();
                      }
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    This will create a new category and automatically select it
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowQuickAddCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAddCategory}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal - Updated with color field */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full my-8 border border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100">Edit Product</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingProduct.description}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editingProduct.categoryId}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          categoryId: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="text-slate-800">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowQuickAddCategory(true)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors text-slate-200"
                      title="Quick Add Category"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        barcode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        unit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="pcs" className="text-slate-800">Pieces</option>
                    <option value="kg" className="text-slate-800">Kilogram</option>
                    <option value="liter" className="text-slate-800">Liter</option>
                    <option value="meter" className="text-slate-800">Meter</option>
                    <option value="box" className="text-slate-800">Box</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Toggle */}
              <div className="flex items-center space-x-2 p-3 bg-blue-900/30 rounded-lg border border-blue-800/50">
                <input
                  type="checkbox"
                  id="editIsVehicle"
                  checked={isVehicle}
                  onChange={(e) => setIsVehicle(e.target.checked)}
                  className="h-4 w-4 text-purple-600"
                />
                <label
                  htmlFor="editIsVehicle"
                  className="text-sm font-medium text-slate-300 flex items-center"
                >
                  <Car className="h-4 w-4 mr-2 text-blue-400" />
                  This is a vehicle or vehicle part
                </label>
              </div>

              {/* Vehicle Details */}
              {isVehicle && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Make *
                    </label>
                    <select
                      value={editingProduct.carMake || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          carMake: e.target.value as CarMake | "",
                          carModel: "",
                          variant: "",
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Make</option>
                      {Object.keys(carMakesModels).map((make) => (
                        <option key={make} value={make} className="text-slate-800">
                          {make}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Model
                    </label>
                    <select
                      value={editingProduct.carModel || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          carModel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!editingProduct.carMake}
                    >
                      <option value="" className="text-slate-800">Select Model</option>
                      {editingProduct.carMake &&
                        carMakesModels[editingProduct.carMake as CarMake]?.map(
                          (model: string) => (
                            <option key={model} value={model} className="text-slate-800">
                              {model}
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Variant
                    </label>
                    <select
                      value={editingProduct.variant || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          variant: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Variant</option>
                      {vehicleVariants.map((variant) => (
                        <option key={variant} value={variant} className="text-slate-800">
                          {variant}
                        </option>
                      ))}
                      <option value="custom" className="text-slate-800">Custom...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Color
                    </label>
                    <select
                      value={editingProduct.color || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          color: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="" className="text-slate-800">Select Color</option>
                      {vehicleColors.map((color) => (
                        <option key={color} value={color} className="text-slate-800">
                          {color}
                        </option>
                      ))}
                      <option value="custom" className="text-slate-800">Custom...</option>
                    </select>
                  </div>

                  {editingProduct.variant === "custom" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Custom Variant
                      </label>
                      <input
                        type="text"
                        value={
                          editingProduct.variant === "custom"
                            ? ""
                            : editingProduct.variant
                        }
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            variant: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter custom variant"
                      />
                    </div>
                  )}

                  {editingProduct.color === "custom" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Custom Color
                      </label>
                      <input
                        type="text"
                        value={
                          editingProduct.color === "custom"
                            ? ""
                            : editingProduct.color
                        }
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            color: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter custom color"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={editingProduct.year || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          year: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={editingProduct.partNumber || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          partNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Part number"
                    />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        costPrice: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.taxRate}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        taxRate: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.currentStock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        currentStock: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.minStock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        minStock: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.maxStock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        maxStock: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditProduct}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Delete Product
              </h3>
              <p className="text-slate-400 mb-4">
                Are you sure you want to delete{" "}
                <strong className="text-slate-200">{productToDelete.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}