import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Outlet from '@/lib/models/Outlet';
import { requireOutletAccess } from '@/lib/auth/session';

type BrandingAssetKey = 'logo' | 'seal';

function isBrandingAssetKey(value: string): value is BrandingAssetKey {
  return value === 'logo' || value === 'seal';
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; asset: string } }
) {
  try {
    if (!isBrandingAssetKey(params.asset)) {
      return NextResponse.json({ error: 'Invalid branding asset' }, { status: 400 });
    }

    await requireOutletAccess(params.id);
    await connectDB();

    const outlet = await Outlet.findById(params.id).select(
      '+branding.logo.data +branding.seal.data'
    );

    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const asset = outlet.branding?.[params.asset];

    if (!asset?.data || !asset.contentType) {
      return NextResponse.json({ error: 'Branding asset not found' }, { status: 404 });
    }

    const imageBytes = new Uint8Array(asset.data);

    return new Response(imageBytes, {
      headers: {
        'Content-Type': asset.contentType,
        'Content-Length': String(asset.size || asset.data.length),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
