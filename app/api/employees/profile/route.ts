import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  buildApiContext,
  formatApiResponse,
  formatErrorResponse
} from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Get user's employee profile
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            phone: true,
            address: true,
            bio: true,
            createdAt: true
          }
        }
      }
    })

    if (!employee) {
      return formatErrorResponse('Employee profile not found', 404)
    }

    return formatApiResponse(employee)
  } catch (error) {
    logError('Error fetching employee profile', error)
    return formatErrorResponse('Failed to fetch profile', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext
    const body = await request.json()
    const { name, email, phone, address, bio } = body

    // Validate required fields
    if (!name || !email) {
      return formatErrorResponse('Name and email are required', 400)
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: user.id }
      }
    })

    if (existingUser) {
      return formatErrorResponse('Email is already taken by another user', 400)
    }

    // Update user information
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        phone: phone || null,
        address: address || null,
        bio: bio || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        phone: true,
        address: true,
        bio: true,
        createdAt: true
      }
    })

    // Get updated employee profile
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            phone: true,
            address: true,
            bio: true,
            createdAt: true
          }
        }
      }
    })

    return formatApiResponse(employee, undefined, 'Profile updated successfully')
  } catch (error) {
    logError('Error updating employee profile', error)
    return formatErrorResponse('Failed to update profile', 500)
  }
}
