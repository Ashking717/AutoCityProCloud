// app/api/bot-config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies }                   from 'next/headers';
import jwt                           from 'jsonwebtoken';
import crypto                        from 'crypto';
import { connectDB }                 from '@/lib/db/mongodb';
import BotConfig                     from '@/lib/models/BotConfig';
import { verifyToken }               from '@/lib/auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL!;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function registerWebhook(botToken: string, botId: string, webhookSecret: string) {
  const webhookUrl = `${APP_URL}/api/telegram/${botId}`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
      secret_token: webhookSecret,
    }),
  });

  return res.json();
}

// ─────────────────────────────────────────────────────────────
// GET — list bots (ADMIN + SUPERADMIN)
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);

    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const filter =
      user.role === 'SUPERADMIN'
        ? {}
        : { outletId: user.outletId };

    const configs = await BotConfig
      .find(filter)
      .select('-authToken -botToken -webhookSecret')
      .sort({ createdAt: -1 });

    return NextResponse.json({ configs });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST — create bot (auto webhook + secure)
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);

    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, botToken } = await req.json();

    if (!name || !botToken) {
      return NextResponse.json(
        { error: 'name and botToken are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Prevent duplicate token
    const exists = await BotConfig.findOne({ botToken });
    if (exists) {
      return NextResponse.json(
        { error: 'This bot token is already connected.' },
        { status: 400 }
      );
    }

    // Generate 1-year AI auth token
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

    const webhookSecret = generateWebhookSecret();

    const config = await BotConfig.create({
      name,
      platform:      'telegram',
      botToken,
      authToken,
      webhookSecret,
      outletId:      user.outletId,
      createdBy:     user.userId,
      isActive:      true,
    });

    // Auto-register webhook immediately
    const webhookResult = await registerWebhook(
      botToken,
      config._id.toString(),
      webhookSecret
    );

    return NextResponse.json({
      success: true,
      webhook: webhookResult,
      config: {
        ...config.toObject(),
        botToken: undefined,
        authToken: undefined,
        webhookSecret: undefined,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH — enable/disable bot
// ─────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);

    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, isActive } = await req.json();

    await connectDB();

    const filter =
      user.role === 'SUPERADMIN'
        ? { _id: id }
        : { _id: id, outletId: user.outletId };

    await BotConfig.findOneAndUpdate(filter, { isActive });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE — remove bot (also remove webhook)
// ─────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);

    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();

    await connectDB();

    const filter =
      user.role === 'SUPERADMIN'
        ? { _id: id }
        : { _id: id, outletId: user.outletId };

    const config = await BotConfig.findOne(filter);
    if (!config) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Remove webhook from Telegram
    await fetch(`https://api.telegram.org/bot${config.botToken}/deleteWebhook`);

    await BotConfig.deleteOne({ _id: id });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}