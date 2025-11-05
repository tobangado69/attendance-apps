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
  startOfDay,
  endOfDay,
  isSameDay,
  isSameWeek,
  isSameMonth
} from 'date-fns'

// Reuse calculation functions
function calculateAttendanceRate(presentDays: number, totalDays: number): number {
  if (totalDays === 0) return 0
  return Math.round((presentDays / totalDays) * 100)
}

function calculateTaskCompletionRate(completed: number, assigned: number): number {
  if (assigned === 0) return 0
  return Math.round((completed / assigned) * 100)
}

function calculateProductivityScore(attendanceRate: number, taskCompletionRate: number): number {
  return Math.round((attendanceRate * 0.4) + (taskCompletionRate * 0.6))
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

    // Only Admin and Manager can access performance reports
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied: Only Admin and Manager can view performance reports' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const granularityParam = searchParams.get('granularity')
    const departmentFilter = searchParams.get('department')

    // Calculate date range
    const now = new Date()
    let dateRange: { start: Date; end: Date }

    switch (period) {
      case 'week':
        dateRange = {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        }
        break
      case 'year':
        dateRange = {
          start: startOfYear(now),
          end: endOfYear(now)
        }
        break
      default: // month
        dateRange = {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
    }

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

    // Get all active employees (with department filter if provided)
    const employeesWhere: {
      isActive: boolean
      department?: {
        name: string
      }
    } = { isActive: true }
    if (departmentFilter) {
      employeesWhere.department = {
        name: departmentFilter
      }
    }

    const employees = await prisma.employee.findMany({
      where: employeesWhere,
      select: {
        id: true,
        employeeId: true,
        userId: true,
        department: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Get attendance records for the date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        userId: {
          in: employees.map(emp => emp.userId)
        }
      },
      select: {
        userId: true,
        checkIn: true,
        totalHours: true,
        date: true
      }
    })

    // Get tasks for the date range
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        assigneeId: {
          in: employees.map(emp => emp.userId)
        }
      },
      select: {
        assigneeId: true,
        status: true,
        createdAt: true
      }
    })

    // Calculate trends based on granularity
    const trends: Array<{
      date: string
      avgProductivityScore: number
      avgEfficiencyRate: number
      avgAttendanceRate: number
      avgTaskCompletionRate: number
      totalEmployees: number
      topPerformer: {
        employeeId: string
        name: string
        productivityScore: number
      } | null
    }> = []

    if (granularity === 'daily') {
      const days = eachDayOfInterval(dateRange)
      days.forEach(day => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        
        const dayAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= dayStart && attDate <= dayEnd
        })

        const dayTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= dayStart && taskDate <= dayEnd
        })

        // Calculate metrics for each employee for this day
        const employeeMetrics = employees.map(emp => {
          const empAttendance = dayAttendance.filter(att => att.userId === emp.userId)
          const present = empAttendance.filter(att => att.checkIn !== null).length
          const attRate = present > 0 ? 100 : 0

          const empTasks = dayTasks.filter(task => task.assigneeId === emp.userId)
          const taskRate = empTasks.length > 0
            ? calculateTaskCompletionRate(
                empTasks.filter(t => t.status === 'COMPLETED').length,
                empTasks.length
              )
            : 0

          const prodScore = calculateProductivityScore(attRate, taskRate)

          return {
            employeeId: emp.employeeId,
            name: emp.user.name,
            productivityScore: prodScore,
            attendanceRate: attRate,
            taskCompletionRate: taskRate
          }
        })

        const avgProdScore = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.productivityScore, 0) / employeeMetrics.length)
          : 0
        const avgAttRate = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / employeeMetrics.length)
          : 0
        const avgTaskRate = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.taskCompletionRate, 0) / employeeMetrics.length)
          : 0

        const topPerformer = employeeMetrics.length > 0
          ? employeeMetrics.reduce((top, emp) => 
              emp.productivityScore > top.productivityScore ? emp : top
            )
          : null

        trends.push({
          date: format(day, 'yyyy-MM-dd'),
          avgProductivityScore: avgProdScore,
          avgEfficiencyRate: 0, // Simplified
          avgAttendanceRate: avgAttRate,
          avgTaskCompletionRate: avgTaskRate,
          totalEmployees: employees.length,
          topPerformer: topPerformer ? {
            employeeId: topPerformer.employeeId,
            name: topPerformer.name,
            productivityScore: topPerformer.productivityScore
          } : null
        })
      })
    } else if (granularity === 'weekly') {
      const weeks = eachWeekOfInterval(dateRange, { weekStartsOn: 1 })
      weeks.forEach((weekStart, index) => {
        const weekEnd = index < weeks.length - 1 ? weeks[index + 1] : dateRange.end
        
        const weekAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= weekStart && attDate < weekEnd
        })

        const weekTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= weekStart && taskDate < weekEnd
        })

        const weekDays = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))

        const employeeMetrics = employees.map(emp => {
          const empAttendance = weekAttendance.filter(att => att.userId === emp.userId)
          const present = empAttendance.filter(att => att.checkIn !== null).length
          const attRate = calculateAttendanceRate(present, weekDays)

          const empTasks = weekTasks.filter(task => task.assigneeId === emp.userId)
          const taskRate = calculateTaskCompletionRate(
            empTasks.filter(t => t.status === 'COMPLETED').length,
            empTasks.length
          )

          const prodScore = calculateProductivityScore(attRate, taskRate)

          return {
            employeeId: emp.employeeId,
            name: emp.user.name,
            productivityScore: prodScore,
            attendanceRate: attRate,
            taskCompletionRate: taskRate
          }
        })

        const avgProdScore = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.productivityScore, 0) / employeeMetrics.length)
          : 0
        const avgAttRate = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / employeeMetrics.length)
          : 0
        const avgTaskRate = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.taskCompletionRate, 0) / employeeMetrics.length)
          : 0

        const topPerformer = employeeMetrics.length > 0
          ? employeeMetrics.reduce((top, emp) => 
              emp.productivityScore > top.productivityScore ? emp : top
            )
          : null

        trends.push({
          date: `Week ${index + 1} (${format(weekStart, 'MMM dd')})`,
          avgProductivityScore: avgProdScore,
          avgEfficiencyRate: 0,
          avgAttendanceRate: avgAttRate,
          avgTaskCompletionRate: avgTaskRate,
          totalEmployees: employees.length,
          topPerformer: topPerformer ? {
            employeeId: topPerformer.employeeId,
            name: topPerformer.name,
            productivityScore: topPerformer.productivityScore
          } : null
        })
      })
    } else if (granularity === 'monthly') {
      const months = eachMonthOfInterval(dateRange)
      months.forEach((monthStart, index) => {
        const monthEnd = index < months.length - 1 ? months[index + 1] : dateRange.end
        
        const monthAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= monthStart && attDate < monthEnd
        })

        const monthTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= monthStart && taskDate < monthEnd
        })

        const monthDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))

        const employeeMetrics = employees.map(emp => {
          const empAttendance = monthAttendance.filter(att => att.userId === emp.userId)
          const present = empAttendance.filter(att => att.checkIn !== null).length
          const attRate = calculateAttendanceRate(present, monthDays)

          const empTasks = monthTasks.filter(task => task.assigneeId === emp.userId)
          const taskRate = calculateTaskCompletionRate(
            empTasks.filter(t => t.status === 'COMPLETED').length,
            empTasks.length
          )

          const prodScore = calculateProductivityScore(attRate, taskRate)

          return {
            employeeId: emp.employeeId,
            name: emp.user.name,
            productivityScore: prodScore,
            attendanceRate: attRate,
            taskCompletionRate: taskRate
          }
        })

        const avgProdScore = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.productivityScore, 0) / employeeMetrics.length)
          : 0
        const avgAttRate = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / employeeMetrics.length)
          : 0
        const avgTaskRate = employeeMetrics.length > 0
          ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.taskCompletionRate, 0) / employeeMetrics.length)
          : 0

        const topPerformer = employeeMetrics.length > 0
          ? employeeMetrics.reduce((top, emp) => 
              emp.productivityScore > top.productivityScore ? emp : top
            )
          : null

        trends.push({
          date: format(monthStart, 'MMMM yyyy'),
          avgProductivityScore: avgProdScore,
          avgEfficiencyRate: 0,
          avgAttendanceRate: avgAttRate,
          avgTaskCompletionRate: avgTaskRate,
          totalEmployees: employees.length,
          topPerformer: topPerformer ? {
            employeeId: topPerformer.employeeId,
            name: topPerformer.name,
            productivityScore: topPerformer.productivityScore
          } : null
        })
      })
    }

    // Calculate improvements and declines
    // Split period into two halves and compare
    const midPoint = new Date(
      dateRange.start.getTime() + (dateRange.end.getTime() - dateRange.start.getTime()) / 2
    )

    const firstHalfEnd = midPoint
    const secondHalfStart = midPoint

    // Calculate performance for first half
    const firstHalfAttendance = attendanceRecords.filter(att => {
      const attDate = new Date(att.date)
      return attDate >= dateRange.start && attDate < firstHalfEnd
    })

    const firstHalfTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt)
      return taskDate >= dateRange.start && taskDate < firstHalfEnd
    })

    const firstHalfDays = Math.ceil((firstHalfEnd.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate performance for second half
    const secondHalfAttendance = attendanceRecords.filter(att => {
      const attDate = new Date(att.date)
      return attDate >= secondHalfStart && attDate <= dateRange.end
    })

    const secondHalfTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt)
      return taskDate >= secondHalfStart && taskDate <= dateRange.end
    })

    const secondHalfDays = Math.ceil((dateRange.end.getTime() - secondHalfStart.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate performance change for each employee
    const employeeChanges = employees.map(emp => {
      // First half
      const firstAtt = firstHalfAttendance.filter(att => att.userId === emp.userId)
      const firstPresent = firstAtt.filter(att => att.checkIn !== null).length
      const firstAttRate = calculateAttendanceRate(firstPresent, firstHalfDays)
      const firstTasks = firstHalfTasks.filter(task => task.assigneeId === emp.userId)
      const firstTaskRate = calculateTaskCompletionRate(
        firstTasks.filter(t => t.status === 'COMPLETED').length,
        firstTasks.length
      )
      const firstProdScore = calculateProductivityScore(firstAttRate, firstTaskRate)

      // Second half
      const secondAtt = secondHalfAttendance.filter(att => att.userId === emp.userId)
      const secondPresent = secondAtt.filter(att => att.checkIn !== null).length
      const secondAttRate = calculateAttendanceRate(secondPresent, secondHalfDays)
      const secondTasks = secondHalfTasks.filter(task => task.assigneeId === emp.userId)
      const secondTaskRate = calculateTaskCompletionRate(
        secondTasks.filter(t => t.status === 'COMPLETED').length,
        secondTasks.length
      )
      const secondProdScore = calculateProductivityScore(secondAttRate, secondTaskRate)

      // Calculate change
      const change = firstProdScore > 0
        ? Math.round(((secondProdScore - firstProdScore) / firstProdScore) * 100)
        : (secondProdScore > 0 ? 100 : 0)

      return {
        employeeId: emp.employeeId,
        name: emp.user.name,
        firstHalfScore: firstProdScore,
        secondHalfScore: secondProdScore,
        productivityChange: change
      }
    })

    // Sort by improvement (descending)
    const mostImproved = employeeChanges
      .filter(emp => emp.productivityChange > 0)
      .sort((a, b) => b.productivityChange - a.productivityChange)
      .slice(0, 5)
      .map(emp => ({
        employeeId: emp.employeeId,
        name: emp.name,
        productivityIncrease: emp.productivityChange,
        period: `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd')}`
      }))

    // Sort by decline (ascending)
    const declining = employeeChanges
      .filter(emp => emp.productivityChange < 0)
      .sort((a, b) => a.productivityChange - b.productivityChange)
      .slice(0, 5)
      .map(emp => ({
        employeeId: emp.employeeId,
        name: emp.name,
        productivityDecrease: Math.abs(emp.productivityChange),
        period: `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd')}`
      }))

    return NextResponse.json({
      period,
      granularity,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      trends,
      improvements: {
        mostImproved,
        declining
      }
    })

  } catch (error) {
    console.error('Error fetching performance trends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance trends' },
      { status: 500 }
    )
  }
}

