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
  isSameDay,
  isSameWeek,
  isSameMonth
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

// Helper function to calculate completion rate
function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

// Helper function to group tasks by period
function groupTasksByPeriod(
  tasks: Array<{ createdAt: Date; status: string; updatedAt: Date }>,
  period: string,
  dateRange: { start: Date; end: Date }
): Array<{ date: string; created: number; completed: number; inProgress: number }> {
  const grouped: Map<string, { created: number; completed: number; inProgress: number }> = new Map()

  tasks.forEach(task => {
    let key: string
    let date: Date

    if (period === 'week') {
      // Daily grouping for week
      date = task.createdAt
      key = format(date, 'yyyy-MM-dd')
    } else if (period === 'year') {
      // Monthly grouping for year
      date = task.createdAt
      key = format(date, 'yyyy-MM')
    } else {
      // Weekly grouping for month
      date = task.createdAt
      key = format(date, 'yyyy-MM-dd') // Use week start date
    }

    if (!grouped.has(key)) {
      grouped.set(key, { created: 0, completed: 0, inProgress: 0 })
    }

    const group = grouped.get(key)!
    group.created++

    if (task.status === 'COMPLETED') {
      group.completed++
    } else if (task.status === 'IN_PROGRESS') {
      group.inProgress++
    }
  })

  // Sort by date and return array
  return Array.from(grouped.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))
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
            name: true,
            email: true
          }
        },
        employee: {
          include: {
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Calculate summary statistics
    const summary = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
      inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      pendingTasks: tasks.filter(t => t.status === 'PENDING').length,
      cancelledTasks: tasks.filter(t => t.status === 'CANCELLED').length,
      completionRate: 0
    }
    summary.completionRate = calculateCompletionRate(summary.completedTasks, summary.totalTasks)

    // Calculate trends
    const trends = groupTasksByPeriod(tasks, period, dateRange)

    // Calculate status distribution
    const statusDistribution = {
      PENDING: tasks.filter(t => t.status === 'PENDING').length,
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
      CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length
    }

    // Calculate priority distribution
    const priorityDistribution = {
      LOW: tasks.filter(t => t.priority === 'LOW').length,
      MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
      HIGH: tasks.filter(t => t.priority === 'HIGH').length,
      URGENT: tasks.filter(t => t.priority === 'URGENT').length
    }

    // Calculate by assignee
    const assigneeMap = new Map<string, {
      assigneeId: string
      assigneeName: string
      assigneeEmail: string
      totalTasks: number
      completedTasks: number
      inProgressTasks: number
    }>()

    tasks.forEach(task => {
      if (!task.assigneeId || !task.assignee) return

      if (!assigneeMap.has(task.assigneeId)) {
        assigneeMap.set(task.assigneeId, {
          assigneeId: task.assigneeId,
          assigneeName: task.assignee.name,
          assigneeEmail: task.assignee.email,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0
        })
      }

      const assigneeData = assigneeMap.get(task.assigneeId)!
      assigneeData.totalTasks++
      if (task.status === 'COMPLETED') {
        assigneeData.completedTasks++
      } else if (task.status === 'IN_PROGRESS') {
        assigneeData.inProgressTasks++
      }
    })

    const byAssignee = Array.from(assigneeMap.values()).map(assignee => ({
      assigneeId: assignee.assigneeId,
      assigneeName: assignee.assigneeName,
      assigneeEmail: assignee.assigneeEmail,
      totalTasks: assignee.totalTasks,
      completedTasks: assignee.completedTasks,
      inProgressTasks: assignee.inProgressTasks,
      completionRate: calculateCompletionRate(assignee.completedTasks, assignee.totalTasks)
    })).sort((a, b) => b.totalTasks - a.totalTasks)

    // Calculate by department
    const departmentMap = new Map<string, {
      department: string
      totalTasks: number
      completedTasks: number
      completedTaskDates: Date[]
    }>()

    tasks.forEach(task => {
      const department = task.employee?.department?.name || 'Unassigned'
      
      if (!departmentMap.has(department)) {
        departmentMap.set(department, {
          department,
          totalTasks: 0,
          completedTasks: 0,
          completedTaskDates: []
        })
      }

      const deptData = departmentMap.get(department)!
      deptData.totalTasks++
      
      if (task.status === 'COMPLETED' && task.updatedAt) {
        deptData.completedTasks++
        deptData.completedTaskDates.push(task.updatedAt)
      }
    })

    const byDepartment = Array.from(departmentMap.values()).map(dept => {
      // Calculate average completion time (in days)
      let avgCompletionTime = 0
      if (dept.completedTaskDates.length > 0) {
        // For completed tasks, we need to get the actual completion time
        // This is simplified - ideally we'd track when status changed to COMPLETED
        // For now, we'll use updatedAt - createdAt as a proxy
        const completedTasksWithDates = tasks.filter(t => 
          t.status === 'COMPLETED' && 
          t.employee?.department?.name === dept.department &&
          t.updatedAt
        )
        
        if (completedTasksWithDates.length > 0) {
          const totalDays = completedTasksWithDates.reduce((sum, task) => {
            const days = (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            return sum + days
          }, 0)
          avgCompletionTime = Math.round((totalDays / completedTasksWithDates.length) * 10) / 10
        }
      }

      return {
        department: dept.department,
        totalTasks: dept.totalTasks,
        completedTasks: dept.completedTasks,
        completionRate: calculateCompletionRate(dept.completedTasks, dept.totalTasks),
        avgCompletionTime
      }
    }).sort((a, b) => b.totalTasks - a.totalTasks)

    return NextResponse.json({
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      summary,
      trends,
      statusDistribution,
      priorityDistribution,
      byAssignee,
      byDepartment
    })

  } catch (error) {
    console.error('Error fetching task analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task analytics' },
      { status: 500 }
    )
  }
}

