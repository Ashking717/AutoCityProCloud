"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ChevronLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Download, Loader2, RefreshCw, Info,
  ArrowRight, XCircle, Check, AlertCircle, X, FileDown, Package,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Time-based theme (copied from ProductsClient) ───────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
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
  status: "pending" | "importing" | "success" | "error";
  importError?: string;
  importedSKU?: string;
}

type ProductField = keyof Omit<ImportRow, "_rowIndex" | "errors" | "warnings" | "status" | "importError" | "importedSKU">;
type ColumnMap = Record<string, ProductField | "">;

interface BulkImportClientProps {
  initialUser: any;
  categories: { _id: string; name: string }[];
  nextSKU: string;
}

// ─── Field definitions ────────────────────────────────────────────────────────
const PRODUCT_FIELDS: { key: ProductField; label: string; required?: boolean }[] = [
  { key: "name",         label: "Product Name",      required: true },
  { key: "sku",          label: "SKU" },
  { key: "categoryName", label: "Category" },
  { key: "barcode",      label: "Barcode" },
  { key: "description",  label: "Description" },
  { key: "unit",         label: "Unit" },
  { key: "costPrice",    label: "Cost Price" },
  { key: "sellingPrice", label: "Selling Price" },
  { key: "taxRate",      label: "Tax Rate (%)" },
  { key: "currentStock", label: "Current Stock" },
  { key: "minStock",     label: "Min Stock" },
  { key: "maxStock",     label: "Max Stock" },
  { key: "isVehicle",    label: "Is Vehicle (true/false)" },
  { key: "carMake",      label: "Car Make" },
  { key: "carModel",     label: "Car Model" },
  { key: "variant",      label: "Variant" },
  { key: "yearFrom",     label: "Year From" },
  { key: "yearTo",       label: "Year To" },
  { key: "color",        label: "Color" },
  { key: "partNumber",   label: "Part Number" },
  { key: "vin",          label: "VIN" },
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

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const parseRow = (line: string) => {
    const result: string[] = [];
    let current = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuotes && line[i+1]==='"') { current+='"'; i++; } else inQuotes=!inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current=""; }
      else current += ch;
    }
    result.push(current.trim());
    return result;
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

