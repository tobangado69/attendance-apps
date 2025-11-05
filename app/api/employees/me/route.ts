import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Get employee data for the current user
    // Note: If you get errors about phone/address/bio fields, run: npx prisma generate
    const employee = await prisma.employee.findUnique({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        employeeId: true,
        position: true,
        salary: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            address: true,
            bio: true,
            role: true,
            createdAt: true
          }
        }
      }
    })

    if (!employee) {
      return formatErrorResponse('Employee record not found', 404)
    }

    return formatApiResponse(employee)
  } catch (error) {
    // Enhanced error logging for Prisma client issues
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isPrismaClientError = errorMessage.includes('Unknown arg') || 
                                 errorMessage.includes('Unknown field') ||
                                 errorMessage.includes('phone') ||
                                 errorMessage.includes('address') ||
                                 errorMessage.includes('bio')
    
    if (isPrismaClientError) {
      logError(error, {
        context: 'Employee me fetch error - Prisma client issue',
        message: 'Prisma client may need regeneration. Run: npx prisma generate',
        suggestion: 'Stop the dev server and run: npx prisma generate'
      })
    } else {
      logError(error, { context: 'Employee me fetch error' })
    }
    
    return formatErrorResponse('Failed to fetch employee data', 500)
  }
}