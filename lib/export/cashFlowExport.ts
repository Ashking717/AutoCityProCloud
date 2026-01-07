import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CashFlowData } from '@/lib/types/cashFlow';

export const exportToPDF = (data: CashFlowData, fromDate: string, toDate: string, outletName: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.text('CASH FLOW STATEMENT', 105, 20, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text(`Outlet: ${outletName}`, 105, 30, { align: 'center' });
  doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`, 105, 36, { align: 'center' });
  
  let yPos = 50;
  
  // Operating Activities
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text('CASH FLOWS FROM OPERATING ACTIVITIES', 14, yPos);
  yPos += 10;
  
  const operatingData = Object.entries(data.operatingActivities.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  operatingData.push(['Net Operating Cash Flow', formatCurrency(data.operatingActivities.total)]);
  
  autoTable(doc, {
    startY: yPos,
    body: operatingData,
    theme: 'striped',
    styles: { 
      fillColor: data.operatingActivities.total >= 0 ? [220, 252, 231] : [254, 226, 226],
      textColor: [31, 41, 55]
    } as any,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  // Investing Activities
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('CASH FLOWS FROM INVESTING ACTIVITIES', 14, yPos);
  yPos += 10;
  
  const investingData = Object.entries(data.investingActivities.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  investingData.push(['Net Investing Cash Flow', formatCurrency(data.investingActivities.total)]);
  
  autoTable(doc, {
    startY: yPos,
    body: investingData,
    theme: 'striped',
    styles: { 
      fillColor: data.investingActivities.total >= 0 ? [219, 234, 254] : [254, 226, 226],
      textColor: [31, 41, 55]
    } as any,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  // Financing Activities
  doc.setFontSize(14);
  doc.setTextColor(147, 51, 234);
  doc.text('CASH FLOWS FROM FINANCING ACTIVITIES', 14, yPos);
  yPos += 10;
  
  const financingData = Object.entries(data.financingActivities.items).map(([name, value]) => [
    name,
    formatCurrency(value)
  ]);
  financingData.push(['Net Financing Cash Flow', formatCurrency(data.financingActivities.total)]);
  
  autoTable(doc, {
    startY: yPos,
    body: financingData,
    theme: 'striped',
    styles: { 
      fillColor: data.financingActivities.total >= 0 ? [237, 233, 254] : [254, 226, 226],
      textColor: [31, 41, 55]
    } as any,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  // Net Cash Flow
  doc.setFontSize(14);
  doc.setTextColor(data.netCashFlow >= 0 ? 5 : 220, data.netCashFlow >= 0 ? 150 : 38, data.netCashFlow >= 0 ? 105 : 38);
  doc.text('NET CHANGE IN CASH', 14, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    body: [[formatCurrency(data.netCashFlow)]],
    styles: { 
      fillColor: data.netCashFlow >= 0 ? [220, 252, 231] : [254, 226, 226],
      textColor: data.netCashFlow >= 0 ? [5, 150, 105] : [220, 38, 38],
      fontStyle: 'bold',
      halign: 'center'
    } as any,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  // Cash Reconciliation
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text('CASH RECONCILIATION', 14, yPos);
  yPos += 10;
  
  const reconciliationData = [
    ['Opening Cash Balance', formatCurrency(data.openingCash)],
    ['Net Change in Cash', formatCurrency(data.netCashFlow)],
    ['Closing Cash Balance', formatCurrency(data.closingCash)]
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: reconciliationData,
    theme: 'striped',
    styles: { 
      fillColor: [219, 234, 254],
      textColor: [31, 41, 55]
    } as any,
  });
  
  // Footer
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    105,
    yPos,
    { align: 'center' }
  );
  
  // Save PDF
  doc.save(`cash-flow-${fromDate}-to-${toDate}.pdf`);
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};