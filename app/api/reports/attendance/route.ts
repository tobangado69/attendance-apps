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
  subDays, 
  format, 
  eachDayOfInterval,
  subWeeks,
  subMonths,
  subYears
} from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, week, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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
          // This week (Monday to Sunday)
          dateRange = {
            start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
            end: endOfWeek(now, { weekStartsOn: 1 }) // Sunday
          }
          break
        case 'year':
          // This year (January 1st to December 31st)
          dateRange = {
            start: startOfYear(now),
            end: endOfYear(now)
          }
          break
        default: // month
          // This month (1st to last day of current month)
          dateRange = {
            start: startOfMonth(now),
            end: endOfMonth(now)
          }
      }
    }

    // Get attendance data for the date range
    const attendanceData = await prisma.attendance.findMany({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get all employees for reference
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        position: true,
        salary: true,
        isActive: true,
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

    // Generate daily attendance summary
    const dailyData = eachDayOfInterval(dateRange).map(date => {
      const dayAttendance = attendanceData.filter(att => 
        format(att.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      )
      
      const present = dayAttendance.filter(att => att.checkIn !== null).length
      const absent = employees.length - present
      const late = dayAttendance.filter(att => {
        if (!att.checkIn) return false
        const checkInTime = new Date(att.checkIn)
        return checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30)
      }).length

      const totalHours = dayAttendance.reduce((sum, att) => {
        return sum + (att.totalHours || 0)
      }, 0)

      return {
        date: format(date, 'yyyy-MM-dd'),
        day: format(date, 'EEE'),
        present,
        absent,
        late,
        totalHours: Math.round(totalHours * 10) / 10
      }
    })

    // Generate employee attendance summary
    const employeeData = employees.map(emp => {
      const empAttendance = attendanceData.filter(att => att.userId === emp.userId)
      const presentDays = empAttendance.filter(att => att.checkIn !== null).length
      const totalDays = dailyData.length
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      
      const totalHours = empAttendance.reduce((sum, att) => sum + (att.totalHours || 0), 0)
      const avgHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0

      const lateDays = empAttendance.filter(att => {
        if (!att.checkIn) return false
        const checkInTime = new Date(att.checkIn)
        return checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30)
      }).length

      return {
        employeeId: emp.employeeId,
        name: emp.user.name,
        email: emp.user.email,
        department: emp.department?.name || 'Unassigned',
        position: emp.position,
        salary: emp.salary,
        presentDays,
        totalDays,
        attendanceRate,
        totalHours: Math.round(totalHours * 10) / 10,
        avgHours,
        lateDays
      }
    })

    // Generate department summary
    const departmentData = employees.reduce((acc, emp) => {
      const dept = emp.department?.name || 'Unassigned'
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          totalEmployees: 0,
          totalPresentDays: 0,
          totalDays: 0,
          avgAttendanceRate: 0,
          totalHours: 0
        }
      }
      
      const empData = employeeData.find(e => e.employeeId === emp.employeeId)
      if (empData) {
        acc[dept].totalEmployees++
        acc[dept].totalPresentDays += empData.presentDays
        acc[dept].totalDays += empData.totalDays
        acc[dept].totalHours += empData.totalHours
      }
      
      return acc
    }, {} as Record<string, { department: string; totalEmployees: number; totalPresentDays: number; totalDays: number; avgAttendanceRate?: number }>)

    // Calculate department averages
    Object.values(departmentData).forEach((dept) => {
      dept.avgAttendanceRate = dept.totalDays > 0 
        ? Math.round((dept.totalPresentDays / dept.totalDays) * 100) 
        : 0
    })

    // Overall statistics
    const totalPresentDays = dailyData.reduce((sum, day) => sum + day.present, 0)
    const totalPossibleDays = dailyData.length * employees.length
    const overallAttendanceRate = totalPossibleDays > 0 
      ? Math.round((totalPresentDays / totalPossibleDays) * 100) 
      : 0

    const totalHours = dailyData.reduce((sum, day) => sum + day.totalHours, 0)
    const avgHoursPerDay = dailyData.length > 0 
      ? Math.round((totalHours / dailyData.length) * 10) / 10 
      : 0

    return NextResponse.json({
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      summary: {
        totalEmployees: employees.length,
        totalDays: dailyData.length,
        overallAttendanceRate,
        totalHours,
        avgHoursPerDay
      },
      dailyData,
      employeeData,
      departmentData: Object.values(departmentData)
    })

  } catch (error) {
    console.error('Error fetching attendance reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance reports' },
      { status: 500 }
    )
  }
}
