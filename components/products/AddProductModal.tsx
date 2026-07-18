import { useState, useRef, useEffect } from "react";
import { X, Car, Plus, Tag } from "lucide-react";
import { CarMake, carMakesModels } from "@/lib/data/carData";
import toast from "react-hot-toast";

interface AddProductModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (productData: any) => Promise<void>;
  categories: any[];
  nextSKU: string;
  onQuickAddCategory: () => void;
}

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
  "Gr",
  "Gxr",
  "Vx",
  "Vxr",
  "Gxr/Vxr",
  "Vxs",
  "Twin turbo",
  "Platinium",
  "Lx470",
  "Lx570",
  "Lx600",
  "V8",
  "V6",
  "Standard",
  "Platinum",
  "FJ100",
  "FJ200",
  "Lc200",
  "Lc300",
  "Lx600",
  "Z71",
  "Z41",
  "2500",
  "1500",
  "Single-door",
  "Double-door",
  "4x4",
];

const vehicleColors = [
  "White",
  "Black",
  "Gray",
  "Silver",
  "Red",
  "Blue",
  "Green",
  "Brown",
  "Chrome",
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
  "Forest Green",
];

interface OpeningStockSplit {
  id: string;
  locationId: string;
  locationName: string;
  quantity: number;
}

export default function AddProductModal({
  show,
  onClose,
  onAdd,
  categories,
  nextSKU,
  onQuickAddCategory,
}: AddProductModalProps) {
  const [isVehicle, setIsVehicle] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [selectedLocationQty, setSelectedLocationQty] = useState(0);
  const [openingStockSplits, setOpeningStockSplits] = useState<OpeningStockSplit[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    categoryId: "",
    barcode: "",
    unit: "pcs",
    costPrice: 0,
    sellingPrice: 0,
    taxRate: 0,
    currentStock: 0,
    minStock: 0,
    maxStock: 1000,
    carMake: "" as CarMake | "",
    carModel: "",
    variant: "",
    yearFrom: "",
    yearTo: "",
    partNumber: "",
    color: "",
  });

  useEffect(() => {
    if (highlightedIndex >= 0) {
      suggestionRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    if (show) {
      fetchStockLocations();
    }
  }, [show]);

  useEffect(() => {
    const totalOpeningStock =
      (Number(selectedLocationQty) || 0) +
      openingStockSplits.reduce(
        (sum, split) => sum + (Number(split.quantity) || 0),
        0
      );

    setFormData((prev) =>
      prev.currentStock === totalOpeningStock
        ? prev
        : { ...prev, currentStock: totalOpeningStock }
    );
  }, [selectedLocationQty, openingStockSplits]);

  const fetchStockLocations = async () => {
    try {
      const res = await fetch("/api/stock-locations", { credentials: "include" });
      if (!res.ok) return;

      const data = await res.json();
      const locations = data.locations || [];
      setStockLocations(locations);

      if (!selectedLocationId && locations.length > 0) {
        setSelectedLocationId(locations[0]._id);
        setFormData((prev) => ({ ...prev, location: locations[0].name || "" }));
      }
    } catch (error) {
      console.error("Failed to load stock locations:", error);
    }
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = stockLocations.find(
      (location) => location._id === locationId
    );

    setSelectedLocationId(locationId);
    setFormData({
      ...formData,
      location: selectedLocation?.name || "",
    });
  };

  const handleAddLocation = async () => {
    const name = newLocationName.trim();
    if (!name) {
      toast.error("Location name is required");
      return;
    }

    setAddingLocation(true);
    try {
      const res = await fetch("/api/stock-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        toast.error((await res.json()).error || "Failed to add location");
        return;
      }

      const data = await res.json();
      const location = data.location;
      setStockLocations((prev) => {
        const exists = prev.some((item) => item._id === location._id);
        return exists ? prev : [...prev, location].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedLocationId(location._id);
      setFormData({ ...formData, location: location.name || name });
      setNewLocationName("");
      setShowNewLocation(false);
      toast.success("Location added");
    } catch {
      toast.error("Failed to add location");
    } finally {
      setAddingLocation(false);
    }
  };

  const addOpeningStockSplit = () => {
    const defaultLocation =
      stockLocations.find((location) => location._id !== selectedLocationId) ||
      stockLocations[0];

    setOpeningStockSplits([
      ...openingStockSplits,
      {
        id: `${Date.now()}-${Math.random()}`,
        locationId: defaultLocation?._id || "",
        locationName: defaultLocation?.name || "",
        quantity: 0,
      },
    ]);
  };

  const updateOpeningStockSplit = (
    id: string,
    field: "locationId" | "quantity",
    value: string | number
  ) => {
    setOpeningStockSplits(openingStockSplits.map((split) => {
      if (split.id !== id) return split;

      if (field === "locationId") {
        const location = stockLocations.find((item) => item._id === value);
        return {
          ...split,
          locationId: String(value),
          locationName: location?.name || "",
        };
      }

      return {
        ...split,
        quantity: Number(value) || 0,
      };
    }));
  };

  const removeOpeningStockSplit = (id: string) => {
    setOpeningStockSplits(openingStockSplits.filter((split) => split.id !== id));
  };

  const fetchNameSuggestions = async (query: string) => {
    if (query.length < 1) {
      setNameSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/products/suggestions?q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        setNameSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Suggestion fetch failed:", err);
    }
  };

  const resetForm = () => {
    const defaultLocation = stockLocations[0];
    setFormData({
      name: "",
      description: "",
      location: defaultLocation?.name || "",
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
      yearFrom: "",
      yearTo: "",
      partNumber: "",
      color: "",
    });
    setIsVehicle(false);
    setNameSuggestions([]);
    setShowNameSuggestions(false);
    setHighlightedIndex(-1);
    setSelectedLocationId(defaultLocation?._id || "");
    setSelectedLocationQty(0);
    setNewLocationName("");
    setShowNewLocation(false);
    setOpeningStockSplits([]);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Product name is required");
      return;
    }

    if (isVehicle && formData.yearFrom && formData.yearTo) {
      if (parseInt(formData.yearFrom) > parseInt(formData.yearTo)) {
        toast.error("Year 'From' must be less than or equal to 'To'");
        return;
      }
    }

    const primaryOpeningQty = Number(selectedLocationQty) || 0;
    const openingLocations = [
      ...(primaryOpeningQty > 0
        ? [{
            locationId: selectedLocationId || undefined,
            locationName: formData.location.trim() || undefined,
            quantity: primaryOpeningQty,
          }]
        : []),
      ...openingStockSplits
        .filter((split) => (Number(split.quantity) || 0) > 0)
        .map((split) => ({
          locationId: split.locationId || undefined,
          locationName: split.locationName || undefined,
          quantity: Number(split.quantity) || 0,
        })),
    ];
    const totalOpeningStock = openingLocations.reduce(
      (sum, split) => sum + (Number(split.quantity) || 0),
      0
    );

    const productData: any = {
      name: formData.name,
      description: formData.description,
      locationId: selectedLocationId || undefined,
      locationName: formData.location.trim() || undefined,
      location: formData.location.trim(),
      categoryId: formData.categoryId || undefined,
      sku: nextSKU,
      barcode: formData.barcode || undefined,
      unit: formData.unit,
      costPrice: parseFloat(formData.costPrice as any) || 0,
      sellingPrice: parseFloat(formData.sellingPrice as any) || 0,
      taxRate: parseFloat(formData.taxRate as any) || 0,
      currentStock: totalOpeningStock,
      minStock: parseFloat(formData.minStock as any) || 0,
      maxStock: parseFloat(formData.maxStock as any) || 1000,
      openingLocations,
    };

    if (isVehicle && formData.carMake) {
      productData.carMake = formData.carMake;
      productData.carModel = formData.carModel;
      productData.variant = formData.variant;
      productData.yearFrom = formData.yearFrom
        ? parseInt(formData.yearFrom)
        : undefined;
      productData.yearTo = formData.yearTo
        ? parseInt(formData.yearTo)
        : undefined;
      productData.partNumber = formData.partNumber;
      productData.color = formData.color;
      productData.isVehicle = true;
    }

    await onAdd(productData);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-white/10 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5 sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">
              Add New Product
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Next SKU: {nextSKU}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 relative">
              <label htmlFor="add-product-name" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Product Name *
              </label>

              <input
                id="add-product-name"
                ref={nameInputRef}
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, name: value });
                  fetchNameSuggestions(value);
                  setShowNameSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();

                  if (!showNameSuggestions || nameSuggestions.length === 0)
                    return;

                  switch (e.key) {
                    case "ArrowDown":
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev < nameSuggestions.length - 1 ? prev + 1 : 0
                      );
                      break;

                    case "ArrowUp":
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : nameSuggestions.length - 1
                      );
                      break;

                    case "Enter":
                      if (highlightedIndex >= 0) {
                        e.preventDefault();
                        setFormData({
                          ...formData,
                          name: nameSuggestions[highlightedIndex],
                        });
                        setShowNameSuggestions(false);
                        setHighlightedIndex(-1);
                      }
                      break;

                    case "Escape":
                      setShowNameSuggestions(false);
                      setHighlightedIndex(-1);
                      break;
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowNameSuggestions(false);
                    setHighlightedIndex(-1);
                  }, 150);
                }}
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                placeholder="Product name"
                autoComplete="off"
              />

              {/* Suggestions dropdown */}
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  <div className="max-h-48 overflow-y-auto">
                    {nameSuggestions.map((name, index) => (
                      <div
                        key={name}
                        role="option"
                        aria-selected={highlightedIndex === index}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setFormData({ ...formData, name }); setShowNameSuggestions(false); setHighlightedIndex(-1); } }}
                        ref={(el) => {
                          suggestionRefs.current[index] = el;
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, name });
                          setShowNameSuggestions(false);
                          setHighlightedIndex(-1);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer ${
                          index === highlightedIndex
                            ? "bg-[color:var(--autocity-accent-40)] text-white"
                            : "text-gray-200 hover:bg-[color:var(--autocity-accent-20)]"
                        }`}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="add-product-description" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="add-product-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                placeholder="Product description"
              />
            </div>

            <div>
              <label htmlFor="add-product-category" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <div className="flex gap-2">
                <select
                  id="add-product-category"
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                >
                  <option value="" className="text-[#050505]">
                    Select Category
                  </option>
                  {categories.map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                      className="text-[#050505]"
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onQuickAddCategory}
                  className="px-3 py-2 bg-[color:var(--autocity-accent-10)] border border-[color:var(--autocity-accent-30)] rounded-lg hover:bg-[color:var(--autocity-accent-20)] transition-colors text-white active:scale-95"
                  title="Quick Add Category"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="add-product-location" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Initial Stock Location
              </label>
              <div className="flex gap-2">
                <select
                  id="add-product-location"
                  value={selectedLocationId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                >
                  {stockLocations.length === 0 && (
                    <option value="">Main Store</option>
                  )}
                  {stockLocations.map((location) => (
                    <option
                      key={location._id}
                      value={location._id}
                      className="text-[#050505]"
                    >
                      {location.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewLocation((value) => !value)}
                  className="px-3 py-2 bg-[color:var(--autocity-accent-10)] border border-[color:var(--autocity-accent-30)] rounded-lg hover:bg-[color:var(--autocity-accent-20)] transition-colors text-white active:scale-95"
                  title="Add Location"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showNewLocation && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddLocation()}
                    className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                    placeholder="New location name"
                  />
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={addingLocation}
                    className="px-3 py-2 bg-[color:var(--autocity-accent)] rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {addingLocation ? "Adding..." : "Add"}
                  </button>
                </div>
              )}
              <label className="block text-xs md:text-sm font-medium text-gray-300 mt-3 mb-1">
                Opening Qty in This Location
                <input
                  type="number"
                  value={selectedLocationQty}
                  onChange={(e) =>
                    setSelectedLocationQty(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                />
              </label>
              <p className="mt-1 text-[11px] text-gray-500">
                This quantity is assigned to the selected location.
              </p>
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-300">
                      Split opening stock
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Add more rows if stock starts in multiple locations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addOpeningStockSplit}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[color:var(--autocity-accent-10)] border border-[color:var(--autocity-accent-30)] text-white hover:bg-[color:var(--autocity-accent-20)] active:scale-95 transition-all"
                  >
                    Add Split
                  </button>
                </div>
                {openingStockSplits.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {openingStockSplits.map((split) => (
                      <div key={split.id} className="grid grid-cols-[1fr_90px_34px] gap-2">
                        <select
                          value={split.locationId}
                          onChange={(e) =>
                            updateOpeningStockSplit(split.id, "locationId", e.target.value)
                          }
                          className="px-2 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                        >
                          {stockLocations.length === 0 && (
                            <option value="">Main Store</option>
                          )}
                          {stockLocations.map((location) => (
                            <option
                              key={location._id}
                              value={location._id}
                              className="text-[#050505]"
                            >
                              {location.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={split.quantity}
                          onChange={(e) =>
                            updateOpeningStockSplit(split.id, "quantity", e.target.value)
                          }
                          className="px-2 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                          placeholder="Qty"
                        />
                        <button
                          type="button"
                          onClick={() => removeOpeningStockSplit(split.id)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center"
                          title="Remove split"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[11px] text-gray-400">
                  Total opening stock: {" "}
                  <span className="font-semibold text-white">
                    {(
                      (Number(selectedLocationQty) || 0) +
                      openingStockSplits.reduce((sum, split) => sum + (Number(split.quantity) || 0), 0)
                    ).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="add-product-barcode" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Barcode
              </label>
              <input
                id="add-product-barcode"
                type="text"
                value={formData.barcode}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                placeholder="Auto generated if blank"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Leave blank to create a distinct internal barcode for scanning in sales and purchases.
              </p>
            </div>

            <div>
              <label htmlFor="add-product-unit" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Unit
              </label>
              <select
                id="add-product-unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
              >
                <option value="pcs" className="text-[#050505]">
                  Pieces
                </option>
                <option value="set" className="text-[#050505]">
                  Set
                </option>
                <option value="kg" className="text-[#050505]">
                  Kilogram
                </option>
                <option value="liter" className="text-[#050505]">
                  Liter
                </option>
                <option value="meter" className="text-[#050505]">
                  Meter
                </option>
                <option value="box" className="text-[#050505]">
                  Box
                </option>
              </select>
            </div>
          </div>

          {/* Vehicle Toggle */}
          <div className="flex items-center space-x-2 p-3 bg-[color:var(--autocity-accent-10)] rounded-xl border border-[color:var(--autocity-accent-20)]">
            <input
              type="checkbox"
              id="isVehicle"
              checked={isVehicle}
              onChange={(e) => setIsVehicle(e.target.checked)}
              className="h-4 w-4 text-[color:var(--autocity-accent)]"
            />
            <label
              htmlFor="isVehicle"
              className="text-xs md:text-sm font-medium text-white flex items-center cursor-pointer"
            >
              <Car className="h-4 w-4 mr-2 text-[color:var(--autocity-accent)]" />
              This is a vehicle or vehicle part
            </label>
          </div>

          {/* Vehicle Details */}
          {isVehicle && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[color:var(--autocity-accent-05)] rounded-xl border border-[color:var(--autocity-accent-10)]">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Make *
                <select
                  value={formData.carMake}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      carMake: e.target.value as CarMake | "",
                      carModel: "",
                    })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                >
                  <option value="" className="text-[#050505]">
                    Select Make
                  </option>
                  {Object.keys(carMakesModels).map((make) => (
                    <option key={make} value={make} className="text-[#050505]">
                      {make}
                    </option>
                  ))}
                </select>
                </label>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Model
                <select
                  value={formData.carModel}
                  onChange={(e) =>
                    setFormData({ ...formData, carModel: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                  disabled={!formData.carMake}
                >
                  <option value="" className="text-[#050505]">
                    Select Model
                  </option>
                  {formData.carMake &&
                    carMakesModels[formData.carMake]?.map((model: string) => (
                      <option
                        key={model}
                        value={model}
                        className="text-[#050505]"
                      >
                        {model}
                      </option>
                    ))}
                </select>
                </label>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Variant
                <select
                  value={formData.variant}
                  onChange={(e) =>
                    setFormData({ ...formData, variant: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                >
                  <option value="" className="text-[#050505]">
                    Select Variant
                  </option>
                  {vehicleVariants.map((variant) => (
                    <option
                      key={variant}
                      value={variant}
                      className="text-[#050505]"
                    >
                      {variant}
                    </option>
                  ))}
                  <option value="custom" className="text-[#050505]">
                    Custom...
                  </option>
                </select>
                </label>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Color
                <select
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                >
                  <option value="" className="text-[#050505]">
                    Select Color
                  </option>
                  {vehicleColors.map((color) => (
                    <option
                      key={color}
                      value={color}
                      className="text-[#050505]"
                    >
                      {color}
                    </option>
                  ))}
                  <option value="custom" className="text-[#050505]">
                    Custom...
                  </option>
                </select>
                </label>
              </div>

              {formData.variant === "custom" && (
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Custom Variant
                  <input
                    type="text"
                    value={formData.variant === "custom" ? "" : formData.variant}
                    onChange={(e) =>
                      setFormData({ ...formData, variant: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                    placeholder="Enter custom variant"
                  />
                  </label>
                </div>
              )}

              {formData.color === "custom" && (
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Custom Color
                  <input
                    type="text"
                    value={formData.color === "custom" ? "" : formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                    placeholder="Enter custom color"
                  />
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <label htmlFor="add-product-year-from" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Year Range (Compatibility)
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      From
                    <input
                      id="add-product-year-from"
                      type="number"
                      value={formData.yearFrom}
                      onChange={(e) =>
                        setFormData({ ...formData, yearFrom: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                      placeholder="e.g., 2015"
                      min="1900"
                      max="2100"
                    />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      To
                    <input
                      type="number"
                      value={formData.yearTo}
                      onChange={(e) =>
                        setFormData({ ...formData, yearTo: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                      placeholder="e.g., 2020"
                      min="1900"
                      max="2100"
                    />
                    </label>
                  </div>
                </div>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Leave "To" empty for current year onwards (e.g., 2018+)
                </p>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Part Number
                <input
                  type="text"
                  value={formData.partNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, partNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                  placeholder="Part number"
                />
                </label>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Cost Price
              <input
                type="number"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costPrice: parseFloat(e.target.value),
                  })
                }
                min="0"
                step="0.01"
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
              />
              </label>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Selling Price
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sellingPrice: parseFloat(e.target.value),
                  })
                }
                min="0"
                step="0.01"
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
              />
              </label>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Tax Rate (%)
              <input
                type="number"
                value={formData.taxRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxRate: parseFloat(e.target.value),
                  })
                }
                min="0"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
              />
              </label>
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Total Opening Stock
              <input
                type="number"
                value={formData.currentStock}
                readOnly
                min="0"
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base opacity-80 cursor-not-allowed"
              />
              </label>
              <p className="mt-1 text-[11px] text-gray-500">
                Auto-filled from the sum of all opening location quantities.
              </p>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Min Stock
              <input
                type="number"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minStock: parseFloat(e.target.value),
                  })
                }
                min="0"
                className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
              />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 md:px-6 py-4 border-t border-white/5 sticky bottom-0 bg-[#050505]/95 backdrop-blur-sm">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
          >
            Add Product
          </button>
        </div>
      </div>
    </div>
  );
}
