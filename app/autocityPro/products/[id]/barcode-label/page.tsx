"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Barcode,
  CheckCircle,
  Loader2,
  Package,
  Printer,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCode128BRenderData,
  sanitizeBarcodeValue,
  type BarcodeRenderData,
} from "@/lib/utils/barcode";

const LABEL_SIZES = {
  "50x30": { label: "50 x 30 mm", widthMm: 50, heightMm: 30 },
  "60x40": { label: "60 x 40 mm", widthMm: 60, heightMm: 40 },
  "38x25": { label: "38 x 25 mm", widthMm: 38, heightMm: 25 },
};

type LabelSizeKey = keyof typeof LABEL_SIZES;

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  sellingPrice?: number;
  category?: { name?: string };
}

function BarcodeSvg({ data }: { data: BarcodeRenderData }) {
  return (
    <svg
      aria-label={`Barcode ${data.value}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${data.width} ${data.height}`}
    >
      <rect width={data.width} height={data.height} fill="white" />
      {data.bars.map((bar, index) => (
        <rect
          key={`${bar.x}-${bar.width}-${index}`}
          x={bar.x}
          y="0"
          width={bar.width}
          height={data.height}
          fill="black"
        />
      ))}
    </svg>
  );
}

export default function ProductBarcodeLabelPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [labelSize, setLabelSize] = useState<LabelSizeKey>("50x30");
  const [labelCount, setLabelCount] = useState(1);

  const selectedSize = LABEL_SIZES[labelSize];
  const hasDistinctBarcode = Boolean(
    product?.barcode &&
    sanitizeBarcodeValue(product.barcode) !== sanitizeBarcodeValue(product.sku)
  );
  const barcodeValue = hasDistinctBarcode ? sanitizeBarcodeValue(product?.barcode) : "";

  const barcodeData = useMemo(() => {
    if (!barcodeValue) return null;

    try {
      return getCode128BRenderData(barcodeValue, { height: 64, quietZone: 10 });
    } catch {
      return null;
    }
  }, [barcodeValue]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`, { credentials: "include" });

      if (res.status === 401) {
        router.push("/autocityPro/login");
        return;
      }

      if (!res.ok) {
        toast.error("Failed to load product");
        return;
      }

      const data = await res.json();
      setProduct(data.product);
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const ensureBarcode = async () => {
    if (!product) return null;
    if (hasDistinctBarcode) return product.barcode;

    try {
      setGenerating(true);
      const res = await fetch(`/api/products/${productId}/barcode`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to generate barcode");
        return null;
      }

      setProduct((prev) => prev ? { ...prev, barcode: data.barcode } : prev);
      toast.success("Barcode generated");
      return data.barcode as string;
    } catch {
      toast.error("Failed to generate barcode");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    const ensuredBarcode = await ensureBarcode();
    if (!ensuredBarcode && !barcodeValue) return;

    setTimeout(() => window.print(), 80);
  };

  const labelCopies = Array.from({ length: Math.max(1, Math.min(labelCount, 100)) });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[color:var(--autocity-accent)]" />
          <span>Loading label...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
          <p>Product not found.</p>
          <button
            onClick={() => router.push("/autocityPro/products")}
            className="mt-4 rounded-xl bg-[color:var(--autocity-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <style>{`
        @page {
          size: ${selectedSize.widthMm}mm ${selectedSize.heightMm}mm;
          margin: 0;
        }

        .barcode-label {
          width: ${selectedSize.widthMm}mm;
          height: ${selectedSize.heightMm}mm;
        }

        @media print {
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            display: block !important;
          }

          .barcode-label {
            break-after: page;
            page-break-after: always;
            box-shadow: none !important;
            margin: 0 !important;
          }

          .barcode-label:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="no-print border-b border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-5 shadow-2xl md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Barcode Label</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {product.name} · SKU {product.sku}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={ensureBarcode}
              disabled={generating || Boolean(product.barcode)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {product.barcode ? "Barcode Ready" : "Generate Barcode"}
            </button>
            <button
              onClick={handlePrint}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--autocity-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--autocity-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print Label
            </button>
          </div>
        </div>
      </div>

      <main className="no-print mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1fr_360px] md:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[color:var(--autocity-accent-10)] p-3 text-[color:var(--autocity-accent)]">
              <Barcode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Preview</h2>
              <p className="text-sm text-zinc-400">
                Barcode value: <span className="font-mono text-zinc-200">{barcodeValue || "Not generated"}</span>
              </p>
            </div>
          </div>

          <div className="flex min-h-[360px] items-center justify-center rounded-3xl bg-zinc-900/80 p-8">
            <div className="scale-[2.4] origin-center">
              {barcodeData ? (
                <PrintableLabel barcodeData={barcodeData} product={product} />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-zinc-400">
                  Generate a barcode to preview the label.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="mb-4 font-semibold">Printer Setup</h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <p className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                Connect the barcode printer in Windows/macOS first.
              </p>
              <p className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                Click Print Label and choose that printer in the browser print dialog.
              </p>
              <p className="flex gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                Set paper size to match the label selected below.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Label Size
            </label>
            <select
              value={labelSize}
              onChange={(event) => setLabelSize(event.target.value as LabelSizeKey)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              {Object.entries(LABEL_SIZES).map(([key, size]) => (
                <option key={key} value={key}>
                  {size.label}
                </option>
              ))}
            </select>

            <label className="mb-2 mt-4 block text-sm font-medium text-zinc-300">
              Copies
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={labelCount}
              onChange={(event) => setLabelCount(Number(event.target.value) || 1)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </aside>
      </main>

      <div className="print-area hidden">
        {barcodeData && labelCopies.map((_, index) => (
          <PrintableLabel
            key={index}
            barcodeData={barcodeData}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}

function PrintableLabel({
  barcodeData,
  product,
}: {
  barcodeData: BarcodeRenderData;
  product: Product;
}) {
  return (
    <div className="barcode-label flex flex-col justify-between bg-white p-[2mm] text-black shadow-2xl">
      <div className="min-h-0">
        <p className="truncate text-center text-[8px] font-bold leading-tight">
          {product.name}
        </p>
        <p className="truncate text-center text-[6px] leading-tight">
          SKU: {product.sku}
        </p>
      </div>
      <div className="h-[13mm] w-full">
        <BarcodeSvg data={barcodeData} />
      </div>
      <div>
        <p className="text-center font-mono text-[8px] font-bold leading-tight">
          {barcodeData.value}
        </p>
        {product.sellingPrice !== undefined && (
          <p className="text-center text-[7px] font-semibold leading-tight">
            QAR {Number(product.sellingPrice || 0).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}
