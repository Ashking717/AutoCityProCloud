import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';

import ActivityLog from '@/lib/models/ActivityLog';
import Customer from '@/lib/models/Customer';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Job, { JobStatus } from '@/lib/models/Job';
import Outlet from '@/lib/models/Outlet';
import Product from '@/lib/models/ProductEnhanced';
import Sale, { PaymentMethod } from '@/lib/models/Sale';
import User from '@/lib/models/User';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import {
  adjustProductLocationStock,
  resolveStockLocationForSale,
} from '@/lib/services/locationStockService';
import { postSaleAccounting } from '@/lib/services/transactionalAccountingService';

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateRange(start: string | null, end: string | null) {
  const from = parseDate(start);
  const to = parseDate(end);
  if (!from || !to) return null;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { $gte: from, $lte: to };
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function nextInvoiceNumber(date = new Date()) {
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8).toUpperCase();
  return `AC-${yearMonth}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessSales') && !hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const query: any = { outletId: new mongoose.Types.ObjectId(user.outletId) };
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end) {
      const range = dateRange(start, end);
      if (!range) return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      query.saleDate = range;
    }
    const status = searchParams.get('status');
    query.status = status && status !== 'all' ? status : { $ne: 'CANCELLED' };

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const [sales, total, totalRows] = await Promise.all([
      Sale.find(query)
        .populate('customerId', 'name phone')
        .populate('createdBy', 'firstName lastName')
        .sort({ saleDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      Sale.countDocuments(query),
      Sale.aggregate([
        { $match: query },
        { $set: { returned: { $sum: { $ifNull: ['$returns.totalAmount', []] } } } },
        { $group: {
          _id: null,
          totalSales: { $sum: { $subtract: ['$grandTotal', '$returned'] } },
          totalDiscount: { $sum: '$totalDiscount' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalance: { $sum: '$balanceDue' },
          count: { $sum: 1 },
        } },
      ]),
    ]);
    const totals = totalRows[0] || {};
    return NextResponse.json({
      sales,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      totals: {
        totalSales: round(Number(totals.totalSales || 0)),
        totalDiscount: round(Number(totals.totalDiscount || 0)),
        totalPaid: round(Number(totals.totalPaid || 0)),
        totalBalance: round(Number(totals.totalBalance || 0)),
        count: Number(totals.count || 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessSales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

    const body = await request.json();
    const operationKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    if (!operationKey || operationKey.length > 160) {
      return NextResponse.json({ error: 'A valid idempotencyKey is required' }, { status: 400 });
    }
    if (!body.customerId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Customer and at least one item are required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const existing = await Sale.findOne({ outletId, operationKey });
    if (existing) return NextResponse.json({ sale: existing, idempotent: true });

    session = await mongoose.startSession();
    let createdSale: any;
    await session.withTransaction(async () => {
      const duplicate = await Sale.findOne({ outletId, operationKey }).session(session!);
      if (duplicate) {
        createdSale = duplicate;
        return;
      }

      const [outlet, customer] = await Promise.all([
        Outlet.findById(outletId).session(session!),
        Customer.findOne({ _id: body.customerId, outletId, isActive: true }).session(session!),
      ]);
      if (!outlet) throw new Error('Outlet not found');
      if (!customer) throw new Error('Active customer not found in this outlet');

      const rawItems: any[] = [];
      const seenLines = new Set<string>();
      let netBeforeOverallDiscount = 0;
      let totalItemDiscount = 0;

      for (const input of body.items) {
        const isLabor = input.isLabor === true;
        const quantity = Number(input.quantity);
        const submittedUnitPrice = Number(input.unitPrice);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(submittedUnitPrice) || submittedUnitPrice < 0) {
          throw new Error('Item quantity and price must be valid non-negative numbers');
        }

        let product: any;
        let locationSelection: any;
        if (!isLabor) {
          product = await Product.findOne({
            _id: input.productId,
            outletId,
            isActive: true,
          }).session(session!);
          if (!product) throw new Error(`Active product not found in this outlet: ${input.productId}`);
          if (input.unit && input.unit !== product.unit) {
            throw new Error(`Unit mismatch for ${product.name}; expected ${product.unit}`);
          }
          locationSelection = await resolveStockLocationForSale({
            product,
            outletId,
            quantity,
            locationId: input.locationId,
            locationName: input.locationName || input.location,
            userId,
            session,
          });
          const lineKey = String(product._id);
          if (seenLines.has(lineKey)) {
            throw new Error(`Duplicate product line: ${product.name}. Combine the quantity into one stock location.`);
          }
          seenLines.add(lineKey);
        }

        // Product prices are authoritative on the server. A client-supplied
        // product price can otherwise bypass both the price list and the
        // explicit discount controls. Labor remains user-priced because it
        // has no product master record.
        const unitPrice = isLabor
          ? submittedUnitPrice
          : Number(product.sellingPrice || 0);

        const gross = round(unitPrice * quantity);
        const itemDiscount = input.discountType === 'percentage'
          ? round(gross * Number(input.discount || 0) / 100)
          : round(Number(input.discountAmount ?? input.discount ?? 0));
        if (!Number.isFinite(itemDiscount) || itemDiscount < 0 || itemDiscount > gross) {
          throw new Error(`Invalid discount for ${input.name || product?.name || 'item'}`);
        }
        const lineNet = round(gross - itemDiscount);
        const taxRate = Number(isLabor ? input.taxRate || 0 : product.taxRate || 0);
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
          throw new Error('Tax rate must be between 0 and 100');
        }
        netBeforeOverallDiscount = round(netBeforeOverallDiscount + lineNet);
        totalItemDiscount = round(totalItemDiscount + itemDiscount);
        rawItems.push({
          product,
          locationSelection,
          productId: product?._id,
          name: isLabor ? String(input.name || 'Labor').trim() : product.name,
          sku: isLabor ? 'LABOR' : product.sku,
          quantity,
          unit: isLabor ? input.unit || 'hour' : product.unit,
          unitPrice,
          costPrice: isLabor ? 0 : Number(product.costPrice || 0),
          itemDiscount,
          lineNet,
          taxRate,
          isLabor,
        });
      }

      const overallDiscount = round(Number(body.overallDiscountAmount || 0));
      if (!Number.isFinite(overallDiscount) || overallDiscount < 0 || overallDiscount > netBeforeOverallDiscount) {
        throw new Error('Overall discount exceeds the sale subtotal');
      }

      let allocated = 0;
      const saleItems = rawItems.map((item, index) => {
        const allocation = index === rawItems.length - 1
          ? round(overallDiscount - allocated)
          : round(overallDiscount * (item.lineNet / (netBeforeOverallDiscount || 1)));
        allocated = round(allocated + allocation);
        const total = round(item.lineNet - allocation);
        const vatAmount = round(total * item.taxRate / 100);
        return {
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          locationId: item.locationSelection?.location?._id,
          locationName: item.locationSelection?.location?.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          discount: round(item.itemDiscount + allocation),
          total,
          taxRate: item.taxRate,
          vatAmount,
          isLabor: item.isLabor,
        };
      });

      const subtotal = round(saleItems.reduce((sum, item) => sum + item.total, 0));
      const totalVAT = round(saleItems.reduce((sum, item) => sum + item.vatAmount, 0));
      const grandTotal = round(subtotal + totalVAT);
      const allowedMethods = new Set<string>(Object.values(PaymentMethod));
      const submittedPayments = Array.isArray(body.payments)
        ? body.payments
        : Number(body.amountPaid || 0) > 0
          ? [{ method: body.paymentMethod, amount: body.amountPaid, reference: body.paymentReference }]
          : [];
      const payments = submittedPayments
        .map((payment: any) => ({
          method: String(payment.method || '').toUpperCase(),
          amount: round(Number(payment.amount || 0)),
          reference: payment.reference || undefined,
        }))
        .filter((payment: any) => payment.amount > 0);
      for (const payment of payments) {
        if (!allowedMethods.has(payment.method) || payment.method === PaymentMethod.CREDIT) {
          throw new Error(`Invalid tender method: ${payment.method}`);
        }
      }
      const amountPaid = round(payments.reduce((sum: number, payment: any) => sum + payment.amount, 0));
      if (body.amountPaid !== undefined && Math.abs(Number(body.amountPaid) - amountPaid) > 0.01) {
        throw new Error('Payment detail total does not match amountPaid');
      }
      if (amountPaid > grandTotal + 0.01) throw new Error('Overpayment is not allowed on a sale');
      const balanceDue = round(grandTotal - amountPaid);

      if (customer.creditLimit > 0 && balanceDue > 0) {
        const updatedCustomer = await Customer.findOneAndUpdate(
          {
            _id: customer._id,
            outletId,
            currentBalance: { $lte: round(customer.creditLimit - balanceDue) },
          },
          { $inc: { currentBalance: balanceDue } },
          { new: true, session }
        );
        if (!updatedCustomer) throw new Error('Customer credit limit would be exceeded');
      } else if (balanceDue > 0) {
        await Customer.updateOne(
          { _id: customer._id, outletId },
          { $inc: { currentBalance: balanceDue } },
          { session }
        );
      }

      const now = new Date();
      const [sale] = await Sale.create([{
        invoiceNumber: nextInvoiceNumber(now),
        operationKey,
        outletId,
        customerId: customer._id,
        customerName: customer.name,
        items: saleItems,
        subtotal,
        totalDiscount: round(totalItemDiscount + overallDiscount),
        overallDiscount,
        totalVAT,
        grandTotal,
        paymentMethod: payments[0]?.method || PaymentMethod.CREDIT,
        payments,
        amountPaid,
        balanceDue,
        status: 'COMPLETED',
        notes: body.notes,
        createdBy: userId,
        saleDate: now,
        isPostedToGL: false,
      }], { session });

      const inventoryResults: any[] = [];
      for (const item of saleItems) {
        if (item.isLabor || !item.productId) continue;
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, outletId, currentStock: { $gte: item.quantity } },
          { $inc: { currentStock: -item.quantity } },
          { new: true, session }
        );
        if (!product) throw new Error(`Insufficient stock for ${item.name}`);
        const location = await adjustProductLocationStock({
          product,
          outletId,
          locationId: item.locationId,
          locationName: item.locationName,
          quantityDelta: -item.quantity,
          userId,
          session,
        });
        inventoryResults.push({ item, product, location });
      }

      const accounting = await postSaleAccounting(sale, userId, session!);
      for (const result of inventoryResults) {
        await InventoryMovement.create([{
          productId: result.item.productId,
          productName: result.item.name,
          sku: result.item.sku,
          movementType: 'SALE',
          quantity: -result.item.quantity,
          unit: result.item.unit,
          unitCost: result.item.costPrice,
          totalValue: round(-result.item.quantity * result.item.costPrice),
          referenceType: 'SALE',
          referenceId: sale._id,
          referenceNumber: sale.invoiceNumber,
          locationId: result.location.location._id,
          locationName: result.location.location.name,
          locationBalanceAfter: result.location.newQuantity,
          outletId,
          balanceAfter: result.product.currentStock,
          date: now,
          createdBy: userId,
          voucherId: accounting.cogsVoucherId || accounting.voucherId,
          ledgerEntriesCreated: true,
          operationKey: `sale:${sale._id}:stock:${result.item.productId}:${result.location.location._id}`,
        }], { session });
      }

      sale.voucherId = accounting.voucherId;
      sale.cogsVoucherId = accounting.cogsVoucherId;
      sale.isPostedToGL = true;
      await sale.save({ session });

      if (body.jobId) {
        const job = await Job.findOneAndUpdate(
          { _id: body.jobId, outletId, status: JobStatus.COMPLETED, convertedToSale: false },
          { $set: {
            convertedToSale: true,
            saleId: sale._id,
            saleInvoiceNumber: sale.invoiceNumber,
            actualCompletionDate: now,
          } },
          { new: true, session }
        );
        if (!job) throw new Error('Completed job was not found or was already converted');
      }

      const userDoc = await User.findById(userId).session(session!).lean();
      await ActivityLog.create([{
        userId,
        username: userDoc?.username || user.email,
        actionType: 'create',
        module: 'sales',
        description: `Created sale ${sale.invoiceNumber} - QAR ${grandTotal.toFixed(2)}`,
        outletId,
        timestamp: now,
      }], { session });
      createdSale = sale;
    });

    return NextResponse.json({ sale: createdSale }, { status: 201 });
  } catch (error: any) {
    console.error('SALE ERROR:', error);
    const status = /required|invalid|must be valid|mismatch|does not match|exceed|duplicate|insufficient|not found|overpayment|not allowed/i.test(error.message)
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || 'Failed to create sale' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