function validateRow(row: ImportRow): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!row.name?.trim()) errors.push("Product name is required");
  if (row.costPrice !== undefined && row.costPrice < 0) errors.push("Cost price cannot be negative");
  if (row.sellingPrice !== undefined && row.sellingPrice < 0) errors.push("Selling price cannot be negative");
  if (row.currentStock !== undefined && row.currentStock < 0) errors.push("Stock cannot be negative");
  if (row.taxRate !== undefined && (row.taxRate < 0 || row.taxRate > 100)) errors.push("Tax rate must be 0–100");
  if (row.yearFrom && row.yearTo && row.yearFrom > row.yearTo) errors.push("Year From must be ≤ Year To");
  if ((row.isVehicle || row.carMake) && !row.carMake) errors.push("Car Make required for vehicle products");
  if (!row.costPrice || row.costPrice === 0) warnings.push("No cost price — inventory value won't be tracked in ledger");
  if (!row.categoryName) warnings.push("No category assigned");
  if (row.currentStock === undefined) warnings.push("No stock specified — defaults to 0");
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function BulkImportClient({ initialUser, categories, nextSKU }: BulkImportClientProps) {
  const router = useRouter();
  const isDark = useTimeBasedTheme();
  const user = initialUser;

  // ── Theme tokens (matches ProductsClient exactly) ────────────────────────
  const th = {
    pageBg:            isDark ? '#050505'  : '#f3f4f6',
    headerBgFrom:    isDark ? '#932222' : '#fef2f2',
    headerBgVia:     isDark ? '#411010' : '#fee2e2',
    headerBgTo:      isDark ? '#a20c0c' : '#fecaca',
    headerTitle:     isDark ? '#ffffff' : '#7f1d1d',
    headerSub:       isDark ? 'rgba(255,255,255,0.80)' : '#991b1b',
    headerBorder:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    headerBtnBg:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    headerBtnBorder: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)',
    headerBtnText:   isDark ? '#ffffff' : '#7f1d1d',
    containerBg:     isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)' : '#ffffff',
    containerBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    cardBg:          isDark ? 'rgba(10,10,10,0.50)' : 'rgba(255,255,255,0.80)',
    cardBorder:      isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    inputBg:         isDark ? '#050505' : '#ffffff',
    inputBorder:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    inputText:       isDark ? '#ffffff' : '#111827',
    labelText:       isDark ? '#d1d5db' : '#374151',
    mutedText:       isDark ? '#9ca3af' : '#6b7280',
    faintText:       isDark ? '#6b7280' : '#9ca3af',
    divider:         isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    rowHover:        isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    rowBorder:       isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    primaryText:     isDark ? '#ffffff' : '#111827',
    secondaryText:   isDark ? '#d1d5db' : '#374151',
    pillBg:          isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    pillBorder:      isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    infoBg:          isDark ? 'rgba(232,69,69,0.05)' : 'rgba(232,69,69,0.04)',
    infoBorder:      isDark ? 'rgba(232,69,69,0.15)' : 'rgba(232,69,69,0.12)',
    mapRowBg:        isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    mapRowBorder:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  // ── State ────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing" | "done">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "errors" | "warnings" | "clean">("all");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, success: 0, failed: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const abortRef = useRef(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  // ── File handling ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const isCSV  = file.name.endsWith(".csv");
    const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isCSV && !isXLSX) { toast.error("Please upload a .csv or .xlsx file"); return; }

    try {
      setFileName(file.name);
      let parsed: { headers: string[]; rows: Record<string, string>[] };
      if (isCSV) {
        parsed = parseCSV(await file.text());
      } else {
        parsed = await parseXLSX(file);
      }

      if (!parsed.headers.length || !parsed.rows.length) {
        toast.error("File is empty or could not be parsed"); return;
      }

      const nonEmpty = parsed.rows.filter(r => Object.values(r).some(v => v.trim()));
      setCsvHeaders(parsed.headers);
      setRawRows(nonEmpty);

      const autoMap: ColumnMap = {};
      parsed.headers.forEach(h => {
        autoMap[h] = HEADER_AUTO_MAP[h.toLowerCase().trim()] ?? "";
      });
      setColumnMap(autoMap);
      setStep("map");
      toast.success(`${nonEmpty.length} rows detected in ${file.name}`);
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Apply column mapping ─────────────────────────────────────────────────
  const applyMapping = useCallback(() => {
    const parseNum  = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
    const parseBool = (v: string) => ["true","yes","1","y"].includes(v.toLowerCase().trim());

    const parsed: ImportRow[] = rawRows.map((raw, i) => {
      const get = (field: ProductField) => {
        const header = Object.entries(columnMap).find(([, f]) => f === field)?.[0];
        return header ? (raw[header] ?? "").trim() : "";
      };
      const carMake = get("carMake");
      const isVehicleParsed = parseBool(get("isVehicle") || "false") || !!carMake;
      const catName  = get("categoryName");
      const matchCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());

      return validateRow({
        _rowIndex:    i,
        name:         get("name"),
        description:  get("description") || undefined,
        categoryName: catName || undefined,
        categoryId:   matchCat?._id,
        sku:          get("sku") || undefined,
        barcode:      get("barcode") || undefined,
        partNumber:   get("partNumber") || undefined,
        unit:         get("unit") || "pcs",
        costPrice:    parseNum(get("costPrice")),
        sellingPrice: parseNum(get("sellingPrice")),
        taxRate:      parseNum(get("taxRate")),
        currentStock: parseNum(get("currentStock")),
        minStock:     parseNum(get("minStock")),
        maxStock:     parseNum(get("maxStock")) ?? 1000,
        isVehicle:    isVehicleParsed || undefined,
        carMake:      carMake || undefined,
        carModel:     get("carModel") || undefined,
        variant:      get("variant") || undefined,
        yearFrom:     parseNum(get("yearFrom")),
        yearTo:       parseNum(get("yearTo")),
        color:        get("color") || undefined,
        vin:          get("vin") || undefined,
        errors: [], warnings: [], status: "pending",
      });
    });

    setRows(parsed);
    setFilterStatus("all");
    setExpandedRows(new Set());
    setStep("preview");
  }, [rawRows, columnMap, categories]);

  // ── Import ───────────────────────────────────────────────────────────────
  const startImport = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (!validRows.length) { toast.error("No valid rows to import"); return; }

    setIsImporting(true);
    abortRef.current = false;
    setStep("importing");
    setImportProgress({ done: 0, total: validRows.length, success: 0, failed: 0 });
    setRows(prev => prev.map(r => r.errors.length === 0 ? { ...r, status: "pending" } : r));

    let success = 0, failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      if (abortRef.current) break;
      const row = validRows[i];

      setRows(prev => prev.map(r => r._rowIndex === row._rowIndex ? { ...r, status: "importing" } : r));

      try {
        const body: any = {
          name: row.name,
          description: row.description,
          categoryId:  row.categoryId,
          sku:         row.sku || nextSKU,
          barcode:     row.barcode,
          unit:        row.unit || "pcs",
          costPrice:   row.costPrice   ?? 0,
          sellingPrice:row.sellingPrice ?? 0,
          taxRate:     row.taxRate     ?? 0,
          currentStock:row.currentStock ?? 0,
          minStock:    row.minStock    ?? 0,
          maxStock:    row.maxStock    ?? 1000,
        };

        if (row.isVehicle && row.carMake) {
          body.isVehicle  = true;
          body.carMake    = row.carMake;
          body.carModel   = row.carModel;
          body.variant    = row.variant;
          body.yearFrom   = row.yearFrom;
          body.yearTo     = row.yearTo;
          body.color      = row.color;
          body.partNumber = row.partNumber;
          body.vin        = row.vin;
        }

        const res  = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok) {
          success++;
          setRows(prev => prev.map(r =>
            r._rowIndex === row._rowIndex
              ? { ...r, status: "success", importedSKU: data.product?.sku }
              : r
          ));
        } else {
          failed++;
          setRows(prev => prev.map(r =>
            r._rowIndex === row._rowIndex
              ? { ...r, status: "error", importError: data.error || "Unknown error" }
              : r
          ));
        }
      } catch (err: any) {
        failed++;
        setRows(prev => prev.map(r =>
          r._rowIndex === row._rowIndex
            ? { ...r, status: "error", importError: err.message }
            : r
        ));
      }

      setImportProgress({ done: i + 1, total: validRows.length, success, failed });
      await new Promise(r => setTimeout(r, 80));
    }

    setIsImporting(false);
    setStep("done");
    if (success > 0) toast.success(`Successfully imported ${success} product${success !== 1 ? "s" : ""}`);
    if (failed > 0)  toast.error(`${failed} product${failed !== 1 ? "s" : ""} failed`);
  };

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  };

  const stats = {
    total:        rows.length,
    valid:        rows.filter(r => r.errors.length === 0).length,
    withErrors:   rows.filter(r => r.errors.length > 0).length,
    withWarnings: rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length,
    clean:        rows.filter(r => r.errors.length === 0 && r.warnings.length === 0).length,
  };

  const filteredRows = rows.filter(r => {
    if (filterStatus === "errors")   return r.errors.length > 0;
    if (filterStatus === "warnings") return r.errors.length === 0 && r.warnings.length > 0;
    if (filterStatus === "clean")    return r.errors.length === 0 && r.warnings.length === 0;
    return true;
  });

  const hasMappedName = Object.values(columnMap).includes("name");

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    color: th.inputText,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="py-10 border-b shadow-xl transition-colors duration-500"
          style={{
            background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`,
            borderColor: th.headerBorder,
          }}
        >
          <div className="px-4 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/autocityPro/products")}
                className="p-2 rounded-xl transition-colors active:scale-95"
                style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#991b1b' }} />
                  <h1 className="text-2xl md:text-3xl font-bold transition-colors duration-500" style={{ color: th.headerTitle }}>
                    Bulk Import
                  </h1>
                </div>
                <p className="mt-1 text-sm transition-colors duration-500" style={{ color: th.headerSub }}>
                  Import products from CSV or Excel • Inventory & accounting auto-posted
                </p>
              </div>
            </div>

            {/* Step pills */}
            <div className="flex items-center gap-1 text-xs flex-wrap">
              {(["upload","map","preview","importing","done"] as const).map((s, i) => {
                const labels   = ["Upload","Map","Review","Import","Done"];
                const stepIdx  = ["upload","map","preview","importing","done"].indexOf(step);
                const isActive = s === step;
                const isDone   = i < stepIdx;
                return (
                  <span key={s} className="flex items-center gap-1">
                    <span
                      className="px-2.5 py-1 rounded-full font-medium transition-all"
                      style={{
                        background: isActive ? '#E84545' : isDone ? 'rgba(232,69,69,0.20)' : th.pillBg,
                        color:      isActive ? '#ffffff' : isDone ? '#E84545'               : th.mutedText,
                        border:     `1px solid ${isActive ? '#E84545' : isDone ? 'rgba(232,69,69,0.30)' : th.pillBorder}`,
                      }}
                    >
                      {labels[i]}
                    </span>
                    {i < 4 && <ArrowRight className="h-3 w-3" style={{ color: th.faintText }} />}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto space-y-6">

          {/* ══════════════════════════════════ STEP 1: UPLOAD */}
          {step === "upload" && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragging ? '#E84545' : th.inputBorder,
                  background:  isDragging ? 'rgba(232,69,69,0.04)' : th.cardBg,
                }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="p-5 rounded-2xl transition-all"
                    style={{ background: isDragging ? 'rgba(232,69,69,0.15)' : th.pillBg }}
                  >
                    <Upload className="h-9 w-9" style={{ color: isDragging ? '#E84545' : th.mutedText }} />
                  </div>
                  <div>
                    <p className="text-xl font-semibold" style={{ color: th.primaryText }}>
                      Drop your file here
                    </p>
                    <p className="text-sm mt-1" style={{ color: th.mutedText }}>or click to browse</p>
                    <p className="text-xs mt-2" style={{ color: th.faintText }}>Supports .csv, .xlsx, .xls</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
              </div>

              {/* Template + info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="flex items-start gap-3 p-5 rounded-2xl"
                  style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}
                >
                  <Info className="h-4 w-4 text-[#E84545] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: th.primaryText }}>Need a template?</p>
                    <p className="text-xs mt-1" style={{ color: th.mutedText }}>
                      Download a pre-filled CSV with all supported columns and an example row.
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); downloadTemplate(); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium active:scale-95 transition-all shrink-0"
                    style={{ background: 'rgba(232,69,69,0.10)', border: '1px solid rgba(232,69,69,0.30)', color: '#E84545' }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Template
                  </button>
                </div>

                <div
                  className="p-5 rounded-2xl"
                  style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: th.mutedText }}>
                    What gets created per product
                  </p>
                  <div className="space-y-1.5">
                    {[
                      "Product record with all fields",
                      "Opening inventory movement log",
                      "Accounting ledger entry (if cost price set)",
                      "Activity log entry",
                    ].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs" style={{ color: th.secondaryText }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Supported columns */}
              <div
                className="p-5 rounded-2xl"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: th.mutedText }}>
                  Supported Columns
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {PRODUCT_FIELDS.map(f => (
                    <div
                      key={f.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: th.pillBg, border: `1px solid ${th.pillBorder}` }}
                    >
                      {f.required && <span className="w-1.5 h-1.5 rounded-full bg-[#E84545] shrink-0" />}
                      <span className="text-xs truncate" style={{ color: th.secondaryText }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 flex items-center gap-1" style={{ color: th.faintText }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E84545] inline-block" /> Required fields
                </p>
              </div>
            </>
          )}

          {/* ══════════════════════════════════ STEP 2: MAP COLUMNS */}
          {step === "map" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: th.primaryText }}>Map Columns</h2>
                  <p className="text-sm mt-0.5" style={{ color: th.mutedText }}>
                    <span className="font-medium" style={{ color: '#E84545' }}>{rawRows.length} rows</span> detected in{" "}
                    <span className="font-mono text-xs">{fileName}</span>
                    {" "}· Match each column to a product field
                  </p>
                </div>
                <button
                  onClick={() => { setStep("upload"); setCsvHeaders([]); setRawRows([]); setFileName(""); }}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors active:scale-95"
                  style={{ background: th.pillBg, border: `1px solid ${th.pillBorder}`, color: th.mutedText }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-upload
                </button>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: th.containerBg, border: `1px solid ${th.containerBorder}` }}
              >
                {/* Table header */}
                <div
                  className="grid grid-cols-5 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ background: isDark ? '#050505' : '#f3f4f6', color: th.mutedText, borderBottom: `1px solid ${th.divider}` }}
                >
                  <span className="col-span-2">CSV Column</span>
                  <span className="text-center">→</span>
                  <span className="col-span-2">Product Field</span>
                </div>

                <div className="divide-y" style={{ borderColor: th.divider }}>
                  {csvHeaders.map(header => {
                    const mapped  = columnMap[header] ?? "";
                    const preview = rawRows.slice(0, 3).map(r => r[header]).filter(Boolean).join(" · ");
                    const isMapped = !!mapped;
                    return (
                      <div
                        key={header}
                        className="grid grid-cols-5 gap-3 items-center px-4 py-3 transition-colors"
                        style={{ background: isMapped ? (isDark ? 'rgba(232,69,69,0.03)' : 'rgba(232,69,69,0.02)') : 'transparent' }}
                      >
                        <div className="col-span-2">
                          <p className="text-sm font-medium" style={{ color: th.primaryText }}>{header}</p>
                          {preview && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: th.faintText }}>
                              e.g. {preview}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight
                            className="h-4 w-4"
                            style={{ color: isMapped ? '#E84545' : th.faintText }}
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={mapped}
                            onChange={e => setColumnMap(prev => ({ ...prev, [header]: e.target.value as ProductField | "" }))}
                            className="w-full px-3 py-2 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors"
                            style={inputStyle}
                          >
                            <option value="">— Skip this column —</option>
                            {PRODUCT_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>
                                {f.label}{f.required ? " *" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!hasMappedName && (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.20)' }}
                >
                  <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                  <p className="text-sm text-orange-400">
                    You must map a column to <strong>Product Name</strong> to continue
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
                  style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}
                >
                  ← Back
                </button>
                <button
                  onClick={applyMapping}
                  disabled={!hasMappedName}
                  className="px-6 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Preview & Validate →
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════ STEP 3: PREVIEW */}
          {step === "preview" && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Rows",    value: stats.total,        color: th.primaryText, bg: th.cardBg, border: th.cardBorder },
                  { label: "Ready",         value: stats.valid,        color: '#4ade80',      bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.20)' },
                  { label: "Errors",        value: stats.withErrors,   color: '#f87171',      bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)' },
                  { label: "Warnings",      value: stats.withWarnings, color: '#fb923c',      bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.20)' },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-2xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-1" style={{ color: th.mutedText }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Category match info */}
              {rows.some(r => r.categoryName && !r.categoryId) && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}
                >
                  <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-400">Some categories not matched</p>
                    <p className="text-xs mt-0.5" style={{ color: th.mutedText }}>
                      Categories not found in your system will be left unassigned.
                      Create them first via Products → Quick Add Category, then re-import.
                    </p>
                  </div>
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-2 flex-wrap">
                {(["all","errors","warnings","clean"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize active:scale-95"
                    style={{
                      background: filterStatus === f ? '#E84545' : th.pillBg,
                      color:      filterStatus === f ? '#ffffff'  : th.mutedText,
                      border:     `1px solid ${filterStatus === f ? '#E84545' : th.pillBorder}`,
                    }}
                  >
                    {f} {f !== "all" && (
                      <span className="ml-1 opacity-70">
                        ({f === "errors" ? stats.withErrors : f === "warnings" ? stats.withWarnings : stats.clean})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Row list */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: th.containerBg, border: `1px solid ${th.containerBorder}` }}
              >
                {filteredRows.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="h-10 w-10 mx-auto mb-2" style={{ color: th.faintText }} />
                    <p style={{ color: th.mutedText }}>No rows match this filter</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: th.divider }}>
                    {filteredRows.map(row => {
                      const isExpanded = expandedRows.has(row._rowIndex);
                      const hasError   = row.errors.length > 0;
                      const hasWarning = row.warnings.length > 0;

                      return (
                        <div key={row._rowIndex}>
                          <button
                            onClick={() => toggleRow(row._rowIndex)}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                          >
                            <span className="shrink-0">
                              {hasError   ? <XCircle      className="h-4 w-4 text-red-400" />
                              : hasWarning ? <AlertCircle  className="h-4 w-4 text-orange-400" />
                              :              <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            </span>

                            <span className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate" style={{ color: th.primaryText }}>
                                {row.name || <span className="italic" style={{ color: th.faintText }}>No name</span>}
                              </span>
                              <span className="text-xs block truncate mt-0.5" style={{ color: th.faintText }}>
                                {[row.carMake, row.carModel, row.variant].filter(Boolean).join(" ") || row.categoryName || "No category"}
                                {row.currentStock !== undefined ? ` · Stock: ${row.currentStock}` : ""}
                                {row.sellingPrice  !== undefined ? ` · QAR ${row.sellingPrice}` : ""}
                                {row.costPrice     !== undefined ? ` · Cost: QAR ${row.costPrice}` : ""}
                              </span>
                            </span>

                            {row.sku && (
                              <span
                                className="shrink-0 text-xs px-2 py-1 rounded font-mono"
                                style={{ background: th.pillBg, color: th.mutedText }}
                              >
                                {row.sku}
                              </span>
                            )}

                            {hasError && (
                              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400">
                                {row.errors.length} error{row.errors.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {!hasError && hasWarning && (
                              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400">
                                {row.warnings.length} warning{row.warnings.length !== 1 ? "s" : ""}
                              </span>
                            )}

                            {isExpanded
                              ? <ChevronUp   className="h-4 w-4 shrink-0" style={{ color: th.faintText }} />
                              : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: th.faintText }} />
                            }
                          </button>

                          {isExpanded && (
                            <div
                              className="px-5 pb-5 pt-3 space-y-4"
                              style={{ borderTop: `1px solid ${th.divider}`, background: isDark ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.02)' }}
                            >
                              {row.errors.length > 0 && (
                                <div className="space-y-1.5">
                                  {row.errors.map((e, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-red-400">
                                      <XCircle className="h-3.5 w-3.5 shrink-0" />{e}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {row.warnings.length > 0 && (
                                <div className="space-y-1.5">
                                  {row.warnings.map((w, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-orange-400/80">
                                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
                                {([
                                  ["Category",    row.categoryId ? row.categoryName : row.categoryName ? `${row.categoryName} (unmatched)` : "—"],
                                  ["Cost Price",  row.costPrice    !== undefined ? `QAR ${row.costPrice}`    : "—"],
                                  ["Selling",     row.sellingPrice !== undefined ? `QAR ${row.sellingPrice}` : "—"],
                                  ["Tax Rate",    row.taxRate      !== undefined ? `${row.taxRate}%`        : "—"],
                                  ["Stock",       row.currentStock ?? "0"],
                                  ["Min Stock",   row.minStock     ?? "0"],
                                  ["Unit",        row.unit || "pcs"],
                                  ["Barcode",     row.barcode || "—"],
                                  ["Car Make",    row.carMake  || "—"],
                                  ["Car Model",   row.carModel || "—"],
                                  ["Variant",     row.variant  || "—"],
                                  ["Year Range",  row.yearFrom ? `${row.yearFrom}–${row.yearTo || "present"}` : "—"],
                                  ["Color",       row.color      || "—"],
                                  ["Part No.",    row.partNumber || "—"],
                                ] as [string, string | number][]).map(([label, value]) => (
                                  <div key={label} className="flex gap-2 text-xs">
                                    <span className="shrink-0 w-20" style={{ color: th.faintText }}>{label}</span>
                                    <span
                                      className="truncate"
                                      style={{ color: String(value) === "—" ? th.faintText : th.secondaryText }}
                                    >
                                      {String(value)}
                                    </span>
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

              {/* Actions */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4"
                style={{ borderTop: `1px solid ${th.divider}` }}
              >
                <div className="text-sm" style={{ color: th.mutedText }}>
                  {stats.withErrors > 0 && (
                    <span className="text-red-400">{stats.withErrors} row{stats.withErrors !== 1 ? "s" : ""} will be skipped · </span>
                  )}
                  <span style={{ color: '#4ade80' }} className="font-semibold">
                    {stats.valid} product{stats.valid !== 1 ? "s" : ""} ready to import
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("map")}
                    className="px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
                    style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={startImport}
                    disabled={stats.valid === 0}
                    className="px-6 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import {stats.valid} Product{stats.valid !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════ STEP 4: IMPORTING */}
          {step === "importing" && (
            <>
              <div
                className="p-8 rounded-2xl text-center space-y-4"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
              >
                <div className="inline-flex p-4 rounded-2xl" style={{ background: 'rgba(232,69,69,0.10)' }}>
                  <Loader2 className="h-9 w-9 text-[#E84545] animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: th.primaryText }}>Importing Products…</h3>
                  <p className="text-sm mt-1" style={{ color: th.mutedText }}>
                    Creating products · logging inventory movements · posting to accounting ledger
                  </p>
                </div>

                {/* Progress bar */}
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between text-xs mb-2" style={{ color: th.mutedText }}>
                    <span>{importProgress.done} of {importProgress.total}</span>
                    <span>{importProgress.total > 0 ? Math.round((importProgress.done / importProgress.total) * 100) : 0}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: th.pillBg }}>
                    <div
                      className="h-full bg-gradient-to-r from-[#E84545] to-[#ff6b6b] rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Live counters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)' }}>
                  <p className="text-3xl font-bold text-emerald-400">{importProgress.success}</p>
                  <p className="text-sm mt-1" style={{ color: th.mutedText }}>Imported</p>
                </div>
                <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
                  <p className="text-3xl font-bold text-red-400">{importProgress.failed}</p>
                  <p className="text-sm mt-1" style={{ color: th.mutedText }}>Failed</p>
                </div>
              </div>

              {/* Per-row status */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: th.containerBg, border: `1px solid ${th.containerBorder}` }}
              >
                <div
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ background: isDark ? '#050505' : '#f3f4f6', color: th.mutedText, borderBottom: `1px solid ${th.divider}` }}
                >
                  Import Progress
                </div>
                <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: th.divider }}>
                  {rows.filter(r => r.errors.length === 0).map(row => (
                    <div key={row._rowIndex} className="flex items-center gap-3 px-4 py-3">
                      <span className="shrink-0 w-5">
                        {row.status === "importing" ? <Loader2 className="h-4 w-4 text-[#E84545] animate-spin" />
                        : row.status === "success"  ? <Check    className="h-4 w-4 text-emerald-400" />
                        : row.status === "error"    ? <XCircle  className="h-4 w-4 text-red-400" />
                        : <span className="h-4 w-4 rounded-full border block" style={{ borderColor: th.pillBorder }} />}
                      </span>
                      <span className="flex-1 text-sm truncate" style={{ color: th.secondaryText }}>{row.name}</span>
                      {row.status === "success" && row.importedSKU && (
                        <span className="text-xs font-mono" style={{ color: th.faintText }}>SKU: {row.importedSKU}</span>
                      )}
                      {row.status === "error" && (
                        <span className="text-xs text-red-400 truncate max-w-[200px]">{row.importError}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => { abortRef.current = true; }}
                  className="px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
                  style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}
                >
                  Cancel remaining
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════ STEP 5: DONE */}
          {step === "done" && (
            <>
              <div
                className="p-8 rounded-2xl text-center space-y-3"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
              >
                <div
                  className="inline-flex p-4 rounded-2xl"
                  style={{ background: importProgress.failed === 0 ? 'rgba(74,222,128,0.10)' : 'rgba(251,146,60,0.10)' }}
                >
                  <CheckCircle2
                    className="h-10 w-10"
                    style={{ color: importProgress.failed === 0 ? '#4ade80' : '#fb923c' }}
                  />
                </div>
                <h3 className="text-2xl font-bold" style={{ color: th.primaryText }}>Import Complete</h3>
                <p style={{ color: th.mutedText }}>
                  {importProgress.success} product{importProgress.success !== 1 ? "s" : ""} imported successfully
                  {importProgress.failed > 0 && ` · ${importProgress.failed} failed`}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl text-center" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <p className="text-2xl font-bold" style={{ color: th.primaryText }}>{importProgress.total}</p>
                  <p className="text-sm mt-1" style={{ color: th.mutedText }}>Attempted</p>
                </div>
                <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)' }}>
                  <p className="text-2xl font-bold text-emerald-400">{importProgress.success}</p>
                  <p className="text-sm mt-1" style={{ color: th.mutedText }}>Imported</p>
                </div>
                <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
                  <p className="text-2xl font-bold text-red-400">{importProgress.failed}</p>
                  <p className="text-sm mt-1" style={{ color: th.mutedText }}>Failed</p>
                </div>
              </div>

              {/* Accounting confirmation */}
              {importProgress.success > 0 && (
                <div
                  className="flex items-start gap-3 p-5 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Accounting & inventory updated</p>
                    <p className="text-xs mt-1" style={{ color: th.mutedText }}>
                      Opening stock for all imported products with a cost price has been posted to the
                      inventory ledger. Each product also has an activity log entry and inventory movement record.
                    </p>
                  </div>
                </div>
              )}

              {/* Failed rows detail */}
              {importProgress.failed > 0 && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: th.containerBg, border: `1px solid ${th.containerBorder}` }}
                >
                  <div
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ background: isDark ? '#050505' : '#f3f4f6', color: '#f87171', borderBottom: `1px solid ${th.divider}` }}
                  >
                    Failed Rows — Review & Retry
                  </div>
                  <div className="divide-y" style={{ borderColor: th.divider }}>
                    {rows.filter(r => r.status === "error").map(row => (
                      <div key={row._rowIndex} className="flex items-center gap-3 px-4 py-3">
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="flex-1 text-sm truncate" style={{ color: th.secondaryText }}>{row.name}</span>
                        <span className="text-xs text-red-400 truncate max-w-[250px]">{row.importError}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                {importProgress.failed > 0 ? (
                  <button
                    onClick={() => {
                      setRows(prev => prev.map(r => r.status === "error" ? { ...r, status: "pending", importError: undefined } : r));
                      setFilterStatus("errors");
                      setStep("preview");
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors active:scale-95"
                    style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}
                  >
                    <RefreshCw className="h-4 w-4" /> Retry Failed Rows
                  </button>
                ) : <span />}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep("upload");
                      setCsvHeaders([]); setRawRows([]); setRows([]);
                      setFileName(""); setColumnMap({});
                      setImportProgress({ done: 0, total: 0, success: 0, failed: 0 });
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm transition-colors active:scale-95"
                    style={{ border: `1px solid ${th.inputBorder}`, color: th.mutedText, background: 'transparent' }}
                  >
                    Import Another File
                  </button>
                  <button
                    onClick={() => router.push("/autocityPro/products")}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95"
                  >
                    View Products →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-16" />
      </div>
    </MainLayout>
  );
}