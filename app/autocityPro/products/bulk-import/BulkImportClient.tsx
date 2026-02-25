"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ChevronLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Download, Loader2, RefreshCw, Info,
  ArrowRight, XCircle, Check, AlertCircle, X, FileDown, Package,
  Zap, List, AlertOctagon,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Time-based theme ────────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ImportRow {
  _rowIndex: number;
  name: string;
  description?: string;
  categoryName?: string;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  partNumber?: string;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  taxRate?: number;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  isVehicle?: boolean;
  carMake?: string;
  carModel?: string;
  variant?: string;
  yearFrom?: number;
  yearTo?: number;
  color?: string;
  vin?: string;
  errors: string[];
  warnings: string[];
  status: "pending" | "importing" | "success" | "error" | "skipped";
  importError?: string;
  importedSKU?: string;
}

type ProductField = keyof Omit<ImportRow, "errors" | "warnings" | "status" | "importError" | "importedSKU" | "_rowIndex">;
type ColumnMap = Record<string, ProductField | "">;

// ─── Import Mode ─────────────────────────────────────────────────────────────
type ImportMode = "fast" | "stock";

interface BulkImportClientProps {
  initialUser: any;
  categories: { _id: string; name: string }[];
  nextSKU: string;
}

// ─── Field definitions ────────────────────────────────────────────────────────
const PRODUCT_FIELDS: { key: ProductField; label: string; required?: boolean }[] = [
  { key: "name", label: "Product Name", required: true },
  { key: "sku", label: "SKU" },
  { key: "categoryName", label: "Category" },
  { key: "barcode", label: "Barcode" },
  { key: "description", label: "Description" },
  { key: "unit", label: "Unit" },
  { key: "costPrice", label: "Cost Price" },
  { key: "sellingPrice", label: "Selling Price" },
  { key: "taxRate", label: "Tax Rate (%)" },
  { key: "currentStock", label: "Current Stock" },
  { key: "minStock", label: "Min Stock" },
  { key: "maxStock", label: "Max Stock" },
  { key: "isVehicle", label: "Is Vehicle (true/false)" },
  { key: "carMake", label: "Car Make" },
  { key: "carModel", label: "Car Model" },
  { key: "variant", label: "Variant" },
  { key: "yearFrom", label: "Year From" },
  { key: "yearTo", label: "Year To" },
  { key: "color", label: "Color" },
  { key: "partNumber", label: "Part Number" },
  { key: "vin", label: "VIN" },
];

const HEADER_AUTO_MAP: Record<string, ProductField> = {
  "name": "name", "product name": "name", "item name": "name", "product": "name",
  "sku": "sku", "item code": "sku", "item no": "sku", "product code": "sku",
  "category": "categoryName", "category name": "categoryName",
  "barcode": "barcode", "bar code": "barcode",
  "description": "description",
  "unit": "unit", "unit of measure": "unit", "uom": "unit",
  "cost price": "costPrice", "cost": "costPrice", "purchase price": "costPrice",
  "selling price": "sellingPrice", "price": "sellingPrice", "sale price": "sellingPrice", "retail price": "sellingPrice",
  "tax rate": "taxRate", "tax": "taxRate", "vat rate": "taxRate",
  "current stock": "currentStock", "stock": "currentStock", "qty": "currentStock",
  "quantity": "currentStock", "opening stock": "currentStock",
  "min stock": "minStock", "minimum stock": "minStock", "reorder": "minStock", "reorder point": "minStock",
  "max stock": "maxStock", "maximum stock": "maxStock",
  "is vehicle": "isVehicle", "vehicle": "isVehicle",
  "car make": "carMake", "make": "carMake",
  "car model": "carModel", "model": "carModel",
  "variant": "variant",
  "year from": "yearFrom", "year start": "yearFrom", "from": "yearFrom",
  "year to": "yearTo", "year end": "yearTo", "to": "yearTo",
  "color": "color", "colour": "color",
  "part number": "partNumber", "part no": "partNumber", "partno": "partNumber",
  "vin": "vin",
};

// ─── Parsers ─────────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const parseRow = (line: string) => {
    const result: string[] = []; let current = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
      else current += ch;
    }
    result.push(current.trim()); return result;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

async function parseXLSX(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const XLSX = (window as any).XLSX;
        if (!XLSX) { reject(new Error("SheetJS not loaded. Please use CSV instead.")); return; }
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (!jsonRows.length) { resolve({ headers: [], rows: [] }); return; }
        const headers: string[] = jsonRows[0].map((h: any) => String(h).trim());
        const rows = jsonRows.slice(1).map((r: any[]) => {
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = String(r[i] ?? "").trim(); });
          return row;
        });
        resolve({ headers, rows });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function validateRow(row: ImportRow, enableWarnings: boolean): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!row.name?.trim()) errors.push("Product name is required");
  if (row.costPrice !== undefined && row.costPrice < 0) errors.push("Cost price cannot be negative");
  if (row.sellingPrice !== undefined && row.sellingPrice < 0) errors.push("Selling price cannot be negative");
  if (row.currentStock !== undefined && row.currentStock < 0) errors.push("Stock cannot be negative");
  if (row.taxRate !== undefined && (row.taxRate < 0 || row.taxRate > 100)) errors.push("Tax rate must be 0–100");
  if (row.yearFrom && row.yearTo && row.yearFrom > row.yearTo) errors.push("Year From must be ≤ Year To");
  if ((row.isVehicle || row.carMake) && !row.carMake) errors.push("Car Make required for vehicle products");

  if (enableWarnings) {
    if (!row.costPrice || row.costPrice === 0) warnings.push("No cost price — inventory value won't be tracked in ledger");
    if (row.currentStock === undefined) warnings.push("No stock specified — defaults to 0");
  }

  return { ...row, errors, warnings };
}

