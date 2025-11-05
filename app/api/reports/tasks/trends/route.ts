import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfYear, 
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isWithinInterval
} from 'date-fns'

// Helper function to calculate date range
function calculateDateRange(
  period: string,
  startDate?: string,
  endDate?: string
): { start: Date; end: Date } {
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate)
    }
  }

  const now = new Date()
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 })
      }
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now)
      }
    default: // month
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only Admin and Manager can access task analytics
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied: Only Admin and Manager can view task analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const granularityParam = searchParams.get('granularity')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range
    const dateRange = calculateDateRange(period, startDate || undefined, endDate || undefined)

    // Determine granularity
    let granularity: 'daily' | 'weekly' | 'monthly'
    if (granularityParam && ['daily', 'weekly', 'monthly'].includes(granularityParam)) {
      granularity = granularityParam as 'daily' | 'weekly' | 'monthly'
    } else {
      // Default granularity based on period
      if (period === 'week') granularity = 'daily'
      else if (period === 'month') granularity = 'weekly'
      else granularity = 'monthly'
    }

    // Get all tasks (we need full history for trends)
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          lte: dateRange.end
        }
      },
      include: {
        employee: {
          include: {
            department: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Filter tasks that fall within our date range
    const tasksInRange = tasks.filter(task => 
      isWithinInterval(task.createdAt, { start: dateRange.start, end: dateRange.end })
    )

    // Generate time buckets based on granularity
    let timeBuckets: Date[]
    if (granularity === 'daily') {
      timeBuckets = eachDayOfInterval(dateRange)
    } else if (granularity === 'weekly') {
      timeBuckets = eachWeekOfInterval(dateRange, { weekStartsOn: 1 })
    } else {
      timeBuckets = eachMonthOfInterval(dateRange)
    }

    // Initialize trend data
    const creationTrends = timeBuckets.map(bucket => ({
      period: format(bucket, granularity === 'daily' ? 'yyyy-MM-dd' : granularity === 'weekly' ? 'yyyy-MM-dd' : 'yyyy-MM'),
      date: bucket.toISOString(),
      created: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      cancelled: 0
    }))

    // Group tasks by time bucket
    tasksInRange.forEach(task => {
      let bucketIndex = -1
      
      if (granularity === 'daily') {
        bucketIndex = timeBuckets.findIndex(bucket => 
          format(bucket, 'yyyy-MM-dd') === format(task.createdAt, 'yyyy-MM-dd')
        )
      } else if (granularity === 'weekly') {
        bucketIndex = timeBuckets.findIndex(bucket => 
          isWithinInterval(task.createdAt, {
            start: bucket,
            end: new Date(bucket.getTime() + 7 * 24 * 60 * 60 * 1000)
          })
        )
      } else {
        bucketIndex = timeBuckets.findIndex(bucket => 
          format(bucket, 'yyyy-MM') === format(task.createdAt, 'yyyy-MM')
        )
      }

      if (bucketIndex >= 0) {
        creationTrends[bucketIndex].created++
        
        // For status trends, we need to check the current status
        // For completed, check if it was completed in this period
        if (task.status === 'COMPLETED' && task.updatedAt) {
          const completedInRange = isWithinInterval(task.updatedAt, { start: dateRange.start, end: dateRange.end })
          if (completedInRange) {
            let completedBucketIndex = -1
            if (granularity === 'daily') {
              completedBucketIndex = timeBuckets.findIndex(bucket => 
                format(bucket, 'yyyy-MM-dd') === format(task.updatedAt, 'yyyy-MM-dd')
              )
            } else if (granularity === 'weekly') {
              completedBucketIndex = timeBuckets.findIndex(bucket => 
                isWithinInterval(task.updatedAt, {
                  start: bucket,
                  end: new Date(bucket.getTime() + 7 * 24 * 60 * 60 * 1000)
                })
              )
            } else {
              completedBucketIndex = timeBuckets.findIndex(bucket => 
                format(bucket, 'yyyy-MM') === format(task.updatedAt, 'yyyy-MM')
              )
            }
            if (completedBucketIndex >= 0) {
              creationTrends[completedBucketIndex].completed++
            }
          }
        }
        
        // For current status in the bucket
        if (task.status === 'IN_PROGRESS') {
          creationTrends[bucketIndex].inProgress++
        } else if (task.status === 'PENDING') {
          creationTrends[bucketIndex].pending++
        } else if (task.status === 'CANCELLED') {
          creationTrends[bucketIndex].cancelled++
        }
      }
    })

    // Calculate priority distribution trends
    const priorityTrends = timeBuckets.map(bucket => ({
      period: format(bucket, granularity === 'daily' ? 'yyyy-MM-dd' : granularity === 'weekly' ? 'yyyy-MM-dd' : 'yyyy-MM'),
      date: bucket.toISOString(),
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0
    }))

    tasksInRange.forEach(task => {
      let bucketIndex = -1
      
      if (granularity === 'daily') {
        bucketIndex = timeBuckets.findIndex(bucket => 
          format(bucket, 'yyyy-MM-dd') === format(task.createdAt, 'yyyy-MM-dd')
        )
      } else if (granularity === 'weekly') {
        bucketIndex = timeBuckets.findIndex(bucket => 
          isWithinInterval(task.createdAt, {
            start: bucket,
            end: new Date(bucket.getTime() + 7 * 24 * 60 * 60 * 1000)
          })
        )
      } else {
        bucketIndex = timeBuckets.findIndex(bucket => 
          format(bucket, 'yyyy-MM') === format(task.createdAt, 'yyyy-MM')
        )
      }

      if (bucketIndex >= 0) {
        priorityTrends[bucketIndex][task.priority as keyof typeof priorityTrends[0]]++
      }
    })

    // Calculate department trends (simplified - departments of tasks created)
    const departmentMap = new Map<string, Map<string, number>>()
    
    tasksInRange.forEach(task => {
      const department = task.employee?.department?.name || 'Unassigned'
      const periodKey = format(
        task.createdAt, 
        granularity === 'daily' ? 'yyyy-MM-dd' : granularity === 'weekly' ? 'yyyy-MM-dd' : 'yyyy-MM'
      )
      
      if (!departmentMap.has(department)) {
        departmentMap.set(department, new Map())
      }
      
      const deptPeriods = departmentMap.get(department)!
      deptPeriods.set(periodKey, (deptPeriods.get(periodKey) || 0) + 1)
    })

    const departmentTrends = Array.from(departmentMap.entries()).map(([department, periods]) => {
      const trendData = timeBuckets.map(bucket => {
        const periodKey = format(bucket, granularity === 'daily' ? 'yyyy-MM-dd' : granularity === 'weekly' ? 'yyyy-MM-dd' : 'yyyy-MM')
        return {
          period: periodKey,
          date: bucket.toISOString(),
          count: periods.get(periodKey) || 0
        }
      })
      
      return {
        department,
        trends: trendData
      }
    })

    return NextResponse.json({
      period,
      granularity,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      creationTrends,
      priorityTrends,
      departmentTrends
    })

  } catch (error) {
    console.error('Error fetching task trends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task trends' },
      { status: 500 }
    )
  }
}

