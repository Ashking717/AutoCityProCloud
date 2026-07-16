// app/autocityPro/products/useKeyboardShortcuts.ts
"use client";
import { hasShortcutModifier, shouldIgnoreGlobalShortcut } from "@/lib/utils/keyboard";
import { useEffect } from "react";
import toast from "react-hot-toast";

interface UseKeyboardShortcutsProps {
  onSearch: () => void;
  onNewProduct: () => void;
  onToggleFilters: () => void;
  onExport: () => void;
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  products: any[];
  onViewProduct: (product: any) => void;
  onDeleteProduct: (product: any) => void;
  disabled: boolean;
}

export default function useKeyboardShortcuts({
  onSearch,
  onNewProduct,
  onToggleFilters,
  onExport,
  selectedIndex,
  setSelectedIndex,
  products,
  onViewProduct,
  onDeleteProduct,
  disabled,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (shouldIgnoreGlobalShortcut(e)) return;
      if (hasShortcutModifier(e)) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          onSearch();
          break;

        case "n":
        case "N":
          if (!e.shiftKey || e.key === "N") {
            e.preventDefault();
            onNewProduct();
          }
          break;

        case "f":
        case "F":
          e.preventDefault();
          onToggleFilters();
          break;

        case "e":
        case "E":
          if (selectedIndex === -1) {
            e.preventDefault();
            onExport();
          }
          break;

        case "ArrowDown":
          if (products.length > 0) {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, products.length - 1)));
          }
          break;

        case "ArrowUp":
          if (products.length > 0) {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < 0 ? products.length - 1 : Math.max(prev - 1, 0)));
          }
          break;

        case "Home":
          if (products.length > 0) {
            e.preventDefault();
            setSelectedIndex(0);
          }
          break;

        case "End":
          if (products.length > 0) {
            e.preventDefault();
            setSelectedIndex(products.length - 1);
          }
          break;

        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < products.length) {
            e.preventDefault();
            const product = products[selectedIndex];
            onViewProduct(product);
          }
          break;

        case "Delete":
        case "Backspace":
          if (selectedIndex >= 0 && selectedIndex < products.length) {
            e.preventDefault();
            const product = products[selectedIndex];
            onDeleteProduct(product);
          }
          break;

        case "Escape":
          e.preventDefault();
          setSelectedIndex(-1);
          break;

        case "?":
          e.preventDefault();
          toast.success(
            "Keyboard Shortcuts:\n" +
              "/ - Focus search\n" +
              "N - New product\n" +
              "F - Toggle filters\n" +
              "E - Export CSV\n" +
              "↑↓ - Navigate products\n" +
              "Home/End - First/last product\n" +
              "Enter - View product\n" +
              "Del - Delete product\n" +
              "Esc - Clear selection",
            { duration: 5000 }
          );
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    disabled,
    selectedIndex,
    products,
    onSearch,
    onNewProduct,
    onToggleFilters,
    onExport,
    onViewProduct,
    onDeleteProduct,
    setSelectedIndex,
  ]);
}
