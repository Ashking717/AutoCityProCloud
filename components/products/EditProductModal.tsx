import { useState, useEffect } from "react";
import { X, Car, Plus } from "lucide-react";
import { CarMake, carMakesModels } from "@/lib/data/carData";
import {
  getProductUnitLabel,
  PRODUCT_UNIT_OPTIONS,
} from "@/lib/utils/productUnit";
import toast from "react-hot-toast";

interface EditProductModalProps {
  show: boolean;
  onClose: () => void;
  onUpdate: (productData: any) => Promise<void>;
  categories: any[];
  product: any;
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
  "Chrome",
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
  "Forest Green",
];

const CUSTOM_OPTION_VALUE = "__custom__";

interface LocationStockSplit {
  id: string;
  locationId: string;
  locationName: string;
  quantity: number;
}

export default function EditProductModal({
  show,
  onClose,
  onUpdate,
  categories,
  product,
  onQuickAddCategory,
}: EditProductModalProps) {
  const [isVehicle, setIsVehicle] = useState(false);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSplits, setLocationSplits] = useState<LocationStockSplit[]>([]);
  const [customVariant, setCustomVariant] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [formData, setFormData] = useState({
    _id: "",
    name: "",
    description: "",
    location: "",
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
    carMake: "" as CarMake | "",
    carModel: "",
    variant: "",
    yearFrom: "",
    yearTo: "",
    partNumber: "",
    color: "",
    isVehicle: false,
  });

  useEffect(() => {
    if (product && show) {
      const existingVariant = String(product.variant || "").trim();
      const existingColor = String(product.color || "").trim();
      const usesCustomVariant =
        !!existingVariant && !vehicleVariants.includes(existingVariant);
      const usesCustomColor =
        !!existingColor && !vehicleColors.includes(existingColor);
      const productLocations = (product.locations || []).filter(
        (location: any) => location.locationId || location.locationName
      );
      const primaryLocation =
        productLocations.find((location: any) => (location.quantity || 0) > 0) ||
        productLocations[0];
      const primaryLocationName = primaryLocation?.locationName || product.location || "";
      const initialLocationSplits =
        productLocations.length > 0
          ? productLocations.map((location: any, index: number) => ({
              id: `${location.locationId || location.locationName || index}-${index}`,
              locationId: location.locationId || "",
              locationName: location.locationName || "",
              quantity: Number(location.quantity) || 0,
            }))
          : primaryLocationName || product.currentStock
          ? [{
              id: `legacy-${product._id}`,
              locationId: primaryLocation?.locationId || "",
              locationName: primaryLocationName,
              quantity: Number(product.currentStock) || 0,
            }]
          : [];

      setFormData({
        _id: product._id,
        name: product.name || "",
        description: product.description || "",
        location: primaryLocationName,
        categoryId: product.category?._id || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        unit: product.unit || "pcs",
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        taxRate: product.taxRate || 0,
        currentStock: product.currentStock || 0,
        minStock: product.minStock || 0,
        maxStock: product.maxStock || 1000,
        carMake: product.carMake || "",
        carModel: product.carModel || "",
        variant: usesCustomVariant ? CUSTOM_OPTION_VALUE : existingVariant,
        yearFrom: product.yearFrom || "",
        yearTo: product.yearTo || "",
        partNumber: product.partNumber || "",
        color: usesCustomColor ? CUSTOM_OPTION_VALUE : existingColor,
        isVehicle: product.isVehicle || false,
      });
      setCustomVariant(usesCustomVariant ? existingVariant : "");
      setCustomColor(usesCustomColor ? existingColor : "");
      setSelectedLocationId(primaryLocation?.locationId || "");
      setLocationSplits(initialLocationSplits);
      setIsVehicle(product.isVehicle || false);
      setShowNewLocation(false);
      setNewLocationName("");
      fetchStockLocations(primaryLocation?.locationId, primaryLocationName);
    }
  }, [product, show]);

  const fetchStockLocations = async (
    preferredLocationId?: string,
    preferredLocationName?: string
  ) => {
    try {
      const res = await fetch("/api/stock-locations", { credentials: "include" });
      if (!res.ok) return;

      const data = await res.json();
      const locations = data.locations || [];
      setStockLocations(locations);
      setLocationSplits((prev) =>
        prev.map((split) => {
          if (split.locationId || !split.locationName) return split;

          const matchedLocation = locations.find(
            (location: any) =>
              String(location.name || "").toLowerCase() ===
              split.locationName.toLowerCase()
          );

          return matchedLocation
            ? { ...split, locationId: matchedLocation._id }
            : split;
        })
      );

      if (preferredLocationId) {
        const preferredLocation = locations.find(
          (location: any) => location._id === preferredLocationId
        );
        if (preferredLocation) {
          setFormData((prev) => ({
            ...prev,
            location: preferredLocation.name || preferredLocationName || "",
          }));
        }
        return;
      }

      const preferredByName = preferredLocationName
        ? locations.find(
            (location: any) =>
              String(location.name || "").toLowerCase() ===
              preferredLocationName.toLowerCase()
          )
        : null;

      if (preferredByName) {
        setSelectedLocationId(preferredByName._id);
        setFormData((prev) => ({
          ...prev,
          location: preferredByName.name || preferredLocationName,
        }));
        return;
      }

      if (preferredLocationName) {
        setSelectedLocationId("");
        setFormData((prev) => ({
          ...prev,
          location: preferredLocationName,
        }));
        return;
      }

      const defaultLocation = locations[0];
      if (defaultLocation) {
        setSelectedLocationId(defaultLocation._id);
        setFormData((prev) => ({
          ...prev,
          location: preferredLocationName || defaultLocation.name || "",
        }));
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
    setLocationSplits((prev) => {
      const nextSplit = {
        id: `${Date.now()}-${Math.random()}`,
        locationId,
        locationName: selectedLocation?.name || "",
        quantity: Number(formData.currentStock) || 0,
      };

      if (prev.length === 0) return [nextSplit];

      return prev.map((split, index) =>
        index === 0
          ? {
              ...split,
              locationId,
              locationName: selectedLocation?.name || "",
            }
          : split
      );
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
      setLocationSplits((prev) =>
        prev.length === 0
          ? [{
              id: `${Date.now()}-${Math.random()}`,
              locationId: location._id,
              locationName: location.name || name,
              quantity: Number(formData.currentStock) || 0,
            }]
          : prev
      );
      setNewLocationName("");
      setShowNewLocation(false);
      toast.success("Location added");
    } catch {
      toast.error("Failed to add location");
    } finally {
      setAddingLocation(false);
    }
  };

  const addLocationSplit = () => {
    const usedLocationIds = new Set(
      locationSplits.map((split) => split.locationId).filter(Boolean)
    );
    const defaultLocation =
      stockLocations.find((location) => !usedLocationIds.has(location._id)) ||
      stockLocations[0];

    setLocationSplits([
      ...locationSplits,
      {
        id: `${Date.now()}-${Math.random()}`,
        locationId: defaultLocation?._id || "",
        locationName: defaultLocation?.name || "",
        quantity: 0,
      },
    ]);
  };

  const updateLocationSplit = (
    id: string,
    field: "locationId" | "quantity",
    value: string | number
  ) => {
    setLocationSplits((prev) =>
      prev.map((split, index) => {
        if (split.id !== id) return split;

        if (field === "locationId") {
          const location = stockLocations.find((item) => item._id === value);

          if (index === 0) {
            setSelectedLocationId(String(value));
            setFormData((current) => ({
              ...current,
              location: location?.name || "",
            }));
          }

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
      })
    );
  };

  const removeLocationSplit = (id: string) => {
    setLocationSplits((prev) => {
      const next = prev.filter((split) => split.id !== id);
      const firstSplit = next[0];

      if (firstSplit) {
        setSelectedLocationId(firstSplit.locationId || "");
        setFormData((current) => ({
          ...current,
          location: firstSplit.locationName || "",
        }));
      }

      return next;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.sku) {
      toast.error("Name and SKU are required");
      return;
    }

    if (isVehicle && formData.yearFrom && formData.yearTo) {
      if (parseInt(formData.yearFrom) > parseInt(formData.yearTo)) {
        toast.error("Year 'From' must be less than or equal to 'To'");
        return;
      }
    }

    const finalVariant =
      formData.variant === CUSTOM_OPTION_VALUE
        ? customVariant.trim()
        : formData.variant.trim();
    const finalColor =
      formData.color === CUSTOM_OPTION_VALUE
        ? customColor.trim()
        : formData.color.trim();

    if (isVehicle && formData.variant === CUSTOM_OPTION_VALUE && !finalVariant) {
      toast.error("Custom variant is required");
      return;
    }

    if (isVehicle && formData.color === CUSTOM_OPTION_VALUE && !finalColor) {
      toast.error("Custom colour is required");
      return;
    }

    const expectedStock = Number(product.currentStock || 0);
    const allocationTotal = locationSplits.reduce(
      (sum, split) => sum + Number(split.quantity || 0),
      0
    );
    if (expectedStock > 0 && locationSplits.length === 0) {
      toast.error("At least one stock location is required");
      return;
    }
    if (locationSplits.some((split) =>
      !split.locationId
      || !Number.isFinite(Number(split.quantity))
      || Number(split.quantity) < 0
    )) {
      toast.error("Every row needs a location and a non-negative quantity");
      return;
    }
    const locationIds = locationSplits.map((split) => split.locationId);
    if (new Set(locationIds).size !== locationIds.length) {
      toast.error("Each location can appear only once");
      return;
    }
    if (Math.abs(allocationTotal - expectedStock) > 0.000001) {
      toast.error(`Location quantities must total ${expectedStock}`);
      return;
    }

    const productData: any = {
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId || undefined,
      sku: formData.sku.toUpperCase(),
      barcode: formData.barcode || undefined,
      unit: formData.unit,
      costPrice: parseFloat(formData.costPrice as any) || 0,
      sellingPrice: parseFloat(formData.sellingPrice as any) || 0,
      taxRate: parseFloat(formData.taxRate as any) || 0,
      minStock: parseFloat(formData.minStock as any) || 0,
      maxStock: parseFloat(formData.maxStock as any) || 1000,
      locationAllocations: locationSplits.map((split) => ({
        locationId: split.locationId,
        quantity: Number(split.quantity) || 0,
      })),
      locationAllocationKey: crypto.randomUUID(),
    };

    if (isVehicle && formData.carMake) {
      productData.carMake = formData.carMake;
      productData.carModel = formData.carModel;
      productData.variant = finalVariant;
      productData.yearFrom = formData.yearFrom
        ? parseInt(formData.yearFrom)
        : undefined;
      productData.yearTo = formData.yearTo
        ? parseInt(formData.yearTo)
        : undefined;
      productData.partNumber = formData.partNumber;
      productData.color = finalColor;
      productData.isVehicle = true;
    } else {
      productData.isVehicle = false;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(productData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-white/10 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5 sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10">
          <h2 className="text-lg md:text-xl font-bold text-white">
            Edit Product
          </h2>
          <button
            onClick={onClose}
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                />
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Description
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Category
                <div className="flex gap-2">
                <select
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
              </label>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                SKU *
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Product Location
                <div className="flex gap-2">
                  <select
                    value={selectedLocationId}
                    onChange={(event) => handleLocationChange(event.target.value)}
                    className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                  >
                    {!selectedLocationId && formData.location && (
                      <option value="" className="text-[#050505]">
                        {formData.location}
                      </option>
                    )}
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
                    onClick={() => setShowNewLocation((current) => !current)}
                    className="px-3 py-2 bg-[color:var(--autocity-accent-10)] border border-[color:var(--autocity-accent-30)] rounded-lg text-white hover:bg-[color:var(--autocity-accent-20)] transition-colors"
                    title="Create a stock location"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </label>
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
              <p className="mt-1 text-[11px] text-gray-500">
                Redistribute existing stock between locations. Saving records audited transfer movements and never changes total stock.
              </p>
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-300">
                      Location stock split
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Current stock is calculated from these rows.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLocationSplit}
                    disabled={stockLocations.length === 0 || locationSplits.length >= stockLocations.length}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[color:var(--autocity-accent-10)] border border-[color:var(--autocity-accent-30)] text-white hover:bg-[color:var(--autocity-accent-20)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add location
                  </button>
                </div>
                {locationSplits.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {locationSplits.map((split) => (
                      <div key={split.id} className="grid grid-cols-[1fr_90px_34px] gap-2">
                        <select
                          value={split.locationId}
                          onChange={(event) => updateLocationSplit(split.id, "locationId", event.target.value)}
                          className="px-2 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-[color:var(--autocity-accent)]"
                        >
                          {!split.locationId && split.locationName && (
                            <option value="" className="text-[#050505]">
                              {split.locationName}
                            </option>
                          )}
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
                          step="any"
                          value={split.quantity}
                          onChange={(event) => updateLocationSplit(split.id, "quantity", event.target.value)}
                          className="px-2 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-[color:var(--autocity-accent)]"
                          placeholder="Qty"
                        />
                        <button
                          type="button"
                          onClick={() => removeLocationSplit(split.id)}
                          className="rounded-lg border border-white/10 bg-white/[0.03] text-gray-400 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors"
                          title="Remove this allocation"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-gray-500">
                    No stock rows yet. Add a split row to assign stock to a location.
                  </p>
                )}
                <p className="mt-3 text-[11px] text-gray-400">
                  Total stock:{" "}
                  <span className="font-semibold text-white">
                    {locationSplits
                      .reduce((sum, split) => sum + (Number(split.quantity) || 0), 0)
                      .toFixed(2)}
                  </span>
                  {Math.abs(
                    locationSplits.reduce((sum, split) => sum + (Number(split.quantity) || 0), 0)
                    - Number(product.currentStock || 0)
                  ) > 0.000001 && (
                    <span className="ml-2 text-amber-400">
                      (must equal {Number(product.currentStock || 0).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="edit-product-barcode" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Barcode
              </label>
                <input
                  id="edit-product-barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  placeholder="Manufacturer barcode or distinct internal barcode"
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                />
              <p className="mt-1 text-[11px] text-gray-500">
                If this is empty, the print-label action can generate a distinct internal barcode.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-xs md:text-sm font-medium text-gray-300">
                  Stock unit
                </label>
                <span className="rounded-full border border-[color:var(--autocity-accent-30)] bg-[color:var(--autocity-accent-10)] px-2.5 py-1 text-xs font-semibold text-[color:var(--autocity-accent)]">
                  Selected: {getProductUnitLabel(formData.unit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRODUCT_UNIT_OPTIONS.map((unitOption) => {
                  const isSelected = formData.unit === unitOption.value;
                  return (
                    <button
                      key={unitOption.value}
                      type="button"
                      aria-pressed={isSelected}
                      disabled
                      className={`rounded-lg border px-3 py-2 text-left transition-all ${
                        isSelected
                          ? "border-[color:var(--autocity-accent)] bg-[color:var(--autocity-accent-10)] text-white ring-1 ring-[color:var(--autocity-accent-30)]"
                          : "border-white/10 bg-[#050505] text-gray-500"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        {unitOption.label}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {unitOption.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Stock unit is immutable after creation so historical movements retain their meaning.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-[color:var(--autocity-accent-10)] rounded-xl border border-[color:var(--autocity-accent-20)]">
            <input
              type="checkbox"
              id="editIsVehicle"
              checked={isVehicle}
              onChange={(e) => setIsVehicle(e.target.checked)}
              className="h-4 w-4 text-[color:var(--autocity-accent)]"
            />
            <label
              htmlFor="editIsVehicle"
              className="text-xs md:text-sm font-medium text-white flex items-center cursor-pointer"
            >
              <Car className="h-4 w-4 mr-2 text-[color:var(--autocity-accent)]" />
              This is a vehicle or vehicle part
            </label>
          </div>

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
                      carMakesModels[formData.carMake as CarMake]?.map(
                        (model: string) => (
                          <option
                            key={model}
                            value={model}
                            className="text-[#050505]"
                          >
                            {model}
                          </option>
                        )
                      )}
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
                    <option value={CUSTOM_OPTION_VALUE} className="text-[#050505]">
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
                    <option value={CUSTOM_OPTION_VALUE} className="text-[#050505]">
                      Custom...
                    </option>
                  </select>
                </label>
              </div>

              {formData.variant === CUSTOM_OPTION_VALUE && (
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Custom Variant
                    <input
                      type="text"
                      value={customVariant}
                      onChange={(e) => setCustomVariant(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                      placeholder="Enter custom variant"
                    />
                  </label>
                </div>
              )}

              {formData.color === CUSTOM_OPTION_VALUE && (
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                    Custom Color
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent"
                      placeholder="Enter custom color"
                    />
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <label htmlFor="edit-product-year-from" className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                  Year Range (Compatibility)
                  <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      From
                      <input
                        id="edit-product-year-from"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Cost Price
                <input
                  type="number"
                  value={formData.costPrice}
                  readOnly={Number(product.currentStock || 0) > 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPrice: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent ${Number(product.currentStock || 0) > 0 ? "opacity-70 cursor-not-allowed" : ""}`}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1">
                Current Stock
                <input
                  type="number"
                  value={formData.currentStock}
                  readOnly
                  min="0"
                  className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-lg text-white text-sm md:text-base opacity-80 cursor-not-allowed"
                />
              </label>
              <p className="mt-1 text-[11px] text-gray-500">
                Locked total. Redistribute it using the location stock split above.
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
            onClick={onClose}
            className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gradient-to-r from-[var(--autocity-accent)] to-[var(--autocity-accent-strong)] text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Updating..." : "Update Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
