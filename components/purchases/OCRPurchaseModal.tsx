// components/purchases/OCRPurchaseModal.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X, Upload, Camera, ScanLine, CheckCircle, AlertCircle, AlertTriangle,
  Trash2, RotateCcw, ChevronRight, ChevronDown, ChevronUp, Loader2,
  Eye, FileImage, Zap, Edit3, Plus, Search, Link, Unlink,
  UserCheck, UserPlus, Package, Car, Image, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import type { OCRParsedResult, OCRParsedItem } from "@/app/api/purchases/ocr/route";
import { carMakesModels } from "@/lib/data/carData";
type CarMake = keyof typeof carMakesModels;

// ─── Static data ──────────────────────────────────────────────────────────────
const VEHICLE_VARIANTS = [
  "Base","LX","EX","Sport","Limited","Premium","Touring","SE","LE","XLE","SR","TRD","GT",
  "R/T","SXT","Gx","Gr","Gxr","Vx","Vxr","Gxr/Vxr","Vxs","Twin turbo","Platinium",
  "Lx470","Lx570","Lx600","V8","V6","Standard","Platinum","FJ100","FJ200","Lc200","Lc300",
  "Z71","Z41","2500","1500","Single-door","Double-door","4x4",
];
const VEHICLE_COLORS = [
  "White","Black","Gray","Silver","Red","Blue","Green","Brown","Chrome","Yellow","Orange",
  "Purple","Gold","Beige","Maroon","Navy","Burgundy","Teal","Champagne","Bronze",
  "Pearl White","Metallic Black","Graphite Gray","Midnight Blue","Racing Red","Forest Green",
];
const UNITS = ["pcs","set","kg","ltr","m","box","pair","roll","liter","meter"];
const MAX_IMAGES = 10;

// ─── Types ────────────────────────────────────────────────────────────────────
interface UploadedImage {
  file: File;
  preview: string;
}

interface NewProductForm {
  name: string; description: string; categoryId: string;
  barcode: string; partNumber: string; unit: string;
  costPrice: number; sellingPrice: number; taxRate: number;
  currentStock: number; minStock: number; maxStock: number;
  isVehicle: boolean; carMake: CarMake | ""; carModel: string;
  variant: string; customVariant: string; yearFrom: string; yearTo: string;
  color: string; customColor: string; vin: string;
}

export interface EnrichedItem extends OCRParsedItem {
  matchedProduct: any | null;
  resolvedName: string;
  resolvedPartNumber: string;
  resolvedUnit: string;
  resolvedUnitPrice: number;
  resolvedQuantity: number;
  resolvedTaxRate: number;
  linkStatus: "matched" | "new" | "manual";
  manualLookupInput: string;
  isEditing: boolean;
  lookingUp: boolean;
  newProductForm: NewProductForm;
  newProductExpanded: boolean;
  saving: boolean;
  savedProduct: any | null;
}

interface OCRPurchaseModalProps {
  show: boolean; onClose: () => void; isDark: boolean;
  onConfirm: (
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; unit: string; taxRate: number; }>,
    supplierName?: string, invoiceNote?: string
  ) => void;
  products: any[]; suppliers: any[];
  nextSKU: string;
  onSupplierCreated?: (supplier: any) => void;
  onProductCreated?: (product: any) => void;
}

type Step = "upload" | "parsing" | "supplier" | "products" | "confirm";

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Strip Arabic/non-ASCII from a name — client-side safety net */
function toEnglishName(raw: string): string {
  if (!raw) return raw;
  let n = raw.replace(/\([^)]*[\u0600-\u06FF][^)]*\)/g, ""); // remove "(arabic)" blocks
  n = n.replace(/[^\x00-\x7F]+/g, "");                          // strip remaining non-ASCII
  return n.trim().replace(/\s{2,}/g, " ");
}

function confidenceBadge(c: "high" | "medium" | "low") {
  return {
    high:   { bg:"bg-green-500/15",  text:"text-green-400",  border:"border-green-500/30",  label:"High" },
    medium: { bg:"bg-yellow-500/15", text:"text-yellow-400", border:"border-yellow-500/30", label:"Med"  },
    low:    { bg:"bg-red-500/15",    text:"text-red-400",    border:"border-red-500/30",    label:"Low"  },
  }[c];
}

function findMatchingProduct(item: OCRParsedItem, products: any[]): any | null {
  if (!products.length) return null;
  // item.partNumber = part number from invoice
  const partNeedle = (item.partNumber || "").toLowerCase().trim();
  const namNeedle  = (item.name || "").toLowerCase().trim();
  if (partNeedle) {
    const byPart = products.find(
      (p) => p.partNumber?.toLowerCase() === partNeedle || p.barcode?.toLowerCase() === partNeedle
    );
    if (byPart) return byPart;
  }
  if (namNeedle && namNeedle.length > 3) {
    const byName = products.find(
      (p) => p.name?.toLowerCase() === namNeedle ||
             (namNeedle.length > 4 && p.name?.toLowerCase().includes(namNeedle)) ||
             (p.name?.toLowerCase().length > 4 && namNeedle.includes(p.name?.toLowerCase()))
    );
    if (byName) return byName;
  }
  return null;
}

function defaultNewProductForm(item: OCRParsedItem): NewProductForm {
  return {
    name: toEnglishName(item.name || ""), description: "", categoryId: "",
    barcode: "", partNumber: item.partNumber || "",
    unit: item.unit || "pcs",
    costPrice: item.unitPrice || 0,
    sellingPrice: item.unitPrice ? Math.round(item.unitPrice * 1.3 * 100) / 100 : 0,
    taxRate: item.taxRate || 0,
    currentStock: 0,   // always start at 0 — stock is added via the purchase, not pre-set
    minStock: 0, maxStock: 1000,
    isVehicle: false, carMake: "", carModel: "",
    variant: "", customVariant: "", yearFrom: "", yearTo: "",
    color: "", customColor: "", vin: "",
  };
}

