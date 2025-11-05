import { v2 as cloudinary } from 'cloudinary';
import { logError } from '@/lib/utils/logger'

// Configure Cloudinary using CLOUDINARY_URL
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
} else {
  // Fallback configuration using individual environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export { cloudinary };

// Types for Cloudinary upload result
interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

// Helper function to upload image
export const uploadImageToCloudinary = async (file: File, folder: string = 'employee-dashboard'): Promise<CloudinaryUploadResult> => {
  try {
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      ).end(buffer);
    });

    return result;
  } catch (error) {
    logError(error, { context: 'uploadImageToCloudinary', folder });
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Helper function to delete image
export const deleteImageFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logError(error, { context: 'deleteImageFromCloudinary', publicId });
    throw new Error('Failed to delete image from Cloudinary');
  }
};