function downloadTemplate() {
  const headers = "Name,SKU,Category,Barcode,Unit,Cost Price,Selling Price,Tax Rate,Current Stock,Min Stock,Max Stock,Car Make,Car Model,Variant,Year From,Year To,Color,Part Number";
  const example = "SIDESTEP FIBER OG L,,EXTERIOR ACCESSORIES,,pcs,500,1800,0,1,0,1000,Toyota,Land Cruiser,Gxr,2016,2021,White,";
  const csv = [headers, example].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: "product_import_template.csv",
  });
  a.click();
}

// ─── Navigation Guard Hook ────────────────────────────────────────────────────
function useNavigationGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have an import in progress. Are you sure you want to leave? Your progress will be lost.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BulkImportClient({ initialUser, categories, nextSKU }: BulkImportClientProps) {
  const router = useRouter();
  const isDark = useTimeBasedTheme();
  const user = initialUser;

  const th = {
    pageBg: isDark ? '#050505' : '#f3f4f6',
    headerBgFrom: isDark ? '#932222' : '#fef2f2',
    headerBgVia: isDark ? '#411010' : '#fee2e2',
    headerBgTo: isDark ? '#a20c0c' : '#fecaca',
    headerTitle: isDark ? '#ffffff' : '#7f1d1d',
    headerSub: isDark ? 'rgba(255,255,255,0.80)' : '#991b1b',
    headerBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    headerBtnBg: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    headerBtnBorder: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)',
    headerBtnText: isDark ? '#ffffff' : '#7f1d1d',
    containerBg: isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)' : '#ffffff',
    containerBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    cardBg: isDark ? 'rgba(10,10,10,0.50)' : 'rgba(255,255,255,0.80)',
    cardBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? '#050505' : '#ffffff',
    inputBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    inputText: isDark ? '#ffffff' : '#111827',
    labelText: isDark ? '#d1d5db' : '#374151',
    mutedText: isDark ? '#9ca3af' : '#6b7280',
    faintText: isDark ? '#6b7280' : '#9ca3af',
    divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    rowHover: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    rowBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    primaryText: isDark ? '#ffffff' : '#111827',
    secondaryText: isDark ? '#d1d5db' : '#374151',
    pillBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    pillBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    infoBg: isDark ? 'rgba(232,69,69,0.05)' : 'rgba(232,69,69,0.04)',
    infoBorder: isDark ? 'rgba(232,69,69,0.15)' : 'rgba(232,69,69,0.12)',
    mapRowBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    mapRowBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [step, setStep] = useState<"select" | "upload" | "map" | "preview" | "importing" | "done">("select");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "errors" | "warnings" | "clean">("all");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, success: 0, failed: 0, skipped: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const abortRef = useRef(false);
  const categoryCache = useRef<Record<string, string>>({});

  // Navigation guard — active once user has loaded data (past select screen)
  const isInProgress = step !== "select" && step !== "done";
  useNavigationGuard(isInProgress);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  // ── Mode-specific config ──────────────────────────────────────────────────
  // In "stock" mode, warnings are suppressed so the reviewer only sees hard errors.
  // In "fast" mode, warnings are shown to help catch data quality issues.
  const enableWarnings = importMode === "fast";

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const isCSV = file.name.endsWith(".csv");
    const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isCSV && !isXLSX) { toast.error("Please upload a .csv or .xlsx file"); return; }
    try {
      setFileName(file.name);
      let parsed: { headers: string[]; rows: Record<string, string>[] };
      if (isCSV) { parsed = parseCSV(await file.text()); }
      else { parsed = await parseXLSX(file); }
      if (!parsed.headers.length || !parsed.rows.length) { toast.error("File is empty or could not be parsed"); return; }
      const nonEmpty = parsed.rows.filter(r => Object.values(r).some(v => v.trim()));
      setCsvHeaders(parsed.headers);
      setRawRows(nonEmpty);
      const autoMap: ColumnMap = {};
      parsed.headers.forEach(h => { autoMap[h] = HEADER_AUTO_MAP[h.toLowerCase().trim()] ?? ""; });
      setColumnMap(autoMap);
      setStep("map");
      toast.success(`${nonEmpty.length} rows detected in ${file.name}`);
    } catch (err: any) { toast.error(`Failed to parse file: ${err.message}`); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Apply column mapping ──────────────────────────────────────────────────
  const applyMapping = useCallback(() => {
    const parseNum = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
    const parseBool = (v: string) => ["true", "yes", "1", "y"].includes(v.toLowerCase().trim());
    const parsed: ImportRow[] = rawRows.map((raw, i) => {
      const get = (field: ProductField) => {
        const header = Object.entries(columnMap).find(([, f]) => f === field)?.[0];
        return header ? (raw[header] ?? "").trim() : "";
      };
      const carMake = get("carMake");
      const isVehicleParsed = parseBool(get("isVehicle") || "false") || !!carMake;
      const catName = get("categoryName");
      const matchCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      return validateRow({
        _rowIndex: i, name: get("name"),
        description: get("description") || undefined,
        categoryName: catName || undefined, categoryId: matchCat?._id,
        sku: get("sku") || undefined, barcode: get("barcode") || undefined,
        partNumber: get("partNumber") || undefined, unit: get("unit") || "pcs",
        costPrice: parseNum(get("costPrice")), sellingPrice: parseNum(get("sellingPrice")),
        taxRate: parseNum(get("taxRate")), currentStock: parseNum(get("currentStock")),
        minStock: parseNum(get("minStock")), maxStock: parseNum(get("maxStock")) ?? 1000,
        isVehicle: isVehicleParsed || undefined, carMake: carMake || undefined,
        carModel: get("carModel") || undefined, variant: get("variant") || undefined,
        yearFrom: parseNum(get("yearFrom")), yearTo: parseNum(get("yearTo")),
        color: get("color") || undefined, vin: get("vin") || undefined,
        errors: [], warnings: [], status: "pending",
      }, enableWarnings);
    });
    setRows(parsed);
    setFilterStatus("all");
    setExpandedRows(new Set());
    setStep("preview");
  }, [rawRows, columnMap, categories, enableWarnings]);

  // ── Stock-only edit handler ───────────────────────────────────────────────
  const updateRowStock = (rowIndex: number, value: string) => {
    const num = parseFloat(value);
    setRows(prev => prev.map(r =>
      r._rowIndex === rowIndex ? { ...r, currentStock: isNaN(num) ? undefined : num } : r
    ));
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const startImport = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (!validRows.length) { toast.error("No valid rows to import"); return; }
    setIsImporting(true);
    abortRef.current = false;
    categoryCache.current = {};
    setStep("importing");

    let existingSkus = new Set<string>();
    try {
      const skuRes = await fetch("/api/products?searchMode=true&limit=10000", { credentials: "include" });
      if (skuRes.ok) {
        const skuData = await skuRes.json();
        existingSkus = new Set((skuData.products as any[]).map((p: any) => String(p.sku)));
      }
    } catch { }

    const rowsWithSkipMarked = validRows.map(r =>
      r.sku && existingSkus.has(String(r.sku))
        ? { ...r, status: "skipped" as const, importError: `SKU ${r.sku} already exists — skipped` }
        : r
    );
    setRows(prev => prev.map(r => { const u = rowsWithSkipMarked.find(x => x._rowIndex === r._rowIndex); return u ?? r; }));

    const preSkipped = rowsWithSkipMarked.filter(r => r.status === "skipped").length;
    const actualRows = rowsWithSkipMarked.filter(r => r.status !== "skipped");
    setImportProgress({ done: 0, total: actualRows.length, success: 0, failed: 0, skipped: preSkipped });
    let success = 0, failed = 0, skipped = preSkipped;

    for (let i = 0; i < actualRows.length; i++) {
      if (abortRef.current) break;
      const row = actualRows[i];
      setRows(prev => prev.map(r => r._rowIndex === row._rowIndex ? { ...r, status: "importing" } : r));
      try {
        let resolvedCategoryId = row.categoryId;
        if (!resolvedCategoryId && row.categoryName?.trim()) {
          const catKey = row.categoryName.trim().toLowerCase();
          if (categoryCache.current[catKey]) {
            resolvedCategoryId = categoryCache.current[catKey];
          } else {
            const catRes = await fetch("/api/categories", {
              method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
              body: JSON.stringify({ name: row.categoryName.trim() }),
            });
            const catData = await catRes.json();
            if (catRes.ok && catData.category?._id) {
              resolvedCategoryId = catData.category._id;
              categoryCache.current[catKey] = catData.category._id;
            }
          }
        }
        const body: any = {
          name: row.name, description: row.description,
          categoryId: resolvedCategoryId, sku: row.sku || nextSKU,
          barcode: row.barcode, unit: row.unit || "pcs",
          costPrice: row.costPrice ?? 0, sellingPrice: row.sellingPrice ?? 0,
          taxRate: row.taxRate ?? 0, currentStock: row.currentStock ?? 0,
          minStock: row.minStock ?? 0, maxStock: row.maxStock ?? 1000,
        };
        if (row.isVehicle && row.carMake) {
          body.isVehicle = true; body.carMake = row.carMake; body.carModel = row.carModel;
          body.variant = row.variant; body.yearFrom = row.yearFrom; body.yearTo = row.yearTo;
          body.color = row.color; body.partNumber = row.partNumber; body.vin = row.vin;
        }
        const res = await fetch("/api/products", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          success++;
          setRows(prev => prev.map(r => r._rowIndex === row._rowIndex ? { ...r, status: "success", importedSKU: data.product?.sku } : r));
        } else {
          failed++;
          setRows(prev => prev.map(r => r._rowIndex === row._rowIndex ? { ...r, status: "error", importError: data.error || "Unknown error" } : r));
        }
      } catch (err: any) {
        failed++;
        setRows(prev => prev.map(r => r._rowIndex === row._rowIndex ? { ...r, status: "error", importError: err.message } : r));
      }
      setImportProgress({ done: i + 1, total: actualRows.length, success, failed, skipped });
      await new Promise(r => setTimeout(r, 80));
    }
    setIsImporting(false);
    setStep("done");
    if (success > 0) toast.success(`Successfully imported ${success} product${success !== 1 ? "s" : ""}`);
    if (failed > 0) toast.error(`${failed} product${failed !== 1 ? "s" : ""} failed`);
  };

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  };

  const stats = {
    total: rows.length,
    valid: rows.filter(r => r.errors.length === 0).length,
    withErrors: rows.filter(r => r.errors.length > 0).length,
    withWarnings: rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length,
    clean: rows.filter(r => r.errors.length === 0 && r.warnings.length === 0).length,
  };

  const filteredRows = rows.filter(r => {
    if (filterStatus === "errors") return r.errors.length > 0;
    if (filterStatus === "warnings") return r.errors.length === 0 && r.warnings.length > 0;
    if (filterStatus === "clean") return r.errors.length === 0 && r.warnings.length === 0;
    return true;
  });

  const hasMappedName = Object.values(columnMap).includes("name");
  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };

  // Step list — mode-aware
  const STEPS = ["select", "upload", "map", "preview", "importing", "done"] as const;
  const STEP_LABELS = ["Mode", "Upload", "Map", "Review", "Import", "Done"];

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen" style={{ background: th.pageBg }}>

        {/* ── Navigation Warning Banner ─────────────────────────────────── */}
        {isInProgress && (
          <div className="sticky top-0 z-50 flex items-center gap-2 px-4 py-2 text-xs font-medium"
            style={{ background: 'rgba(234,179,8,0.12)', borderBottom: '1px solid rgba(234,179,8,0.25)', color: '#ca8a04' }}>
            <AlertOctagon size={13} className="shrink-0" />
            Don't refresh or navigate away — your import progress will be lost.
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: `linear-gradient(135deg, ${th.headerBgFrom}, ${th.headerBgVia}, ${th.headerBgTo})`, borderBottom: `1px solid ${th.headerBorder}` }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/autocityPro/products")}
              className="p-2 rounded-xl transition-colors active:scale-95"
              style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: th.headerTitle }}>Bulk Import</h1>
              <p className="text-xs leading-tight" style={{ color: th.headerSub }}>
                {importMode === "fast" ? "Fast entry — new products with full details" :
                  importMode === "stock" ? "Stock edit — update current stock on existing structure" :
                    "Choose your import mode to begin"}
              </p>
            </div>
          </div>
          {/* Step pills */}
          <div className="hidden md:flex items-center gap-1">
            {STEPS.map((s, i) => {
              const stepIdx = STEPS.indexOf(step);
              const isActive = s === step;
              const isDone = i < stepIdx;
              return (
                <div key={s} className="flex items-center gap-1">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.15)' : isDone ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isActive ? '#fff' : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                    }}>
                    {isDone && <Check size={10} />}
                    {STEP_LABELS[i]}
                  </div>
                  {i < STEPS.length - 1 && <ArrowRight size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

          {/* ══════════════════════════ STEP 0: MODE SELECTION */}
          {step === "select" && (
            <div className="space-y-6">
              <div className="text-center pt-4 pb-2">
                <h2 className="text-xl font-bold mb-1" style={{ color: th.primaryText }}>Choose Import Mode</h2>
                <p className="text-sm" style={{ color: th.mutedText }}>Select the type of bulk operation you want to perform</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fast Entry Mode */}
                <button
                  onClick={() => { setImportMode("fast"); setStep("upload"); }}
                  className="group text-left p-6 rounded-2xl border-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: isDark ? 'rgba(232,69,69,0.04)' : 'rgba(232,69,69,0.02)',
                    borderColor: isDark ? 'rgba(232,69,69,0.20)' : 'rgba(232,69,69,0.15)',
                  }}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(232,69,69,0.12)', border: '1px solid rgba(232,69,69,0.20)' }}>
                      <Zap size={22} style={{ color: '#E84545' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold" style={{ color: th.primaryText }}>Bulk Fast Entry</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(232,69,69,0.12)', color: '#E84545' }}>Recommended</span>
                      </div>
                      <p className="text-sm mb-4" style={{ color: th.mutedText }}>
                        Import brand new products with all details — prices, categories, car specs, stock levels, and more.
                        Accounting ledger entries are posted automatically.
                      </p>
                      <div className="space-y-1.5">
                        {[
                          "Creates new product records",
                          "Posts opening inventory to ledger",
                          "Auto-creates missing categories",
                          "Validates all fields with warnings",
                          "Skips duplicate SKUs automatically",
                        ].map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs" style={{ color: th.secondaryText }}>
                            <CheckCircle2 size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#E84545' }}>
                    Select this mode <ArrowRight size={14} />
                  </div>
                </button>

                {/* Stock Edit Mode */}
                <button
                  onClick={() => { setImportMode("stock"); setStep("upload"); }}
                  className="group text-left p-6 rounded-2xl border-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: isDark ? 'rgba(59,130,246,0.04)' : 'rgba(59,130,246,0.02)',
                    borderColor: isDark ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.15)',
                  }}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.20)' }}>
                      <List size={22} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold" style={{ color: th.primaryText }}>Bulk Stock Edit</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>Stock Only</span>
                      </div>
                      <p className="text-sm mb-4" style={{ color: th.mutedText }}>
                        Upload a file to set or update current stock levels one-by-one. Ideal for physical stock counts
                        and inventory corrections. Warnings suppressed for speed.
                      </p>
                      <div className="space-y-1.5">
                        {[
                          "Review & edit each row's stock before import",
                          "No cost-price warnings (warnings suppressed)",
                          "Errors-only validation — faster review",
                          "Duplicate SKUs still auto-skipped",
                          "Same file format as Fast Entry",
                        ].map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs" style={{ color: th.secondaryText }}>
                            <CheckCircle2 size={12} style={{ color: '#60a5fa', flexShrink: 0 }} />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#3b82f6' }}>
                    Select this mode <ArrowRight size={14} />
                  </div>
                </button>
              </div>

              {/* Info footer */}
              <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
                <Info size={15} className="mt-0.5 shrink-0" style={{ color: '#E84545' }} />
                <p style={{ color: th.mutedText }}>
                  Both modes use the same CSV/Excel file format. Download the template below if you don't have a file yet.
                  You can switch modes by going back to this screen.
                </p>
              </div>

              <div className="flex justify-center">
                <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-all"
                  style={{ background: 'rgba(232,69,69,0.08)', border: '1px solid rgba(232,69,69,0.25)', color: '#E84545' }}>
                  <FileDown size={15} /> Download CSV Template
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════ STEP 1: UPLOAD */}
          {step === "upload" && (
            <>
              {/* Mode badge */}
              <div className="flex items-center gap-2">
                <button onClick={() => setStep("select")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: th.pillBg, border: `1px solid ${th.pillBorder}`, color: th.mutedText }}>
                  <ChevronLeft size={12} /> Change Mode
                </button>
                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: importMode === "fast" ? 'rgba(232,69,69,0.08)' : 'rgba(59,130,246,0.08)',
                    border: importMode === "fast" ? '1px solid rgba(232,69,69,0.20)' : '1px solid rgba(59,130,246,0.20)',
                    color: importMode === "fast" ? '#E84545' : '#3b82f6',
                  }}>
                  {importMode === "fast" ? <Zap size={11} /> : <List size={11} />}
                  {importMode === "fast" ? "Fast Entry Mode" : "Stock Edit Mode"}
                  {importMode === "stock" && <span style={{ color: th.faintText }}>· warnings suppressed</span>}
                </div>
              </div>

              {/* Drop zone */}
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all"
                style={{ borderColor: isDragging ? '#E84545' : th.inputBorder, background: isDragging ? 'rgba(232,69,69,0.04)' : th.cardBg }}>
                <Upload size={32} className="mx-auto mb-3" style={{ color: isDragging ? '#E84545' : th.faintText }} />
                <p className="text-base font-semibold mb-1" style={{ color: th.primaryText }}>Drop your file here</p>
                <p className="text-sm mb-1" style={{ color: th.mutedText }}>or click to browse</p>
                <p className="text-xs" style={{ color: th.faintText }}>Supports .csv, .xlsx, .xls</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              </div>

              {/* Template + info */}
              <div className="p-4 rounded-xl flex items-start gap-4" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <FileSpreadsheet size={18} className="mt-0.5 shrink-0" style={{ color: th.faintText }} />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-0.5" style={{ color: th.primaryText }}>Need a template?</p>
                  <p className="text-xs mb-3" style={{ color: th.mutedText }}>Download a pre-filled CSV with all supported columns and an example row.</p>
                  <button onClick={e => { e.stopPropagation(); downloadTemplate(); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium active:scale-95 transition-all"
                    style={{ background: 'rgba(232,69,69,0.10)', border: '1px solid rgba(232,69,69,0.30)', color: '#E84545' }}>
                    <Download size={13} /> Download Template
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════ STEP 2: MAP COLUMNS */}
          {step === "map" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold" style={{ color: th.primaryText }}>Map Columns</h2>
                  <p className="text-xs mt-0.5" style={{ color: th.mutedText }}>
                    {rawRows.length} rows in <span style={{ color: th.secondaryText }}>{fileName}</span> · Match each column to a product field
                  </p>
                </div>
                <button onClick={() => { setStep("upload"); setCsvHeaders([]); setRawRows([]); setFileName(""); }}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ background: th.pillBg, border: `1px solid ${th.pillBorder}`, color: th.mutedText }}>
                  Re-upload
                </button>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${th.containerBorder}` }}>
                <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider grid grid-cols-3 gap-4"
                  style={{ background: th.mapRowBg, borderBottom: `1px solid ${th.mapRowBorder}`, color: th.faintText }}>
                  <span>CSV Column</span><span>→</span><span>Product Field</span>
                </div>
                {csvHeaders.map(header => {
                  const mapped = columnMap[header] ?? "";
                  const preview = rawRows.slice(0, 3).map(r => r[header]).filter(Boolean).join(" · ");
                  return (
                    <div key={header} className="px-5 py-3 grid grid-cols-3 gap-4 items-center"
                      style={{ borderBottom: `1px solid ${th.mapRowBorder}`, background: th.mapRowBg }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: th.primaryText }}>{header}</p>
                        {preview && <p className="text-xs mt-0.5 truncate" style={{ color: th.faintText }}>e.g. {preview}</p>}
                      </div>
                      <ArrowRight size={14} style={{ color: th.faintText }} />
                      <select value={mapped}
                        onChange={e => setColumnMap(prev => ({ ...prev, [header]: e.target.value as ProductField | "" }))}
                        className="w-full px-3 py-2 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors"
                        style={inputStyle}>
                        <option value="">— Skip this column —</option>
                        {PRODUCT_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>

              {!hasMappedName && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)', color: '#f87171' }}>
                  <AlertTriangle size={14} />
                  You must map a column to <strong>Product Name</strong> to continue
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button onClick={() => setStep("upload")} className="px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
                  style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}>
                  ← Back
                </button>
                <button onClick={applyMapping} disabled={!hasMappedName}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#E84545', color: '#ffffff' }}>
                  Preview & Validate →
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════ STEP 3: PREVIEW */}
          {step === "preview" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Rows", value: stats.total, color: th.primaryText, bg: th.cardBg, border: th.cardBorder },
                  { label: "Ready", value: stats.valid, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.20)' },
                  { label: "Errors", value: stats.withErrors, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)' },
                  { label: "Warnings", value: stats.withWarnings, color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.20)' },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: th.mutedText }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Stock edit mode — inline editable table */}
              {importMode === "stock" && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${th.containerBorder}` }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.06)', borderBottom: `1px solid rgba(59,130,246,0.15)` }}>
                    <List size={14} style={{ color: '#3b82f6' }} />
                    <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>Stock Edit Mode — Review & Adjust Stock Per Row</p>
                    <p className="text-xs ml-auto" style={{ color: th.mutedText }}>Edit the Current Stock column before importing</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${th.rowBorder}`, background: th.mapRowBg }}>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: th.faintText }}>SKU</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: th.faintText }}>Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: th.faintText }}>Car / Variant</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#3b82f6' }}>Current Stock ✏️</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: th.faintText }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map(row => (
                          <tr key={row._rowIndex} style={{ borderBottom: `1px solid ${th.rowBorder}` }}
                            className="transition-colors hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5">
                              {row.sku ? (
                                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: th.pillBg, color: th.faintText }}>{row.sku}</span>
                              ) : <span style={{ color: th.faintText }}>—</span>}
                            </td>
                            <td className="px-4 py-2.5" style={{ color: th.primaryText }}>{row.name}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: th.mutedText }}>
                              {[row.carMake, row.carModel, row.variant].filter(Boolean).join(" ") || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <input type="number" min="0" value={row.currentStock ?? ""}
                                onChange={e => updateRowStock(row._rowIndex, e.target.value)}
                                className="w-24 px-2 py-1 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                style={{ background: th.inputBg, border: `1px solid rgba(59,130,246,0.30)`, color: th.inputText }} />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {row.errors.length > 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                                  {row.errors.length} error{row.errors.length !== 1 ? "s" : ""}
                                </span>
                              ) : (
                                <CheckCircle2 size={14} style={{ color: '#4ade80', margin: '0 auto' }} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fast mode notices */}
              {importMode === "fast" && (
                <>
                  {rows.some(r => r.categoryName && !r.categoryId) && (
                    <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
                      <Info size={15} className="mt-0.5 shrink-0" style={{ color: '#E84545' }} />
                      <p style={{ color: th.mutedText }}>
                        <strong style={{ color: th.secondaryText }}>New categories will be created automatically: </strong>
                        {[...new Set(rows.filter(r => r.categoryName && !r.categoryId).map(r => r.categoryName))].join(", ")}
                      </p>
                    </div>
                  )}
                  {rows.some(r => r.sku) && (
                    <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                      <Info size={15} className="mt-0.5 shrink-0" style={{ color: th.faintText }} />
                      <p style={{ color: th.mutedText }}>
                        <strong style={{ color: th.secondaryText }}>Duplicate SKUs will be skipped automatically.</strong>{" "}
                        Any row whose SKU already exists in your inventory will be silently skipped.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Filter tabs — only show warnings tab in fast mode */}
              <div className="flex gap-2 flex-wrap">
                {(["all", "errors", ...(enableWarnings ? ["warnings"] : []), "clean"] as ("all" | "errors" | "warnings" | "clean")[]).map(f => (
                  <button key={f} onClick={() => setFilterStatus(f)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize active:scale-95"
                    style={{
                      background: filterStatus === f ? '#E84545' : th.pillBg,
                      color: filterStatus === f ? '#ffffff' : th.mutedText,
                      border: `1px solid ${filterStatus === f ? '#E84545' : th.pillBorder}`,
                    }}>
                    {f}{f !== "all" && ` (${f === "errors" ? stats.withErrors : f === "warnings" ? stats.withWarnings : stats.clean})`}
                  </button>
                ))}
              </div>

              {/* Row list — only shown in fast mode (stock mode uses table above) */}
              {importMode === "fast" && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${th.containerBorder}` }}>
                  {filteredRows.length === 0 ? (
                    <div className="py-12 text-center text-sm" style={{ color: th.mutedText }}>No rows match this filter</div>
                  ) : (
                    <div>
                      {filteredRows.map(row => {
                        const isExpanded = expandedRows.has(row._rowIndex);
                        const hasError = row.errors.length > 0;
                        const hasWarning = row.warnings.length > 0;
                        return (
                          <div key={row._rowIndex} style={{ borderBottom: `1px solid ${th.rowBorder}` }}>
                            <button onClick={() => toggleRow(row._rowIndex)}
                              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]">
                              {hasError ? <XCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                                : hasWarning ? <AlertTriangle size={16} style={{ color: '#fb923c', flexShrink: 0 }} />
                                  : <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: row.name ? th.primaryText : th.faintText }}>
                                  {row.name || <em>No name</em>}
                                </p>
                                <p className="text-xs mt-0.5 truncate" style={{ color: th.mutedText }}>
                                  {[row.carMake, row.carModel, row.variant].filter(Boolean).join(" ") || row.categoryName || "No category"}
                                  {row.currentStock !== undefined ? ` · Stock: ${row.currentStock}` : ""}
                                  {row.sellingPrice !== undefined ? ` · QAR ${row.sellingPrice}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {row.sku && <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: th.pillBg, color: th.faintText }}>{row.sku}</span>}
                                {hasError && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>{row.errors.length} error{row.errors.length !== 1 ? "s" : ""}</span>}
                                {!hasError && hasWarning && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>{row.warnings.length} warning{row.warnings.length !== 1 ? "s" : ""}</span>}
                                {isExpanded ? <ChevronUp size={14} style={{ color: th.faintText }} /> : <ChevronDown size={14} style={{ color: th.faintText }} />}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-5 pb-4 space-y-3" style={{ borderTop: `1px solid ${th.rowBorder}`, paddingTop: 12 }}>
                                {row.errors.length > 0 && (
                                  <div className="space-y-1">
                                    {row.errors.map((e, i) => <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#f87171' }}><XCircle size={12} />{e}</div>)}
                                  </div>
                                )}
                                {row.warnings.length > 0 && (
                                  <div className="space-y-1">
                                    {row.warnings.map((w, i) => <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#fb923c' }}><AlertTriangle size={12} />{w}</div>)}
                                  </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {([
                                    ["Category", row.categoryId ? row.categoryName : row.categoryName ? `${row.categoryName} (unmatched)` : "—"],
                                    ["Cost Price", row.costPrice !== undefined ? `QAR ${row.costPrice}` : "—"],
                                    ["Selling", row.sellingPrice !== undefined ? `QAR ${row.sellingPrice}` : "—"],
                                    ["Tax Rate", row.taxRate !== undefined ? `${row.taxRate}%` : "—"],
                                    ["Stock", row.currentStock ?? "0"],
                                    ["Unit", row.unit || "pcs"],
                                    ["Car Make", row.carMake || "—"],
                                    ["Year Range", row.yearFrom ? `${row.yearFrom}–${row.yearTo || "present"}` : "—"],
                                  ] as [string, string | number][]).map(([label, value]) => (
                                    <div key={label} className="p-2 rounded-lg" style={{ background: th.pillBg }}>
                                      <p className="text-xs mb-0.5" style={{ color: th.faintText }}>{label}</p>
                                      <p className="text-xs font-medium" style={{ color: th.secondaryText }}>{String(value)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs" style={{ color: th.faintText }}>
                  {stats.withErrors > 0 && <span style={{ color: '#f87171' }}>{stats.withErrors} row{stats.withErrors !== 1 ? "s" : ""} will be skipped · </span>}
                  {stats.valid} product{stats.valid !== 1 ? "s" : ""} ready to import
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("map")} className="px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
                    style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}>
                    ← Back
                  </button>
                  <button onClick={startImport} disabled={stats.valid === 0}
                    className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: '#E84545', color: '#ffffff' }}>
                    Import {stats.valid} Product{stats.valid !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════ STEP 4: IMPORTING */}
          {step === "importing" && (
            <>
              <div className="text-center py-4">
                <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: '#E84545' }} />
                <h2 className="text-lg font-bold mb-1" style={{ color: th.primaryText }}>Importing Products…</h2>
                <p className="text-sm" style={{ color: th.mutedText }}>Creating products · logging inventory movements · posting to accounting ledger</p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: th.mutedText }}>{importProgress.done} of {importProgress.total}</span>
                  <span style={{ color: th.primaryText }}>{importProgress.total > 0 ? Math.round((importProgress.done / importProgress.total) * 100) : 0}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: th.pillBg }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ background: '#E84545', width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Imported", value: importProgress.success, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.20)' },
                  { label: "Skipped", value: importProgress.skipped, color: th.mutedText, bg: th.cardBg, border: th.cardBorder },
                  { label: "Failed", value: importProgress.failed, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)' },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: th.mutedText }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${th.containerBorder}` }}>
                <div className="px-4 py-3 text-xs font-semibold" style={{ background: th.mapRowBg, borderBottom: `1px solid ${th.mapRowBorder}`, color: th.faintText }}>
                  Import Progress
                </div>
                <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: th.rowBorder }}>
                  {rows.filter(r => r.errors.length === 0).map(row => (
                    <div key={row._rowIndex} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="shrink-0">
                        {row.status === "importing" ? <Loader2 size={14} className="animate-spin" style={{ color: '#E84545' }} />
                          : row.status === "success" ? <CheckCircle2 size={14} style={{ color: '#4ade80' }} />
                            : row.status === "skipped" ? <span className="text-xs" style={{ color: th.faintText }}>–</span>
                              : row.status === "error" ? <XCircle size={14} style={{ color: '#f87171' }} />
                                : <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: th.inputBorder }} />}
                      </div>
                      <p className="flex-1 text-sm truncate" style={{ color: th.secondaryText }}>{row.name}</p>
                      {row.status === "success" && row.importedSKU && <span className="text-xs font-mono" style={{ color: th.faintText }}>SKU: {row.importedSKU}</span>}
                      {row.status === "skipped" && <span className="text-xs" style={{ color: th.faintText }}>{row.importError}</span>}
                      {row.status === "error" && <span className="text-xs" style={{ color: '#f87171' }}>{row.importError}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => { abortRef.current = true; }}
                  className="px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
                  style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}>
                  Cancel remaining
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════ STEP 5: DONE */}
          {step === "done" && (
            <>
              <div className="text-center py-4">
                <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: '#4ade80' }} />
                <h2 className="text-xl font-bold mb-1" style={{ color: th.primaryText }}>Import Complete</h2>
                <p className="text-sm" style={{ color: th.mutedText }}>
                  {importProgress.success} product{importProgress.success !== 1 ? "s" : ""} imported successfully
                  {importProgress.skipped > 0 && ` · ${importProgress.skipped} skipped (duplicate SKU)`}
                  {importProgress.failed > 0 && ` · ${importProgress.failed} failed`}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Attempted", value: importProgress.total, color: th.primaryText, bg: th.cardBg, border: th.cardBorder },
                  { label: "Imported", value: importProgress.success, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.20)' },
                  { label: "Skipped", value: importProgress.skipped, color: th.mutedText, bg: th.cardBg, border: th.cardBorder },
                  { label: "Failed", value: importProgress.failed, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)' },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: th.mutedText }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {importProgress.success > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: '#4ade80' }} />
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: '#4ade80' }}>Accounting & inventory updated</p>
                    <p className="text-xs" style={{ color: th.mutedText }}>
                      Opening stock for all imported products with a cost price has been posted to the inventory ledger.
                      New categories were created automatically. Each product also has an activity log and inventory movement record.
                    </p>
                  </div>
                </div>
              )}

              {importProgress.failed > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.20)' }}>
                  <div className="px-4 py-3" style={{ background: 'rgba(248,113,113,0.08)', borderBottom: '1px solid rgba(248,113,113,0.15)' }}>
                    <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Failed Rows — Review & Retry</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(248,113,113,0.10)' }}>
                    {rows.filter(r => r.status === "error").map(row => (
                      <div key={row._rowIndex} className="flex items-center justify-between px-4 py-3">
                        <p className="text-sm" style={{ color: th.primaryText }}>{row.name}</p>
                        <p className="text-xs" style={{ color: '#f87171' }}>{row.importError}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {importProgress.failed > 0 ? (
                  <button onClick={() => {
                    setRows(prev => prev.map(r => r.status === "error" ? { ...r, status: "pending", importError: undefined } : r));
                    setFilterStatus("errors"); setStep("preview");
                  }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors active:scale-95"
                    style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}>
                    <RefreshCw size={14} /> Retry Failed Rows
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    setStep("select"); setImportMode(null); setCsvHeaders([]); setRawRows([]); setRows([]);
                    setFileName(""); setColumnMap({}); setImportProgress({ done: 0, total: 0, success: 0, failed: 0, skipped: 0 });
                  }} className="px-4 py-2.5 rounded-xl text-sm transition-colors active:scale-95"
                    style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}>
                    Import Another File
                  </button>
                  <button onClick={() => router.push("/autocityPro/products")}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #E84545, #cc3c3c)', color: '#ffffff' }}>
                    View Products →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}