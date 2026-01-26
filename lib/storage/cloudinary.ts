// lib/storage/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload voice message to Cloudinary
 * @param fileBuffer - Audio file buffer
 * @param filename - Unique filename
 * @returns Cloudinary secure URL
 */
export async function uploadVoiceToCloudinary(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Audio files use 'video' resource type in Cloudinary
        folder: 'voice-messages', // Organize in folder
        public_id: filename.replace(/\.(webm|wav|mp3|mpeg)$/, ''), // Remove extension
        format: 'webm', // Keep original format
        // Optional: Add transformations
        // quality: 'auto',
        // fetch_format: 'auto',
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

    // Write buffer to upload stream
    uploadStream.end(fileBuffer);
  });
}

/**
 * Upload image to Cloudinary
 * @param fileBuffer - Image file buffer
 * @param filename - Unique filename
 * @returns Cloudinary secure URL
 */
export async function uploadImageToCloudinary(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'message-images', // Organize in folder
        public_id: filename.replace(/\.(jpg|jpeg|png|gif|webp)$/, ''), // Remove extension
        // Optional: Add transformations
        quality: 'auto',
        fetch_format: 'auto',
        // Resize if too large (optional)
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' }
        ]
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

    // Write buffer to upload stream
    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete voice message from Cloudinary
 * @param url - Cloudinary URL
 */
export async function deleteVoiceFromCloudinary(url: string): Promise<void> {
  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/cloud/video/upload/v123/voice-messages/voice-xxx.webm
    const matches = url.match(/voice-messages\/(.+)\./);
    if (!matches) {
      throw new Error('Invalid Cloudinary URL');
    }

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
 * @param url - Cloudinary URL
 */
export async function deleteImageFromCloudinary(url: string): Promise<void> {
  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/cloud/image/upload/v123/message-images/image-xxx.jpg
    const matches = url.match(/message-images\/(.+)\./);
    if (!matches) {
      throw new Error('Invalid Cloudinary URL');
    }

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
      storageUsedMB: result.storage.usage / 1024 / 1024,
      bandwidthUsedMB: result.bandwidth.usage / 1024 / 1024,
      storageLimit: result.storage.limit / 1024 / 1024,
      bandwidthLimit: result.bandwidth.limit / 1024 / 1024,
    };
  } catch (error) {
    console.error('❌ Failed to get Cloudinary usage:', error);
    throw error;
  }
}