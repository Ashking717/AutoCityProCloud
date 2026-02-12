// lib/storage/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload voice message to Cloudinary.
 *
 * Cloudinary transcodes on ingest, so we let it do the heavy lifting:
 *   format: 'mp3'          → store as MP3 (universally playable)
 *   bit_rate: '16k'        → 16 kbps — standard telephone quality for voice
 *   audio_frequency: 8000  → 8 kHz sample rate
 *
 * Result: ~10 KB per 5 s, ~20 KB per 10 s  (vs ~100–260 KB raw Opus)
 * Playback quality is indistinguishable from the raw recording for speech.
 */
export async function uploadVoiceToCloudinary(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',       // Cloudinary uses 'video' for all audio
        folder: 'voice-messages',
        public_id: filename.replace(/\.(webm|wav|mp3|mpeg|ogg)$/, ''),
        format: 'mp3',                // transcode to MP3 on Cloudinary's side
        transformation: [
          {
            audio_codec:      'mp3',
            bit_rate:         '16k',  // 16 kbps — ~10 KB/5 s for voice
            audio_frequency:  8000,   // 8 kHz — telephone quality, fine for speech
          },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          console.log(
            `✅ Uploaded to Cloudinary: ${result.secure_url}`,
            `(${(result.bytes / 1024).toFixed(1)} KB stored)`
          );
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed - no result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Upload image to Cloudinary
 */
export async function uploadImageToCloudinary(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'message-images',
        public_id: filename.replace(/\.(jpg|jpeg|png|gif|webp)$/, ''),
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          console.log('✅ Uploaded to Cloudinary:', result.secure_url);
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed - no result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete voice message from Cloudinary
 */
export async function deleteVoiceFromCloudinary(url: string): Promise<void> {
  try {
    // Handles both .webm and .mp3 URLs
    const matches = url.match(/voice-messages\/(.+?)(?:\.\w+)?$/);
    if (!matches) throw new Error('Invalid Cloudinary voice URL');

    const publicId = `voice-messages/${matches[1]}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    console.log('✅ Deleted from Cloudinary:', publicId);
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImageFromCloudinary(url: string): Promise<void> {
  try {
    const matches = url.match(/message-images\/(.+)\./);
    if (!matches) throw new Error('Invalid Cloudinary image URL');

    const publicId = `message-images/${matches[1]}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    console.log('✅ Deleted from Cloudinary:', publicId);
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Get Cloudinary usage stats (for monitoring)
 */
export async function getCloudinaryUsage() {
  try {
    const result = await cloudinary.api.usage();
    return {
      storageUsedMB:   result.storage.usage   / 1024 / 1024,
      bandwidthUsedMB: result.bandwidth.usage / 1024 / 1024,
      storageLimit:    result.storage.limit   / 1024 / 1024,
      bandwidthLimit:  result.bandwidth.limit / 1024 / 1024,
    };
  } catch (error) {
    console.error('❌ Failed to get Cloudinary usage:', error);
    throw error;
  }
}