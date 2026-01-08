// app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import User from '@/lib/models/User';

// Helper function to map DB fields to frontend expected fields
function mapAccountFields(account: any) {
  return {
    ...account,
    accountNumber: account.code || account.accountNumber,
    accountName: account.name || account.accountName,
    accountType: account.type || account.accountType,
    accountSubType: account.subType || account.accountSubType,
    accountGroup: account.accountGroup || account.group,
  };
}

// GET /api/accounts
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const accountsRaw = await Account.find({
      outletId: user.outletId,
    })
      .sort({ code: 1, accountNumber: 1 })
      .lean() as any[];
    
    // Calculate current balance from ledger entries for each account
    const LedgerEntry = (await import('@/lib/models/LedgerEntry')).default;
    
    const accountsWithBalances = await Promise.all(
      accountsRaw.map(async (acc: any) => {
        // Get all ledger entries for this account
        const entries = await LedgerEntry.find({
          accountId: acc._id,
          outletId: user.outletId,
        }).lean();
        
        // Calculate balance: opening + (sum of debits - sum of credits)
        const totalDebits = entries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0);
        const totalCredits = entries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);
        
        // For assets and expenses: debit increases, credit decreases
        // For liabilities, equity, and revenue: credit increases, debit decreases
        const accountType = (acc.type || acc.accountType || '').toUpperCase();
        let currentBalance = acc.openingBalance || 0;

        if (accountType === 'asset' || accountType === 'expense') {
          currentBalance += (totalDebits - totalCredits);
        } else {
          // LIABILITY, EQUITY, REVENUE
          currentBalance += (totalCredits - totalDebits);
        }
        
        return mapAccountFields({
          ...acc,
          currentBalance,
        });
      })
    );
    
    return NextResponse.json({ accounts: accountsWithBalances });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    const body = await request.json();

    const {
      accountCode,
      accountName,
      accountType,
      accountSubType,
      accountGroup,
      openingBalance,
      description,
    } = body;

    if (!accountCode || !accountName || !accountType || !accountGroup) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if account code already exists
    const existing = await Account.findOne({
      outletId: user.outletId,
      $or: [
        { code: accountCode },
        { accountNumber: accountCode }
      ]
    });

    if (existing) {
      return NextResponse.json({ error: 'Account number already exists' }, { status: 400 });
    }

    // Create account using the DB schema field names
    const account = await Account.create({
      code: accountCode,
      name: accountName,
      type: accountType.toUpperCase(),
      subType: accountSubType ? accountSubType.toUpperCase() : undefined,
      accountGroup,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0,
      description,
      outletId: user.outletId,
      isSystem: false,
      isActive: true,
    });

    // Fetch user for activity log
    const userDoc = await User.findById(user.userId).lean();
    const username = userDoc?.username || userDoc?.username || user.username || user.email || "Unknown User";

    await ActivityLog.create({
      userId: user.userId,
      username,
      actionType: 'create',
      module: 'accounts',
      description: `Created account: ${accountName}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    // Map fields for response
    const mappedAccount = mapAccountFields(account.toObject());

    return NextResponse.json({ account: mappedAccount }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}