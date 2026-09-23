"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState, type CSSProperties, type RefObject } from "react";

interface ProductSearchSelectProps {
  products: any[];
  value: string;
  selectedProductId: string;
  onChange: (value: string) => void;
  onSelect: (product: any) => void;
  onClear: () => void;
  placeholder?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  panelStyle?: CSSProperties;
  primaryColor?: string;
  secondaryColor?: string;
  inputRef?: RefObject<HTMLInputElement>;
}

export default function ProductSearchSelect({
  products,
  value,
  selectedProductId,
  onChange,
  onSelect,
  onClear,
  placeholder = "Search products...",
  inputClassName = "w-full pl-10 pr-10 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[color:var(--autocity-accent)] focus:border-transparent",
  inputStyle,
  panelStyle,
  primaryColor = "#ffffff",
  secondaryColor = "#9ca3af",
  inputRef,
}: ProductSearchSelectProps) {
  const [focused, setFocused] = useState(false);
  const query = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (selectedProductId || query.length < 2) return [];
    return products.filter((product) => {
      const values = [
        product.name,
        product.sku,
        product.barcode,
        product.partNumber,
        product.carMake,
        product.carModel,
      ];
      return values.some((candidate) => String(candidate || "").toLowerCase().includes(query));
    }).slice(0, 8);
  }, [products, query, selectedProductId]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[color:var(--autocity-accent)]" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClassName}
        style={inputStyle}
      />
      {(value || selectedProductId) && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1.5 hover:bg-white/10"
          aria-label="Clear selected product"
        >
          <X className="h-4 w-4" style={{ color: secondaryColor }} />
        </button>
      )}
      {focused && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-80 overflow-y-auto rounded-xl shadow-2xl"
          style={panelStyle}
        >
          {suggestions.map((product) => (
            <button
              key={product._id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(product);
                setFocused(false);
              }}
              className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-left last:border-b-0 hover:bg-white/10"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold" style={{ color: primaryColor }}>
                  {product.name}
                </span>
                <span className="block truncate text-xs" style={{ color: secondaryColor }}>
                  SKU {product.sku}{product.partNumber ? ` · Part ${product.partNumber}` : ""}
                </span>
              </span>
              <span className="flex-shrink-0 text-xs" style={{ color: secondaryColor }}>
                Stock {Number(product.currentStock || 0)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
