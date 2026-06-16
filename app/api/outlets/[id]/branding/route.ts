import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Outlet from '@/lib/models/Outlet';
import { requireRole } from '@/lib/auth/session';
import { UserRole } from '@/lib/types/roles';

type BrandingAssetKey = 'logo' | 'seal';

const MAX_BRANDING_IMAGE_SIZE = 2 * 1024 * 1024;

function isBrandingAssetKey(value: FormDataEntryValue | string | null): value is BrandingAssetKey {
  return value === 'logo' || value === 'seal';
}

function getLegacyUrlKey(asset: BrandingAssetKey) {
  return asset === 'logo' ? 'logoUrl' : 'sealUrl';
}

async function getWritableOutlet(id: string, user: { role: string; outletId: string | null }) {
  const outlet = await Outlet.findById(id);

  if (!outlet) {
    return { error: NextResponse.json({ error: 'Outlet not found' }, { status: 404 }) };
  }

  if (user.role !== UserRole.SUPERADMIN && user.outletId !== id) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) };
  }

  return { outlet };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]);
    await connectDB();

    const { outlet, error } = await getWritableOutlet(params.id, user);
    if (error) return error;

    const formData = await request.formData();
    const asset = formData.get('asset');
    const file = formData.get('file');

    if (!isBrandingAssetKey(asset)) {
      return NextResponse.json({ error: 'Invalid branding asset' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_BRANDING_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large. Maximum size is 2MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const now = new Date();

    outlet!.set(`branding.${asset}`, {
      data: buffer,
      contentType: file.type,
      filename: file.name,
      size: file.size,
      updatedAt: now,
    });
    outlet!.set(`branding.${getLegacyUrlKey(asset)}`, '');

    await outlet!.save();

    const safeOutlet = await Outlet.findById(params.id);

    return NextResponse.json({
      outlet: safeOutlet,
      asset,
      url: `/api/outlets/${params.id}/branding/${asset}?v=${now.getTime()}`,
    });
  } catch (error: unknown) {
    console.error('Update outlet branding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]);
    await connectDB();

    const { outlet, error } = await getWritableOutlet(params.id, user);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const asset = body?.asset;

    if (!isBrandingAssetKey(asset)) {
      return NextResponse.json({ error: 'Invalid branding asset' }, { status: 400 });
    }

    outlet!.set(`branding.${asset}`, undefined);
    outlet!.set(`branding.${getLegacyUrlKey(asset)}`, '');
    await outlet!.save();

    const safeOutlet = await Outlet.findById(params.id);

    return NextResponse.json({ outlet: safeOutlet, asset });
  } catch (error: unknown) {
    console.error('Clear outlet branding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
