// lib/utils/closingPdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClosingData {
  _id: string;
  closingType: 'day' | 'month';
  closingDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  openingCash: number;
  openingBank: number;
  closingBank: number;
  bankSales?: number;
  bankPayments?: number;
  totalOpeningBalance?: number;
  totalClosingBalance?: number;
  cashSales: number;
  cashReceipts: number;
  cashPayments: number;
  closingCash: number;
  salesCount: number;
  purchasesCount?: number;
  expensesCount?: number;
  totalDiscount: number;
  totalTax: number;
  openingStock: number;
  closingStock: number;
  stockValue: number;
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
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
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

interface InventoryItem {
  productName: string;
  currentStock: number;
  costPrice: number;
  value: number;
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
  inventory?: InventoryItem[];
  outletName?: string;
  outletAddress?: string | Address;
}

// Dark Red Theme Colors
const COLORS = {
  darkRed: '#932222',
  lightRed: '#E84545',
  darkBg: '#0A0A0A',
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
  mediumGray: '#9CA3AF',
  darkGray: '#1F2937',
  black: '#000000',
  green: '#10B981',
  red: '#EF4444',
};

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

export async function generateClosingPDF(data: PDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = await loadImageAsBase64('/logo.png');
  const { closing, sales = [], expenses = [], purchases = [], inventory = [] } = data;
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

  // Helper function to check if we need a new page
  const checkAddPage = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Add header background
  doc.setFillColor(COLORS.darkRed);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Add logo
  doc.addImage(logoBase64, 'PNG', margin, 10, 30, 30);

  // Company name and title
  doc.setTextColor(COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(outletName, pageWidth / 2, 25, { align: 'center' });

  if (outletAddress) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(outletAddress, pageWidth / 2, 32, { align: 'center' });
  }

  // Report title
  const closingTypeText = closing.closingType === 'day' ? 'Daily' : 'Monthly';
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${closingTypeText} Closing Report`, pageWidth / 2, 42, { align: 'center' });

  yPosition = 60;

  // Period Information Box
  doc.setFillColor(COLORS.lightGray);
  doc.rect(margin, yPosition, contentWidth, 30, 'F');

  doc.setTextColor(COLORS.black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const periodStart = new Date(closing.periodStart).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const periodEnd = new Date(closing.periodEnd).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.text('Period:', margin + 5, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${periodStart} to ${periodEnd}`, margin + 30, yPosition + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', margin + 5, yPosition + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(closing.status.toUpperCase(), margin + 30, yPosition + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Closed By:', margin + 5, yPosition + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`${closing.closedBy.firstName} ${closing.closedBy.lastName}`, margin + 30, yPosition + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('Closed At:', pageWidth / 2 + 5, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date(closing.closedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    pageWidth / 2 + 30,
    yPosition + 8
  );

  yPosition += 40;

  // Financial Summary Section
  checkAddPage(70);
  doc.setFillColor(COLORS.darkRed);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', margin + 5, yPosition + 6);

  yPosition += 12;

  // Financial summary table with purchases separate from expenses
  const totalCosts = closing.totalPurchases + closing.totalExpenses;
  const financialData = [
    ['Total Revenue', `QAR ${closing.totalRevenue.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['', ''],
    ['Total Purchases', `QAR ${closing.totalPurchases.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Total Expenses', `QAR ${closing.totalExpenses.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Total Costs', `QAR ${totalCosts.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['', ''],
    ['Net Profit/Loss', `QAR ${closing.netProfit.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['', ''],
    ['Sales Count', closing.salesCount.toString()],
    ['Purchases Count', (closing.purchasesCount || 0).toString()],
    ['Expenses Count', (closing.expensesCount || 0).toString()],
    ['', ''],
    ['Total Discount', `QAR ${closing.totalDiscount.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Total Tax', `QAR ${closing.totalTax.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: financialData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.5 },
      1: { halign: 'right', cellWidth: contentWidth * 0.5 },
    },
    didParseCell: (data) => {
      if (data.row.index === 6) {
        // Net Profit row
        data.cell.styles.fillColor = closing.netProfit >= 0 ? [16, 185, 129] : [239, 68, 68];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      } else if (data.row.index === 4) {
        // Total Costs row
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.fontStyle = 'bold';
      } else if ([1, 5, 7, 11].includes(data.row.index)) {
        // Empty rows
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.minCellHeight = 3;
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Cash Flow Section
  checkAddPage(60);
  doc.setFillColor(COLORS.darkRed);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH FLOW', margin + 5, yPosition + 6);

  yPosition += 12;

  const cashFlowData = [
    ['Opening Cash Balance', `QAR ${closing.openingCash.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Cash Sales', `QAR ${closing.cashSales.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Cash Receipts', `QAR ${closing.cashReceipts.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Cash Payments', `QAR ${closing.cashPayments.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Closing Cash Balance', `QAR ${closing.closingCash.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: cashFlowData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.5 },
      1: { halign: 'right', cellWidth: contentWidth * 0.5 },
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        // Closing cash row
        data.cell.styles.fillColor = [147, 34, 34];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Bank Flow Section
  checkAddPage(60);
  doc.setFillColor(COLORS.darkRed);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK FLOW', margin + 5, yPosition + 6);

  yPosition += 12;

  const bankFlowData = [
    ['Opening Bank Balance', `QAR ${closing.openingBank.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Bank Sales', `QAR ${(closing.bankSales || 0).toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Bank Payments', `QAR ${(closing.bankPayments || 0).toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ['Closing Bank Balance', `QAR ${closing.closingBank.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: bankFlowData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.5 },
      1: { halign: 'right', cellWidth: contentWidth * 0.5 },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        // Closing bank row
        data.cell.styles.fillColor = [147, 34, 34];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Total Balances Section (if available)
  if (closing.totalOpeningBalance !== undefined && closing.totalClosingBalance !== undefined) {
    checkAddPage(40);
    doc.setFillColor(COLORS.darkRed);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL BALANCES', margin + 5, yPosition + 6);

    yPosition += 12;

    const totalOpeningBalance = closing.totalOpeningBalance;
    const totalClosingBalance = closing.totalClosingBalance;
    const netChange = totalClosingBalance - totalOpeningBalance;

    const totalBalancesData = [
      ['Total Opening Balance', `QAR ${totalOpeningBalance.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
      ['Total Closing Balance', `QAR ${totalClosingBalance.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
      ['Net Change', `QAR ${netChange.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: totalBalancesData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: contentWidth * 0.5 },
        1: { halign: 'right', cellWidth: contentWidth * 0.5 },
      },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          // Net change row
          data.cell.styles.fillColor = netChange >= 0 ? [16, 185, 129] : [239, 68, 68];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Inventory Section
  checkAddPage(60);
  doc.setFillColor(COLORS.darkRed);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTORY', margin + 5, yPosition + 6);

  yPosition += 12;

  const inventoryData = [
    ['Opening Stock', closing.openingStock.toString()],
    ['Closing Stock', closing.closingStock.toString()],
    ['Total Inventory Value', `QAR ${closing.stockValue.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: inventoryData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.5 },
      1: { halign: 'right', cellWidth: contentWidth * 0.5 },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [147, 34, 34];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Ledger Information (if available)
  if (closing.ledgerEntriesCount) {
    checkAddPage(40);
    doc.setFillColor(COLORS.darkRed);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LEDGER INFORMATION', margin + 5, yPosition + 6);

    yPosition += 12;

    const ledgerData = [
      ['Ledger Entries', closing.ledgerEntriesCount.toString()],
      ['Total Debits', `QAR ${(closing.totalDebits || 0).toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
      ['Total Credits', `QAR ${(closing.totalCredits || 0).toLocaleString('en-QA', { minimumFractionDigits: 2 })}`],
      ['Trial Balance', closing.trialBalanceMatched ? 'MATCHED ✓' : 'MISMATCH ⚠'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: ledgerData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: contentWidth * 0.5 },
        1: { halign: 'right', cellWidth: contentWidth * 0.5 },
      },
      didParseCell: (data) => {
        if (data.row.index === 3) {
          data.cell.styles.fillColor = closing.trialBalanceMatched ? [16, 185, 129] : [239, 68, 68];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Sales List (only for daily closings)
  if (closing.closingType === 'day' && sales.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFillColor(COLORS.darkRed);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SALES LIST', margin + 5, yPosition + 6);

    yPosition += 12;

    const salesTableData = sales.map((sale) => [
      sale.invoiceNumber,
      new Date(sale.saleDate).toLocaleDateString('en-US'),
      sale.customerName || '-',
      sale.paymentMethod,
      `QAR ${sale.grandTotal.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Invoice #', 'Date', 'Customer', 'Payment', 'Amount']],
      body: salesTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [147, 34, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Purchases List
  if (purchases.length > 0) {
    checkAddPage(60);
    if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY + 60 > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(COLORS.darkRed);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASES', margin + 5, yPosition + 6);

    yPosition += 12;

    const purchasesTableData = purchases.map((purchase) => [
      purchase.voucherNumber,
      new Date(purchase.date).toLocaleDateString('en-US'),
      purchase.supplierName || '-',
      `QAR ${purchase.amount.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Voucher #', 'Date', 'Supplier', 'Amount']],
      body: purchasesTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [147, 34, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 70 },
        3: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expenses List
  if (expenses.length > 0) {
    checkAddPage(60);
    if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY + 60 > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(COLORS.darkRed);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPENSES', margin + 5, yPosition + 6);

    yPosition += 12;

    const expensesTableData = expenses.map((expense) => [
      expense.voucherNumber,
      new Date(expense.date).toLocaleDateString('en-US'),
      expense.description,
      expense.category || '-',
      `QAR ${expense.amount.toLocaleString('en-QA', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Voucher #', 'Date', 'Description', 'Category', 'Amount']],
      body: expensesTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [147, 34, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Notes Section
  if (closing.notes) {
    yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : yPosition + 10;
    checkAddPage(30);

    doc.setFillColor(COLORS.darkRed);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', margin + 5, yPosition + 6);

    yPosition += 12;

    doc.setTextColor(COLORS.black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(closing.notes, contentWidth - 10);
    doc.text(splitNotes, margin + 5, yPosition);
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      margin,
      pageHeight - 10
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
  }

  return doc.output('blob');
}