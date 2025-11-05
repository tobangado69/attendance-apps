import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse,
  validateRole
} from '@/lib/api/api-utils'
import { AttendanceStatus } from '@/lib/constants/status'
import { logError } from '@/lib/utils/logger'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

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

    // Build cache key based on filters
    const cacheKey = `attendance_reports_${defaultStartDate}_${defaultEndDate}_${department}_${user.id}`
    
    // Use cached function for report generation
    const getCachedReport = unstable_cache(
      async () => {
        // Use database aggregations for better performance
        const [
          attendanceRecords,
          summaryStats,
          totalHoursResult,
          employeeStatsRaw,
          departmentsForStats,
          dailyTrendsData
        ] = await Promise.all([
          // Get attendance records for detailed data
          prisma.attendance.findMany({
            where,
            select: {
              id: true,
              userId: true,
              date: true,
              status: true,
              totalHours: true,
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
          }),
          // Get summary statistics using database aggregations
          prisma.attendance.groupBy({
            by: ['status'],
            where,
            _count: {
              id: true
            }
          }),
          // Calculate average hours worked using database aggregation
          prisma.attendance.aggregate({
            where,
            _sum: {
              totalHours: true
            },
            _avg: {
              totalHours: true
            }
          }),
          // Get employee stats with aggregation
          prisma.attendance.groupBy({
            by: ['userId'],
            where,
            _count: {
              id: true
            },
            _sum: {
              totalHours: true
            }
          }),
          // Get department breakdown data
          prisma.attendance.findMany({
            where,
            select: {
              status: true,
              employee: {
                select: {
                  department: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }),
          // Get daily trends data (only date and status)
          prisma.attendance.findMany({
            where,
            select: {
              date: true,
              status: true
            }
          })
        ])

        // Calculate summary statistics from database aggregations
        const totalRecords = summaryStats.reduce((sum, stat) => sum + stat._count.id, 0)
        const presentCount = summaryStats.find(s => s.status === AttendanceStatus.PRESENT)?._count.id || 0
        const absentCount = summaryStats.find(s => s.status === AttendanceStatus.ABSENT)?._count.id || 0
        const lateCount = summaryStats.find(s => s.status === AttendanceStatus.LATE)?._count.id || 0
        const earlyLeaveCount = summaryStats.find(s => s.status === AttendanceStatus.EARLY_LEAVE)?._count.id || 0

        const totalHours = totalHoursResult._sum.totalHours || 0
        const averageHours = totalHoursResult._avg.totalHours || 0

        // Get unique employees for the period
        const uniqueEmployees = employeeStatsRaw.length

        // Department breakdown (optimized: process in memory but only needed fields fetched)
        const departmentStats: Record<string, { department: string; total: number; present: number; absent: number; late: number; earlyLeave: number }> = {}
        departmentsForStats.forEach(record => {
          const dept = record.employee?.department?.name || 'Unknown'
          if (!departmentStats[dept]) {
            departmentStats[dept] = { department: dept, total: 0, present: 0, absent: 0, late: 0, earlyLeave: 0 }
          }
          departmentStats[dept].total++
          if (record.status === AttendanceStatus.PRESENT) departmentStats[dept].present++
          else if (record.status === AttendanceStatus.ABSENT) departmentStats[dept].absent++
          else if (record.status === AttendanceStatus.LATE) departmentStats[dept].late++
          else if (record.status === AttendanceStatus.EARLY_LEAVE) departmentStats[dept].earlyLeave++
        })

        // Daily attendance trends (optimized: process in memory but only needed fields fetched)
        const dailyTrends: Record<string, { date: string; total: number; present: number; absent: number; late: number; earlyLeave: number }> = {}
        dailyTrendsData.forEach(record => {
          const date = record.date.toISOString().split('T')[0]
          if (!dailyTrends[date]) {
            dailyTrends[date] = { date, total: 0, present: 0, absent: 0, late: 0, earlyLeave: 0 }
          }
          dailyTrends[date].total++
          if (record.status === AttendanceStatus.PRESENT) dailyTrends[date].present++
          else if (record.status === AttendanceStatus.ABSENT) dailyTrends[date].absent++
          else if (record.status === AttendanceStatus.LATE) dailyTrends[date].late++
          else if (record.status === AttendanceStatus.EARLY_LEAVE) dailyTrends[date].earlyLeave++
        })

        return {
          attendanceRecords,
          summary: {
            totalRecords,
            presentCount,
            absentCount,
            lateCount,
            earlyLeaveCount,
            uniqueEmployees,
            averageHours,
            totalHours
          },
          departmentStats,
          dailyTrends,
          employeeStatsRaw
        }
      },
      [cacheKey],
      {
        revalidate: CACHE_REVALIDATE.MEDIUM, // 5 minutes - reports don't change frequently
        tags: [CACHE_TAGS.ATTENDANCE, CACHE_TAGS.REPORTS]
      }
    )

    const {
      attendanceRecords,
      summary,
      departmentStats,
      dailyTrends,
      employeeStatsRaw
    } = await getCachedReport()

    const { totalRecords, presentCount, absentCount, lateCount, earlyLeaveCount, uniqueEmployees, averageHours } = summary

    // Get top performers (most present days) - merge aggregated data with user info
    const employeeStatsMap = new Map(employeeStatsRaw.map(stat => [stat.userId, stat]))
    const employeeStats = attendanceRecords.reduce((acc, record) => {
      const userId = record.userId
      const aggregated = employeeStatsMap.get(userId)
      if (!acc[userId]) {
        acc[userId] = {
          user: record.user,
          employee: record.employee,
          totalDays: aggregated?._count.id || 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          earlyLeaveDays: 0,
          totalHours: aggregated?._sum.totalHours || 0
        }
      }
      const userStats = acc[userId]
      if (!userStats) return acc
      
      if (record.status === AttendanceStatus.PRESENT) {
        userStats.presentDays++
      } else if (record.status === AttendanceStatus.ABSENT) {
        userStats.absentDays++
      } else if (record.status === AttendanceStatus.LATE) {
        userStats.lateDays++
      } else if (record.status === AttendanceStatus.EARLY_LEAVE) {
        userStats.earlyLeaveDays++
      }
      return acc
    }, {} as Record<string, { 
      user: { id: string; name: string; email: string }
      employee: { id: string; employeeId: string; position: string | null; department: { id: string; name: string } | null } | null
      totalDays: number
      presentDays: number
      absentDays: number
      lateDays: number
      earlyLeaveDays: number
      totalHours: number
      attendancePercentage?: number
      averageHours?: number
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
