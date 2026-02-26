/**
 * AI Worker Executor — v5 (API-delegating)
 *
 * Every write operation delegates to the existing internal API routes so
 * there is zero duplication of GL, stock, numbering, or activity-log logic.
 * Read-only lookups still hit MongoDB directly (simple finds, no side-effects).
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';

import Product  from '@/lib/models/ProductEnhanced';
import Customer from '@/lib/models/Customer';
import Supplier from '@/lib/models/Supplier';
import Account  from '@/lib/models/Account';
import Category from '@/lib/models/Category';

export type ToolResult = { success: boolean; data?: unknown; message: string };

export interface ExecutorContext {
  userId:   string;
  outletId: string;
  token:    string;   // raw auth-token cookie — forwarded to every internal call
  baseUrl:  string;   // e.g. http://localhost:3000
}

// ─── Internal fetch helper ─────────────────────────────────────────────────────
async function api(
  baseUrl: string,
  token:   string,
  path:    string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `auth-token=${token}`,
      ...(options.headers ?? {}),
    },
  });

  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  return { ok: res.ok, status: res.status, data };
}

// ─── Main executor ─────────────────────────────────────────────────────────────
export async function executeTool(
  toolName: string,
  input:    Record<string, any>,
  ctx:      ExecutorContext
): Promise<ToolResult> {

  await connectDB();

  const outletId = new mongoose.Types.ObjectId(ctx.outletId);
  const { token, baseUrl } = ctx;

  switch (toolName) {

    // ── SEARCH PRODUCTS ────────────────────────────────────────────────────────
    case 'search_products': {
      const products = await Product.find({
        outletId,
        isActive: true,
        $or: [
          { name:       { $regex: input.query, $options: 'i' } },
          { sku:        { $regex: input.query, $options: 'i' } },
          { partNumber: { $regex: input.query, $options: 'i' } },
        ],
      }).select('_id name sku sellingPrice costPrice currentStock unit partNumber').limit(10).lean();

      if (!products.length)
        return { success: false, message: `No products found matching "${input.query}"` };
      return { success: true, data: products, message: `Found ${products.length} product(s)` };
    }

    // ── SEARCH CUSTOMERS ───────────────────────────────────────────────────────
    case 'search_customers': {
      const customers = await Customer.find({
        outletId,
        $or: [
          { name:  { $regex: input.query, $options: 'i' } },
          { phone: { $regex: input.query, $options: 'i' } },
        ],
      }).select('_id name phone email').limit(10).lean();

      if (!customers.length)
        return { success: false, message: `No customers found matching "${input.query}"` };
      return { success: true, data: customers, message: `Found ${customers.length} customer(s)` };
    }

    // ── SEARCH SUPPLIERS ───────────────────────────────────────────────────────
    case 'search_suppliers': {
      const suppliers = await Supplier.find({
        outletId,
        name: { $regex: input.query, $options: 'i' },
      }).select('_id name phone email').limit(10).lean();

      if (!suppliers.length)
        return { success: false, message: `No suppliers found matching "${input.query}"` };
      return { success: true, data: suppliers, message: `Found ${suppliers.length} supplier(s)` };
    }

    // ── GET EXPENSE ACCOUNTS ───────────────────────────────────────────────────
    case 'get_expense_accounts': {
      const accounts = await Account.find({
        outletId, type: 'expense', isActive: true,
      }).select('_id code name').lean();

      return { success: true, data: accounts, message: `Found ${accounts.length} expense account(s)` };
    }

    // ── GET CATEGORIES ────────────────────────────────────────────────────────
    case 'get_categories': {
      const categories = await Category.find({
        outletId, isActive: true,
      }).select('_id name code').sort({ name: 1 }).lean();

      return { success: true, data: categories, message: `Found ${categories.length} categor(ies)` };
    }

    // ── CREATE PRODUCT → POST /api/products ───────────────────────────────────
    case 'create_product': {
      // Get the auto-generated next SKU
      const skuRes = await api(baseUrl, token, '/api/products/next-sku');
      if (!skuRes.ok)
        return { success: false, message: 'Could not generate product SKU. Please try again.' };

      const nextSKU: string = skuRes.data.nextSKU ?? '10001';

      const res = await api(baseUrl, token, '/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name:         input.name,
          categoryId:   input.categoryId,
          sku:          nextSKU,          // route handles uniqueness collisions itself
          costPrice:    Number(input.costPrice),
          sellingPrice: Number(input.sellingPrice),
          currentStock: Number(input.openingStock ?? 0),
          unit:         input.unit        ?? 'pcs',
          minStock:     Number(input.minStock ?? 0),
          maxStock:     1000,
          description:  input.description ?? '',
          partNumber:   input.partNumber  ?? '',
          isVehicle:    input.isVehicle   === true,
          carMake:      input.carMake     ?? '',
          carModel:     input.carModel    ?? '',
          variant:      input.variant     ?? '',
          yearFrom:     input.yearFrom    ?? null,
          yearTo:       input.yearTo      ?? null,
          color:        input.color       ?? '',
          taxRate:      0,
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `Failed to create product (${res.status})` };

      const product  = res.data.product ?? res.data;
      const finalSKU = product.sku ?? nextSKU;
      const qty      = Number(input.openingStock ?? 0);
      const stockLine = qty > 0
        ? ` | Opening Stock: **${qty} ${input.unit || 'pcs'}** @ QAR ${Number(input.costPrice).toFixed(2)}`
        : '';

      return {
        success: true,
        data: { id: product._id, sku: finalSKU, name: input.name },
        message: `✅ Product created! **${input.name}** | SKU: **${finalSKU}** | Category: ${input.categoryName} | Cost: QAR ${Number(input.costPrice).toFixed(2)} | Selling: QAR ${Number(input.sellingPrice).toFixed(2)}${stockLine}`,
      };
    }

    // ── CREATE SALE → POST /api/sales ─────────────────────────────────────────
    case 'create_sale': {
      const grandTotal = input.items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.unitPrice) * Number(item.quantity) - Number(item.discount ?? 0),
        0
      );
      const amountPaid = Number(input.amountPaid ?? grandTotal);

      const res = await api(baseUrl, token, '/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId:    input.customerId,
          customerName:  input.customerName,
          paymentMethod: input.paymentMethod ?? 'CASH',
          amountPaid,
          notes:         input.notes,
          items: input.items.map((item: any) => ({
            productId:    item.productId,
            quantity:     Number(item.quantity),
            unitPrice:    Number(item.unitPrice),
            discount:     Number(item.discount ?? 0),
            discountType: 'fixed',
            unit:         item.unit,
            name:         item.name,
            sku:          item.sku,
          })),
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `Failed to create sale (${res.status})` };

      const sale       = res.data.sale ?? res.data;
      const invoice    = sale.invoiceNumber ?? '—';
      const total      = Number(sale.grandTotal ?? grandTotal);
      const balanceDue = Number(sale.balanceDue ?? 0);

      return {
        success: true,
        data: { id: sale._id, invoiceNumber: invoice, grandTotal: total, balanceDue },
        message: `✅ Sale created! Invoice: **${invoice}** | Total: QAR ${total.toFixed(2)} | Paid: QAR ${amountPaid.toFixed(2)}${balanceDue > 0 ? ` | Balance Due: QAR ${balanceDue.toFixed(2)}` : ''}`,
      };
    }

    // ── CREATE PURCHASE → POST /api/purchases ─────────────────────────────────
    case 'create_purchase': {
      const subtotal   = input.items.reduce(
        (sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity),
        0
      );
      const amountPaid = Number(input.amountPaid ?? subtotal);

      const res = await api(baseUrl, token, '/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId:    input.supplierId,
          supplierName:  input.supplierName,
          paymentMethod: input.paymentMethod ?? 'CASH',
          amountPaid,
          notes:         input.notes,
          items: input.items.map((item: any) => ({
            productId: item.productId,
            name:      item.name,
            sku:       item.sku,
            quantity:  Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            unit:      item.unit,
            taxRate:   Number(item.taxRate ?? 0),
          })),
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `Failed to create purchase (${res.status})` };

      const purchase    = res.data.purchase ?? res.data;
      const purchaseNum = purchase.purchaseNumber ?? '—';
      const total       = Number(purchase.grandTotal ?? subtotal);
      const balanceDue  = Number(purchase.balanceDue ?? 0);

      return {
        success: true,
        data: { id: purchase._id, purchaseNumber: purchaseNum, grandTotal: total, balanceDue },
        message: `✅ Purchase recorded! Ref: **${purchaseNum}** | Total: QAR ${total.toFixed(2)} | Paid: QAR ${amountPaid.toFixed(2)}${balanceDue > 0 ? ` | Balance Due: QAR ${balanceDue.toFixed(2)}` : ''}`,
      };
    }

    // ── CREATE EXPENSE → POST /api/expenses ───────────────────────────────────
    // The expense route requires paymentAccountId for non-CREDIT methods.
    // We resolve the default cash/bank system account automatically.
    case 'create_expense': {
      const subtotal   = input.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
      const amountPaid = Number(input.amountPaid ?? subtotal);
      const method     = (input.paymentMethod ?? 'CASH') as string;

      // Resolve paymentAccountId from system accounts
      let paymentAccountId: string | undefined = input.paymentAccountId;

      if (!paymentAccountId && method !== 'CREDIT') {
        const isBank  = method === 'BANK_TRANSFER' || method === 'CARD';
        const subTypes = isBank
          ? ['bank', 'BANK', 'bank_account', 'BANK_ACCOUNT']
          : ['cash', 'CASH'];

        const payAcct = await Account.findOne({
          outletId,
          subType:  { $in: subTypes },
          isActive: true,
          isSystem: true,
        }).select('_id').lean() as any;

        paymentAccountId = payAcct?._id?.toString();
      }

      const res = await api(baseUrl, token, '/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category:         input.category,
          paymentMethod:    method,
          paymentAccountId,
          amountPaid,
          vendorName:       input.vendorName,
          notes:            input.notes,
          taxAmount:        0,
          isRecurring:      false,
          items: input.items.map((item: any) => ({
            description: item.description,
            accountId:   item.accountId,
            accountName: item.accountName,
            accountCode: item.accountCode,
            amount:      Number(item.amount),
          })),
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `Failed to create expense (${res.status})` };

      const expense    = res.data.expense ?? res.data;
      const expenseNum = expense.expenseNumber ?? '—';

      return {
        success: true,
        data: { id: expense._id, expenseNumber: expenseNum, grandTotal: subtotal },
        message: `✅ Expense recorded! Ref: **${expenseNum}** | ${input.category} | Amount: QAR ${subtotal.toFixed(2)}`,
      };
    }

    // ── GET SUMMARY → /api/reports/* ──────────────────────────────────────────
    case 'get_summary': {
      const now  = new Date();
      let from: Date;
      if (input.period === 'today') {
        from = new Date(now); from.setHours(0, 0, 0, 0);
      } else if (input.period === 'this_week') {
        from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0, 0, 0, 0);
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const to = new Date(now); to.setHours(23, 59, 59, 999);
      const qs = `startDate=${from.toISOString()}&endDate=${to.toISOString()}`;

      const doSales     = input.type === 'sales'     || input.type === 'all';
      const doPurchases = input.type === 'purchases'  || input.type === 'all';
      const doExpenses  = input.type === 'expenses'   || input.type === 'all';

      const [sRes, pRes, eRes] = await Promise.all([
        doSales     ? api(baseUrl, token, `/api/reports/sales?${qs}`)     : null,
        doPurchases ? api(baseUrl, token, `/api/reports/purchases?${qs}`) : null,
        doExpenses  ? api(baseUrl, token, `/api/reports/daybook?${qs}`)   : null,
      ]);

      const result: Record<string, any> = {};
      const lines: string[] = [`📊 **${input.period.replace('_', ' ')} summary:**`];

      if (sRes?.ok) {
        const d = sRes.data;
        const count = d.totalCount ?? d.sales?.length ?? 0;
        const total = d.totalRevenue ?? d.grandTotal  ?? 0;
        result.sales = { count, total, recent: (d.sales ?? []).slice(0, 3) };
        lines.push(`\nSales: **QAR ${Number(total).toFixed(2)}** (${count} invoices)`);
        result.sales.recent.forEach((s: any) =>
          lines.push(`  • ${s.invoiceNumber} — ${s.customerName} — QAR ${Number(s.grandTotal).toFixed(2)}`));
      }

      if (pRes?.ok) {
        const d = pRes.data;
        const count = d.totalCount ?? d.purchases?.length ?? 0;
        const total = d.totalAmount ?? d.grandTotal        ?? 0;
        result.purchases = { count, total, recent: (d.purchases ?? []).slice(0, 3) };
        lines.push(`\nPurchases: **QAR ${Number(total).toFixed(2)}** (${count} orders)`);
        result.purchases.recent.forEach((p: any) =>
          lines.push(`  • ${p.purchaseNumber} — ${p.supplierName} — QAR ${Number(p.grandTotal).toFixed(2)}`));
      }

      if (eRes?.ok) {
        const d = eRes.data;
        const count = d.totalCount ?? d.expenses?.length ?? 0;
        const total = d.totalExpenses ?? d.grandTotal     ?? 0;
        result.expenses = { count, total };
        lines.push(`\nExpenses: **QAR ${Number(total).toFixed(2)}** (${count} entries)`);
      }

      return { success: true, data: result, message: lines.join('\n') };
    }

    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
