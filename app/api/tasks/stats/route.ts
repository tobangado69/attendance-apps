import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiResponse, formatErrorResponse } from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'
import { TaskStatus } from '@/lib/constants/status'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build where clause based on user role
    const where: Record<string, unknown> = {}
    
    // If employee, only show assigned tasks or tasks they created
    if (session.user.role === 'EMPLOYEE') {
      where.OR = [
        { assigneeId: session.user.id },
        { creatorId: session.user.id }
      ]
    }

    // Build cache key based on user role
    const cacheKey = `tasks_stats_${session.user.id}_${session.user.role}`
    
    // Use cached function for task statistics
    const getCachedTaskStats = unstable_cache(
      async () => {
        // Optimize: Use single query with groupBy instead of 4 separate count queries
        const [totalTasks, statusGroups] = await Promise.all([
          prisma.task.count({ where }),
          prisma.task.groupBy({
            by: ['status'],
            where,
            _count: {
              id: true
            }
          })
        ])

        // Extract counts from grouped results
        const pendingTasks = statusGroups.find(s => s.status === TaskStatus.PENDING)?._count.id || 0
        const inProgressTasks = statusGroups.find(s => s.status === TaskStatus.IN_PROGRESS)?._count.id || 0
        const completedTasks = statusGroups.find(s => s.status === TaskStatus.COMPLETED)?._count.id || 0

        return {
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks
        }
      },
      [cacheKey],
      {
        revalidate: CACHE_REVALIDATE.SHORT, // 1 minute - stats change frequently
        tags: [CACHE_TAGS.TASKS]
      }
    )

    const stats = await getCachedTaskStats()

    return formatApiResponse(stats)
  } catch (error) {
    logError(error, { context: 'GET /api/tasks/stats' })
    return NextResponse.json(
      { error: 'Failed to fetch task statistics' },
      { status: 500 }
    )
  }
}
