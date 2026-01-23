// lib/utils/closingPdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* =========================================================
   Types
   ========================================================= */

interface ClosingData {
  _id: string;
  closingType: 'day' | 'month';
  closingDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;

  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;

  openingCash: number;
  openingBank: number;
  closingCash: number;
  closingBank: number;

  cashSales: number;
  bankSales?: number;

  // Legacy / informational only (ledger-driven system)
  cashReceipts?: number;
  cashPayments?: number;
  bankPayments?: number;

  totalOpeningBalance?: number;
  totalClosingBalance?: number;

  salesCount: number;
  purchasesCount?: number;
  expensesCount?: number;

  totalDiscount: number;
  totalTax: number;

  openingStock: number;
  closingStock: number;
  stockValue: number;

  accountsPayable?: number;

  ledgerEntriesCount?: number;
  trialBalanceMatched?: boolean;
  totalDebits?: number;
  totalCredits?: number;

  closedBy: {
    firstName: string;
    lastName: string;
  };

  closedAt: string;
  notes?: string;
}

interface SaleItem {
  invoiceNumber: string;
  saleDate: string;
  customerName?: string;
  grandTotal: number;
  paymentMethod: string;
  items?: any[];
}

interface ExpenseItem {
  voucherNumber: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
}

interface PurchaseItem {
  voucherNumber: string;
  date: string;
  supplierName?: string;
  amount: number;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface PDFData {
  closing: ClosingData;
  sales?: SaleItem[];
  expenses?: ExpenseItem[];
  purchases?: PurchaseItem[];
  outletName?: string;
  outletAddress?: string | Address;
}

/* =========================================================
   Theme
   ========================================================= */

const COLORS = {
  primary: '#932222',
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
  mediumGray: '#9CA3AF',
  darkGray: '#4B5563',
  black: '#000000',
  green: '#10B981',
  red: '#EF4444',
  blue: '#3B82F6',
  amber: '#F59E0B',
};

/* =========================================================
   Helpers
   ========================================================= */

async function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas error');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function formatCurrency(amount: number): string {
  return `QAR ${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* =========================================================
   PDF Generator
   ========================================================= */

export async function generateClosingPDF(data: PDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoBase64 = await loadImageAsBase64('/logo.png');
  const { closing, sales = [], expenses = [], purchases = [] } = data;

  const outletName = data.outletName || 'AutoCity Pro';
  const outletAddress =
    typeof data.outletAddress === 'string'
      ? data.outletAddress
      : data.outletAddress
      ? [
          data.outletAddress.street,
          data.outletAddress.city,
          data.outletAddress.state,
          data.outletAddress.country,
          data.outletAddress.postalCode,
        ]
          .filter(Boolean)
          .join(', ')
      : '';

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const checkAddPage = (space: number) => {
    if (yPosition + space > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  /* ================= HEADER ================= */

  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.addImage(logoBase64, 'PNG', margin, 8, 30, 30);

  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(outletName, pageWidth / 2, 22, { align: 'center' });

  if (outletAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(outletAddress, pageWidth / 2, 30, { align: 'center' });
  }

  const closingTypeText = closing.closingType === 'day' ? 'Daily' : 'Monthly';
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${closingTypeText} Closing Report`, pageWidth / 2, 42, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ledger-Driven Accounting`, pageWidth / 2, 49, { align: 'center' });

  yPosition = 65;

  /* ================= PERIOD INFO BOX ================= */

  doc.setFillColor(COLORS.lightGray);
  doc.roundedRect(margin, yPosition, contentWidth, 35, 2, 2, 'F');

  doc.setTextColor(COLORS.black);
  doc.setFontSize(10);

  const periodStart = formatDate(closing.periodStart);
  const periodEnd = formatDate(closing.periodEnd);
  const closedAt = formatDateTime(closing.closedAt);

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Period:', margin + 5, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${periodStart} to ${periodEnd}`, margin + 25, yPosition + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', margin + 5, yPosition + 16);
  doc.setFont('helvetica', 'normal');
  const statusText = closing.status.toUpperCase();
  const statusColor = closing.status === 'closed' ? COLORS.green : COLORS.amber;
  doc.setTextColor(statusColor);
  doc.text(statusText, margin + 25, yPosition + 16);
  doc.setTextColor(COLORS.black);

