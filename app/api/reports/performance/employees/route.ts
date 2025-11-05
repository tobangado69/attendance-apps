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
  endOfDay
} from 'date-fns'

// Reuse calculation functions from main endpoint
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

function calculateEfficiencyRate(totalHours: number, presentDays: number): number {
  if (presentDays === 0) return 0
  const expectedHours = presentDays * 8
  return Math.round((totalHours / expectedHours) * 100)
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
    const employeeId = searchParams.get('employeeId')
    const period = searchParams.get('period') || 'month'

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'employeeId parameter is required' },
        { status: 400 }
      )
    }

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

    const totalDays = eachDayOfInterval(dateRange).length

    // Get employee by employeeId
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: {
        id: true,
        employeeId: true,
        position: true,
        userId: true,
        department: {
          select: {
            id: true,
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

    if (!employee || !employee.user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Employee not found' },
        { status: 404 }
      )
    }

    // Get attendance records for the employee
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: employee.userId,
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        checkIn: true,
        totalHours: true,
        date: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get tasks assigned to employee
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: employee.userId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        status: true,
        createdAt: true,
        dueDate: true
      }
    })

    // Calculate employee performance metrics
    const presentDays = attendanceRecords.filter(att => att.checkIn !== null).length
    const attendanceRate = calculateAttendanceRate(presentDays, totalDays)
    const totalHours = attendanceRecords.reduce((sum, att) => sum + (att.totalHours || 0), 0)
    const avgHoursPerDay = presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0
    const efficiencyRate = calculateEfficiencyRate(totalHours, presentDays)

    const tasksAssigned = tasks.length
    const tasksCompleted = tasks.filter(task => task.status === 'COMPLETED').length
    const tasksOverdue = tasks.filter(task => {
      if (!task.dueDate) return false
      return task.dueDate < new Date() && task.status !== 'COMPLETED'
    }).length
    const taskCompletionRate = calculateTaskCompletionRate(tasksCompleted, tasksAssigned)

    const productivityScore = calculateProductivityScore(attendanceRate, taskCompletionRate)

    // Get all employees for ranking and comparison
    const allEmployees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        userId: true,
        department: {
          select: {
            name: true
          }
        }
      }
    })

    // Get all attendance and tasks for comparison
    const allAttendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        userId: true,
        checkIn: true,
        totalHours: true
      }
    })

    const allTasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        assigneeId: {
          not: null
        }
      },
      select: {
        assigneeId: true,
        status: true
      }
    })

    // Calculate performance for all employees for ranking
    const allEmployeePerformance = allEmployees.map(emp => {
      const empAttendance = allAttendanceRecords.filter(att => att.userId === emp.userId)
      const empPresentDays = empAttendance.filter(att => att.checkIn !== null).length
      const empAttendanceRate = calculateAttendanceRate(empPresentDays, totalDays)
      const empTasks = allTasks.filter(task => task.assigneeId === emp.userId)
      const empTasksCompleted = empTasks.filter(task => task.status === 'COMPLETED').length
      const empTaskCompletionRate = calculateTaskCompletionRate(empTasksCompleted, empTasks.length)
      const empProductivityScore = calculateProductivityScore(empAttendanceRate, empTaskCompletionRate)

      return {
        employeeId: emp.employeeId,
        userId: emp.userId,
        department: emp.department?.name || 'Unassigned',
        productivityScore: empProductivityScore,
        efficiencyRate: 0, // Simplified for ranking
        attendanceRate: empAttendanceRate,
        taskCompletionRate: empTaskCompletionRate
      }
    })

    // Rank employees
    const rankedEmployees = allEmployeePerformance
      .sort((a, b) => {
        if (b.productivityScore !== a.productivityScore) {
          return b.productivityScore - a.productivityScore
        }
        return b.efficiencyRate - a.efficiencyRate
      })
      .map((emp, index) => ({ ...emp, rank: index + 1 }))

    // Find employee's rank
    const employeeRankData = rankedEmployees.find(emp => emp.employeeId === employeeId)
    const rank = employeeRankData?.rank || 0

    // Calculate rank within department
    const departmentEmployees = rankedEmployees.filter(
      emp => emp.department === (employee.department?.name || 'Unassigned')
    )
    const rankInDepartment = departmentEmployees.findIndex(
      emp => emp.employeeId === employeeId
    ) + 1

    // Calculate department averages
    const departmentEmployeesPerf = allEmployeePerformance.filter(
      emp => emp.department === (employee.department?.name || 'Unassigned')
    )
    const departmentAvg = {
      productivityScore: departmentEmployeesPerf.length > 0
        ? Math.round(departmentEmployeesPerf.reduce((sum, emp) => sum + emp.productivityScore, 0) / departmentEmployeesPerf.length)
        : 0,
      efficiencyRate: 0, // Simplified
      attendanceRate: departmentEmployeesPerf.length > 0
        ? Math.round(departmentEmployeesPerf.reduce((sum, emp) => sum + emp.attendanceRate, 0) / departmentEmployeesPerf.length)
        : 0,
      taskCompletionRate: departmentEmployeesPerf.length > 0
        ? Math.round(departmentEmployeesPerf.reduce((sum, emp) => sum + emp.taskCompletionRate, 0) / departmentEmployeesPerf.length)
        : 0
    }

    // Calculate company averages
    const companyAvg = {
      productivityScore: allEmployeePerformance.length > 0
        ? Math.round(allEmployeePerformance.reduce((sum, emp) => sum + emp.productivityScore, 0) / allEmployeePerformance.length)
        : 0,
      efficiencyRate: 0, // Simplified
      attendanceRate: allEmployeePerformance.length > 0
        ? Math.round(allEmployeePerformance.reduce((sum, emp) => sum + emp.attendanceRate, 0) / allEmployeePerformance.length)
        : 0,
      taskCompletionRate: allEmployeePerformance.length > 0
        ? Math.round(allEmployeePerformance.reduce((sum, emp) => sum + emp.taskCompletionRate, 0) / allEmployeePerformance.length)
        : 0
    }

    // Calculate trends
    // For week: daily trends
    // For month: weekly trends
    // For year: monthly trends
    let productivityTrend: number[] = []
    let attendanceTrend: number[] = []
    let taskCompletionTrend: number[] = []

    if (period === 'week') {
      // Daily trends
      const days = eachDayOfInterval(dateRange)
      productivityTrend = days.map(day => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        const dayAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= dayStart && attDate <= dayEnd
        })
        const dayPresent = dayAttendance.filter(att => att.checkIn !== null).length
        const dayAttRate = dayPresent > 0 ? 100 : 0

        const dayTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= dayStart && taskDate <= dayEnd
        })
        const dayTaskRate = dayTasks.length > 0
          ? calculateTaskCompletionRate(
              dayTasks.filter(t => t.status === 'COMPLETED').length,
              dayTasks.length
            )
          : 0

        return calculateProductivityScore(dayAttRate, dayTaskRate)
      })

      attendanceTrend = days.map(day => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        const dayAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= dayStart && attDate <= dayEnd
        })
        return dayAttendance.filter(att => att.checkIn !== null).length > 0 ? 100 : 0
      })

      taskCompletionTrend = days.map(day => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        const dayTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= dayStart && taskDate <= dayEnd
        })
        return dayTasks.length > 0
          ? calculateTaskCompletionRate(
              dayTasks.filter(t => t.status === 'COMPLETED').length,
              dayTasks.length
            )
          : 0
      })
    } else if (period === 'month') {
      // Weekly trends
      const weeks = eachWeekOfInterval(dateRange, { weekStartsOn: 1 })
      productivityTrend = weeks.map((weekStart, index) => {
        const weekEnd = index < weeks.length - 1 ? weeks[index + 1] : dateRange.end
        const weekAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= weekStart && attDate < weekEnd
        })
        const weekPresent = weekAttendance.filter(att => att.checkIn !== null).length
        const weekDays = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
        const weekAttRate = calculateAttendanceRate(weekPresent, weekDays)

        const weekTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= weekStart && taskDate < weekEnd
        })
        const weekTaskRate = weekTasks.length > 0
          ? calculateTaskCompletionRate(
              weekTasks.filter(t => t.status === 'COMPLETED').length,
              weekTasks.length
            )
          : 0

        return calculateProductivityScore(weekAttRate, weekTaskRate)
      })

      attendanceTrend = weeks.map((weekStart, index) => {
        const weekEnd = index < weeks.length - 1 ? weeks[index + 1] : dateRange.end
        const weekAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= weekStart && attDate < weekEnd
        })
        const weekPresent = weekAttendance.filter(att => att.checkIn !== null).length
        const weekDays = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
        return calculateAttendanceRate(weekPresent, weekDays)
      })

      taskCompletionTrend = weeks.map((weekStart, index) => {
        const weekEnd = index < weeks.length - 1 ? weeks[index + 1] : dateRange.end
        const weekTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= weekStart && taskDate < weekEnd
        })
        return weekTasks.length > 0
          ? calculateTaskCompletionRate(
              weekTasks.filter(t => t.status === 'COMPLETED').length,
              weekTasks.length
            )
          : 0
      })
    } else if (period === 'year') {
      // Monthly trends
      const months = eachMonthOfInterval(dateRange)
      productivityTrend = months.map((monthStart, index) => {
        const monthEnd = index < months.length - 1 ? months[index + 1] : dateRange.end
        const monthAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= monthStart && attDate < monthEnd
        })
        const monthPresent = monthAttendance.filter(att => att.checkIn !== null).length
        const monthDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
        const monthAttRate = calculateAttendanceRate(monthPresent, monthDays)

        const monthTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= monthStart && taskDate < monthEnd
        })
        const monthTaskRate = monthTasks.length > 0
          ? calculateTaskCompletionRate(
              monthTasks.filter(t => t.status === 'COMPLETED').length,
              monthTasks.length
            )
          : 0

        return calculateProductivityScore(monthAttRate, monthTaskRate)
      })

      attendanceTrend = months.map((monthStart, index) => {
        const monthEnd = index < months.length - 1 ? months[index + 1] : dateRange.end
        const monthAttendance = attendanceRecords.filter(att => {
          const attDate = new Date(att.date)
          return attDate >= monthStart && attDate < monthEnd
        })
        const monthPresent = monthAttendance.filter(att => att.checkIn !== null).length
        const monthDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
        return calculateAttendanceRate(monthPresent, monthDays)
      })

      taskCompletionTrend = months.map((monthStart, index) => {
        const monthEnd = index < months.length - 1 ? months[index + 1] : dateRange.end
        const monthTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return taskDate >= monthStart && taskDate < monthEnd
        })
        return monthTasks.length > 0
          ? calculateTaskCompletionRate(
              monthTasks.filter(t => t.status === 'COMPLETED').length,
              monthTasks.length
            )
          : 0
      })
    }

    return NextResponse.json({
      employee: {
        employeeId: employee.employeeId,
        name: employee.user.name,
        email: employee.user.email,
        department: employee.department?.name || 'Unassigned',
        position: employee.position || 'N/A'
      },
      performance: {
        productivityScore,
        efficiencyRate,
        attendanceRate,
        taskCompletionRate,
        attendanceCorrelation: 0, // Simplified for now
        rank,
        rankInDepartment: rankInDepartment || 0,
        totalHours: Math.round(totalHours * 10) / 10,
        avgHoursPerDay,
        tasksCompleted,
        tasksAssigned,
        tasksOverdue
      },
      comparison: {
        departmentAvg,
        companyAvg
      },
      trends: {
        productivityTrend,
        attendanceTrend,
        taskCompletionTrend
      }
    })

  } catch (error) {
    console.error('Error fetching employee performance details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee performance details' },
      { status: 500 }
    )
  }
}

