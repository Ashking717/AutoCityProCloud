// app/api/upload/route.ts WITH CLOUDINARY
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { uploadVoiceToCloudinary, uploadImageToCloudinary } from '@/lib/storage/cloudinary';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = verifyToken(token);
    
    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (type === 'voice' && !file.type.includes('audio') && !file.type.includes('webm')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio files are allowed.' },
        { status: 400 }
      );
    }

    if (type === 'image' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only image files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for voice, 5MB for images)
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${type === 'image' ? '5MB' : '10MB'}.` },
        { status: 400 }
      );
    }

    console.log('📤 Uploading file:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
      user: currentUser.userId,
    });

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || (type === 'image' ? 'jpg' : 'webm');
    const filename = `${type}-${currentUser.userId}-${timestamp}.${extension}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    let url: string;
    if (type === 'image') {
      url = await uploadImageToCloudinary(buffer, filename);
    } else {
      url = await uploadVoiceToCloudinary(buffer, filename);
    }

    console.log('✅ Upload successful:', {
      url,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });

    return NextResponse.json({
      url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 });
  }
}

// GET route to check upload service status (optional)
export async function GET() {
  try {
    const cloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    return NextResponse.json({
      service: 'cloudinary',
      configured: cloudinaryConfigured,
      maxSizeVoice: '10MB',
      maxSizeImage: '5MB',
      allowedTypesVoice: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg'],
      allowedTypesImage: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}