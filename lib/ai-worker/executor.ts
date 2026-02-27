/**
 * AI Worker Executor — v6
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
  token:    string;
  baseUrl:  string;
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

    // ── GET CATEGORIES ─────────────────────────────────────────────────────────
    // When a query is provided, do a server-side regex match so the AI receives
    // only the matching category — it can never pick the wrong one from a list.
    case 'get_categories': {
      const filter: any = { outletId, isActive: true };

      if (input.query?.trim()) {
        // Escape regex special chars then match anywhere in the name
        const escaped = input.query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.name   = { $regex: escaped, $options: 'i' };
      }

      const categories = await Category.find(filter)
        .select('_id name code')
        .sort({ name: 1 })
        .lean();

      if (input.query?.trim() && !categories.length)
        return {
          success: false,
          message: `No category found matching "${input.query}". Please fetch all categories (call without query) and pick the closest match.`,
        };

      return {
        success:  true,
        data:     categories,
        message:  input.query?.trim()
          ? `Found ${categories.length} categor(ies) matching "${input.query}"`
          : `Found ${categories.length} categor(ies)`,
      };
    }

    // ── CREATE CUSTOMER → POST /api/customers ──────────────────────────────────
    case 'create_customer': {
      const res = await api(baseUrl, token, '/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name:    input.name,
          phone:   input.phone   ?? '',
          email:   input.email   ?? '',
          address: input.address ?? '',
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `Failed to create customer (${res.status})` };

      const customer = res.data.customer ?? res.data;
      return {
        success: true,
        data: { id: customer._id, name: customer.name, phone: customer.phone },
        message: `✅ Customer created! **${customer.name}**${customer.phone ? ` | Phone: ${customer.phone}` : ''} — now proceeding with sale.`,
      };
    }

    // ── CREATE SUPPLIER → POST /api/suppliers ──────────────────────────────────
    case 'create_supplier': {
      const res = await api(baseUrl, token, '/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name:    input.name,
          phone:   input.phone   ?? '',
          email:   input.email   ?? '',
          address: input.address ?? '',
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `Failed to create supplier (${res.status})` };

      const supplier = res.data.supplier ?? res.data;
      return {
        success: true,
        data: { id: supplier._id, name: supplier.name, phone: supplier.phone },
        message: `✅ Supplier created! **${supplier.name}**${supplier.phone ? ` | Phone: ${supplier.phone}` : ''} — now proceeding with purchase.`,
      };
    }

    // ── CREATE PRODUCT → POST /api/products ───────────────────────────────────
    case 'create_product': {
      const skuRes = await api(baseUrl, token, '/api/products/next-sku');
      if (!skuRes.ok)
        return { success: false, message: 'Could not generate product SKU. Please try again.' };

      const nextSKU: string = skuRes.data.nextSKU ?? '10001';

      // Auto-detect isVehicle: true if ANY vehicle field is present — safety net
      // so vehicle data is never silently dropped even if the AI forgets isVehicle=true
      const hasVehicleFields = !!(
        input.carMake  || input.carModel || input.variant ||
        input.yearFrom || input.yearTo   || input.color
      );
      const isVehicle = input.isVehicle === true || hasVehicleFields;

      const res = await api(baseUrl, token, '/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name:         input.name,
          categoryId:   input.categoryId,
          sku:          nextSKU,
          costPrice:    Number(input.costPrice),
          sellingPrice: Number(input.sellingPrice),
          currentStock: Number(input.openingStock ?? 0),
          unit:         input.unit        ?? 'pcs',
          minStock:     Number(input.minStock ?? 0),
          maxStock:     1000,
          description:  input.description ?? '',
          partNumber:   input.partNumber  ?? '',
          // ── Vehicle fields ──────────────────────────────────────────────
          isVehicle,
          carMake:      input.carMake  ?? '',
          carModel:     input.carModel ?? '',
          variant:      input.variant  ?? '',
          yearFrom:     input.yearFrom ? Number(input.yearFrom) : null,
          yearTo:       input.yearTo   ? Number(input.yearTo)   : null,
          color:        input.color    ?? '',
          // ───────────────────────────────────────────────────────────────
          taxRate: 0,
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

      const vehicleLine = isVehicle
        ? ` | ${[
            input.carMake,
            input.carModel,
            input.variant,
            input.yearFrom && input.yearTo
              ? `${input.yearFrom}–${input.yearTo}`
              : (input.yearFrom ?? input.yearTo ?? null),
          ].filter(Boolean).join(' ')}`
        : '';

      return {
        success: true,
        data: { id: product._id, sku: finalSKU, name: input.name, isVehicle },
        message: `✅ Product created! **${input.name}** | SKU: **${finalSKU}** | Category: ${input.categoryName} | Cost: QAR ${Number(input.costPrice).toFixed(2)} | Selling: QAR ${Number(input.sellingPrice).toFixed(2)}${vehicleLine}${stockLine}`,
      };
    }

    // ── CREATE SALE → POST /api/sales ──────────────────────────────────────────
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

    // ── CREATE PURCHASE → POST /api/purchases ──────────────────────────────────
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

    // ── CREATE EXPENSE → POST /api/expenses ────────────────────────────────────
    case 'create_expense': {
      const subtotal   = input.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
      const amountPaid = Number(input.amountPaid ?? subtotal);
      const method     = (input.paymentMethod ?? 'CASH') as string;

      let paymentAccountId: string | undefined = input.paymentAccountId;

      if (!paymentAccountId && method !== 'CREDIT') {
        const isBank   = method === 'BANK_TRANSFER' || method === 'CARD';
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