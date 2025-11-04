import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse
} from '@/lib/api/api-utils'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

// Helper function to get cached stats (separate for employee vs admin/manager)
const getCachedEmployeeStats = unstable_cache(
  async (userId: string, today: Date, startOfMonth: Date) => {
    const [
      totalEmployees,
      presentToday,
      pendingTasks,
      completedTasks,
      totalAttendanceRecords,
      presentRecords
    ] = await Promise.all([
      // Total employees (same for all)
      prisma.employee.count({ where: { isActive: true } }),
      
      // Present today (same for all)
      prisma.attendance.count({
        where: {
          date: { gte: today },
          checkIn: { not: null }
        }
      }),
      
      // Employee's pending tasks
      prisma.task.count({
        where: { status: 'PENDING', assigneeId: userId }
      }),
      
      // Employee's completed tasks
      prisma.task.count({
        where: { status: 'COMPLETED', assigneeId: userId }
      }),
      
      // Employee's attendance records this month
      prisma.attendance.count({
        where: {
          date: { gte: startOfMonth },
          userId
        }
      }),
      
      // Employee's present records this month
      prisma.attendance.count({
        where: {
          date: { gte: startOfMonth },
          userId,
          checkIn: { not: null }
        }
      })
    ])

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0

    return {
      totalEmployees,
      presentToday,
      pendingTasks,
      completedTasks,
      attendanceRate
    }
  },
  ['dashboard-stats-employee'],
  {
    revalidate: CACHE_REVALIDATE.SHORT,
    tags: [CACHE_TAGS.DASHBOARD, CACHE_TAGS.ATTENDANCE, CACHE_TAGS.TASKS]
  }
)

const getCachedAdminStats = unstable_cache(
  async (today: Date, startOfMonth: Date) => {
    const [
      totalEmployees,
      presentToday,
      pendingTasks,
      completedTasks,
      totalAttendanceRecords,
      presentRecords
    ] = await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.attendance.count({
        where: {
          date: { gte: today },
          checkIn: { not: null }
        }
      }),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.attendance.count({
        where: { date: { gte: startOfMonth } }
      }),
      prisma.attendance.count({
        where: {
          date: { gte: startOfMonth },
          checkIn: { not: null }
        }
      })
    ])

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0

    return {
      totalEmployees,
      presentToday,
      pendingTasks,
      completedTasks,
      attendanceRate
    }
  },
  ['dashboard-stats-admin'],
  {
    revalidate: CACHE_REVALIDATE.SHORT,
    tags: [CACHE_TAGS.DASHBOARD, CACHE_TAGS.ATTENDANCE, CACHE_TAGS.TASKS]
  }
)

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Prepare date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Use cached stats based on user role
    const stats = user.role === 'EMPLOYEE'
      ? await getCachedEmployeeStats(user.id, today, startOfMonth)
      : await getCachedAdminStats(today, startOfMonth)

    return formatApiResponse(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return formatErrorResponse('Failed to fetch dashboard statistics', 500)
  }
}