function buildEnrichedItems(parsedItems: OCRParsedItem[], products: any[]): EnrichedItem[] {
  return parsedItems.map((item) => {
    const matched = findMatchingProduct(item, products);
    return {
      ...item,
      matchedProduct: matched,
      resolvedName: toEnglishName(matched?.name ?? item.name),
      resolvedPartNumber: matched?.partNumber ?? item.partNumber ?? "",
      resolvedUnit: item.unit || matched?.unit || "pcs",
      resolvedUnitPrice: item.unitPrice || matched?.costPrice || 0,
      resolvedQuantity: item.quantity,
      resolvedTaxRate: item.taxRate || matched?.taxRate || 0,
      linkStatus: matched ? "matched" : "new",
      manualLookupInput: "", isEditing: false, lookingUp: false,
      newProductForm: defaultNewProductForm(item),
      newProductExpanded: false, saving: false, savedProduct: null,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OCRPurchaseModal({
  show, onClose, isDark, onConfirm, products, suppliers, nextSKU,
  onSupplierCreated, onProductCreated,
}: OCRPurchaseModalProps) {
  const [step, setStep]               = useState<Step>("upload");
  // Multi-image state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging]   = useState(false);
  const [parseError, setParseError]   = useState<string | null>(null);
  const [parsingProgress, setParsingProgress] = useState<string>("");
  // Result state
  const [result, setResult]           = useState<OCRParsedResult | null>(null);
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  // Supplier step
  const [supplierMode, setSupplierMode]   = useState<"select"|"create">("select");
  const [selectedSupplier, setSelectedSupplier] = useState<any|null>(null);
  const [newSupplier, setNewSupplier]     = useState({ name:"", phone:"", email:"", contactPerson:"" });
  const [supplierSaving, setSupplierSaving] = useState(false);
  // Product step
  const [enrichedItems, setEnrichedItems] = useState<EnrichedItem[]>([]);
  const [currentNextSKU, setCurrentNextSKU] = useState(nextSKU);
  // Categories — fetched internally so modal is self-contained
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  // Inline quick-add category state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentNextSKU(nextSKU); }, [nextSKU]);

  // Fetch categories whenever modal opens
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch { /* silent */ }
    finally { setCategoriesLoading(false); }
  };

  useEffect(() => { if (show) fetchCategories(); }, [show]);

  // Inline quick-add category handler
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("Category name is required"); return; }
    setSavingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      const created = data.category;
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      // Auto-select it in whichever new-product form is open
      setEnrichedItems((prev) => prev.map((item) =>
        item.newProductExpanded
          ? { ...item, newProductForm: { ...item.newProductForm, categoryId: String(created._id) } }
          : item
      ));
      setNewCategoryName(""); setShowAddCategory(false);
      toast.success(`Category "${created.name}" created`)
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingCategory(false); }
  };

  useEffect(() => {
    if (!show) {
      setTimeout(() => {
        setStep("upload"); setUploadedImages([]); setResult(null);
        setEnrichedItems([]); setParseError(null); setParsingProgress("");
        setSelectedSupplier(null); setSupplierMode("select");
        setNewSupplier({ name:"", phone:"", email:"", contactPerson:"" });
        setShowAllPreviews(false);
      }, 300);
    }
  }, [show]);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const th = {
    overlay:      isDark ? "rgba(0,0,0,0.85)"   : "rgba(0,0,0,0.55)",
    modalBg:      isDark ? "linear-gradient(180deg,#0D0D0D 0%,#080808 100%)" : "linear-gradient(180deg,#ffffff 0%,#f8f9fa 100%)",
    border:       isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    textPrimary:  isDark ? "#ffffff"   : "#111827",
    textSecondary:isDark ? "#9ca3af"  : "#6b7280",
    textMuted:    isDark ? "#6b7280"  : "#9ca3af",
    inputBg:      isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
    inputBorder:  isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)",
    itemBg:       isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    itemBorder:   isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    divider:      isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    closeBg:      isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    dropzoneBg:   isDark ? "rgba(232,69,69,0.04)"  : "rgba(232,69,69,0.03)",
    dropzoneBorder:       isDark ? "rgba(232,69,69,0.25)" : "rgba(232,69,69,0.20)",
    dropzoneActiveBg:     isDark ? "rgba(232,69,69,0.10)" : "rgba(232,69,69,0.07)",
    matchedBg:    isDark ? "rgba(34,197,94,0.06)"  : "rgba(34,197,94,0.04)",
    matchedBorder:isDark ? "rgba(34,197,94,0.25)"  : "rgba(34,197,94,0.20)",
    newBg:        isDark ? "rgba(232,69,69,0.06)"  : "rgba(232,69,69,0.04)",
    newBorder:    isDark ? "rgba(232,69,69,0.25)"  : "rgba(232,69,69,0.20)",
    manualBg:     isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)",
    manualBorder: isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.20)",
    vehicleBg:    isDark ? "rgba(232,69,69,0.05)"  : "rgba(232,69,69,0.03)",
    vehicleBorder:isDark ? "rgba(232,69,69,0.20)"  : "rgba(232,69,69,0.15)",
  };

  const iS  = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.textPrimary };
  const iC  = "focus:outline-none focus:ring-2 focus:ring-[#E84545]/40 focus:border-[#E84545]/50 rounded-lg px-3 py-2 text-sm w-full";
  const lbl = "text-[10px] mb-1 block font-medium";

  const visibleSteps: Step[] = ["upload","supplier","products","confirm"];
  const LABELS: Record<Step,string> = { upload:"Upload", parsing:"Parse", supplier:"Supplier", products:"Products", confirm:"Confirm" };
  const curIdx = visibleSteps.indexOf(step === "parsing" ? "upload" : step);

  // ─── Image management ─────────────────────────────────────────────────────
  const addImages = useCallback((newFiles: File[]) => {
    const validTypes = ["image/jpeg","image/png","image/webp","image/gif"];
    const maxSize    = 10 * 1024 * 1024;
    const validated: UploadedImage[] = [];

    for (const file of newFiles) {
      if (!validTypes.includes(file.type))  { toast.error(`"${file.name}" is not a supported image type`); continue; }
      if (file.size > maxSize)               { toast.error(`"${file.name}" is too large (max 10MB)`); continue; }
      validated.push({ file, preview: URL.createObjectURL(file) });
    }

    setUploadedImages((prev) => {
      const combined = [...prev, ...validated];
      if (combined.length > MAX_IMAGES) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed`);
        return combined.slice(0, MAX_IMAGES);
      }
      return combined;
    });
    setParseError(null);
  }, []);

  const removeImage = (idx: number) => {
    setUploadedImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  }, [addImages]);

  // ─── Parse ────────────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (uploadedImages.length === 0) return;
    setStep("parsing"); setParseError(null);
    setParsingProgress(uploadedImages.length > 1
      ? `Scanning ${uploadedImages.length} images in parallel…`
      : "Scanning invoice…"
    );
    try {
      const fd = new FormData();
      uploadedImages.forEach(({ file }) => fd.append("images[]", file));

      const res  = await fetch("/api/purchases/ocr", { method:"POST", credentials:"include", body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OCR parsing failed");

      const parsed: OCRParsedResult = data.result;
      setResult(parsed);

      // Auto-match supplier
      if (parsed.supplierName) {
        const auto = suppliers.find((s) =>
          s.name?.toLowerCase().includes(parsed.supplierName!.toLowerCase()) ||
          parsed.supplierName!.toLowerCase().includes(s.name?.toLowerCase())
        );
        if (auto) { setSelectedSupplier(auto); setSupplierMode("select"); }
        else {
          setNewSupplier({ name:parsed.supplierName, phone:parsed.supplierPhone||"", email:parsed.supplierEmail||"", contactPerson:"" });
          setSupplierMode("create");
        }
      }

      setEnrichedItems(buildEnrichedItems(parsed.items, products));
      setStep("supplier");
    } catch (err: any) {
      setParseError(err.message); setStep("upload"); toast.error(err.message || "Parsing failed");
    }
  };

  // ─── Supplier ────────────────────────────────────────────────────────────
  const handleSaveNewSupplier = async () => {
    if (!newSupplier.name) { toast.error("Supplier name is required"); return; }
    setSupplierSaving(true);
    try {
      const code = `SUP${newSupplier.name.toUpperCase().replace(/[^A-Z0-9]/g,"").substring(0,8)}${Date.now().toString().slice(-4)}`;
      const res = await fetch("/api/suppliers", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({...newSupplier,code}) });
      if (!res.ok) throw new Error((await res.json()).error||"Failed");
      const d = await res.json();
      setSelectedSupplier(d.supplier); onSupplierCreated?.(d.supplier);
      toast.success("Supplier created!"); setSupplierMode("select");
    } catch (err: any) { toast.error(err.message); }
    finally { setSupplierSaving(false); }
  };

  // ─── Item helpers ─────────────────────────────────────────────────────────
  const updateItem = (idx: number, patch: Partial<EnrichedItem>) =>
    setEnrichedItems((prev) => { const n=[...prev]; n[idx]={...n[idx],...patch}; return n; });
  const updateNPF  = (idx: number, patch: Partial<NewProductForm>) =>
    setEnrichedItems((prev) => { const n=[...prev]; n[idx]={...n[idx],newProductForm:{...n[idx].newProductForm,...patch}}; return n; });
  const removeItem = (idx: number) => setEnrichedItems((prev) => prev.filter((_,i)=>i!==idx));

  const addBlankItem = () => {
    const blank: OCRParsedItem = { name:"", partNumber:"", quantity:1, unitPrice:0, unit:"pcs", taxRate:0, total:0, confidence:"low" };
    setEnrichedItems((prev) => [...prev, {
      ...blank, matchedProduct:null, resolvedName:"", resolvedPartNumber:"",
      resolvedUnit:"pcs", resolvedUnitPrice:0, resolvedQuantity:1, resolvedTaxRate:0,
      linkStatus:"new", manualLookupInput:"", isEditing:true, lookingUp:false,
      newProductForm:defaultNewProductForm(blank), newProductExpanded:false, saving:false, savedProduct:null,
    }]);
  };

  const unlinkItem = (idx: number) => {
    const i = enrichedItems[idx];
    updateItem(idx, { matchedProduct:null, resolvedName:i.name||"", resolvedPartNumber:i.partNumber||"",
      resolvedUnit:i.unit||"pcs", resolvedUnitPrice:i.unitPrice||0, resolvedTaxRate:i.taxRate||0,
      linkStatus:"new", manualLookupInput:"", savedProduct:null });
  };

  /** Link an unmatched item to an existing product by SKU code only */
  const handleSkuLookup = async (idx: number, input: string) => {
    if (!input.trim()) return;
    updateItem(idx, { lookingUp:true });
    try {
      const lower = input.toLowerCase().trim();
      // Search loaded products by SKU only
      const found = products.find((p) => p.sku?.toLowerCase() === lower);
      if (found) {
        updateItem(idx, { matchedProduct:found, resolvedName:found.name,
          resolvedPartNumber:found.partNumber||"", resolvedUnit:found.unit||"pcs",
          resolvedUnitPrice:found.costPrice||0, resolvedTaxRate:found.taxRate||0,
          linkStatus:"manual", lookingUp:false });
        toast.success(`Linked: ${found.name}`); return;
      }
      // Server fallback — exact SKU match
      const res = await fetch(`/api/products?search=${encodeURIComponent(input)}&limit=20`, { credentials:"include" });
      if (res.ok) {
        const data = await res.json();
        const sf = (data.products||[]).find((p:any) => p.sku?.toLowerCase() === lower);
        if (sf) {
          updateItem(idx, { matchedProduct:sf, resolvedName:sf.name,
            resolvedPartNumber:sf.partNumber||"", resolvedUnit:sf.unit||"pcs",
            resolvedUnitPrice:sf.costPrice||0, resolvedTaxRate:sf.taxRate||0,
            linkStatus:"manual", lookingUp:false });
          toast.success(`Linked: ${sf.name}`); return;
        }
      }
      toast.error("No product found with that SKU");
      updateItem(idx, { lookingUp:false });
    } catch { updateItem(idx, { lookingUp:false }); toast.error("Lookup failed"); }
  };

  const handleSaveNewProduct = async (idx: number) => {
    const item = enrichedItems[idx];
    const f = item.newProductForm;
    if (!f.name.trim())  { toast.error("Product name is required"); return; }
    if (!f.categoryId)   { toast.error("Category is required — please select a category"); return; }
    if (f.isVehicle && !f.carMake) { toast.error("Car make is required for vehicle products"); return; }
    if (f.isVehicle && f.yearFrom && f.yearTo && parseInt(f.yearFrom) > parseInt(f.yearTo)) { toast.error("Year From must be ≤ Year To"); return; }
    updateItem(idx, { saving:true });
    try {
      // Build payload — omit keys that are empty so the API doesn't see undefined values
      const payload: any = {
        name:        f.name,
        description: f.description || "",
        sku:         currentNextSKU,
        unit:        f.unit || "pcs",
        costPrice:   Number(f.costPrice)  || 0,
        sellingPrice:Number(f.sellingPrice)|| 0,
        taxRate:     Number(f.taxRate)    || 0,
        currentStock: 0,   // always 0 — stock added when purchase is submitted
        minStock:    Number(f.minStock)   || 0,
        maxStock:    Number(f.maxStock)   || 1000,
      };
      // Only include optional string fields when they have a value
      if (f.categoryId) payload.categoryId = f.categoryId;
      if (f.barcode)    payload.barcode    = f.barcode;
      if (f.partNumber) payload.partNumber = f.partNumber;
      if (f.isVehicle && f.carMake) {
        payload.isVehicle=true; payload.carMake=f.carMake; payload.carModel=f.carModel;
        payload.variant  = f.variant==="custom" ? f.customVariant : f.variant;
        payload.color    = f.color==="custom"   ? f.customColor   : f.color;
        payload.yearFrom = f.yearFrom ? parseInt(f.yearFrom) : undefined;
        payload.yearTo   = f.yearTo   ? parseInt(f.yearTo)   : undefined;
        payload.vin      = f.vin||undefined;
      }
      const res = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error||"Failed to create product");
      const d = await res.json();
      const created = d.product;
      onProductCreated?.(created);
      const nr = await fetch("/api/products/next-sku", { credentials:"include" });
      if (nr.ok) { const nd=await nr.json(); setCurrentNextSKU(nd.nextSKU); }
      updateItem(idx, { savedProduct:created, matchedProduct:created, resolvedName:created.name,
        resolvedPartNumber:created.partNumber||"",
        resolvedUnit:created.unit||f.unit,
        resolvedUnitPrice:created.costPrice||f.costPrice,
        resolvedTaxRate:created.taxRate||f.taxRate,
        // store the real inventory SKU so the purchase confirm can reference it
        manualLookupInput: created.sku,
        linkStatus:"manual", newProductExpanded:false, saving:false });
      toast.success(`"${created.name}" created — SKU: ${created.sku}`);
    } catch (err:any) { toast.error(err.message); updateItem(idx, { saving:false }); }
  };

  const handleConfirm = () => {
    const valid = enrichedItems.filter((i) => i.resolvedName.trim() && i.resolvedQuantity > 0);
    if (!valid.length) { toast.error("Add at least one valid item"); return; }
    onConfirm(
      valid.map((i) => ({
        name: i.resolvedName,
        // Pass real inventory SKU for matched/saved products; fall back to part number for unlinked new items
        sku: i.matchedProduct?.sku || i.savedProduct?.sku || i.resolvedPartNumber || "",
        quantity: i.resolvedQuantity,
        unitPrice: i.resolvedUnitPrice,
        unit: i.resolvedUnit || "pcs",
        taxRate: i.resolvedTaxRate || 0,
      })),
      selectedSupplier?.name || result?.supplierName || undefined,
      result?.invoiceNumber
        ? `Invoice: ${result.invoiceNumber}${result.invoiceDate ? ` (${result.invoiceDate})` : ""}`
        : undefined
    );
    toast.success(`${valid.length} items added to cart`);
    onClose();
  };

  if (!show) return null;

  const calcTotal    = enrichedItems.reduce((s,i)=>s+i.resolvedQuantity*i.resolvedUnitPrice,0);
  const matchedCount = enrichedItems.filter((i)=>i.linkStatus!=="new").length;
  const newCount     = enrichedItems.filter((i)=>i.linkStatus==="new").length;

  // ═══════════════════════════════ RENDER ═══════════════════════════════════

  // ─── UPLOAD ──────────────────────────────────────────────────────────────
  const renderUpload = () => (
    <div className="p-6 space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e)=>{e.preventDefault();setIsDragging(true);}}
        onDragLeave={()=>setIsDragging(false)}
        onDrop={handleDrop}
        onClick={()=>uploadedImages.length<MAX_IMAGES&&fileInputRef.current?.click()}
        className="relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200"
        style={{
          background: isDragging ? th.dropzoneActiveBg : th.dropzoneBg,
          borderColor: isDragging ? "#E84545" : th.dropzoneBorder,
          cursor: uploadedImages.length >= MAX_IMAGES ? "not-allowed" : "pointer",
        }}
      >
        <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{background:"rgba(232,69,69,0.10)"}}>
            <Image className="h-7 w-7 text-[#E84545]"/>
          </div>
          <p className="font-semibold text-sm mb-1" style={{color:th.textPrimary}}>
            {uploadedImages.length === 0 ? "Drop invoice images here" : `Drop more images (${uploadedImages.length}/${MAX_IMAGES})`}
          </p>
          <p className="text-xs" style={{color:th.textSecondary}}>
            JPEG · PNG · WEBP · max 10MB each · up to {MAX_IMAGES} pages
          </p>
          {uploadedImages.length < MAX_IMAGES && (
            <p className="text-[11px] mt-1.5 text-[#E84545]">Click to browse or drag &amp; drop</p>
          )}
        </div>
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="scan-line" style={{background:"linear-gradient(transparent,rgba(232,69,69,0.4),transparent)"}}/>
          </div>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e)=>{ const files=Array.from(e.target.files||[]); addImages(files); e.target.value=""; }}/>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e)=>{ const files=Array.from(e.target.files||[]); addImages(files); e.target.value=""; }}/>

      {/* Add buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={(e)=>{e.stopPropagation();cameraInputRef.current?.click();}}
          disabled={uploadedImages.length>=MAX_IMAGES}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{background:th.itemBg,borderColor:th.itemBorder,color:th.textPrimary}}>
          <Camera className="h-4 w-4 text-[#E84545]"/>Take Photo
        </button>
        <button
          onClick={(e)=>{e.stopPropagation();fileInputRef.current?.click();}}
          disabled={uploadedImages.length>=MAX_IMAGES}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{background:th.itemBg,borderColor:th.itemBorder,color:th.textPrimary}}>
          <FileImage className="h-4 w-4 text-[#E84545]"/>Upload Files
        </button>
      </div>

      {/* Image preview grid */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{color:th.textSecondary}}>
              {uploadedImages.length} page{uploadedImages.length>1?"s":""} ready to scan
            </p>
            <button onClick={()=>setUploadedImages([])} className="text-[11px] flex items-center gap-1 transition-colors" style={{color:"#f87171"}}>
              <Trash2 className="h-3 w-3"/>Clear all
            </button>
          </div>

          {/* Grid — show up to 3 then a "+N more" tile */}
          <div className="grid grid-cols-3 gap-2">
            {(showAllPreviews ? uploadedImages : uploadedImages.slice(0,3)).map((img, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border group" style={{borderColor:th.itemBorder,aspectRatio:"4/3"}}>
                <img src={img.preview} alt={`Page ${idx+1}`} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e)=>{e.stopPropagation();removeImage(idx);}}
                    className="p-1.5 rounded-full bg-red-500/80 text-white active:scale-95 transition-all">
                    <X className="h-3.5 w-3.5"/>
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white">
                  {idx+1}
                </div>
              </div>
            ))}
            {/* "+N more" tile */}
            {!showAllPreviews && uploadedImages.length > 3 && (
              <button
                onClick={()=>setShowAllPreviews(true)}
                className="rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95"
                style={{borderColor:th.itemBorder,background:th.itemBg,aspectRatio:"4/3"}}>
                <p className="text-lg font-bold" style={{color:th.textPrimary}}>+{uploadedImages.length-3}</p>
                <p className="text-[10px]" style={{color:th.textMuted}}>more</p>
              </button>
            )}
          </div>
          {showAllPreviews && uploadedImages.length > 3 && (
            <button onClick={()=>setShowAllPreviews(false)} className="text-[11px] w-full text-center" style={{color:th.textMuted}}>Show less ↑</button>
          )}
        </div>
      )}

      {/* Error */}
      {parseError && (
        <div className="flex items-start gap-3 p-4 rounded-xl border" style={{background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.25)"}}>
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/>
          <p className="text-sm text-red-400">{parseError}</p>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 rounded-xl border" style={{background:th.itemBg,borderColor:th.itemBorder}}>
        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{color:th.textSecondary}}>
          <Zap className="h-3.5 w-3.5 text-[#E84545]"/>Tips for best results
        </p>
        <ul className="space-y-1">
          {[
            "Upload multiple pages of the same invoice together",
            "Good lighting — avoid shadows and glare",
            "Include part numbers for faster matching",
            "Arabic invoices supported — names auto-translated to English",
          ].map((tip)=>(
            <li key={tip} className="text-xs flex items-center gap-2" style={{color:th.textMuted}}>
              <span className="w-1 h-1 rounded-full bg-[#E84545] flex-shrink-0"/>{tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Parse button */}
      <button
        onClick={handleParse}
        disabled={uploadedImages.length===0}
        className="w-full py-3.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
        <ScanLine className="h-5 w-5"/>
        {uploadedImages.length > 1 ? `Parse ${uploadedImages.length} Pages with AI` : "Parse Invoice with AI"}
        <ChevronRight className="h-4 w-4"/>
      </button>
    </div>
  );

  // ─── PARSING ─────────────────────────────────────────────────────────────
  const renderParsing = () => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[340px] space-y-6">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-2 border-[#E84545]/20 animate-ping"/>
        <div className="absolute inset-2 rounded-full border-2 border-[#E84545]/30 animate-ping" style={{animationDelay:"0.2s"}}/>
        <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{background:"rgba(232,69,69,0.08)",border:"2px solid rgba(232,69,69,0.3)"}}>
          <ScanLine className="h-9 w-9 text-[#E84545] animate-pulse"/>
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-bold" style={{color:th.textPrimary}}>Analysing Invoice…</p>
        <p className="text-sm" style={{color:th.textSecondary}}>{parsingProgress || "Claude Vision is reading your invoice"}</p>
      </div>
      {uploadedImages.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {uploadedImages.map((img, i) => (
            <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-[#E84545]/40 relative">
              <img src={img.preview} alt={`p${i+1}`} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 flex items-center justify-center bg-[#E84545]/20">
                <Loader2 className="h-4 w-4 text-[#E84545] animate-spin" style={{animationDelay:`${i*0.2}s`}}/>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="w-full max-w-xs space-y-2.5">
        {[
          "Reading invoice structure",
          "Extracting line items",
          "Translating to English if needed",
          "Identifying supplier info",
        ].map((label,i)=>(
          <div key={label} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:"rgba(232,69,69,0.15)",border:"1px solid rgba(232,69,69,0.3)"}}>
              <Loader2 className="h-3 w-3 text-[#E84545] animate-spin" style={{animationDelay:`${i*0.15}s`}}/>
            </div>
            <p className="text-xs" style={{color:th.textSecondary}}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── SUPPLIER ────────────────────────────────────────────────────────────
  const renderSupplier = () => (
    <div className="p-6 space-y-5">
      {result?.supplierName && (
        <div className="p-3 rounded-xl border flex items-start gap-3" style={{background:"rgba(232,69,69,0.06)",borderColor:"rgba(232,69,69,0.25)"}}>
          <AlertCircle className="h-4 w-4 text-[#E84545] mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-xs font-semibold" style={{color:th.textPrimary}}>Detected from invoice</p>
            <p className="text-sm font-bold text-[#E84545]">{result.supplierName}</p>
            {result.supplierPhone&&<p className="text-xs" style={{color:th.textSecondary}}>{result.supplierPhone}</p>}
          </div>
        </div>
      )}
      {/* Merged info banner */}
      {uploadedImages.length > 1 && result && (
        <div className="p-3 rounded-xl border flex items-center gap-2" style={{background:"rgba(59,130,246,0.06)",borderColor:"rgba(59,130,246,0.20)"}}>
          <Image className="h-4 w-4 text-blue-400 flex-shrink-0"/>
          <p className="text-xs" style={{color:"#60a5fa"}}>
            {uploadedImages.length} pages merged — <strong>{result.items.length} unique items</strong> found
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(["select","create"] as const).map((m)=>(
          <button key={m} onClick={()=>setSupplierMode(m)} className="py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={{background:supplierMode===m?"#E84545":th.itemBg,color:supplierMode===m?"#fff":th.textSecondary,border:`1px solid ${supplierMode===m?"#E84545":th.itemBorder}`}}>
            {m==="select"?<><UserCheck className="h-4 w-4"/>Select Existing</>:<><UserPlus className="h-4 w-4"/>Add New</>}
          </button>
        ))}
      </div>
      {supplierMode==="select" ? (
        <div className="space-y-3">
          <select value={selectedSupplier?._id||""} onChange={(e)=>setSelectedSupplier(suppliers.find((s)=>String(s._id)===e.target.value)||null)} style={iS} className={iC}>
            <option value="">— Choose a supplier —</option>
            {suppliers.map((s)=><option key={s._id} value={String(s._id)}>{s.name} · {s.phone}</option>)}
          </select>
          {selectedSupplier&&(
            <div className="p-4 rounded-xl border" style={{background:th.matchedBg,borderColor:th.matchedBorder}}>
              <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-green-400"/><p className="font-semibold" style={{color:th.textPrimary}}>{selectedSupplier.name}</p></div>
              <p className="text-xs" style={{color:th.textSecondary}}>{selectedSupplier.phone}</p>
              {selectedSupplier.email&&<p className="text-xs" style={{color:th.textMuted}}>{selectedSupplier.email}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[{label:"Supplier Name *",key:"name",placeholder:"Name",span:true},{label:"Phone",key:"phone",placeholder:"+974 xxxx xxxx",span:false},{label:"Email",key:"email",placeholder:"email@supplier.com",span:false},{label:"Contact Person",key:"contactPerson",placeholder:"Contact name",span:false}].map((f)=>(
              <div key={f.key} className={f.span?"col-span-2":""}>
                <label className={lbl} style={{color:th.textMuted}}>{f.label}</label>
                <input value={(newSupplier as any)[f.key]} onChange={(e)=>setNewSupplier({...newSupplier,[f.key]:e.target.value})} style={iS} className={iC} placeholder={f.placeholder}/>
              </div>
            ))}
          </div>
          {selectedSupplier
            ? <div className="p-3 rounded-xl border flex items-center gap-2" style={{background:th.matchedBg,borderColor:th.matchedBorder}}><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0"/><p className="text-sm" style={{color:th.textPrimary}}>Saved: <strong>{selectedSupplier.name}</strong></p></div>
            : <button onClick={handleSaveNewSupplier} disabled={supplierSaving||!newSupplier.name} className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40" style={{background:"rgba(232,69,69,0.12)",border:"1px solid rgba(232,69,69,0.30)",color:"#E84545"}}>
                {supplierSaving?<Loader2 className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>}Save & Use This Supplier
              </button>
          }
        </div>
      )}
      <button onClick={()=>setStep("products")} disabled={supplierMode==="create"&&!selectedSupplier}
        className="w-full py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2">
        Continue to Products<ChevronRight className="h-4 w-4"/>
      </button>
      {!selectedSupplier&&<button onClick={()=>setStep("products")} className="w-full text-xs text-center py-1" style={{color:th.textMuted}}>Skip supplier for now →</button>}
    </div>
  );

  // ─── NEW PRODUCT FORM (full AddProductModal feature set) ──────────────────
  const renderNewProductForm = (idx: number) => {
    const f   = enrichedItems[idx].newProductForm;
    const upd = (p: Partial<NewProductForm>) => updateNPF(idx, p);
    return (
      <div className="border-t mt-2 pt-3 space-y-3" style={{borderColor:"rgba(232,69,69,0.20)"}}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#E84545] flex items-center gap-1.5"><Package className="h-3.5 w-3.5"/>Save to Inventory</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:"rgba(232,69,69,0.10)",color:"#E84545"}}>Next SKU: {currentNextSKU}</span>
        </div>
        <div><label className={lbl} style={{color:th.textMuted}}>Product Name *</label>
          <input value={f.name} onChange={(e)=>upd({name:e.target.value})} style={iS} className={iC} placeholder="Product name (English)"/></div>
        <div><label className={lbl} style={{color:th.textMuted}}>Description</label>
          <textarea value={f.description} onChange={(e)=>upd({description:e.target.value})} rows={2} style={{...iS,resize:"none"}} className={iC} placeholder="Optional"/></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl} style={{color: !f.categoryId ? "#E84545" : th.textMuted}}>Category *</label>
            <div className="flex gap-1">
              <select value={f.categoryId} onChange={(e)=>upd({categoryId:e.target.value})}
                style={{...iS, borderColor: !f.categoryId ? "rgba(232,69,69,0.6)" : th.inputBorder}}
                className={`${iC} flex-1`}
                disabled={categoriesLoading}>
                <option value="">{categoriesLoading ? "Loading…" : "Select category…"}</option>
                {categories.map((c:any)=><option key={c._id} value={String(c._id)}>{c.name}</option>)}
              </select>
              <button
                onClick={()=>{setShowAddCategory(v=>!v); setNewCategoryName("");}}
                title="Add new category"
                className="px-2 rounded-lg flex-shrink-0 transition-all active:scale-95"
                style={{background:"rgba(232,69,69,0.10)",border:"1px solid rgba(232,69,69,0.25)",color:"#E84545"}}>
                <Plus className="h-3.5 w-3.5"/>
              </button>
            </div>
            {showAddCategory && (
              <div className="mt-1.5 flex gap-1.5">
                <input
                  value={newCategoryName}
                  onChange={(e)=>setNewCategoryName(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==="Enter") handleAddCategory(); if(e.key==="Escape") setShowAddCategory(false); }}
                  style={iS} className={`${iC} flex-1`}
                  placeholder="New category name…"
                  autoFocus
                />
                <button
                  onClick={handleAddCategory}
                  disabled={savingCategory||!newCategoryName.trim()}
                  className="px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
                  style={{background:"rgba(232,69,69,0.15)",border:"1px solid rgba(232,69,69,0.30)",color:"#E84545"}}>
                  {savingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <CheckCircle className="h-3.5 w-3.5"/>}
                  {savingCategory ? "" : "Save"}
                </button>
                <button
                  onClick={()=>setShowAddCategory(false)}
                  className="px-2 rounded-lg transition-all active:scale-95 flex-shrink-0"
                  style={{background:th.itemBg,border:`1px solid ${th.itemBorder}`,color:th.textMuted}}>
                  <X className="h-3.5 w-3.5"/>
                </button>
              </div>
            )}
          </div>
          <div><label className={lbl} style={{color:th.textMuted}}>Barcode</label>
            <input value={f.barcode} onChange={(e)=>upd({barcode:e.target.value})} style={iS} className={iC} placeholder="Barcode"/></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={lbl} style={{color:th.textMuted}}>Part Number</label>
            <input value={f.partNumber} onChange={(e)=>upd({partNumber:e.target.value})} style={iS} className={iC} placeholder="Part #"/></div>
          <div><label className={lbl} style={{color:th.textMuted}}>Unit</label>
            <select value={f.unit} onChange={(e)=>upd({unit:e.target.value})} style={iS} className={iC}>
              {UNITS.map((u)=><option key={u} value={u}>{u}</option>)}</select></div>
        </div>
        {/* Vehicle toggle */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl border" style={{background:th.vehicleBg,borderColor:th.vehicleBorder}}>
          <input type="checkbox" id={`veh-${idx}`} checked={f.isVehicle} onChange={(e)=>upd({isVehicle:e.target.checked})} className="h-4 w-4 accent-[#E84545]"/>
          <label htmlFor={`veh-${idx}`} className="text-xs font-medium flex items-center gap-1.5 cursor-pointer" style={{color:th.textPrimary}}>
            <Car className="h-3.5 w-3.5 text-[#E84545]"/>Vehicle or vehicle part
          </label>
        </div>
        {f.isVehicle && (
          <div className="p-3 rounded-xl border space-y-2.5" style={{background:th.vehicleBg,borderColor:th.vehicleBorder}}>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl} style={{color:th.textMuted}}>Make *</label>
                <select value={f.carMake} onChange={(e)=>upd({carMake:e.target.value as CarMake|"",carModel:""})} style={iS} className={iC}>
                  <option value="">Select Make</option>
                  {Object.keys(carMakesModels).map((m)=><option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className={lbl} style={{color:th.textMuted}}>Model</label>
                <select value={f.carModel} onChange={(e)=>upd({carModel:e.target.value})} disabled={!f.carMake} style={iS} className={iC}>
                  <option value="">Select Model</option>
                  {f.carMake&&(carMakesModels[f.carMake as CarMake]||[]).map((m:string)=><option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className={lbl} style={{color:th.textMuted}}>Variant</label>
                <select value={f.variant} onChange={(e)=>upd({variant:e.target.value})} style={iS} className={iC}>
                  <option value="">Select Variant</option>
                  {VEHICLE_VARIANTS.map((v)=><option key={v} value={v}>{v}</option>)}
                  <option value="custom">Custom…</option></select></div>
              <div><label className={lbl} style={{color:th.textMuted}}>Color</label>
                <select value={f.color} onChange={(e)=>upd({color:e.target.value})} style={iS} className={iC}>
                  <option value="">Select Color</option>
                  {VEHICLE_COLORS.map((c)=><option key={c} value={c}>{c}</option>)}
                  <option value="custom">Custom…</option></select></div>
              {f.variant==="custom"&&<div className="col-span-2"><label className={lbl} style={{color:th.textMuted}}>Custom Variant</label><input value={f.customVariant} onChange={(e)=>upd({customVariant:e.target.value})} style={iS} className={iC} placeholder="Enter variant"/></div>}
              {f.color==="custom"&&<div className="col-span-2"><label className={lbl} style={{color:th.textMuted}}>Custom Color</label><input value={f.customColor} onChange={(e)=>upd({customColor:e.target.value})} style={iS} className={iC} placeholder="Enter color"/></div>}
            </div>
            <div><label className={lbl} style={{color:th.textMuted}}>Year Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl} style={{color:th.textMuted}}>From</label>
                  <input type="number" value={f.yearFrom} onChange={(e)=>upd({yearFrom:e.target.value})} style={iS} className={iC} placeholder="e.g. 2015" min="1900" max="2100"/></div>
                <div><label className={lbl} style={{color:th.textMuted}}>To</label>
                  <input type="number" value={f.yearTo} onChange={(e)=>upd({yearTo:e.target.value})} style={iS} className={iC} placeholder="e.g. 2024" min="1900" max="2100"/></div>
              </div>
              <p className="text-[10px] mt-1" style={{color:th.textMuted}}>Leave "To" empty for current year onwards</p>
            </div>
            <div><label className={lbl} style={{color:th.textMuted}}>VIN (optional)</label>
              <input value={f.vin} onChange={(e)=>upd({vin:e.target.value})} style={iS} className={iC} placeholder="Vehicle ID Number"/></div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div><label className={lbl} style={{color:th.textMuted}}>Cost Price</label>
            <input type="number" value={f.costPrice} onChange={(e)=>upd({costPrice:parseFloat(e.target.value)||0})} min={0} step={0.01} style={iS} className={iC}/></div>
          <div><label className={lbl} style={{color:th.textMuted}}>Selling Price</label>
            <input type="number" value={f.sellingPrice} onChange={(e)=>upd({sellingPrice:parseFloat(e.target.value)||0})} min={0} step={0.01} style={iS} className={iC}/></div>
          <div><label className={lbl} style={{color:th.textMuted}}>Tax %</label>
            <input type="number" value={f.taxRate} onChange={(e)=>upd({taxRate:parseFloat(e.target.value)||0})} min={0} max={100} step={0.5} style={iS} className={iC}/></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={lbl} style={{color:th.textMuted}}>Min Stock</label>
            <input type="number" value={f.minStock} onChange={(e)=>upd({minStock:parseFloat(e.target.value)||0})} min={0} style={iS} className={iC}/></div>
          <div><label className={lbl} style={{color:th.textMuted}}>Max Stock</label>
            <input type="number" value={f.maxStock} onChange={(e)=>upd({maxStock:parseFloat(e.target.value)||0})} min={0} style={iS} className={iC}/></div>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)"}}>
          <AlertCircle className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5"/>
          <p className="text-[10px]" style={{color:"#60a5fa"}}>
            Product will be created with <strong>0 opening stock</strong>. Stock will be added automatically when this purchase is confirmed.
          </p>
        </div>
        <button onClick={()=>handleSaveNewProduct(idx)} disabled={enrichedItems[idx].saving||!f.name.trim()}
          className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
          style={{background:"linear-gradient(135deg,#E84545,#cc3c3c)",color:"#fff"}}>
          {enrichedItems[idx].saving?<><Loader2 className="h-4 w-4 animate-spin"/>Saving…</>:<><CheckCircle className="h-4 w-4"/>Save to Inventory & Use</>}
        </button>
      </div>
    );
  };

  // ─── PRODUCTS ────────────────────────────────────────────────────────────
  const renderProducts = () => (
    <div className="flex flex-col min-h-0">
      <div className="px-6 py-3 border-b flex items-center justify-between gap-3 flex-wrap" style={{borderColor:th.divider}}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">✓ {matchedCount} matched</span>
          {newCount>0&&<span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-red-500/15 text-red-400 border-red-500/30">+ {newCount} new</span>}
          {result?.invoiceNumber&&<span className="text-xs font-mono px-2.5 py-1 rounded-full border" style={{background:th.itemBg,borderColor:th.itemBorder,color:th.textMuted}}>{result.invoiceNumber}</span>}
          {uploadedImages.length>1&&<span className="text-[10px] px-2.5 py-1 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">{uploadedImages.length} pages</span>}
        </div>
        <button onClick={()=>setStep("supplier")} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border" style={{background:th.itemBg,borderColor:th.itemBorder,color:th.textSecondary}}><RotateCcw className="h-3 w-3"/>Back</button>
      </div>

      {result?.warnings?.length?<div className="mx-6 mt-3 p-3 rounded-xl border" style={{background:"rgba(251,191,36,0.06)",borderColor:"rgba(251,191,36,0.25)"}}><div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5"/><div className="space-y-0.5">{result.warnings.map((w,i)=><p key={i} className="text-xs text-yellow-300">{w}</p>)}</div></div></div>:null}

      <div className="mx-6 mt-3 flex items-center gap-4 text-[10px]" style={{color:th.textMuted}}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>Matched</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Manual link</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E84545] inline-block"/>New item</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3" style={{maxHeight:"420px"}}>
        {enrichedItems.map((item,idx)=>{
          const isLinked  = item.linkStatus!=="new";
          const rowBg     = item.linkStatus==="matched"?th.matchedBg:item.linkStatus==="manual"?th.manualBg:th.newBg;
          const rowBorder = item.linkStatus==="matched"?th.matchedBorder:item.linkStatus==="manual"?th.manualBorder:th.newBorder;
          const badge = confidenceBadge(item.confidence);
          return (
            <div key={idx} className="rounded-xl border overflow-hidden transition-all" style={{background:rowBg,borderColor:item.isEditing?"rgba(232,69,69,0.5)":rowBorder}}>
              <div className="px-3 pt-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.linkStatus==="matched"?"bg-green-400":item.linkStatus==="manual"?"bg-blue-400":"bg-[#E84545]"}`}/>
                    {item.isEditing
                      ? <input value={item.resolvedName} onChange={(e)=>updateItem(idx,{resolvedName:e.target.value,newProductForm:{...item.newProductForm,name:e.target.value}})} style={iS} className={`${iC} font-semibold`} placeholder="Product name (English)"/>
                      : <span className="text-sm font-semibold truncate" style={{color:th.textPrimary}}>{item.resolvedName||<span style={{color:th.textMuted}}>(unnamed)</span>}</span>
                    }
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                    {item.linkStatus==="matched"&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">✓ Matched</span>}
                    {item.linkStatus==="manual"&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">⚡ Linked</span>}
                    {item.linkStatus==="new"&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E84545]/10 border border-[#E84545]/20 text-[#E84545]">+ New</span>}
                    {item.savedProduct&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">✓ Saved</span>}
                  </div>
                  {item.resolvedPartNumber&&!item.isEditing&&<p className="text-[11px] font-mono ml-3.5" style={{color:th.textMuted}}>Part #: {item.resolvedPartNumber}</p>}
                  {item.matchedProduct&&!item.isEditing&&<p className="text-[10px] ml-3.5" style={{color:th.textMuted}}>SKU: {item.matchedProduct.sku} · Stock: {item.matchedProduct.currentStock} · Cost: {item.matchedProduct.costPrice?.toFixed(2)}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={()=>updateItem(idx,{isEditing:!item.isEditing})} className="p-1.5 rounded-lg transition-all" style={{background:"rgba(232,69,69,0.08)",color:"#E84545"}}>
                    {item.isEditing?<CheckCircle className="h-3.5 w-3.5"/>:<Edit3 className="h-3.5 w-3.5"/>}
                  </button>
                  {isLinked&&<button onClick={()=>unlinkItem(idx)} className="p-1.5 rounded-lg transition-all" style={{background:"rgba(251,191,36,0.08)",color:"#fbbf24"}}><Unlink className="h-3.5 w-3.5"/></button>}
                  <button onClick={()=>removeItem(idx)} className="p-1.5 rounded-lg transition-all" style={{background:"rgba(239,68,68,0.08)",color:"#f87171"}}><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
              {item.isEditing ? (
                <div className="px-3 pb-3 pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={lbl} style={{color:th.textMuted}}>Part Number</label>
                      <input value={item.resolvedPartNumber} onChange={(e)=>updateItem(idx,{resolvedPartNumber:e.target.value})} style={iS} className={iC} placeholder="Part #"/></div>
                    <div><label className={lbl} style={{color:th.textMuted}}>Unit</label>
                      <select value={item.resolvedUnit} onChange={(e)=>updateItem(idx,{resolvedUnit:e.target.value})} style={iS} className={iC}>
                        {UNITS.map((u)=><option key={u} value={u}>{u}</option>)}</select></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={lbl} style={{color:th.textMuted}}>Qty</label><input type="number" value={item.resolvedQuantity} min={0.001} onChange={(e)=>updateItem(idx,{resolvedQuantity:parseFloat(e.target.value)||1})} style={iS} className={iC}/></div>
                    <div><label className={lbl} style={{color:th.textMuted}}>Unit Price</label><input type="number" value={item.resolvedUnitPrice} min={0} step={0.01} onChange={(e)=>updateItem(idx,{resolvedUnitPrice:parseFloat(e.target.value)||0})} style={iS} className={iC}/></div>
                    <div><label className={lbl} style={{color:th.textMuted}}>Tax %</label><input type="number" value={item.resolvedTaxRate} min={0} max={100} step={0.5} onChange={(e)=>updateItem(idx,{resolvedTaxRate:parseFloat(e.target.value)||0})} style={iS} className={iC}/></div>
                  </div>
                </div>
              ) : (
                <div className="px-3 pb-2 pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {[{label:"Qty",value:`${item.resolvedQuantity} ${item.resolvedUnit}`},{label:"Unit Price",value:item.resolvedUnitPrice.toFixed(2)},{label:"Line Total",value:(item.resolvedQuantity*item.resolvedUnitPrice).toFixed(2)}].map((s)=>(
                      <div key={s.label} className="text-center p-1.5 rounded-lg" style={{background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"}}>
                        <p className="text-[9px] mb-0.5" style={{color:th.textMuted}}>{s.label}</p>
                        <p className="text-xs font-semibold" style={{color:th.textPrimary}}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isLinked && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="p-2.5 rounded-lg border" style={{background:isDark?"rgba(59,130,246,0.06)":"rgba(59,130,246,0.03)",borderColor:"rgba(59,130,246,0.20)"}}>
                    <p className="text-[10px] font-semibold mb-1.5 flex items-center gap-1" style={{color:"#60a5fa"}}><Link className="h-3 w-3"/>Link by SKU Code</p>
                    <div className="flex gap-2">
                      <input value={item.manualLookupInput} onChange={(e)=>updateItem(idx,{manualLookupInput:e.target.value})}
                        onKeyDown={(e)=>{if(e.key==="Enter")handleSkuLookup(idx,item.manualLookupInput);}}
                        style={iS} className={iC} placeholder="Enter inventory SKU…"/>
                      <button onClick={()=>handleSkuLookup(idx,item.manualLookupInput)} disabled={item.lookingUp||!item.manualLookupInput.trim()}
                        className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
                        style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.30)",color:"#60a5fa"}}>
                        {item.lookingUp?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Search className="h-3.5 w-3.5"/>}
                        {item.lookingUp?"":"Find"}
                      </button>
                    </div>
                  </div>
                  <button onClick={()=>updateItem(idx,{newProductExpanded:!item.newProductExpanded})}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{background:"rgba(232,69,69,0.10)",border:"1px solid rgba(232,69,69,0.25)",color:"#E84545"}}>
                    <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5"/>{item.savedProduct?"Edit & Re-save to Inventory":"Create New Product in Inventory"}</span>
                    {item.newProductExpanded?<ChevronUp className="h-3.5 w-3.5"/>:<ChevronDown className="h-3.5 w-3.5"/>}
                  </button>
                  {item.newProductExpanded && renderNewProductForm(idx)}
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addBlankItem} className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-95" style={{borderColor:th.itemBorder,color:th.textMuted}}>
          <Plus className="h-4 w-4"/>Add Item Manually
        </button>
      </div>

      <div className="border-t px-6 py-4" style={{borderColor:th.divider}}>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <p className="text-xs" style={{color:th.textSecondary}}>{enrichedItems.length} item{enrichedItems.length!==1?"s":""}</p>
            <p className="text-lg font-bold" style={{color:th.textPrimary}}>Est. Total: <span className="text-[#E84545]">{calcTotal.toLocaleString("en-QA",{minimumFractionDigits:2})}</span></p>
          </div>
          {result?.grandTotal&&Math.abs(result.grandTotal-calcTotal)>0.5&&(
            <div className="text-right">
              <p className="text-[10px]" style={{color:th.textMuted}}>Invoice total</p>
              <p className="text-sm font-semibold text-yellow-400">{result.grandTotal.toLocaleString("en-QA",{minimumFractionDigits:2})}</p>
              <p className="text-[10px] text-yellow-500">⚠ Mismatch</p>
            </div>
          )}
        </div>
        <button onClick={()=>setStep("confirm")} disabled={enrichedItems.filter(i=>i.resolvedName.trim()).length===0}
          className="w-full py-3.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
          <ChevronRight className="h-5 w-5"/>Review & Confirm
        </button>
      </div>
    </div>
  );

  // ─── CONFIRM ─────────────────────────────────────────────────────────────
  const renderConfirm = () => {
    const valid = enrichedItems.filter(i=>i.resolvedName.trim()&&i.resolvedQuantity>0);
    return (
      <div className="flex flex-col min-h-0">
        <div className="px-6 py-3 border-b" style={{borderColor:th.divider}}><p className="text-xs" style={{color:th.textSecondary}}>Review before adding to cart</p></div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{maxHeight:"420px"}}>
          <div className="p-4 rounded-xl border" style={{background:th.itemBg,borderColor:th.itemBorder}}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{color:th.textMuted}}><UserCheck className="h-3.5 w-3.5 text-[#E84545]"/>SUPPLIER</p>
            {selectedSupplier?<p className="text-sm font-bold" style={{color:th.textPrimary}}>{selectedSupplier.name}</p>:<p className="text-sm text-yellow-400">⚠ No supplier — set it in the purchase form</p>}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{color:th.textMuted}}><Package className="h-3.5 w-3.5 text-[#E84545]"/>{valid.length} ITEMS</p>
            {valid.map((item,idx)=>(
              <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl border" style={{background:th.itemBg,borderColor:th.itemBorder}}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.linkStatus==="matched"?"bg-green-400":item.linkStatus==="manual"?"bg-blue-400":"bg-[#E84545]"}`}/>
                    <p className="text-sm font-medium truncate" style={{color:th.textPrimary}}>{item.resolvedName}</p>
                    {item.savedProduct&&<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex-shrink-0">Saved</span>}
                  </div>
                  <p className="text-xs ml-3" style={{color:th.textMuted}}>
                    {item.resolvedQuantity} {item.resolvedUnit} × {item.resolvedUnitPrice.toFixed(2)}
                    {item.resolvedPartNumber?` · Part #: ${item.resolvedPartNumber}`:""}
                  </p>
                </div>
                <p className="text-sm font-bold flex-shrink-0" style={{color:th.textPrimary}}>{(item.resolvedQuantity*item.resolvedUnitPrice).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{background:"rgba(232,69,69,0.06)",borderColor:"rgba(232,69,69,0.25)"}}>
            <p className="font-bold" style={{color:th.textPrimary}}>Estimated Total</p>
            <p className="text-xl font-bold text-[#E84545]">{calcTotal.toLocaleString("en-QA",{minimumFractionDigits:2})}</p>
          </div>
          {newCount>0&&(
            <div className="p-3 rounded-xl border" style={{background:"rgba(251,191,36,0.06)",borderColor:"rgba(251,191,36,0.20)"}}>
              <p className="text-xs text-yellow-300 flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"/>
                {newCount} item{newCount>1?"s are":" is"} not in inventory. Consider saving them first.
              </p>
            </div>
          )}
        </div>
        <div className="border-t px-6 py-4 flex gap-3" style={{borderColor:th.divider}}>
          <button onClick={()=>setStep("products")} className="flex-1 py-3 rounded-xl font-semibold text-sm border transition-all active:scale-95" style={{background:th.itemBg,borderColor:th.itemBorder,color:th.textSecondary}}>← Edit Items</button>
          <button onClick={handleConfirm} className="flex-1 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
            <CheckCircle className="h-5 w-5"/>Add {valid.length} to Cart
          </button>
        </div>
      </div>
    );
  };

  // ─── ROOT ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes scanLine{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}} .scan-line{position:absolute;inset-x:0;height:40%;animation:scanLine 1.2s linear infinite;}`}</style>
      <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 backdrop-blur-sm" style={{background:th.overlay}}
        onClick={(e)=>{if(e.target===e.currentTarget&&step!=="parsing")onClose();}}>
        <div className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden max-h-[92vh]" style={{background:th.modalBg,borderColor:th.border}}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{borderColor:th.divider}}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(232,69,69,0.10)"}}><ScanLine className="h-5 w-5 text-[#E84545]"/></div>
              <div>
                <h2 className="font-bold text-base" style={{color:th.textPrimary}}>OCR Invoice Scanner</h2>
                <p className="text-xs" style={{color:th.textSecondary}}>
                  {step==="upload"  && (uploadedImages.length>0?`${uploadedImages.length} page${uploadedImages.length>1?"s":""} ready`:"Upload invoice images")}
                  {step==="parsing" && "AI is processing your invoice…"}
                  {step==="supplier"&& "Verify or add supplier"}
                  {step==="products"&& "Match & review products"}
                  {step==="confirm" && "Confirm and add to cart"}
                </p>
              </div>
            </div>
            {step!=="parsing"&&<button onClick={onClose} className="p-2 rounded-xl transition-all active:scale-95" style={{background:th.closeBg,color:th.textSecondary}}><X className="h-5 w-5"/></button>}
          </div>

          {/* Step indicator */}
          <div className="flex items-center px-6 py-2 border-b flex-shrink-0" style={{borderColor:th.divider}}>
            {visibleSteps.map((s,i)=>{
              const isPast=i<curIdx; const isActive=i===curIdx||(step==="parsing"&&i===0);
              return (
                <div key={s} className="flex items-center gap-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{background:isActive?"#E84545":isPast?"rgba(232,69,69,0.25)":th.itemBg,color:isActive?"#fff":isPast?"#E84545":th.textMuted,border:isPast?"1px solid rgba(232,69,69,0.4)":"1px solid transparent"}}>
                      {isPast?"✓":i+1}
                    </div>
                    <span className="text-[11px] font-medium" style={{color:isActive?th.textPrimary:th.textMuted}}>{LABELS[s]}</span>
                  </div>
                  {i<visibleSteps.length-1&&<ChevronRight className="h-3 w-3 mx-2" style={{color:th.textMuted}}/>}
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {step==="upload"  && renderUpload()}
            {step==="parsing" && renderParsing()}
            {step==="supplier"&& renderSupplier()}
            {step==="products"&& renderProducts()}
            {step==="confirm" && renderConfirm()}
          </div>
        </div>
      </div>
    </>
  );
}