import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteImageFromCloudinary } from '@/lib/cloudinary'
import {
  buildApiContext,
  formatApiResponse,
  formatErrorResponse
} from '@/lib/api/api-utils'

export async function DELETE(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Get current user image
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!currentUser?.image) {
      return formatErrorResponse('No profile image to delete', 400)
    }

    // Extract public ID from Cloudinary URL
    const cloudinaryUrl = currentUser.image
    const publicIdMatch = cloudinaryUrl.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/i)
    
    if (publicIdMatch) {
      const publicId = publicIdMatch[1]
      try {
        await deleteImageFromCloudinary(publicId)
      } catch (error) {
        console.warn('Failed to delete from Cloudinary:', error)
        // Continue with database update even if Cloudinary deletion fails
      }
    }

    // Update user profile to remove image
    await prisma.user.update({
      where: { id: user.id },
      data: {
        image: null
      }
    })

    return formatApiResponse({ success: true }, undefined, 'Profile image deleted successfully')
  } catch (error) {
    console.error('Error deleting profile image:', error)
    return formatErrorResponse('Failed to delete profile image', 500)
  }
}
