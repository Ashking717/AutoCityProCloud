// ============================================================================
// 🥈 FIX #2: LAZY-LOADED PDF EXPORT
// This module is only loaded when user clicks "Export PDF"
// Saves ~100KB from initial bundle
// ============================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function exportProductsToPDF(products: any[]) {
  const PRIORITY_MAKES = ["toyota", "nissan", "lexus", "ford"];

  const sortedProducts = [...products].sort((a, b) => {
    const hasMakeA = !!a.carMake;
    const hasMakeB = !!b.carMake;

    if (hasMakeA && !hasMakeB) return -1;
    if (!hasMakeA && hasMakeB) return 1;
    if (!hasMakeA && !hasMakeB) return 0;

    const makeA = a.carMake.toLowerCase();
    const makeB = b.carMake.toLowerCase();

    const idxA = PRIORITY_MAKES.indexOf(makeA);
    const idxB = PRIORITY_MAKES.indexOf(makeB);

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    return makeA.localeCompare(makeB);
  });

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const headers = [
    ["SKU", "Name", "Category", "Barcode", "Price", "Stock", "Make", "Model", "Variant", "Year", "Color", "Part No"],
  ];

  const rows: any[] = [];
  let lastMake = "";
  let lastModel = "";
  let othersStarted = false;

  sortedProducts.forEach((p) => {
    const hasMake = !!p.carMake;

    if (!hasMake) {
      if (!othersStarted) {
        rows.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        rows.push([
          {
            content: "OTHERS / GENERAL PRODUCTS",
            colSpan: 12,
            styles: {
              fillColor: [40, 40, 40],
              textColor: 255,
              fontStyle: "bold",
              fontSize: 9,
              halign: "center",
            },
          },
        ]);
        othersStarted = true;
      }

      rows.push([
        p.sku || "",
        p.name || "",
        p.category?.name || "",
        p.barcode || "",
        p.sellingPrice || 0,
        p.currentStock || 0,
        "",
        "",
        p.variant || "",
        formatYearRange(p.yearFrom, p.yearTo),
        p.color || "",
        p.partNumber || "",
      ]);

      return;
    }

    if (p.carMake !== lastMake) {
      rows.push([
        {
          content: p.carMake.toUpperCase(),
          colSpan: 12,
          styles: {
            fillColor: [25, 25, 25],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
          },
        },
      ]);
      lastMake = p.carMake;
      lastModel = "";
    }

    if (p.carModel && p.carModel !== lastModel) {
      rows.push([
        {
          content: `  ${p.carModel}`,
          colSpan: 12,
          styles: {
            fillColor: [140, 140, 140],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8,
            halign: "left",
          },
        },
      ]);
      lastModel = p.carModel;
    }

    rows.push([
      p.sku || "",
      p.name || "",
      p.category?.name || "",
      p.barcode || "",
      p.sellingPrice || 0,
      p.currentStock || 0,
      p.carMake || "",
      p.carModel || "",
      p.variant || "",
      formatYearRange(p.yearFrom, p.yearTo),
      p.color || "",
      p.partNumber || "",
    ]);
  });

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 22,
    theme: "grid",
    showHead: "everyPage",
    pageBreak: "auto",
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
      valign: "middle",
    },
    headStyles: {
      fillColor: [65, 16, 16],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    margin: { top: 18, left: 8, right: 8 },
  });

  doc.save(`products_${new Date().toISOString().split("T")[0]}.pdf`);
}

function formatYearRange(yearFrom?: number, yearTo?: number): string {
  if (!yearFrom && !yearTo) return "";
  if (yearFrom && !yearTo) return `${yearFrom}+`;
  if (!yearFrom && yearTo) return `Up to ${yearTo}`;
  if (yearFrom === yearTo) return `${yearFrom}`;
  return `${yearFrom}-${yearTo}`;
}