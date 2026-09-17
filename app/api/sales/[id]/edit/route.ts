import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Customer from '@/lib/models/Customer';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Product from '@/lib/models/ProductEnhanced';
import Sale, { PaymentMethod } from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import {
  adjustProductLocationStock,
  resolveStockLocationForSale,
  restoreProductStockAtHistoricalCost,
} from '@/lib/services/locationStockService';
import {
  postSaleAccounting,
  reverseSaleAccounting,
} from '@/lib/services/transactionalAccountingService';
import { hasPermission } from '@/lib/types/roles';

const round = (value: number) => Number(value.toFixed(2));
const roundCost = (value: number) => Number(value.toFixed(4));

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessSales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid sale ID' }, { status: 400 });
    }

    const body = await request.json();
    const correctionKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    const correctionReason = String(body.correctionReason || '').trim();
    if (!correctionKey || correctionKey.length > 160) {
      return NextResponse.json({ error: 'A valid idempotencyKey is required' }, { status: 400 });
    }
    if (!correctionReason) {
      return NextResponse.json({ error: 'A correction reason is required' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one corrected sale item is required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let correctedSale: any;

    await session.withTransaction(async () => {
      const sale: any = await Sale.findOne({ _id: params.id, outletId }).session(session!);
      if (!sale) throw new Error('Sale not found');
      if (sale.lastCorrectionKey === correctionKey) {
        correctedSale = sale;
        return;
      }
      if (sale.status !== 'COMPLETED') throw new Error('Only completed sales can be corrected');
      if (sale.returns?.length) throw new Error('Sales with returns cannot be edited');
      if (!sale.voucherId || !sale.isPostedToGL) {
        throw new Error('Sale accounting must be complete before correction');
      }

      const requestedByIndex = new Map<number, any>();
      for (const [position, requested] of body.items.entries()) {
        const lineIndex = Number(requested.lineIndex ?? position);
        if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= sale.items.length) {
          throw new Error('Corrected sale item does not match an original line');
        }
        if (requestedByIndex.has(lineIndex)) throw new Error('Duplicate corrected sale line');
        requestedByIndex.set(lineIndex, requested);
      }

      const saleItems: any[] = [];
      const stockPlans: any[] = [];
      let totalDiscount = 0;

      for (const [lineIndex, oldItem] of sale.items.entries()) {
        const requested = requestedByIndex.get(lineIndex);
        if (!requested) {
          if (!oldItem.isLabor && oldItem.productId) {
            const updatedProduct = await restoreProductStockAtHistoricalCost({
              productId: oldItem.productId,
              outletId,
              quantity: Number(oldItem.quantity),
              unitCost: Number(oldItem.costPrice || 0),
              session: session!,
            });
            const locationResult = await adjustProductLocationStock({
              product: updatedProduct,
              outletId,
              locationId: oldItem.locationId,
              locationName: oldItem.locationName,
              quantityDelta: Number(oldItem.quantity),
              userId,
              session,
            });
            stockPlans.push({
              lineIndex,
              product: updatedProduct,
              item: oldItem,
              movementType: 'RETURN',
              quantity: Number(oldItem.quantity),
              unitCost: Number(oldItem.costPrice || 0),
              locationResult,
            });
          }
          continue;
        }
        const requestedIdentity = String(requested.productId || requested.sku || '');
        const originalIdentity = String(oldItem.productId || oldItem.sku || '');
        if (requestedIdentity !== originalIdentity && String(requested.sku || '') !== String(oldItem.sku || '')) {
          throw new Error('Products cannot be substituted during a sale correction');
        }

        const quantity = Number(requested.quantity);
        const unitPrice = Number(requested.unitPrice);
        const gross = round(quantity * unitPrice);
        const discount = round(Number(requested.discountAmount ?? requested.discount ?? 0));
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('Corrected quantity must be greater than zero');
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error('Corrected price must be a non-negative number');
        }
        if (!Number.isFinite(discount) || discount < 0 || discount > gross) {
          throw new Error(`Invalid corrected discount for ${oldItem.name}`);
        }
        const taxRate = Number(requested.taxRate ?? oldItem.taxRate ?? 0);
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
          throw new Error('Tax rate must be between 0 and 100');
        }
        const total = round(gross - discount);
        const vatAmount = round(total * taxRate / 100);
        totalDiscount = round(totalDiscount + discount);

        const correctedItem: any = {
          productId: oldItem.productId,
          name: oldItem.name,
          sku: oldItem.sku,
          locationId: oldItem.locationId,
          locationName: oldItem.locationName,
          quantity,
          unit: oldItem.unit,
          unitPrice,
          discount,
          total,
          costPrice: Number(oldItem.costPrice || 0),
          taxRate,
          vatAmount,
          isLabor: Boolean(oldItem.isLabor),
          returnedQuantity: 0,
        };

        if (!oldItem.isLabor && oldItem.productId) {
          const quantityDelta = round(quantity - Number(oldItem.quantity || 0));
          const product: any = await Product.findOne({ _id: oldItem.productId, outletId }).session(session!);
          if (!product) throw new Error(`Product not found for corrected line: ${oldItem.name}`);

          if (quantityDelta > 0) {
            if (!product.isActive) throw new Error(`Inactive product cannot be increased: ${oldItem.name}`);
            const locationSelection = await resolveStockLocationForSale({
              product,
              outletId,
              quantity: quantityDelta,
              locationId: oldItem.locationId,
              locationName: oldItem.locationName,
              userId,
              session,
            });
            const currentUnitCost = Number(product.costPrice || 0);
            const updatedProduct: any = await Product.findOneAndUpdate(
              { _id: product._id, outletId, currentStock: { $gte: quantityDelta } },
              { $inc: { currentStock: -quantityDelta } },
              { new: true, session }
            );
            if (!updatedProduct) throw new Error(`Insufficient stock for ${oldItem.name}`);
            const locationResult = await adjustProductLocationStock({
              product: updatedProduct,
              outletId,
              locationId: locationSelection.location._id,
              quantityDelta: -quantityDelta,
              userId,
              session,
            });
            correctedItem.locationId = locationSelection.location._id;
            correctedItem.locationName = locationSelection.location.name;
            correctedItem.costPrice = roundCost((
              Number(oldItem.costPrice || 0) * Number(oldItem.quantity || 0)
              + currentUnitCost * quantityDelta
            ) / quantity);
            stockPlans.push({ lineIndex, product: updatedProduct, item: correctedItem, movementType: 'SALE', quantity: -quantityDelta, unitCost: currentUnitCost, locationResult });
          } else if (quantityDelta < 0) {
            const restoredQuantity = Math.abs(quantityDelta);
            const updatedProduct = await restoreProductStockAtHistoricalCost({
              productId: product._id,
              outletId,
              quantity: restoredQuantity,
              unitCost: Number(oldItem.costPrice || 0),
              session: session!,
            });
            const locationResult = await adjustProductLocationStock({
              product: updatedProduct,
              outletId,
              locationId: oldItem.locationId,
              locationName: oldItem.locationName,
              quantityDelta: restoredQuantity,
              userId,
              session,
            });
            stockPlans.push({ lineIndex, product: updatedProduct, item: correctedItem, movementType: 'RETURN', quantity: restoredQuantity, unitCost: Number(oldItem.costPrice || 0), locationResult });
          }
        }
        saleItems.push(correctedItem);
      }

      if (saleItems.length === 0) throw new Error('At least one corrected sale item is required');
      const subtotal = round(saleItems.reduce((sum, item) => sum + Number(item.total || 0), 0));
      const totalVAT = round(saleItems.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0));
      const grandTotal = round(subtotal + totalVAT);

      const allowedMethods = new Set<string>(Object.values(PaymentMethod));
      const submittedPayments = Array.isArray(body.payments)
        ? body.payments
        : [{ method: body.paymentMethod || sale.paymentMethod, amount: body.amountPaid ?? sale.amountPaid, reference: body.reference }];
      const payments = submittedPayments.map((payment: any) => ({
        method: String(payment.method || '').toUpperCase(),
        amount: round(Number(payment.amount || 0)),
        reference: String(payment.reference || '').trim() || undefined,
      })).filter((payment: any) => payment.amount > 0);
      if (payments.some((payment: any) => !allowedMethods.has(payment.method) || payment.method === PaymentMethod.CREDIT)) {
        throw new Error('Correction contains an invalid tender payment method');
      }
      const amountPaid = round(payments.reduce((sum: number, payment: any) => sum + payment.amount, 0));
      if (body.amountPaid !== undefined && Math.abs(Number(body.amountPaid) - amountPaid) > 0.01) {
        throw new Error('Corrected payment details must equal amount paid');
      }
      if (amountPaid > grandTotal + 0.01) throw new Error('Overpayment is not allowed');
      const balanceDue = round(grandTotal - amountPaid);

      const customer: any = await Customer.findOne({ _id: sale.customerId, outletId, isActive: true }).session(session!);
      if (!customer) throw new Error('Active customer not found in this outlet');
      const balanceDelta = round(balanceDue - Number(sale.balanceDue || 0));
      if (balanceDelta > 0 && customer.creditLimit > 0) {
        const updatedCustomer = await Customer.findOneAndUpdate(
          { _id: customer._id, outletId, currentBalance: { $lte: round(customer.creditLimit - balanceDelta) } },
          { $inc: { currentBalance: balanceDelta } },
          { new: true, session }
        );
        if (!updatedCustomer) throw new Error('Customer credit limit would be exceeded');
      } else if (Math.abs(balanceDelta) > 0.001) {
        const updatedCustomer = await Customer.findOneAndUpdate(
          { _id: customer._id, outletId, currentBalance: { $gte: Math.max(0, -balanceDelta) } },
          { $inc: { currentBalance: balanceDelta } },
          { new: true, session }
        );
        if (!updatedCustomer) throw new Error('Customer balance cannot be reduced below zero');
      }

      const reversals = await reverseSaleAccounting(sale, userId, correctionReason, session!);
      sale.items = saleItems;
      sale.subtotal = subtotal;
      sale.totalDiscount = totalDiscount;
      sale.overallDiscount = 0;
      sale.totalVAT = totalVAT;
      sale.grandTotal = grandTotal;
      sale.payments = payments;
      sale.paymentMethod = payments[0]?.method || PaymentMethod.CREDIT;
      sale.amountPaid = amountPaid;
      sale.balanceDue = balanceDue;
      sale.notes = body.notes ?? sale.notes;

      const accounting = await postSaleAccounting(sale, userId, session!, {
        postingSuffix: `correction:${correctionKey}`,
      });
      const now = new Date();
      for (const plan of stockPlans) {
        const voucherId = plan.quantity < 0 ? accounting.cogsVoucherId : reversals.cogsReversalId;
        await InventoryMovement.create([{
          productId: plan.product._id,
          productName: plan.item.name,
          sku: plan.item.sku,
          movementType: plan.movementType,
          quantity: plan.quantity,
          unit: plan.item.unit,
          unitCost: plan.unitCost,
          totalValue: round(plan.quantity * plan.unitCost),
          referenceType: 'SALE',
          referenceId: sale._id,
          referenceNumber: sale.invoiceNumber,
          locationId: plan.locationResult.location._id,
          locationName: plan.locationResult.location.name,
          locationBalanceAfter: plan.locationResult.newQuantity,
          outletId,
          balanceAfter: plan.product.currentStock,
          date: now,
          createdBy: userId,
          notes: `Sale correction: ${correctionReason}`,
          voucherId,
          ledgerEntriesCreated: Boolean(voucherId),
          operationKey: `sale-correction:${correctionKey}:line:${plan.lineIndex}`,
        }], { session });
      }

      sale.voucherId = accounting.voucherId;
      sale.cogsVoucherId = accounting.cogsVoucherId;
      sale.isPostedToGL = true;
      sale.lastCorrectionKey = correctionKey;
      await sale.save({ session });
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'sales',
        description: `Corrected sale ${sale.invoiceNumber}: ${correctionReason}`,
        outletId,
        timestamp: now,
      }], { session });
      correctedSale = sale;
    });

    return NextResponse.json({ message: 'Sale corrected successfully', sale: correctedSale });
  } catch (error: any) {
    console.error('SALE EDIT ERROR:', error);
    const status = /required|cannot|invalid|only completed|returns|must|not found|complete|duplicate|insufficient|overpayment|exceed|greater than zero|match/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to edit sale' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
