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
  format
} from 'date-fns'

// Performance calculation helper functions
function calculateAttendanceRate(presentDays: number, totalDays: number): number {
  if (totalDays === 0) return 0
  return Math.round((presentDays / totalDays) * 100)
}

function calculateTaskCompletionRate(completed: number, assigned: number): number {
  if (assigned === 0) return 0
  return Math.round((completed / assigned) * 100)
}

function calculateProductivityScore(attendanceRate: number, taskCompletionRate: number): number {
  // Weighted formula: Attendance (40%) + Task Completion (60%)
  return Math.round((attendanceRate * 0.4) + (taskCompletionRate * 0.6))
}

function calculateEfficiencyRate(totalHours: number, presentDays: number): number {
  if (presentDays === 0) return 0
  const expectedHours = presentDays * 8 // Assuming 8 hours per day
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
    const period = searchParams.get('period') || 'month' // month, week, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range
    let dateRange: { start: Date; end: Date }

    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else {
      const now = new Date()
      switch (period) {
        case 'week':
          dateRange = {
            start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
            end: endOfWeek(now, { weekStartsOn: 1 }) // Sunday
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
    }

    // Calculate total days in period
    const totalDays = eachDayOfInterval(dateRange).length

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        position: true,
        salary: true,
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

    // Get attendance records for the date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        userId: true,
        checkIn: true,
        totalHours: true,
        date: true
      }
    })

    // Get tasks assigned in the date range
    // Tasks are considered "in period" if they were created during the period
    const tasks = await prisma.task.findMany({
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
        status: true,
        createdAt: true
      }
    })

    // Calculate performance metrics for each employee
    const employeePerformance = employees.map(emp => {
      // Attendance metrics
      const empAttendance = attendanceRecords.filter(att => att.userId === emp.userId)
      const presentDays = empAttendance.filter(att => att.checkIn !== null).length
      const attendanceRate = calculateAttendanceRate(presentDays, totalDays)
      const totalHours = empAttendance.reduce((sum, att) => sum + (att.totalHours || 0), 0)
      const avgHoursPerDay = presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0
      const efficiencyRate = calculateEfficiencyRate(totalHours, presentDays)

      // Task metrics
      const empTasks = tasks.filter(task => task.assigneeId === emp.userId)
      const tasksAssigned = empTasks.length
      const tasksCompleted = empTasks.filter(task => task.status === 'COMPLETED').length
      const taskCompletionRate = calculateTaskCompletionRate(tasksCompleted, tasksAssigned)

      // Performance score
      const productivityScore = calculateProductivityScore(attendanceRate, taskCompletionRate)

      // Calculate correlation between attendance and task completion
      // For now, return 0 as correlation requires time-series data
      // This will be calculated properly in the trends endpoint (task-001-3)
      const attendanceCorrelation = 0

      return {
        employeeId: emp.employeeId,
        name: emp.user.name,
        email: emp.user.email,
        department: emp.department?.name || 'Unassigned',
        position: emp.position || 'N/A',
        productivityScore,
        efficiencyRate,
        attendanceRate,
        taskCompletionRate,
        attendanceCorrelation,
        totalHours: Math.round(totalHours * 10) / 10,
        avgHoursPerDay,
        tasksCompleted,
        tasksAssigned
      }
    })

    // Rank employees by productivity score
    const rankedEmployees = employeePerformance
      .map((emp, index) => ({ ...emp, rank: 0 }))
      .sort((a, b) => {
        // Sort by productivity score (descending), then efficiency rate (descending)
        if (b.productivityScore !== a.productivityScore) {
          return b.productivityScore - a.productivityScore
        }
        return b.efficiencyRate - a.efficiencyRate
      })
      .map((emp, index) => ({ ...emp, rank: index + 1 }))

    // Calculate department performance
    const departmentMap = new Map<string, {
      department: string
      totalEmployees: number
      productivityScores: number[]
      efficiencyRates: number[]
      attendanceRates: number[]
      taskCompletionRates: number[]
      totalHours: number
    }>()

    rankedEmployees.forEach(emp => {
      const dept = emp.department
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          totalEmployees: 0,
          productivityScores: [],
          efficiencyRates: [],
          attendanceRates: [],
          taskCompletionRates: [],
          totalHours: 0
        })
      }

      const deptData = departmentMap.get(dept)!
      deptData.totalEmployees++
      deptData.productivityScores.push(emp.productivityScore)
      deptData.efficiencyRates.push(emp.efficiencyRate)
      deptData.attendanceRates.push(emp.attendanceRate)
      deptData.taskCompletionRates.push(emp.taskCompletionRate)
      deptData.totalHours += emp.totalHours
    })

    const departmentPerformance = Array.from(departmentMap.values()).map(dept => {
      const avg = (arr: number[]) => arr.length > 0 
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) 
        : 0

      return {
        department: dept.department,
        totalEmployees: dept.totalEmployees,
        avgProductivityScore: avg(dept.productivityScores),
        avgEfficiencyRate: avg(dept.efficiencyRates),
        avgAttendanceRate: avg(dept.attendanceRates),
        avgTaskCompletionRate: avg(dept.taskCompletionRates),
        totalHours: Math.round(dept.totalHours * 10) / 10
      }
    })

    // Calculate summary averages
    const summary = {
      totalEmployees: employees.length,
      avgProductivityScore: rankedEmployees.length > 0
        ? Math.round(rankedEmployees.reduce((sum, emp) => sum + emp.productivityScore, 0) / rankedEmployees.length)
        : 0,
      avgEfficiencyRate: rankedEmployees.length > 0
        ? Math.round(rankedEmployees.reduce((sum, emp) => sum + emp.efficiencyRate, 0) / rankedEmployees.length)
        : 0,
      avgAttendanceRate: rankedEmployees.length > 0
        ? Math.round(rankedEmployees.reduce((sum, emp) => sum + emp.attendanceRate, 0) / rankedEmployees.length)
        : 0,
      avgTaskCompletionRate: rankedEmployees.length > 0
        ? Math.round(rankedEmployees.reduce((sum, emp) => sum + emp.taskCompletionRate, 0) / rankedEmployees.length)
        : 0
    }

    // Get top 10 performers
    const topPerformers = rankedEmployees
      .slice(0, 10)
      .map(emp => ({
        employeeId: emp.employeeId,
        name: emp.name,
        productivityScore: emp.productivityScore,
        rank: emp.rank
      }))

    return NextResponse.json({
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      summary,
      employeePerformance: rankedEmployees,
      departmentPerformance,
      topPerformers
    })

  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

