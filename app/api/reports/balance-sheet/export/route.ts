import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import Product from '@/lib/models/ProductEnhanced';
import Sale from '@/lib/models/Sale';
import Outlet from '@/lib/models/Outlet';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    
    const asOfDate = new Date(searchParams.get('asOfDate') || new Date());
    const format = searchParams.get('format') as 'pdf' | 'excel' | null;
    
    // Only handle Excel export server-side
    if (!format || format !== 'excel') {
      return NextResponse.json({ 
        error: 'PDF export is handled client-side. Use format=excel for server export.' 
      }, { status: 400 });
    }
    
    // Fetch outlet information
    const outlet = await Outlet.findById(user.outletId).lean();
    
    // Fetch balance sheet data
    const accounts = await Account.find({ outletId: user.outletId }).lean();
    const products = await Product.find({ outletId: user.outletId }).lean();
    const unpaidSales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      balanceDue: { $gt: 0 },
    }).lean();
    
    // Process data
    const assetAccounts = accounts.filter(a => a.accountType === 'asset');
    const liabilityAccounts = accounts.filter(a => a.accountType === 'liability');
    const equityAccounts = accounts.filter(a => a.accountType === 'equity');
    
    const currentAssets: { [key: string]: number } = {};
    const fixedAssets: { [key: string]: number } = {};
    
    assetAccounts.forEach(account => {
      const balance = account.currentBalance || 0;
      if (account.accountGroup === 'Current Assets' || account.accountGroup === 'Cash & Bank') {
        currentAssets[account.accountName] = balance;
      } else {
        fixedAssets[account.accountName] = balance;
      }
    });
    
    const inventoryValue = products.reduce((sum, p) => {
      return sum + ((p.currentStock || 0) * (p.costPrice || 0));
    }, 0);
    currentAssets['Inventory'] = inventoryValue;
    
    const accountsReceivable = unpaidSales.reduce((sum, sale) => sum + (sale.balanceDue || 0), 0);
    currentAssets['Accounts Receivable'] = accountsReceivable;
    
    const currentLiabilities: { [key: string]: number } = {};
    const longTermLiabilities: { [key: string]: number } = {};
    
    liabilityAccounts.forEach(account => {
      const balance = account.currentBalance || 0;
      if (account.accountGroup === 'Current Liabilities') {
        currentLiabilities[account.accountName] = balance;
      } else {
        longTermLiabilities[account.accountName] = balance;
      }
    });
    
    const equity: { [key: string]: number } = {};
    equityAccounts.forEach(account => {
      equity[account.accountName] = account.currentBalance || 0;
    });
    
    const totalCurrentAssets = Object.values(currentAssets).reduce((sum, val) => sum + val, 0);
    const totalFixedAssets = Object.values(fixedAssets).reduce((sum, val) => sum + val, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;
    
    const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((sum, val) => sum + val, 0);
    const totalLongTermLiabilities = Object.values(longTermLiabilities).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    
    const totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
    
    const reportData = {
      assets: {
        currentAssets: { items: currentAssets, total: totalCurrentAssets },
        fixedAssets: { items: fixedAssets, total: totalFixedAssets },
        totalAssets,
      },
      liabilities: {
        currentLiabilities: { items: currentLiabilities, total: totalCurrentLiabilities },
        longTermLiabilities: { items: longTermLiabilities, total: totalLongTermLiabilities },
        totalLiabilities,
      },
      equity: { items: equity, total: totalEquity },
      isBalanced,
      metadata: {
        outletName: outlet?.name || 'AutoCity',
        outletId: user.outletId,
        generatedAt: new Date().toISOString(),
        asOfDate: asOfDate.toISOString(),
      },
    };
    
    return generateExcel(reportData, outlet);
    
  } catch (error: any) {
    console.error('Error exporting balance sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateExcel(data: any, outlet: any) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Balance Sheet');
  
  // Title
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'BALANCE SHEET';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF4F46E5' } };
  titleCell.alignment = { horizontal: 'center' };
  
  // Subtitle
  worksheet.mergeCells('A2:D2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `Outlet: ${outlet?.outletName || 'AutoCity'}`;
  subtitleCell.font = { size: 11, color: { argb: 'FF6B7280' } };
  subtitleCell.alignment = { horizontal: 'center' };
  
  // Date
  worksheet.mergeCells('A3:D3');
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `As of: ${new Date(data.metadata.asOfDate).toLocaleDateString()}`;
  dateCell.font = { size: 11, color: { argb: 'FF6B7280' } };
  dateCell.alignment = { horizontal: 'center' };
  
  let row = 5;
  
  // Assets Section
  worksheet.mergeCells(`A${row}:D${row}`);
  const assetsHeader = worksheet.getCell(`A${row}`);
  assetsHeader.value = 'ASSETS';
  assetsHeader.font = { size: 14, bold: true, color: { argb: 'FF1E40AF' } };
  assetsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  row++;
  
  // Current Assets
  worksheet.getCell(`A${row}`).value = 'Current Assets';
  worksheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF374151' } };
  row++;
  
  Object.entries(data.assets.currentAssets.items).forEach(([name, value]) => {
    worksheet.getCell(`A${row}`).value = name;
    worksheet.getCell(`D${row}`).value = value as number;
    worksheet.getCell(`D${row}`).numFmt = '#,##0.00 "QAR"';
    row++;
  });
  
  worksheet.getCell(`A${row}`).value = 'Total Current Assets';
  worksheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF1E40AF' } };
  worksheet.getCell(`D${row}`).value = data.assets.currentAssets.total;
  worksheet.getCell(`D${row}`).numFmt = '#,##0.00 "QAR"';
  worksheet.getCell(`D${row}`).font = { bold: true, color: { argb: 'FF1E40AF' } };
  row += 2;
  
  // Continue with the rest of the Excel generation...
  // (Similar to previous Excel generation code)
  
  // Adjust column widths
  worksheet.columns = [
    { width: 40 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  const response = new NextResponse(buffer);
  response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  response.headers.set('Content-Disposition', `attachment; filename="balance-sheet-${new Date().toISOString().split('T')[0]}.xlsx"`);
  
  return response;
}