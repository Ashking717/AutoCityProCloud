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

  const isWalkIn   = input.customerId === 'walk-in';
  const subtotal   = input.items.reduce((sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
  const discount   = Number(input.discount ?? 0);
  const grandTotal = Number((subtotal - discount).toFixed(2));

  // API defaults amountPaid to 0 when omitted — must explicitly send grandTotal for full payment
  // Only override when user explicitly specified a partial/zero amount
  const amountPaid = input.amountPaid != null
    ? Number(input.amountPaid)
    : grandTotal;  // full payment default

  const res = await api(baseUrl, token, '/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      customerId:           isWalkIn ? undefined : input.customerId,
      customerName:         input.customerName,
      paymentMethod:        input.paymentMethod ?? 'CASH',
      overallDiscountAmount: discount,   // ← correct field name the API expects
      amountPaid,                        // ← always send explicitly
      notes:                input.notes ?? '',
      items: input.items.map((item: any) => ({
        productId:    item.productId,
        quantity:     Number(item.quantity),
        unitPrice:    Number(item.unitPrice),
        discount:     0,
        discountType: 'fixed',
        unit:         item.unit,
        name:         item.name,
        sku:          item.sku,
      })),
    }),
  });

  if (!res.ok)
    return { success: false, message: res.data?.error ?? `create_sale failed (HTTP ${res.status})` };

  const sale       = res.data.sale ?? res.data;
  const invoice    = sale.invoiceNumber ?? '—';
  const total      = Number(sale.grandTotal  ?? grandTotal);
  const paid       = Number(sale.amountPaid  ?? amountPaid);
  const balanceDue = Number(sale.balanceDue  ?? 0);

  return {
    success: true,
    data: { id: sale._id, invoiceNumber: invoice, grandTotal: total, balanceDue },
    message: [
      `✅ Sale created! Invoice: **${invoice}**`,
      discount > 0 ? `Subtotal: QAR ${subtotal.toFixed(2)} | Discount: -QAR ${discount.toFixed(2)}` : '',
      `Total: QAR ${total.toFixed(2)} | Paid: QAR ${paid.toFixed(2)}`,
      balanceDue > 0 ? `⚠️ Balance Due: QAR ${balanceDue.toFixed(2)}` : '✓ Fully paid',
    ].filter(Boolean).join(' | '),
  };
}    // ── CREATE PURCHASE ────────────────────────────────────────────────────────
case 'create_purchase': {
  if (!input.items?.length)
    return { success: false, message: 'create_purchase: items array is empty.' };

  const subtotal   = input.items.reduce(
    (sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity), 0
  );
  const taxTotal   = input.items.reduce(
    (sum: number, item: any) => sum + (Number(item.unitPrice) * Number(item.quantity) * Number(item.taxRate ?? 0)) / 100, 0
  );
  const grandTotal = Number((subtotal + taxTotal).toFixed(2));

  // Always send explicitly — API defaults to 0 when omitted
  const amountPaid = input.amountPaid != null ? Number(input.amountPaid) : grandTotal;
  const balanceDue = Number((grandTotal - amountPaid).toFixed(2));

  const res = await api(baseUrl, token, '/api/purchases', {
    method: 'POST',
    body: JSON.stringify({
      supplierId:    input.supplierId,
      supplierName:  input.supplierName,
      paymentMethod: input.paymentMethod ?? 'CASH',
      amountPaid,                          // ← always explicit
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
  const total       = Number(purchase.grandTotal  ?? grandTotal);
  const actualPaid  = Number(purchase.amountPaid  ?? amountPaid);
  const actualDue   = Number(purchase.balanceDue  ?? balanceDue);

  const paymentLine = actualDue <= 0
    ? `✓ Fully paid: QAR ${actualPaid.toFixed(2)}`
    : actualPaid <= 0
      ? `📋 Fully on credit — QAR ${total.toFixed(2)} due later`
      : `Paid: QAR ${actualPaid.toFixed(2)} | ⚠️ On credit: QAR ${actualDue.toFixed(2)}`;

  return {
    success: true,
    data: { id: purchase._id, purchaseNumber: purchaseNum, grandTotal: total, balanceDue: actualDue },
    message: [
      `✅ Purchase recorded! Ref: **${purchaseNum}**`,
      `Supplier: ${input.supplierName} | Total: QAR ${total.toFixed(2)}`,
      paymentLine,
    ].join(' | '),
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
// ── GET SUMMARY ────────────────────────────────────────────────────────────
case 'get_summary': {
  const now = new Date();
  let from: Date;

  if (input.period === 'today') {
    from = utcStartOfDay(now);
  } else if (input.period === 'this_week') {
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - now.getUTCDay());
    from = utcStartOfDay(start);
  } else {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const to = utcEndOfDay(now);

  // ── Import models needed for ledger-driven summary ──────────────────────
  const LedgerEntry = (await import('@/lib/models/LedgerEntry')).default;
  const Sale        = (await import('@/lib/models/Sale')).default;

  // ── Ledger helper: sum debit-credit for accounts matching subTypes ───────
  async function ledgerNet(
    subTypes: string[],
    accountType: string | null,
    start: Date,
    end: Date,
    mode: 'credit_minus_debit' | 'debit_minus_credit' | 'credits_only' | 'debits_only' = 'credit_minus_debit'
  ): Promise<number> {
    const accountFilter: any = { outletId, isActive: true, subType: { $in: subTypes } };
    if (accountType) accountFilter.type = accountType;

    const accs = await Account.find(accountFilter).select('_id').lean();
    if (!accs.length) return 0;

    const entries = await LedgerEntry.find({
      outletId,
      accountId: { $in: accs.map((a: any) => a._id) },
      date: { $gte: start, $lte: end },
    }).lean() as any[];

    if (mode === 'credit_minus_debit')
      return entries.reduce((s, e) => s + (e.credit || 0) - (e.debit || 0), 0);
    if (mode === 'debit_minus_credit')
      return entries.reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0);
    if (mode === 'credits_only')
      return entries.reduce((s, e) => s + (e.credit || 0), 0);
    return entries.reduce((s, e) => s + (e.debit || 0), 0);
  }

  // ── Ledger helper: running balance up to a date ───────────────────────────
  async function ledgerBalance(subTypes: string[], upto: Date): Promise<number> {
    const accs = await Account.find({
      outletId, isActive: true, subType: { $in: subTypes },
    }).select('_id').lean();
    if (!accs.length) return 0;

    const entries = await LedgerEntry.find({
      outletId,
      accountId: { $in: accs.map((a: any) => a._id) },
      date: { $lte: upto },
    }).lean() as any[];

    return entries.reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0);
  }

  const doSales     = input.type === 'sales'     || input.type === 'all';
  const doPurchases = input.type === 'purchases'  || input.type === 'all';
  const doExpenses  = input.type === 'expenses'   || input.type === 'all';

  const periodLabel = input.period.replace(/_/g, ' ');
  const lines: string[] = [`📊 **${periodLabel} summary:**`];
  const result: Record<string, any> = {};

  // ── REVENUE (credit to sales/service revenue accounts, net of debits) ────
  if (doSales) {
    const revenue = await ledgerNet(
      ['sales_revenue', 'SALES_REVENUE', 'service_revenue', 'SERVICE_REVENUE'],
      'revenue',
      from, to,
      'credit_minus_debit'
    );

    // Fallback: count from Sale documents if ledger has no revenue entries
    const salesDocs = await (Sale as any).find({
      outletId,
      status: 'COMPLETED',
      saleDate: { $gte: from, $lte: to },
    }).select('invoiceNumber customerName grandTotal amountPaid balanceDue').lean() as any[];

    const total    = revenue > 0 ? revenue : salesDocs.reduce((s: number, x: any) => s + (x.grandTotal || 0), 0);
    const count    = salesDocs.length;
    const credited = salesDocs.reduce((s: number, x: any) => s + (x.amountPaid || 0), 0);
    const balance  = salesDocs.reduce((s: number, x: any) => s + (x.balanceDue || 0), 0);

    result.sales = { total, count, credited, balance };
    lines.push(`\n**Sales Revenue:** QAR ${total.toFixed(2)} (${count} invoice${count !== 1 ? 's' : ''})`);
    if (credited < total) lines.push(`  Collected: QAR ${credited.toFixed(2)} | Outstanding: QAR ${balance.toFixed(2)}`);

    // Show last 3 invoices
    salesDocs.slice(0, 3).forEach((s: any) =>
      lines.push(`  • ${s.invoiceNumber} — ${s.customerName} — QAR ${Number(s.grandTotal).toFixed(2)}`)
    );
  }

  // ── PURCHASES (credits to cash/bank with referenceType=PURCHASE) ──────────
  if (doPurchases) {
    const cashBankAccs = await Account.find({
      outletId, isActive: true,
      subType: { $in: ['cash', 'CASH', 'bank', 'BANK', 'bank_account', 'BANK_ACCOUNT'] },
    }).select('_id').lean() as any[];

    const purchaseEntries = await LedgerEntry.find({
      outletId,
      accountId: { $in: cashBankAccs.map((a: any) => a._id) },
      referenceType: 'PURCHASE',
      date: { $gte: from, $lte: to },
      credit: { $gt: 0 },
    }).lean() as any[];

    const total = purchaseEntries.reduce((s, e: any) => s + (e.credit || 0), 0);
    const count = new Set(purchaseEntries.map((e: any) => e.referenceId?.toString()).filter(Boolean)).size;

    result.purchases = { total, count };
    lines.push(`\n**Purchases (paid):** QAR ${total.toFixed(2)} (${count || purchaseEntries.length} transaction${count !== 1 ? 's' : ''})`);
  }

  // ── EXPENSES (credits to cash/bank with "Expense payment" narration) ──────
  if (doExpenses) {
    const cashBankAccs = await Account.find({
      outletId, isActive: true,
      subType: { $in: ['cash', 'CASH', 'bank', 'BANK', 'bank_account', 'BANK_ACCOUNT'] },
    }).select('_id').lean() as any[];

    const expenseEntries = await LedgerEntry.find({
      outletId,
      accountId: { $in: cashBankAccs.map((a: any) => a._id) },
      narration: { $regex: /expense payment/i },
      date: { $gte: from, $lte: to },
      credit: { $gt: 0 },
    }).lean() as any[];

    const total = expenseEntries.reduce((s, e: any) => s + (e.credit || 0), 0);
    const count = new Set(
      expenseEntries.map((e: any) => e.referenceId?.toString() || e.voucherId?.toString()).filter(Boolean)
    ).size;

    result.expenses = { total, count };
    lines.push(`\n**Expenses (paid):** QAR ${total.toFixed(2)} (${count || expenseEntries.length} entr${count !== 1 ? 'ies' : 'y'})`);
  }

  // ── CASH & BANK BALANCES ──────────────────────────────────────────────────
  if (input.type === 'all') {
    const [cashBalance, bankBalance] = await Promise.all([
      ledgerBalance(['cash', 'CASH'], to),
      ledgerBalance(['bank', 'BANK', 'bank_account', 'BANK_ACCOUNT'], to),
    ]);

    result.cashBalance = cashBalance;
    result.bankBalance = bankBalance;
    lines.push(`\n**Cash in Hand:** QAR ${cashBalance.toFixed(2)}`);
    lines.push(`**Bank Balance:** QAR ${bankBalance.toFixed(2)}`);
  }

  // ── NET PROFIT ────────────────────────────────────────────────────────────
  if (result.sales != null && result.purchases != null && result.expenses != null) {
    const cogs = await ledgerNet(['cogs', 'COGS'], 'expense', from, to, 'debits_only');
    const net  = result.sales.total - cogs - result.purchases.total - result.expenses.total;
    result.net = net;
    result.cogs = cogs;
    if (cogs > 0) lines.push(`\n**COGS:** QAR ${cogs.toFixed(2)}`);
    lines.push(`\n**Net Profit** (Revenue − COGS − Purchases − Expenses): **QAR ${net.toFixed(2)}**`);
  }

  return { success: true, data: result, message: lines.join('\n') };
}
    // ── SEARCH ACCOUNTS ────────────────────────────────────────────────────────
// ── SEARCH ACCOUNTS ────────────────────────────────────────────────────────
case 'search_accounts': {
  const filter: any = { outletId, isActive: true };

  const isCashBankRequest =
    input.accountGroup && /cash|bank/i.test(input.accountGroup);

  if (isCashBankRequest) {
    // Match by subType (how the seed stores it) OR by name as fallback
    filter.$or = [
      { subType: { $in: ['cash', 'CASH', 'bank', 'BANK', 'bank_account', 'BANK_ACCOUNT'] } },
      { name: { $regex: 'cash|bank', $options: 'i' } },
    ];
  } else if (input.query?.trim()) {
    filter.name = { $regex: input.query.trim(), $options: 'i' };
  }

  const accounts = await Account.find(filter)
    .select('_id code name type subType isSystem')
    .sort({ name: 1 })
    .limit(20)
    .lean();

  if (!accounts.length)
    return {
      success: false,
      message: `search_accounts: No cash/bank accounts found. Ensure system accounts are seeded for this outlet.`,
    };

  // Return with consistent field names so the AI can use `accountId` in entries
  const normalized = (accounts as any[]).map(a => ({
    accountId:   a._id.toString(),
    code:        a.code,
    name:        a.name,
    type:        a.type,
    subType:     a.subType,
  }));

  return {
    success: true,
    data: normalized,
    message: `Found ${normalized.length} account(s): ${normalized.map(a => `${a.name} (${a.subType})`).join(', ')}`,
  };
}

// ── CREATE VOUCHER ─────────────────────────────────────────────────────────
// ── CREATE VOUCHER ─────────────────────────────────────────────────────────
case 'create_voucher': {
  if (!input.entries?.length || input.entries.length < 2)
    return { success: false, message: 'create_voucher: At least 2 entries are required.' };

  const totalDebit  = input.entries.reduce((s: number, e: any) => s + Number(e.debit  ?? 0), 0);
  const totalCredit = input.entries.reduce((s: number, e: any) => s + Number(e.credit ?? 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01)
    return {
      success: false,
      message: `create_voucher: Unbalanced — DR QAR ${totalDebit.toFixed(2)} ≠ CR QAR ${totalCredit.toFixed(2)}.`,
    };

  // ── Contra-specific sanity check ──────────────────────────────────────────
  if (input.voucherType === 'contra') {
    // Fetch the subTypes of all accounts used in this voucher
    const accountIds = input.entries.map((e: any) => e.accountId).filter(Boolean);
    const accs = await Account.find({ _id: { $in: accountIds }, outletId })
      .select('_id name subType')
      .lean() as any[];

    const accMap = new Map(accs.map(a => [a._id.toString(), a]));

    for (const entry of input.entries) {
      const acc = accMap.get(entry.accountId?.toString());
      if (!acc) continue;

      const isCash = /cash/i.test(acc.subType ?? '') || /cash/i.test(acc.name ?? '');
      const isBank = /bank/i.test(acc.subType ?? '') || /bank/i.test(acc.name ?? '');
      const isWithdrawal = /withdraw|withdrawal/i.test(input.narration ?? '');
      const isDeposit    = /deposit/i.test(input.narration ?? '');

      if (isWithdrawal) {
        // Cash must be DEBIT, Bank must be CREDIT
        if (isCash && Number(entry.credit) > 0)
          return {
            success: false,
            message: `create_voucher: Withdrawal error — Cash account "${acc.name}" must be DEBIT (money going TO cash), not credit. Swap the debit/credit values and retry.`,
          };
        if (isBank && Number(entry.debit) > 0)
          return {
            success: false,
            message: `create_voucher: Withdrawal error — Bank account "${acc.name}" must be CREDIT (money leaving bank), not debit. Swap the debit/credit values and retry.`,
          };
      }

      if (isDeposit) {
        // Bank must be DEBIT, Cash must be CREDIT
        if (isBank && Number(entry.credit) > 0)
          return {
            success: false,
            message: `create_voucher: Deposit error — Bank account "${acc.name}" must be DEBIT (money going TO bank), not credit. Swap the debit/credit values and retry.`,
          };
        if (isCash && Number(entry.debit) > 0)
          return {
            success: false,
            message: `create_voucher: Deposit error — Cash account "${acc.name}" must be CREDIT (money leaving cash), not debit. Swap the debit/credit values and retry.`,
          };
      }
    }
  }

  const res = await api(baseUrl, token, '/api/vouchers', {
    method: 'POST',
    body: JSON.stringify({
      voucherType:     input.voucherType,
      date:            input.date ?? new Date().toISOString().split('T')[0],
      narration:       input.narration,
      referenceNumber: input.referenceNumber ?? '',
      status:          input.status ?? 'posted',
      entries: input.entries.map((e: any) => ({
        accountId: e.accountId,
        debit:     Number(e.debit  ?? 0),
        credit:    Number(e.credit ?? 0),
        narration: e.narration ?? input.narration,
      })),
    }),
  });

  if (!res.ok)
    return { success: false, message: res.data?.error ?? `create_voucher failed (HTTP ${res.status})` };

  const voucher = res.data.voucher ?? res.data;
  const ref     = voucher.voucherNumber ?? voucher._id ?? '—';
  const type    = input.voucherType.charAt(0).toUpperCase() + input.voucherType.slice(1);

  const entrySummary = input.entries
    .map((e: any) =>
      Number(e.debit)  > 0 ? `  • ${e.accountName} — DR QAR ${Number(e.debit).toFixed(2)}`  :
      Number(e.credit) > 0 ? `  • ${e.accountName} — CR QAR ${Number(e.credit).toFixed(2)}` : null
    )
    .filter(Boolean)
    .join('\n');

  return {
    success: true,
    data: { id: voucher._id, voucherNumber: ref, voucherType: input.voucherType },
    message: `✅ ${type} Voucher created! Ref: **${ref}**\n${entrySummary}`,
  };
}
// ── PREVIEW CLOSING ────────────────────────────────────────────────────────
case 'preview_closing': {
  const date = input.closingDate ?? new Date().toISOString().split('T')[0];
  const res  = await api(baseUrl, token,
    `/api/closings/preview?type=${input.closingType}&date=${date}`
  );

  if (!res.ok)
    return { success: false, message: res.data?.error ?? `preview_closing failed (HTTP ${res.status})` };

  const d = res.data;
  const fmt = (n: number) => `QAR ${Number(n ?? 0).toFixed(2)}`;

  const lines = [
    `📋 **Closing Preview — ${input.closingType === 'day' ? 'Daily' : 'Monthly'} (${date})**`,
    `Period: ${new Date(d.periodStart).toLocaleDateString()} → ${new Date(d.periodEnd).toLocaleDateString()}`,
    ``,
    `**Revenue:**       ${fmt(d.totalRevenue)}`,
    `**COGS:**          ${fmt(d.totalCOGS)}`,
    `**Purchases:**     ${fmt(d.totalPurchases)}`,
    `**Expenses:**      ${fmt(d.totalExpenses)}`,
    `**Gross Profit:**  ${fmt(d.grossProfit)}`,
    `**Net Profit:**    ${fmt(d.netProfit)}  (${d.netProfitMargin?.toFixed(1) ?? 0}%)`,
    ``,
    `**Cash Opening:**  ${fmt(d.openingCash)}  →  Closing: ${fmt(d.projectedClosingCash)}`,
    `**Bank Opening:**  ${fmt(d.openingBank)}  →  Closing: ${fmt(d.projectedClosingBank)}`,
    `**Total Balance:** ${fmt(d.totalOpeningBalance)} → ${fmt(d.totalClosingBalance)}`,
    ``,
    `Sales: ${d.salesCount} | Purchases: ${d.paidPurchasesCount} paid / ${d.unpaidPurchasesCount} unpaid | Expenses: ${d.paidExpensesCount}`,
    d.unpaidPurchasesTotal > 0
      ? `⚠️ Unpaid purchases: ${fmt(d.unpaidPurchasesTotal)} (not deducted from profit)`
      : '',
    d.isFirstClosing ? `ℹ️ First closing — all historical data included.` : '',
  ].filter(l => l !== '');

  return {
    success: true,
    data: { ...d, closingType: input.closingType, closingDate: date },
    message: lines.join('\n'),
  };
}

// ── CREATE CLOSING ─────────────────────────────────────────────────────────
case 'create_closing': {
  const date = input.closingDate ?? new Date().toISOString().split('T')[0];

  const res = await api(baseUrl, token, '/api/closings', {
    method: 'POST',
    body: JSON.stringify({
      closingType: input.closingType,
      closingDate: date,
      notes:       input.notes ?? '',
    }),
  });

  if (!res.ok)
    return { success: false, message: res.data?.error ?? `create_closing failed (HTTP ${res.status})` };

  const d = res.data;
  const fmt = (n: number) => `QAR ${Number(n ?? 0).toFixed(2)}`;
  const c   = d.closing;
  const pb  = d.profitBreakdown;

  return {
    success: true,
    data: { id: c._id, closingType: c.closingType, closingDate: c.closingDate },
    message: [
      `✅ **${input.closingType === 'day' ? 'Day' : 'Month'} Closed Successfully!**`,
      ``,
      `**Revenue:**    ${fmt(pb.revenue)}`,
      `**COGS:**       ${fmt(pb.cogs)}`,
      `**Purchases:**  ${fmt(pb.purchases)}`,
      `**Expenses:**   ${fmt(pb.expenses)}`,
      `**Net Profit:** ${fmt(pb.netProfit)}`,
      ``,
      `Ledger entries: ${d.ledgerStats.entries} | Balanced: ${d.ledgerStats.balanced ? '✓' : '✗'}`,
    ].join('\n'),
  };
}

    default:
      return {
        success: false,
        message: `Unknown tool: "${toolName}". Available tools are listed in the system prompt.`,
      };
  }
}