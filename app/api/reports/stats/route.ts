import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfYear, 
  endOfYear 
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
    const period = searchParams.get('period') || 'month' // week, month, year

    // Calculate date range based on period
    const now = new Date()
    let dateRange: { start: Date; end: Date }

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

    const totalAttendanceRecords = await prisma.attendance.count({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }
    })

    const presentRecords = await prisma.attendance.count({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        checkIn: {
          not: null
        }
      }
    })

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0

    // Get average hours per day for the selected period
    const attendanceWithHours = await prisma.attendance.findMany({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        totalHours: {
          not: null
        }
      },
      select: {
        totalHours: true
      }
    })

    const totalHours = attendanceWithHours.reduce((sum, record) => 
      sum + (record.totalHours || 0), 0
    )
    const averageHours = attendanceWithHours.length > 0 
      ? totalHours / attendanceWithHours.length 
      : 0

    // Get task completion rate for the selected period
    const totalTasksInPeriod = await prisma.task.count({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }
    })

    const completedTasksInPeriod = await prisma.task.count({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        status: 'COMPLETED'
      }
    })

    const taskCompletionRate = totalTasksInPeriod > 0 
      ? Math.round((completedTasksInPeriod / totalTasksInPeriod) * 100)
      : 0

    // Get active employees (checked in today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const activeEmployees = await prisma.attendance.count({
      where: {
        date: {
          gte: today
        },
        checkIn: {
          not: null
        },
        checkOut: null
      }
    })

    return NextResponse.json({
      attendanceRate,
      averageHours: Math.round(averageHours * 10) / 10,
      taskCompletionRate,
      activeEmployees
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report statistics' },
      { status: 500 }
    )
  }
}