  doc.setFont('helvetica', 'bold');
  doc.text('Closed By:', margin + 5, yPosition + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${closing.closedBy.firstName} ${closing.closedBy.lastName}`,
    margin + 25,
    yPosition + 24
  );

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Closing Date:', pageWidth / 2 + 10, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(closing.closingDate), pageWidth / 2 + 40, yPosition + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Closed At:', pageWidth / 2 + 10, yPosition + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(closedAt, pageWidth / 2 + 40, yPosition + 16);

  if (closing.trialBalanceMatched !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('Trial Balance:', pageWidth / 2 + 10, yPosition + 24);
    doc.setFont('helvetica', 'normal');
    const tbText = closing.trialBalanceMatched ? '✓ Matched' : '✗ Not Matched';
    const tbColor = closing.trialBalanceMatched ? COLORS.green : COLORS.red;
    doc.setTextColor(tbColor);
    doc.text(tbText, pageWidth / 2 + 40, yPosition + 24);
    doc.setTextColor(COLORS.black);
  }

  yPosition += 45;

  /* ================= EXECUTIVE SUMMARY ================= */

  checkAddPage(80);
  doc.setFillColor(COLORS.primary);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('EXECUTIVE SUMMARY', margin + 5, yPosition + 6);

  yPosition += 12;

  const profitMargin =
    closing.totalRevenue > 0
      ? ((closing.netProfit / closing.totalRevenue) * 100).toFixed(1)
      : '0.0';

  autoTable(doc, {
    startY: yPosition,
    theme: 'grid',
    head: [['Metric', 'Amount', 'Details']],
    body: [
      [
        'Total Revenue',
        formatCurrency(closing.totalRevenue),
        `${closing.salesCount} sales`,
      ],
      [
        'Total Costs',
        formatCurrency(closing.totalPurchases + closing.totalExpenses),
        `Purchases + Expenses`,
      ],
      [
        'Net Profit / Loss',
        formatCurrency(closing.netProfit),
        `${profitMargin}% margin`,
      ],
      [
        'Cash Position',
        formatCurrency(closing.closingCash),
        `From ${formatCurrency(closing.openingCash)}`,
      ],
      [
        'Bank Position',
        formatCurrency(closing.closingBank),
        `From ${formatCurrency(closing.openingBank)}`,
      ],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: {
      fillColor: [147, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right', cellWidth: 40 },
      2: { fontSize: 9, textColor: [75, 85, 99] },
    },
    didParseCell: (data) => {
      if (data.row.index === 2 && data.section === 'body') {
        data.cell.styles.fillColor =
          closing.netProfit >= 0 ? [16, 185, 129] : [239, 68, 68];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  /* ================= FINANCIAL BREAKDOWN ================= */

  checkAddPage(90);
  doc.setFillColor(COLORS.primary);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL BREAKDOWN', margin + 5, yPosition + 6);

  yPosition += 12;

  const totalCosts = closing.totalPurchases + closing.totalExpenses;

  autoTable(doc, {
    startY: yPosition,
    theme: 'striped',
    head: [['Category', 'Amount', 'Count', '% of Revenue']],
    body: [
      [
        'Revenue',
        formatCurrency(closing.totalRevenue),
        closing.salesCount.toString(),
        '100.0%',
      ],
      [
        'Purchases',
        formatCurrency(closing.totalPurchases),
        String(closing.purchasesCount ?? 0),
        closing.totalRevenue > 0
          ? `${((closing.totalPurchases / closing.totalRevenue) * 100).toFixed(1)}%`
          : '0.0%',
      ],
      [
        'Expenses',
        formatCurrency(closing.totalExpenses),
        String(closing.expensesCount ?? 0),
        closing.totalRevenue > 0
          ? `${((closing.totalExpenses / closing.totalRevenue) * 100).toFixed(1)}%`
          : '0.0%',
      ],
      [
        'Total Costs',
        formatCurrency(totalCosts),
        '-',
        closing.totalRevenue > 0
          ? `${((totalCosts / closing.totalRevenue) * 100).toFixed(1)}%`
          : '0.0%',
      ],
      [
        'Discounts Given',
        formatCurrency(closing.totalDiscount),
        '-',
        closing.totalRevenue > 0
          ? `${((closing.totalDiscount / closing.totalRevenue) * 100).toFixed(1)}%`
          : '0.0%',
      ],
      [
        'Tax Collected',
        formatCurrency(closing.totalTax),
        '-',
        closing.totalRevenue > 0
          ? `${((closing.totalTax / closing.totalRevenue) * 100).toFixed(1)}%`
          : '0.0%',
      ],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: {
      fillColor: [147, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'center' },
      3: { halign: 'right', fontSize: 9 },
    },
    didParseCell: (data) => {
      if (data.row.index === 3 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  /* ================= LEDGER-DRIVEN CASH FLOW ================= */

  checkAddPage(75);
  doc.setFillColor(COLORS.primary);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH FLOW ANALYSIS (Ledger-Driven)', margin + 5, yPosition + 6);

  yPosition += 12;

  doc.setFontSize(8);
  doc.setTextColor(COLORS.mediumGray);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Cash balances are calculated from ledger entries. Sales figures shown for reference only.',
    margin + 5,
    yPosition - 2
  );
  doc.setTextColor(COLORS.black);

  const cashMovement = closing.closingCash - closing.openingCash;
  const cashMovementText =
    cashMovement >= 0
      ? `+${formatCurrency(Math.abs(cashMovement))}`
      : `-${formatCurrency(Math.abs(cashMovement))}`;

  autoTable(doc, {
    startY: yPosition,
    theme: 'grid',
    body: [
      ['Opening Cash Balance (Ledger)', formatCurrency(closing.openingCash)],
      ['Cash Sales (Informational)', formatCurrency(closing.cashSales)],
      [
        'Other Cash Receipts',
        formatCurrency(closing.cashReceipts ?? 0),
      ],
      [
        'Cash Payments (Ledger)',
        formatCurrency(closing.cashPayments ?? 0),
      ],
      ['Net Cash Movement', cashMovementText],
      ['Closing Cash Balance (Ledger)', formatCurrency(closing.closingCash)],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 5) {
        data.cell.styles.fillColor = [147, 34, 34];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  /* ================= LEDGER-DRIVEN BANK FLOW ================= */

  checkAddPage(70);
  doc.setFillColor(COLORS.primary);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK FLOW ANALYSIS (Ledger-Driven)', margin + 5, yPosition + 6);

  yPosition += 12;

  const bankMovement = closing.closingBank - closing.openingBank;
  const bankMovementText =
    bankMovement >= 0
      ? `+${formatCurrency(Math.abs(bankMovement))}`
      : `-${formatCurrency(Math.abs(bankMovement))}`;

  autoTable(doc, {
    startY: yPosition,
    theme: 'grid',
    body: [
      ['Opening Bank Balance (Ledger)', formatCurrency(closing.openingBank)],
      [
        'Bank Sales (Informational)',
        formatCurrency(closing.bankSales ?? 0),
      ],
      [
        'Bank Payments (Ledger)',
        formatCurrency(closing.bankPayments ?? 0),
      ],
      ['Net Bank Movement', bankMovementText],
      ['Closing Bank Balance (Ledger)', formatCurrency(closing.closingBank)],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [147, 34, 34];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  /* ================= TOTAL BALANCE SUMMARY ================= */

  checkAddPage(50);
  doc.setFillColor(COLORS.blue);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL BALANCE SUMMARY', margin + 5, yPosition + 6);

  yPosition += 12;

  const totalOpening = closing.totalOpeningBalance ?? 0;
  const totalClosing = closing.totalClosingBalance ?? 0;
  const totalMovement = totalClosing - totalOpening;

  autoTable(doc, {
    startY: yPosition,
    theme: 'grid',
    body: [
      ['Total Opening Balance (Cash + Bank)', formatCurrency(totalOpening)],
      ['Total Closing Balance (Cash + Bank)', formatCurrency(totalClosing)],
      ['Net Change', formatCurrency(totalMovement)],
    ],
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === 1) {
        data.cell.styles.fillColor = [59, 130, 246];
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  /* ================= INVENTORY ANALYSIS ================= */

  checkAddPage(60);
  doc.setFillColor(COLORS.primary);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTORY ANALYSIS', margin + 5, yPosition + 6);

  yPosition += 12;

  const stockChange = closing.closingStock - closing.openingStock;
  const stockChangeText =
    stockChange >= 0 ? `+${stockChange} units` : `${stockChange} units`;

  autoTable(doc, {
    startY: yPosition,
    theme: 'striped',
    body: [
      ['Opening Stock', `${closing.openingStock} units`, '-'],
      ['Closing Stock', `${closing.closingStock} units`, '-'],
      ['Stock Change', stockChangeText, '-'],
      ['Inventory Value', formatCurrency(closing.stockValue), 'At cost price'],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'right', cellWidth: 50 },
      2: { fontSize: 9, textColor: [75, 85, 99] },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [243, 244, 246];
      }
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  /* ================= LIABILITIES ================= */

  if (closing.accountsPayable !== undefined && closing.accountsPayable > 0) {
    checkAddPage(40);
    doc.setFillColor(COLORS.amber);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text('LIABILITIES', margin + 5, yPosition + 6);

    yPosition += 12;

    autoTable(doc, {
      startY: yPosition,
      theme: 'grid',
      body: [['Accounts Payable', formatCurrency(closing.accountsPayable)]],
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  /* ================= LEDGER STATISTICS ================= */

  if (closing.ledgerEntriesCount !== undefined) {
    checkAddPage(50);
    doc.setFillColor(COLORS.darkGray);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text('LEDGER STATISTICS', margin + 5, yPosition + 6);

    yPosition += 12;

    autoTable(doc, {
      startY: yPosition,
      theme: 'grid',
      body: [
        ['Total Ledger Entries', String(closing.ledgerEntriesCount)],
        [
          'Total Debits',
          closing.totalDebits !== undefined
            ? formatCurrency(closing.totalDebits)
            : 'N/A',
        ],
        [
          'Total Credits',
          closing.totalCredits !== undefined
            ? formatCurrency(closing.totalCredits)
            : 'N/A',
        ],
        [
          'Trial Balance Status',
          closing.trialBalanceMatched ? '✓ Matched' : '✗ Not Matched',
        ],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.row.index === 3) {
          const matched = closing.trialBalanceMatched;
          data.cell.styles.fillColor = matched ? [16, 185, 129] : [239, 68, 68];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  /* ================= NOTES ================= */

  if (closing.notes && closing.notes.trim().length > 0) {
    checkAddPage(30);
    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(margin, yPosition, contentWidth, 'auto' as any, 2, 2, 'F');

    doc.setTextColor(COLORS.black);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('NOTES:', margin + 5, yPosition + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(closing.notes, contentWidth - 10);
    doc.text(splitNotes, margin + 5, yPosition + 14);

    yPosition += 20 + splitNotes.length * 4;
  }

  /* ================= DETAILED SALES (if daily) ================= */

  if (closing.closingType === 'day' && sales.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFillColor(COLORS.primary);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DETAILED SALES TRANSACTIONS', margin + 5, yPosition + 6);

    yPosition += 12;

    const salesTableData = sales.slice(0, 50).map((sale) => [
      sale.invoiceNumber,
      formatDate(sale.saleDate),
      sale.customerName || 'Walk-in',
      formatCurrency(sale.grandTotal),
      sale.paymentMethod,
    ]);

    autoTable(doc, {
      startY: yPosition,
      theme: 'striped',
      head: [['Invoice', 'Date', 'Customer', 'Amount', 'Payment']],
      body: salesTableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [147, 34, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 50 },
        3: { halign: 'right', cellWidth: 30 },
        4: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
    });

    if (sales.length > 50) {
      yPosition = (doc as any).lastAutoTable.finalY + 5;
      doc.setFontSize(8);
      doc.setTextColor(COLORS.mediumGray);
      doc.text(`Showing first 50 of ${sales.length} sales`, margin, yPosition);
    }
  }

  /* ================= FOOTER ================= */

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(COLORS.mediumGray);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Page numbers
    doc.setFontSize(8);
    doc.setTextColor(COLORS.mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 10
    );

    // Generation info
    doc.text(
      `Generated: ${new Date().toLocaleString('en-US')}`,
      margin,
      pageHeight - 10
    );

    // System info
    doc.text(
      'AutoCity Accounting',
      pageWidth / 2,
      pageHeight - 10,
      {
        align: 'center',
      }
    );
  }

  return doc.output('blob');
}