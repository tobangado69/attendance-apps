import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiResponse, formatErrorResponse } from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

/**
 * Cached function to fetch employee statistics
 * Statistics don't change frequently, so we can cache for longer
 */
const getCachedEmployeeStats = unstable_cache(
  async () => {
    // Get total active employees
    const totalEmployees = await prisma.employee.count({
      where: { isActive: true }
    })

    // Get unique departments count
    const departments = await prisma.department.findMany({
      select: { id: true, name: true }
    })
    const totalDepartments = departments.length

    // Get department names
    const departmentNames = departments
      .map(d => d.name)
      .join(', ')

    // Get new employees this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newThisMonth = await prisma.employee.count({
      where: {
        isActive: true,
        createdAt: {
          gte: startOfMonth
        }
      }
    })

    return {
      totalEmployees,
      totalDepartments,
      departmentNames,
      newThisMonth
    }
  },
  ['employee-stats'],
  {
    revalidate: CACHE_REVALIDATE.MEDIUM, // 5 minutes - stats change less frequently
    tags: [CACHE_TAGS.EMPLOYEES]
  }
)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await getCachedEmployeeStats()

    return formatApiResponse(stats)
  } catch (error) {
    logError(error, { context: 'GET /api/employees/stats' })
    return formatErrorResponse('Failed to fetch employee statistics', 500)
  }
}
