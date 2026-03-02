// app/api/bot-config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies }                   from 'next/headers';
import jwt                           from 'jsonwebtoken';
import { connectDB }                 from '@/lib/db/mongodb';
import BotConfig                     from '@/lib/models/BotConfig';
import { verifyToken }               from '@/lib/auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ── GET — list all bot configs for this outlet ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();
    const configs = await BotConfig.find({ outletId: user.outletId }).select('-authToken');

    return NextResponse.json({ configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — create a new bot config ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, botToken } = await req.json();
    if (!name || !botToken) {
      return NextResponse.json({ error: 'name and botToken are required' }, { status: 400 });
    }

    // Auto-generate a 1-year auth token for this outlet/user
    const authToken = jwt.sign(
      {
        userId:   user.userId,
        email:    user.email,
        username: user.username,
        role:     user.role,
        outletId: user.outletId,
      },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    await connectDB();
    const config = await BotConfig.create({
      name,
      platform:  'telegram',
      botToken,
      authToken,
      outletId:  user.outletId,
      createdBy: user.userId,
    });

    return NextResponse.json({
      success: true,
      config:  { ...config.toObject(), authToken: undefined }, // never return authToken
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — enable/disable a bot ──────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, isActive } = await req.json();

    await connectDB();
    await BotConfig.findOneAndUpdate(
      { _id: id, outletId: user.outletId },
      { isActive }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE — remove a bot config ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await req.json();

    await connectDB();
    await BotConfig.findOneAndDelete({ _id: id, outletId: user.outletId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}