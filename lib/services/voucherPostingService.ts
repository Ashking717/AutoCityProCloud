import mongoose from 'mongoose';

import Account from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Voucher, {
  IVoucher,
  ReferenceType,
  VoucherType,
} from '@/lib/models/Voucher';
import { applyVoucherBalances } from '@/lib/services/balanceEngine';

export interface PostingEntryInput {
  accountId: mongoose.Types.ObjectId | string;
  debit?: number;
  credit?: number;
  narration?: string;
}

export interface PostedVoucherInput {
  voucherType: VoucherType | 'payment' | 'receipt' | 'journal' | 'contra';
  date: Date;
  narration: string;
  entries: PostingEntryInput[];
  referenceType?: ReferenceType | string;
  referenceId?: mongoose.Types.ObjectId | string;
  referenceNumber?: string;
  postingKey: string;
  outletId: mongoose.Types.ObjectId | string;
  createdBy: mongoose.Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  isReversal?: boolean;
  reversalReason?: string;
}

function objectId(value: mongoose.Types.ObjectId | string) {
  return value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(value);
}

function voucherPrefix(type: string) {
  if (type === 'receipt') return 'RE';
  if (type === 'payment') return 'PY';
  if (type === 'contra') return 'CO';
  return 'JO';
}

export function createCollisionResistantVoucherNumber(type: string, date = new Date()) {
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8).toUpperCase();
  return `${voucherPrefix(type)}-${yearMonth}-${suffix}`;
}

function validateAmounts(entries: PostingEntryInput[]) {
  if (!entries.length) throw new Error('Voucher requires at least one entry');

  let debit = 0;
  let credit = 0;
  for (const entry of entries) {
    const dr = Number(entry.debit || 0);
    const cr = Number(entry.credit || 0);
    if (!Number.isFinite(dr) || !Number.isFinite(cr) || dr < 0 || cr < 0) {
      throw new Error('Voucher entries must contain non-negative finite amounts');
    }
    if ((dr > 0) === (cr > 0)) {
      throw new Error('Each voucher entry must contain exactly one positive debit or credit');
    }
    debit += dr;
    credit += cr;
  }

  if (Math.abs(debit - credit) > 0.01) {
    throw new Error(`Voucher not balanced: DR=${debit.toFixed(2)}, CR=${credit.toFixed(2)}`);
  }

  return {
    totalDebit: Number(debit.toFixed(2)),
    totalCredit: Number(credit.toFixed(2)),
  };
}

async function createPostedVoucherInSession(
  input: PostedVoucherInput,
  session: mongoose.ClientSession
) {
  const outletId = objectId(input.outletId);
  const createdBy = objectId(input.createdBy);

  const existing = await Voucher.findOne({
    outletId,
    postingKey: input.postingKey,
  }).session(session);
  if (existing) {
    const ledgerCount = await LedgerEntry.countDocuments({ voucherId: existing._id })
      .session(session);
    if (existing.status !== 'posted' || ledgerCount !== existing.entries.length) {
      throw new Error(`Incomplete prior posting detected for ${input.postingKey}`);
    }
    return { voucher: existing, created: false };
  }

  const totals = validateAmounts(input.entries);
  const accountIds = [...new Set(input.entries.map((entry) => String(entry.accountId)))];
  const accounts = await Account.find({
    _id: { $in: accountIds.map(objectId) },
    outletId,
    isActive: true,
  }).session(session);
  if (accounts.length !== accountIds.length) {
    throw new Error('Every voucher account must be active and belong to the current outlet');
  }

  const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
  const entries = input.entries.map((entry) => {
    const account = accountMap.get(String(entry.accountId))!;
    return {
      accountId: account._id,
      accountNumber: account.code,
      accountName: account.name,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      narration: entry.narration,
    };
  });

  const [voucher] = await Voucher.create(
    [{
      voucherNumber: createCollisionResistantVoucherNumber(input.voucherType, input.date),
      voucherType: input.voucherType,
      date: input.date,
      narration: input.narration,
      entries,
      ...totals,
      status: 'posted',
      referenceType: input.referenceType,
      referenceId: input.referenceId ? objectId(input.referenceId) : undefined,
      referenceNumber: input.referenceNumber,
      postingKey: input.postingKey,
      outletId,
      createdBy,
      metadata: input.metadata,
    }],
    { session }
  );

  await applyVoucherBalances(voucher, session);
  await LedgerEntry.insertMany(
    entries.map((entry, lineNumber) => ({
      voucherId: voucher._id,
      voucherNumber: voucher.voucherNumber,
      voucherType: voucher.voucherType,
      accountId: entry.accountId,
      accountNumber: entry.accountNumber,
      accountName: entry.accountName,
      debit: entry.debit,
      credit: entry.credit,
      narration: entry.narration || voucher.narration,
      date: voucher.date,
      referenceType: input.referenceType,
      referenceId: input.referenceId ? objectId(input.referenceId) : undefined,
      referenceNumber: input.referenceNumber,
      isReversal: input.isReversal === true,
      reversalReason: input.reversalReason,
      outletId,
      createdBy,
      lineNumber,
    })),
    { session, ordered: true }
  );

  return { voucher, created: true };
}

export async function createPostedVoucher(
  input: PostedVoucherInput,
  session?: mongoose.ClientSession
): Promise<{ voucher: IVoucher; created: boolean }> {
  if (session) return createPostedVoucherInSession(input, session);

  const ownSession = await mongoose.startSession();
  try {
    let result: { voucher: IVoucher; created: boolean } | undefined;
    await ownSession.withTransaction(async () => {
      result = await createPostedVoucherInSession(input, ownSession);
    });
    if (!result) throw new Error('Voucher transaction did not complete');
    return result;
  } finally {
    await ownSession.endSession();
  }
}

