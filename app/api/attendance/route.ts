import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  buildTextSearchWhere, 
  buildDateRangeWhere,
  formatApiResponse, 
  formatErrorResponse,
  validateRole
} from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user, pagination, search } = apiContext
    const { searchParams } = new URL(request.url)
    
    // Parse additional filters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause using utilities
    const where: Record<string, unknown> = {
      ...buildTextSearchWhere(search.search || '', [
        'user.name',
        'user.email'
      ]),
      ...buildDateRangeWhere(startDate || undefined, endDate || undefined, 'date')
    }
    
    // If not admin, only show own records
    if (user.role !== 'ADMIN') {
      where.userId = user.id
    } else if (userId) {
      where.userId = userId
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Department filter
    if (department) {
      where.employee = {
        departmentId: department
      }
    }

    // Search filter is already handled by buildTextSearchWhere utility

    // Build orderBy clause
    let orderBy: Record<string, unknown> = {}
    switch (sortBy) {
      case 'employee':
        orderBy = {
          user: {
            name: sortOrder
          }
        }
        break
      case 'date':
        orderBy = { date: sortOrder }
        break
      case 'checkIn':
        orderBy = { checkIn: sortOrder }
        break
      case 'checkOut':
        orderBy = { checkOut: sortOrder }
        break
      case 'totalHours':
        orderBy = { totalHours: sortOrder }
        break
      case 'status':
        orderBy = { status: sortOrder }
        break
      case 'department':
        orderBy = {
          employee: {
            department: {
              name: sortOrder
            }
          }
        }
        break
      default:
        orderBy = { date: 'desc' }
    }

    // Note: Caching removed for attendance list due to complex dynamic filtering
    // Similar to employees list - caching is not practical with role-based access and dynamic filters
    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              position: true,
              department: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy,
        skip: pagination.skip,
        take: pagination.limit
      }),
      prisma.attendance.count({ where })
    ])

    // Get unique departments for filter dropdown
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return formatApiResponse({
      attendance,
      departments: departments.map(d => d.name)
    }, {
      total,
      page: pagination.page,
      limit: pagination.limit
    })
  } catch (error) {
    logError(error, { context: 'GET /api/attendance' })
    return formatErrorResponse('Failed to fetch attendance records', 500)
  }
}
