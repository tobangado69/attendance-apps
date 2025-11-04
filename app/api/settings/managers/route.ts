import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse,
  withAdminGuard 
} from '@/lib/api/api-utils'
import { Role } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Only admin can access manager list
    if (user.role !== 'ADMIN') {
      return formatErrorResponse('Access denied. Admin role required.', 403)
    }

    // Fetch all users who can be managers (ADMIN and MANAGER roles)
    const managers = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.MANAGER]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employee: {
          select: {
            employeeId: true,
            position: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return formatApiResponse(managers)
  } catch (error) {
    console.error('Error fetching managers:', error)
    return formatErrorResponse('Failed to fetch managers', 500)
  }
}
