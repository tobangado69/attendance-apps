import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  buildApiContext,
  formatApiResponse,
  formatErrorResponse
} from '@/lib/api/api-utils'

export async function PUT(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext
    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return formatErrorResponse('Current password and new password are required', 400)
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return formatErrorResponse('New password must be at least 8 characters long', 400)
    }

    // Get user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        password: true
      }
    })

    if (!userWithPassword) {
      return formatErrorResponse('User not found', 404)
    }

    // Verify current password
    if (userWithPassword.password) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password)
      if (!isCurrentPasswordValid) {
        return formatErrorResponse('Current password is incorrect', 400)
      }

      // Check if new password is the same as current password
      const isSamePassword = await bcrypt.compare(newPassword, userWithPassword.password)
      if (isSamePassword) {
        return formatErrorResponse('New password must be different from current password', 400)
      }
    } else {
      // If user doesn't have a password (e.g., OAuth user), they can't change password
      return formatErrorResponse('Password change not available for this account type', 400)
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword
      }
    })

    return formatApiResponse({ success: true }, undefined, 'Password changed successfully')
  } catch (error) {
    console.error('Error changing password:', error)
    return formatErrorResponse('Failed to change password', 500)
  }
}
