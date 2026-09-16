import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Outlet from '@/lib/models/Outlet';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { calculateBalanceChange } from '@/lib/services/balanceEngine';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    if (searchParams.get('format') !== 'excel') {
      return NextResponse.json({ error: 'Use format=excel for server export' }, { status: 400 });
    }
    const asOfDate = new Date(searchParams.get('asOfDate') || new Date());
    asOfDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(asOfDate.getTime())) return NextResponse.json({ error: 'Invalid as-of date' }, { status: 400 });
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const [outlet, accounts, rows] = await Promise.all([
      Outlet.findOne({ _id: outletId }).lean(),
      Account.find({ outletId }).lean(),
      LedgerEntry.aggregate([
        { $match: { outletId, date: { $lte: asOfDate } } },
        { $group: { _id: '$accountId', debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      ]),
    ]);
    const totals = new Map(rows.map((row: any) => [String(row._id), row]));
    const currentAssets: Record<string, number> = {};
    const fixedAssets: Record<string, number> = {};
    const currentLiabilities: Record<string, number> = {};
    const longTermLiabilities: Record<string, number> = {};
    const equity: Record<string, number> = {};
    let revenue = 0;
    let expenses = 0;
    for (const account of accounts as any[]) {
      const row: any = totals.get(String(account._id)) || { debit: 0, credit: 0 };
      const balance = round(calculateBalanceChange(account.type, row.debit, row.credit));
      if (Math.abs(balance) <= 0.001) continue;
      if (account.type === AccountType.ASSET) {
        const isCurrent = [
          AccountSubType.CASH, AccountSubType.BANK, AccountSubType.INVENTORY,
          AccountSubType.ACCOUNTS_RECEIVABLE, AccountSubType.VAT_RECEIVABLE,
        ].includes(account.subType);
        (isCurrent ? currentAssets : fixedAssets)[account.name] = balance;
      } else if (account.type === AccountType.LIABILITY) {
        const isCurrent = [AccountSubType.ACCOUNTS_PAYABLE, AccountSubType.VAT_PAYABLE].includes(account.subType);
        (isCurrent ? currentLiabilities : longTermLiabilities)[account.name] = balance;
      } else if (account.type === AccountType.EQUITY) equity[account.name] = balance;
      else if (account.type === AccountType.REVENUE) revenue += balance;
      else if (account.type === AccountType.EXPENSE) expenses += balance;
    }
    const retainedEarnings = round(revenue - expenses);
    if (Math.abs(retainedEarnings) > 0.001) equity['Retained Earnings (Net Income)'] = retainedEarnings;
    const sum = (values: Record<string, number>) => round(Object.values(values).reduce((total, value) => total + value, 0));
    const totalAssets = round(sum(currentAssets) + sum(fixedAssets));
    const totalLiabilities = round(sum(currentLiabilities) + sum(longTermLiabilities));
    const totalEquity = sum(equity);
    const reportData = {
      assets: { currentAssets, fixedAssets, totalAssets },
      liabilities: { currentLiabilities, longTermLiabilities, totalLiabilities },
      equity,
      totalEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
      asOfDate,
    };
    return generateExcel(reportData, (outlet as any)?.name || 'AutoCity');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateExcel(data: any, outletName: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Balance Sheet');
  sheet.columns = [{ width: 42 }, { width: 20 }];
  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = 'BALANCE SHEET';
  sheet.getCell('A1').font = { size: 18, bold: true };
  sheet.getCell('A2').value = 'Outlet';
  sheet.getCell('B2').value = outletName;
  sheet.getCell('A3').value = 'As of';
  sheet.getCell('B3').value = data.asOfDate;
  sheet.getCell('B3').numFmt = 'yyyy-mm-dd';
  let row = 5;
  const addSection = (title: string, items: Record<string, number>, totalLabel: string) => {
    sheet.getCell(`A${row}`).value = title;
    sheet.getCell(`A${row}`).font = { bold: true, size: 13 };
    row += 1;
    for (const [name, value] of Object.entries(items)) {
      sheet.getCell(`A${row}`).value = name;
      sheet.getCell(`B${row}`).value = value;
      sheet.getCell(`B${row}`).numFmt = '#,##0.00 "QAR"';
      row += 1;
    }
    sheet.getCell(`A${row}`).value = totalLabel;
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = round(Object.values(items).reduce((sum, value) => sum + value, 0));
    sheet.getCell(`B${row}`).numFmt = '#,##0.00 "QAR"';
    sheet.getCell(`B${row}`).font = { bold: true };
    row += 2;
  };
  addSection('CURRENT ASSETS', data.assets.currentAssets, 'Total Current Assets');
  addSection('FIXED ASSETS', data.assets.fixedAssets, 'Total Fixed Assets');
  addSection('CURRENT LIABILITIES', data.liabilities.currentLiabilities, 'Total Current Liabilities');
  addSection('LONG-TERM LIABILITIES', data.liabilities.longTermLiabilities, 'Total Long-term Liabilities');
  addSection('EQUITY', data.equity, 'Total Equity');
  sheet.getCell(`A${row}`).value = 'Accounting equation balanced';
  sheet.getCell(`B${row}`).value = data.isBalanced ? 'Yes' : 'No';
  const buffer = await workbook.xlsx.writeBuffer();
  const response = new NextResponse(buffer);
  response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  response.headers.set('Content-Disposition', `attachment; filename="balance-sheet-${new Date().toISOString().split('T')[0]}.xlsx"`);
  return response;
}
