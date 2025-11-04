import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse
} from '@/lib/api/api-utils'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Get employee data for the current user
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
    console.error('Employee me fetch error:', error)
    return formatErrorResponse('Failed to fetch employee data', 500)
  }
}