import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { BalanceSheetData } from '@/lib/types/balanceSheet';

export const exportToPDF = (data: BalanceSheetData, asOfDate: string, outletName: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229);
  doc.text('BALANCE SHEET', 105, 20, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text(`Outlet: ${outletName}`, 105, 30, { align: 'center' });
  doc.text(`As of: ${new Date(asOfDate).toLocaleDateString()}`, 105, 36, { align: 'center' });
  
  let yPos = 50;
  
  // Assets Section
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text('ASSETS', 14, yPos);
  yPos += 10;
  
  // Current Assets
  const currentAssetsData = Object.entries(data.assets.currentAssets.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  currentAssetsData.push(['Total Current Assets', formatCurrency(data.assets.currentAssets.total)]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Current Assets', 'Amount (QAR)']],
    body: currentAssetsData,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Fixed Assets
  const fixedAssetsData = Object.entries(data.assets.fixedAssets.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  fixedAssetsData.push(['Total Fixed Assets', formatCurrency(data.assets.fixedAssets.total)]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Fixed Assets', 'Amount (QAR)']],
    body: fixedAssetsData,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Total Assets
  autoTable(doc, {
    startY: yPos,
    body: [['TOTAL ASSETS', formatCurrency(data.assets.totalAssets)]],
    styles: { 
      fillColor: [224, 231, 255] as [number, number, number],
      textColor: [30, 58, 138] as [number, number, number],
      fontStyle: 'bold' as const
    },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  // Liabilities & Equity Section
  doc.setFontSize(14);
  doc.setTextColor(124, 58, 237);
  doc.text('LIABILITIES & EQUITY', 14, yPos);
  yPos += 10;
  
  // Current Liabilities
  const currentLiabilitiesData = Object.entries(data.liabilities.currentLiabilities.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  currentLiabilitiesData.push(['Total Current Liabilities', formatCurrency(data.liabilities.currentLiabilities.total)]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Current Liabilities', 'Amount (QAR)']],
    body: currentLiabilitiesData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Long-term Liabilities
  const longTermLiabilitiesData = Object.entries(data.liabilities.longTermLiabilities.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  longTermLiabilitiesData.push(['Total Long-term Liabilities', formatCurrency(data.liabilities.longTermLiabilities.total)]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Long-term Liabilities', 'Amount (QAR)']],
    body: longTermLiabilitiesData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Total Liabilities
  autoTable(doc, {
    startY: yPos,
    body: [['TOTAL LIABILITIES', formatCurrency(data.liabilities.totalLiabilities)]],
    styles: { 
      fillColor: [254, 226, 226] as [number, number, number],
      textColor: [153, 27, 27] as [number, number, number],
      fontStyle: 'bold' as const
    },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Equity
  const equityData = Object.entries(data.equity.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  equityData.push(['Total Equity', formatCurrency(data.equity.total)]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Equity', 'Amount (QAR)']],
    body: equityData,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105] },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Total Liabilities & Equity
  const totalLiabilitiesEquity = data.liabilities.totalLiabilities + data.equity.total;
  const balanceColor = data.isBalanced ? [5, 150, 105] as [number, number, number] : [220, 38, 38] as [number, number, number];
  const lightenedBalanceColor = data.isBalanced 
    ? [5 * 0.1, 150 * 0.1, 105 * 0.1] as [number, number, number]
    : [220 * 0.1, 38 * 0.1, 38 * 0.1] as [number, number, number];
  
  autoTable(doc, {
    startY: yPos,
    body: [['TOTAL LIABILITIES & EQUITY', formatCurrency(totalLiabilitiesEquity)]],
    styles: { 
      fillColor: lightenedBalanceColor,
      textColor: balanceColor,
      fontStyle: 'bold' as const
    },
  } as UserOptions);
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Balance Status
  doc.setFontSize(12);
  if (data.isBalanced) {
    doc.setTextColor(5, 150, 105);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  
  doc.text(
    data.isBalanced ? '✓ Balance Sheet is balanced' : '⚠ Balance Sheet is not balanced',
    105,
    yPos,
    { align: 'center' }
  );
  
  // Footer
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    105,
    yPos,
    { align: 'center' }
  );
  
  // Save PDF
  doc.save(`balance-sheet-${asOfDate}.pdf`);
};

export const exportToExcel = (data: BalanceSheetData, asOfDate: string, outletName: string) => {
  // Create a simple Excel file using SheetJS
  // This is a fallback - ideally use the server-side export
  const workbook = {
    SheetNames: ['Balance Sheet'],
    Sheets: {
      'Balance Sheet': {
        '!ref': 'A1:Z100',
        A1: { t: 's', v: 'BALANCE SHEET' },
        A2: { t: 's', v: `Outlet: ${outletName}` },
        A3: { t: 's', v: `As of: ${new Date(asOfDate).toLocaleDateString()}` },
        // Add more cells here...
      }
    }
  };
  
  // For now, show a message to use the server export
  alert('Excel export is available via the server export feature.');
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};