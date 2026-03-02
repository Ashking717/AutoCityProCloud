/**
 * AI Worker Executor — v7
 *
 * Every write operation delegates to internal API routes (zero logic duplication).
 * Read-only lookups hit MongoDB directly.
 *
 * v7 changes vs v6:
 * - Added  : check_stock, get_customer_outstanding
 * - Fixed  : walk-in customer support in create_sale (customerId="walk-in")
 * - Fixed  : create_sale / create_purchase now default amountPaid to grandTotal
 *            only when the field is explicitly omitted (not when it's 0)
 * - Fixed  : get_summary uses UTC date math — consistent regardless of server TZ
 * - Fixed  : create_expense logs a warning instead of silently passing undefined
 *            paymentAccountId when no system account is configured
 * - Improved: all error messages include the tool name for easier debugging
 * - Added  : net profit line in get_summary when type="all"
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';

import Product  from '@/lib/models/ProductEnhanced';
import Customer from '@/lib/models/Customer';
import Supplier from '@/lib/models/Supplier';
import Account  from '@/lib/models/Account';
import Category from '@/lib/models/Category';
import Sale     from '@/lib/models/Sale';

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

// ─── UTC date helpers ─────────────────────────────────────────────────────────
function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function utcEndOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
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
      })
        .select('_id name sku sellingPrice costPrice currentStock unit partNumber isVehicle carMake carModel')
        .limit(10)
        .lean();

      if (!products.length)
        return {
          success: false,
          message: `search_products: No results for "${input.query}". Ask the user to verify the name or SKU.`,
        };
      return { success: true, data: products, message: `Found ${products.length} product(s)` };
    }

    // ── CHECK STOCK ────────────────────────────────────────────────────────────
    case 'check_stock': {
      const product = await Product.findOne({ _id: input.productId, outletId })
        .select('_id name sku currentStock minStock sellingPrice costPrice unit')
        .lean() as any;

      if (!product)
        return { success: false, message: `check_stock: product "${input.productId}" not found.` };

      const low = product.currentStock <= product.minStock;
      return {
        success: true,
        data: product,
        message: `**${product.name}** | Stock: ${product.currentStock} ${product.unit}${low ? ' ⚠️ LOW STOCK' : ''}`,
      };
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
        return {
          success: false,
          message: `search_customers: No results for "${input.query}". You may create a new customer or use customerId="walk-in".`,
        };
      return { success: true, data: customers, message: `Found ${customers.length} customer(s)` };
    }

    // ── GET CUSTOMER OUTSTANDING ───────────────────────────────────────────────
    case 'get_customer_outstanding': {
      const [aggResult, customer] = await Promise.all([
        (Sale as any).aggregate([
          { $match: { outletId, customerId: new mongoose.Types.ObjectId(input.customerId) } },
          { $group: { _id: null, totalDue: { $sum: '$balanceDue' } } },
        ]).exec() as Promise<any[]>,
        Customer.findOne({ _id: input.customerId, outletId }).select('name phone').lean() as Promise<any>,
      ]);

      if (!customer)
        return { success: false, message: `get_customer_outstanding: customer "${input.customerId}" not found.` };

      const totalDue: number = aggResult[0]?.totalDue ?? 0;
      return {
        success: true,
        data: { customerId: input.customerId, name: customer.name, outstandingBalance: totalDue },
        message: totalDue > 0
          ? `**${customer.name}** has an outstanding balance of **QAR ${totalDue.toFixed(2)}**.`
          : `**${customer.name}** has no outstanding balance.`,
      };
    }

    // ── SEARCH SUPPLIERS ───────────────────────────────────────────────────────
    case 'search_suppliers': {
      const suppliers = await Supplier.find({
        outletId,
        name: { $regex: input.query, $options: 'i' },
      }).select('_id name phone email').limit(10).lean();

      if (!suppliers.length)
        return {
          success: false,
          message: `search_suppliers: No results for "${input.query}". You may create a new supplier.`,
        };
      return { success: true, data: suppliers, message: `Found ${suppliers.length} supplier(s)` };
    }

    // ── GET EXPENSE ACCOUNTS ───────────────────────────────────────────────────
    case 'get_expense_accounts': {
      const accounts = await Account.find({
        outletId, type: 'expense', isActive: true,
      }).select('_id code name').lean();

      if (!accounts.length)
        return { success: false, message: 'get_expense_accounts: No expense accounts found. Please configure the Chart of Accounts.' };

      return { success: true, data: accounts, message: `Found ${accounts.length} expense account(s)` };
    }

    // ── GET CATEGORIES ─────────────────────────────────────────────────────────
    case 'get_categories': {
      const filter: any = { outletId, isActive: true };

      if (input.query?.trim()) {
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
          message: `get_categories: No match for "${input.query}". Call without a query to list all categories, then pick the closest.`,
        };

      return {
        success: true,
        data: categories,
        message: input.query?.trim()
          ? `Found ${categories.length} categor(ies) matching "${input.query}"`
          : `Found ${categories.length} categor(ies)`,
      };
    }

    // ── CREATE CUSTOMER ────────────────────────────────────────────────────────
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
        return { success: false, message: res.data?.error ?? `create_customer failed (HTTP ${res.status})` };

      const c = res.data.customer ?? res.data;
      return {
        success: true,
        data: { id: c._id, name: c.name, phone: c.phone },
        message: `✅ Customer created: **${c.name}**${c.phone ? ` | ${c.phone}` : ''} — proceeding with sale.`,
      };
    }

    // ── CREATE SUPPLIER ────────────────────────────────────────────────────────
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
        return { success: false, message: res.data?.error ?? `create_supplier failed (HTTP ${res.status})` };

      const s = res.data.supplier ?? res.data;
      return {
        success: true,
        data: { id: s._id, name: s.name, phone: s.phone },
        message: `✅ Supplier created: **${s.name}**${s.phone ? ` | ${s.phone}` : ''} — proceeding with purchase.`,
      };
    }

    // ── CREATE PRODUCT ─────────────────────────────────────────────────────────
    case 'create_product': {
      const skuRes = await api(baseUrl, token, '/api/products/next-sku');
      if (!skuRes.ok)
        return { success: false, message: 'create_product: Could not generate SKU. Please retry.' };

      const nextSKU: string = skuRes.data.nextSKU ?? '10001';

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
          isVehicle,
          carMake:  input.carMake  ?? '',
          carModel: input.carModel ?? '',
          variant:  input.variant  ?? '',
          yearFrom: input.yearFrom ? Number(input.yearFrom) : null,
          yearTo:   input.yearTo   ? Number(input.yearTo)   : null,
          color:    input.color    ?? '',
          taxRate:  0,
        }),
      });

      if (!res.ok)
        return { success: false, message: res.data?.error ?? `create_product failed (HTTP ${res.status})` };

      const product  = res.data.product ?? res.data;
      const finalSKU = product.sku ?? nextSKU;
      const qty      = Number(input.openingStock ?? 0);

      const stockLine = qty > 0
        ? ` | Stock: **${qty} ${input.unit || 'pcs'}** @ QAR ${Number(input.costPrice).toFixed(2)}`
        : '';

      const vehicleLine = isVehicle
        ? ` | ${[
            input.carMake, input.carModel, input.variant,
            input.yearFrom && input.yearTo
              ? `${input.yearFrom}–${input.yearTo}`
              : (input.yearFrom ?? input.yearTo ?? null),
          ].filter(Boolean).join(' ')}`
        : '';

      return {
        success: true,
        data: { id: product._id, sku: finalSKU, name: input.name, isVehicle },
        message: `✅ Product created: **${input.name}** | SKU: **${finalSKU}** | Category: ${input.categoryName} | Cost: QAR ${Number(input.costPrice).toFixed(2)} | Selling: QAR ${Number(input.sellingPrice).toFixed(2)}${vehicleLine}${stockLine}`,
      };
    }

    // ── CREATE SALE ────────────────────────────────────────────────────────────
case 'create_sale': {
  if (!input.items?.length)
    return { success: false, message: 'create_sale: items array is empty.' };

  const isWalkIn = input.customerId === 'walk-in';

  const subtotal     = input.items.reduce((sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
  const discount     = Number(input.discount ?? 0);   // ← top-level only
  const grandTotal   = subtotal - discount;
  const amountPaid   = input.amountPaid != null ? Number(input.amountPaid) : grandTotal;

  const res = await api(baseUrl, token, '/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      customerId:    isWalkIn ? undefined : input.customerId,
      customerName:  input.customerName,
      paymentMethod: input.paymentMethod ?? 'CASH',
      discount,                                        // ← send as order-level field
      amountPaid,
      notes:         input.notes ?? '',
      items: input.items.map((item: any) => ({
        productId: item.productId,
        quantity:  Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount:  0,                                  // ← always 0 at item level
        discountType: 'fixed',
        unit:      item.unit,
        name:      item.name,
        sku:       item.sku,
      })),
    }),
  });

  if (!res.ok)
    return { success: false, message: res.data?.error ?? `create_sale failed (HTTP ${res.status})` };

  const sale       = res.data.sale ?? res.data;
  const invoice    = sale.invoiceNumber ?? '—';
  const total      = Number(sale.grandTotal ?? grandTotal);
  const balanceDue = Number(sale.balanceDue ?? 0);

  return {
    success: true,
    data: { id: sale._id, invoiceNumber: invoice, grandTotal: total, balanceDue },
    message: `✅ Sale created! Invoice: **${invoice}**${discount > 0 ? ` | Subtotal: QAR ${subtotal.toFixed(2)} | Discount: QAR ${discount.toFixed(2)}` : ''} | Total: QAR ${total.toFixed(2)} | Paid: QAR ${amountPaid.toFixed(2)}${balanceDue > 0 ? ` | Balance Due: QAR ${balanceDue.toFixed(2)}` : ''}`,
  };
}
    // ── CREATE PURCHASE ────────────────────────────────────────────────────────
    case 'create_purchase': {
      if (!input.items?.length)
        return { success: false, message: 'create_purchase: items array is empty. Provide at least one line item.' };

      const subtotal   = input.items.reduce(
        (sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity),
        0
      );
      const amountPaid = input.amountPaid != null ? Number(input.amountPaid) : subtotal;

      const res = await api(baseUrl, token, '/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId:    input.supplierId,
          supplierName:  input.supplierName,
          paymentMethod: input.paymentMethod ?? 'CASH',
          amountPaid,
          notes:         input.notes ?? '',
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
        return { success: false, message: res.data?.error ?? `create_purchase failed (HTTP ${res.status})` };

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

    // ── CREATE EXPENSE ─────────────────────────────────────────────────────────
    case 'create_expense': {
      if (!input.items?.length)
        return { success: false, message: 'create_expense: items array is empty. Provide at least one expense line.' };

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

        if (!paymentAccountId) {
          console.warn(`[AI Worker] create_expense: no system ${method} payment account found for outlet ${ctx.outletId}. Proceeding without paymentAccountId.`);
        }
      }

      const res = await api(baseUrl, token, '/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category:         input.category,
          paymentMethod:    method,
          paymentAccountId: paymentAccountId ?? null,
          amountPaid,
          vendorName:       input.vendorName  ?? '',
          notes:            input.notes       ?? '',
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
        return { success: false, message: res.data?.error ?? `create_expense failed (HTTP ${res.status})` };

      const expense    = res.data.expense ?? res.data;
      const expenseNum = expense.expenseNumber ?? '—';

      return {
        success: true,
        data: { id: expense._id, expenseNumber: expenseNum, grandTotal: subtotal },
        message: `✅ Expense recorded! Ref: **${expenseNum}** | ${input.category} | QAR ${subtotal.toFixed(2)}`,
      };
    }

    // ── GET SUMMARY ────────────────────────────────────────────────────────────
    case 'get_summary': {
      const now = new Date();
      let from: Date;

      if (input.period === 'today') {
        from = utcStartOfDay(now);
      } else if (input.period === 'this_week') {
        const start = new Date(now);
        start.setUTCDate(now.getUTCDate() - now.getUTCDay()); // Sunday
        from = utcStartOfDay(start);
      } else {
        from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      }

      const to = utcEndOfDay(now);
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
      const periodLabel = input.period.replace(/_/g, ' ');
      const lines: string[] = [`📊 **${periodLabel} summary:**`];

      if (sRes?.ok) {
        const d = sRes.data;
        const count = d.totalCount ?? d.sales?.length    ?? 0;
        const total = d.totalRevenue ?? d.grandTotal     ?? 0;
        result.sales = { count, total, recent: (d.sales ?? []).slice(0, 3) };
        lines.push(`\n**Sales:** QAR ${Number(total).toFixed(2)} (${count} invoice${count !== 1 ? 's' : ''})`);
        result.sales.recent.forEach((s: any) =>
          lines.push(`  • ${s.invoiceNumber} — ${s.customerName} — QAR ${Number(s.grandTotal).toFixed(2)}`));
      } else if (doSales) {
        lines.push('\n**Sales:** unavailable');
      }

      if (pRes?.ok) {
        const d = pRes.data;
        const count = d.totalCount ?? d.purchases?.length ?? 0;
        const total = d.totalAmount ?? d.grandTotal        ?? 0;
        result.purchases = { count, total, recent: (d.purchases ?? []).slice(0, 3) };
        lines.push(`\n**Purchases:** QAR ${Number(total).toFixed(2)} (${count} order${count !== 1 ? 's' : ''})`);
        result.purchases.recent.forEach((p: any) =>
          lines.push(`  • ${p.purchaseNumber} — ${p.supplierName} — QAR ${Number(p.grandTotal).toFixed(2)}`));
      } else if (doPurchases) {
        lines.push('\n**Purchases:** unavailable');
      }

      if (eRes?.ok) {
        const d = eRes.data;
        const count = d.totalCount ?? d.expenses?.length ?? 0;
        const total = d.totalExpenses ?? d.grandTotal     ?? 0;
        result.expenses = { count, total };
        lines.push(`\n**Expenses:** QAR ${Number(total).toFixed(2)} (${count} entr${count !== 1 ? 'ies' : 'y'})`);
      } else if (doExpenses) {
        lines.push('\n**Expenses:** unavailable');
      }

      // Net profit when all three reports are present
      if (result.sales != null && result.purchases != null && result.expenses != null) {
        const net = (result.sales.total ?? 0) - (result.purchases.total ?? 0) - (result.expenses.total ?? 0);
        lines.push(`\n**Net (Sales − Purchases − Expenses):** QAR ${net.toFixed(2)}`);
        result.net = net;
      }

      return { success: true, data: result, message: lines.join('\n') };
    }

    default:
      return {
        success: false,
        message: `Unknown tool: "${toolName}". Available tools are listed in the system prompt.`,
      };
  }
}