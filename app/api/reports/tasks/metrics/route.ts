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
  differenceInDays,
  differenceInHours
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range
    const dateRange = calculateDateRange(period, startDate || undefined, endDate || undefined)

    // Get all tasks in the date range
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const now = new Date()
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.updatedAt)
    const overdueTasks = tasks.filter(t => 
      t.status !== 'COMPLETED' && 
      t.status !== 'CANCELLED' && 
      t.dueDate && 
      t.dueDate < now
    )
    const backlogTasks = tasks.filter(t => 
      t.status === 'PENDING' || t.status === 'IN_PROGRESS'
    )

    // Calculate average completion time (in days)
    let avgCompletionTime = 0
    if (completedTasks.length > 0) {
      const totalDays = completedTasks.reduce((sum, task) => {
        const days = differenceInDays(task.updatedAt!, task.createdAt)
        return sum + days
      }, 0)
      avgCompletionTime = Math.round((totalDays / completedTasks.length) * 10) / 10
    }

    // Calculate average completion time in hours
    let avgCompletionTimeHours = 0
    if (completedTasks.length > 0) {
      const totalHours = completedTasks.reduce((sum, task) => {
        const hours = differenceInHours(task.updatedAt!, task.createdAt)
        return sum + hours
      }, 0)
      avgCompletionTimeHours = Math.round((totalHours / completedTasks.length) * 10) / 10
    }

    // Calculate task velocity (tasks per day)
    const periodDays = differenceInDays(dateRange.end, dateRange.start) + 1
    const velocity = periodDays > 0 
      ? Math.round((completedTasks.length / periodDays) * 10) / 10 
      : 0

    // Calculate backlog size
    const backlogSize = backlogTasks.length

    // Calculate average tasks per assignee
    const assigneeMap = new Map<string, number>()
    tasks.forEach(task => {
      if (task.assigneeId) {
        assigneeMap.set(task.assigneeId, (assigneeMap.get(task.assigneeId) || 0) + 1)
      }
    })
    const avgTasksPerAssignee = assigneeMap.size > 0
      ? Math.round((tasks.length / assigneeMap.size) * 10) / 10
      : 0

    // Calculate overdue percentage
    const overduePercentage = tasks.length > 0
      ? Math.round((overdueTasks.length / tasks.length) * 100)
      : 0

    // Get overdue tasks breakdown by priority
    const overdueByPriority = {
      LOW: overdueTasks.filter(t => t.priority === 'LOW').length,
      MEDIUM: overdueTasks.filter(t => t.priority === 'MEDIUM').length,
      HIGH: overdueTasks.filter(t => t.priority === 'HIGH').length,
      URGENT: overdueTasks.filter(t => t.priority === 'URGENT').length
    }

    // Get backlog breakdown by priority
    const backlogByPriority = {
      LOW: backlogTasks.filter(t => t.priority === 'LOW').length,
      MEDIUM: backlogTasks.filter(t => t.priority === 'MEDIUM').length,
      HIGH: backlogTasks.filter(t => t.priority === 'HIGH').length,
      URGENT: backlogTasks.filter(t => t.priority === 'URGENT').length
    }

    return NextResponse.json({
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      metrics: {
        avgCompletionTime, // in days
        avgCompletionTimeHours, // in hours
        overdueTasks: overdueTasks.length,
        overduePercentage,
        overdueByPriority,
        velocity, // tasks per day
        backlogSize,
        backlogByPriority,
        avgTasksPerAssignee,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length
      }
    })

  } catch (error) {
    console.error('Error fetching task performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task performance metrics' },
      { status: 500 }
    )
  }
}

