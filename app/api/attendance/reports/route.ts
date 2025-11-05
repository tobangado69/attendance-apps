import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse,
  validateRole
} from '@/lib/api/api-utils'
import { AttendanceStatus } from '@/lib/constants/status'
import { logError } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user, search } = apiContext
    const { searchParams } = new URL(request.url)
    
    // Only Admin can access reports
    const roleCheck = validateRole(user, ['ADMIN'], 'Only Admin can access attendance reports')
    if (roleCheck) {
      return roleCheck
    }
    
    // Parse date range
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const department = searchParams.get('department') || ''
    const reportType = searchParams.get('type') || 'summary' // summary, detailed, analytics

    // Default to current month if no dates provided
    const now = new Date()
    const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const defaultEndDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Build where clause
    const where: Record<string, unknown> = {
      date: {
        gte: new Date(defaultStartDate),
        lte: new Date(defaultEndDate)
      }
    }

    // If not admin, only show own records
    if (user.role !== 'ADMIN') {
      where.userId = user.id
    }

    // Department filter
    if (department) {
      where.employee = {
        department: department
      }
    }

    // Get attendance records with user and employee data
    const attendanceRecords = await prisma.attendance.findMany({
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
      orderBy: { date: 'desc' }
    })

    // Calculate summary statistics
    const totalRecords = attendanceRecords.length
    const presentCount = attendanceRecords.filter(record => record.status === AttendanceStatus.PRESENT).length
    const absentCount = attendanceRecords.filter(record => record.status === AttendanceStatus.ABSENT).length
    const lateCount = attendanceRecords.filter(record => record.status === AttendanceStatus.LATE).length
    const earlyLeaveCount = attendanceRecords.filter(record => record.status === AttendanceStatus.EARLY_LEAVE).length

    // Calculate average hours worked
    const totalHours = attendanceRecords.reduce((sum, record) => {
      return sum + (record.totalHours || 0)
    }, 0)
    const averageHours = totalRecords > 0 ? totalHours / totalRecords : 0

    // Get unique employees for the period
    const uniqueEmployees = [...new Set(attendanceRecords.map(record => record.userId))].length

    // Department breakdown
    const departmentStats = attendanceRecords.reduce((acc, record) => {
      const dept = record.employee?.department?.name || 'Unknown'       
      if (!acc[dept]) {
        acc[dept] = { department: dept, total: 0, present: 0, absent: 0, late: 0, earlyLeave: 0 }
      }
      acc[dept].total++
      if (record.status === AttendanceStatus.PRESENT) acc[dept].present++
      else if (record.status === AttendanceStatus.ABSENT) acc[dept].absent++
      else if (record.status === AttendanceStatus.LATE) acc[dept].late++
      else if (record.status === AttendanceStatus.EARLY_LEAVE) acc[dept].earlyLeave++
      return acc
    }, {} as Record<string, { department: string; total: number; present: number; absent: number; late: number; earlyLeave: number }>)

    // Daily attendance trends
    const dailyTrends = attendanceRecords.reduce((acc, record) => {
      const date = record.date.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { date, total: 0, present: 0, absent: 0, late: 0, earlyLeave: 0 }
      }
      acc[date].total++
      if (record.status === AttendanceStatus.PRESENT) acc[date].present++
      else if (record.status === AttendanceStatus.ABSENT) acc[date].absent++
      else if (record.status === AttendanceStatus.LATE) acc[date].late++
      else if (record.status === AttendanceStatus.EARLY_LEAVE) acc[date].earlyLeave++
      return acc
    }, {} as Record<string, { date: string; total: number; present: number; absent: number; late: number; earlyLeave: number }>)

    // Get top performers (most present days)
    const employeeStats = attendanceRecords.reduce((acc, record) => {
      const userId = record.userId
      if (!acc[userId]) {
        acc[userId] = {
          user: record.user,
          employee: record.employee,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          earlyLeaveDays: 0,
          totalHours: 0
        }
      }
      acc[userId].totalDays++
      acc[userId].totalHours += record.totalHours || 0
      if (record.status === AttendanceStatus.PRESENT) acc[userId].presentDays++
      else if (record.status === AttendanceStatus.ABSENT) acc[userId].absentDays++
      else if (record.status === AttendanceStatus.LATE) acc[userId].lateDays++
      else if (record.status === AttendanceStatus.EARLY_LEAVE) acc[userId].earlyLeaveDays++
      return acc
    }, {} as Record<string, { 
      user: { id: string; name: string; email: string }
      employee: { id: string; employeeId: string; position: string | null; department: { id: string; name: string } | null } | null
      totalDays: number
      presentDays: number
      totalHours: number
      attendancePercentage?: number
      averageHours?: number
      lateDays?: number
      absentDays?: number
      earlyLeaveDays?: number
    }>)

    // Calculate attendance percentage for each employee
    Object.values(employeeStats).forEach((emp) => {
      emp.attendancePercentage = emp.totalDays > 0 ? (emp.presentDays / emp.totalDays) * 100 : 0
      emp.averageHours = emp.totalDays > 0 ? emp.totalHours / emp.totalDays : 0
    })

    // Sort employees by attendance percentage
    const topPerformers = Object.values(employeeStats)
      .sort((a, b) => (b.attendancePercentage || 0) - (a.attendancePercentage || 0))
      .slice(0, 10)

    // Get departments for filter
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })

    const reportData = {
      summary: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        earlyLeaveCount,
        uniqueEmployees,
        averageHours: Math.round(averageHours * 100) / 100,
        attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100 * 100) / 100 : 0
      },
      departmentStats,
      dailyTrends,
      topPerformers,
      dateRange: {
        startDate: defaultStartDate,
        endDate: defaultEndDate
      },
      departments: departments.map(d => d.name)
    }

    return formatApiResponse(reportData)
  } catch (error) {
    logError(error, { context: 'GET /api/attendance/reports' })
    return formatErrorResponse('Failed to generate attendance reports', 500)
  }
}