async function postDraftVoucherInSession(
  voucherId: mongoose.Types.ObjectId | string,
  outletIdInput: mongoose.Types.ObjectId | string,
  session: mongoose.ClientSession
) {
  const outletId = objectId(outletIdInput);
  const voucher = await Voucher.findOne({ _id: voucherId, outletId }).session(session);
  if (!voucher) throw new Error('Voucher not found');

  const existingCount = await LedgerEntry.countDocuments({ voucherId: voucher._id }).session(session);
  if (voucher.status === 'posted' || voucher.status === 'approved') {
    if (existingCount !== voucher.entries.length) {
      throw new Error('Posted voucher has incomplete ledger entries and requires reconciliation');
    }
    return { voucher, posted: false };
  }
  if (voucher.status !== 'draft') throw new Error('Only draft vouchers can be posted');
  if (existingCount > 0) throw new Error('Draft voucher already has ledger entries');

  validateAmounts(voucher.entries);
  const accountIds = [...new Set(voucher.entries.map((entry) => String(entry.accountId)))];
  const accounts = await Account.find({
    _id: { $in: accountIds.map(objectId) },
    outletId,
    isActive: true,
  }).session(session);
  if (accounts.length !== accountIds.length) {
    throw new Error('Every voucher account must be active and belong to the current outlet');
  }
  const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
  voucher.entries.forEach((entry) => {
    const account = accountMap.get(String(entry.accountId))!;
    entry.accountNumber = account.code;
    entry.accountName = account.name;
  });
  voucher.status = 'posted';
  voucher.postingKey ||= `manual-voucher:${voucher._id}`;
  await voucher.save({ session });
  await applyVoucherBalances(voucher, session);
  await LedgerEntry.insertMany(voucher.entries.map((entry, lineNumber) => ({
    voucherId: voucher._id,
    voucherNumber: voucher.voucherNumber,
    voucherType: voucher.voucherType,
    accountId: entry.accountId,
    accountNumber: entry.accountNumber,
    accountName: entry.accountName,
    debit: entry.debit,
    credit: entry.credit,
    narration: entry.narration || voucher.narration,
    date: voucher.date,
    referenceType: voucher.referenceType,
    referenceId: voucher.referenceId,
    referenceNumber: voucher.referenceNumber,
    outletId,
    createdBy: voucher.createdBy,
    lineNumber,
  })), { session, ordered: true });
  return { voucher, posted: true };
}

export async function postDraftVoucher(
  voucherId: mongoose.Types.ObjectId | string,
  outletId: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession
) {
  if (session) return postDraftVoucherInSession(voucherId, outletId, session);
  const ownSession = await mongoose.startSession();
  try {
    let result: Awaited<ReturnType<typeof postDraftVoucherInSession>> | undefined;
    await ownSession.withTransaction(async () => {
      result = await postDraftVoucherInSession(voucherId, outletId, ownSession);
    });
    if (!result) throw new Error('Voucher posting transaction did not complete');
    return result;
  } finally {
    await ownSession.endSession();
  }
}

async function reverseVoucherInSession(
  voucherId: mongoose.Types.ObjectId | string,
  outletIdInput: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  reason: string,
  session: mongoose.ClientSession
) {
  const outletId = objectId(outletIdInput);
  const voucher = await Voucher.findOne({ _id: voucherId, outletId }).session(session);
  if (!voucher) throw new Error('Voucher not found');
  if (voucher.status === 'cancelled') {
    const reversal = await Voucher.findOne({
      outletId,
      postingKey: `voucher-reversal:${voucher._id}`,
    }).session(session);
    return { voucher, reversal };
  }
  if (voucher.status !== 'posted' && voucher.status !== 'approved') {
    throw new Error('Only posted vouchers can be cancelled');
  }

  const result = await createPostedVoucherInSession({
    voucherType: voucher.voucherType,
    date: new Date(),
    narration: `REVERSAL: ${voucher.narration} - ${reason}`,
    entries: voucher.entries.map((entry) => ({
      accountId: entry.accountId,
      debit: entry.credit,
      credit: entry.debit,
    })),
    referenceType: ReferenceType.REVERSAL,
    referenceId: voucher.referenceId || voucher._id,
    referenceNumber: voucher.referenceNumber || voucher.voucherNumber,
    postingKey: `voucher-reversal:${voucher._id}`,
    outletId,
    createdBy: userId,
    metadata: { originalVoucherId: voucher._id, originalVoucherNumber: voucher.voucherNumber },
    isReversal: true,
    reversalReason: reason,
  }, session);

  voucher.status = 'cancelled';
  await voucher.save({ session });
  return { voucher, reversal: result.voucher };
}

export async function reversePostedVoucher(
  voucherId: mongoose.Types.ObjectId | string,
  outletId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  reason: string,
  session?: mongoose.ClientSession
) {
  if (session) {
    return reverseVoucherInSession(voucherId, outletId, userId, reason, session);
  }

  const ownSession = await mongoose.startSession();
  try {
    let result: Awaited<ReturnType<typeof reverseVoucherInSession>> | undefined;
    await ownSession.withTransaction(async () => {
      result = await reverseVoucherInSession(
        voucherId,
        outletId,
        userId,
        reason,
        ownSession
      );
    });
    if (!result) throw new Error('Voucher reversal transaction did not complete');
    return result;
  } finally {
    await ownSession.endSession();
  }
}
