// app/api/ai-provider/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import AIProviderConfig, { AIProvider } from '@/lib/models/AiProviderConfig';

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return `${'•'.repeat(Math.min(key.length - 4, 32))}${key.slice(-4)}`;
}

// GET — any authenticated user can read (for widget status check)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token) as any;

    const configs = await AIProviderConfig.find({ outletId: user.outletId }).lean();
    return NextResponse.json({
      configs: configs.map(c => ({
        _id:           c._id,
        provider:      c.provider,
        label:         c.label,
        isActive:      c.isActive,
        widgetEnabled: c.widgetEnabled,
        createdAt:     c.createdAt,
        maskedKey:     maskKey('sk-...hidden'),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — ADMIN/SUPERADMIN only
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token) as any;
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { provider, apiKey, label, widgetEnabled = true } = await request.json() as {
      provider: AIProvider; apiKey: string; label?: string; widgetEnabled?: boolean;
    };

    if (!provider || !apiKey)
      return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 });
    if (!['openai', 'anthropic'].includes(provider))
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    if (apiKey.length < 20)
      return NextResponse.json({ error: 'API key looks too short' }, { status: 400 });

    await AIProviderConfig.updateMany({ outletId: user.outletId }, { isActive: false });

    const config = await AIProviderConfig.create({
      provider, apiKey,
      label:         label || `${provider === 'openai' ? 'OpenAI' : 'Anthropic'} Key`,
      outletId:      user.outletId,
      isActive:      true,
      widgetEnabled: widgetEnabled ?? true,
      createdBy:     user.userId,
    });

    return NextResponse.json({
      success: true,
      config: {
        _id: config._id, provider: config.provider, label: config.label,
        isActive: config.isActive, widgetEnabled: config.widgetEnabled,
        createdAt: config.createdAt, maskedKey: maskKey(apiKey),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — toggle isActive / widgetEnabled / label
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token) as any;
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, isActive, widgetEnabled, label } = await request.json() as {
      id: string; isActive?: boolean; widgetEnabled?: boolean; label?: string;
    };

    const config = await AIProviderConfig.findOne({ _id: id, outletId: user.outletId });
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    if (typeof isActive === 'boolean') {
      if (isActive)
        await AIProviderConfig.updateMany({ outletId: user.outletId, _id: { $ne: id } }, { isActive: false });
      config.isActive = isActive;
    }
    if (typeof widgetEnabled === 'boolean') config.widgetEnabled = widgetEnabled;
    if (label) config.label = label;

    await config.save();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token) as any;
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await request.json() as { id: string };
    await AIProviderConfig.deleteOne({ _id: id, outletId: user.outletId });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}