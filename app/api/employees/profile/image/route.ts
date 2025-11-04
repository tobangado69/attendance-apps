import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import {
  buildApiContext,
  formatApiResponse,
  formatErrorResponse
} from '@/lib/api/api-utils'

export async function POST(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return formatErrorResponse('No image provided', 400)
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return formatErrorResponse('File must be an image', 400)
    }

    // Validate file size (max 10MB for Cloudinary)
    if (image.size > 10 * 1024 * 1024) {
      return formatErrorResponse('Image size must be less than 10MB', 400)
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_URL || process.env.CLOUDINARY_URL.includes('YOUR_ACTUAL')) {
      return formatErrorResponse('Cloudinary is not configured. Please set CLOUDINARY_URL in environment variables with your actual API credentials.', 500)
    }

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadImageToCloudinary(image, 'employee-dashboard/profiles')
      
      if (!uploadResult || !uploadResult.secure_url) {
        return formatErrorResponse('Failed to upload image to Cloudinary', 500)
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      return formatErrorResponse(`Cloudinary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
    }

    // Update user profile with new Cloudinary URL
    await prisma.user.update({
      where: { id: user.id },
      data: {
        image: uploadResult.secure_url
      } as { image: string }
    })

    return formatApiResponse({ 
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id 
    }, undefined, 'Profile image updated successfully')
  } catch (error) {
    console.error('Error uploading profile image:', error)
    return formatErrorResponse('Failed to upload profile image', 500)
  }
}
