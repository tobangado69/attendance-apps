import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDistanceToNow } from 'date-fns'
import { formatApiResponse, formatErrorResponse } from '@/lib/api/api-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const activities = []

    // Get recent attendance activities
    const recentAttendance = await prisma.attendance.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })

    for (const attendance of recentAttendance) {
      if (attendance.checkIn) {
        activities.push({
          id: `attendance-${attendance.id}`,
          type: 'attendance',
          message: `${attendance.user.name} checked in at ${attendance.checkIn.toLocaleTimeString()}`,
          time: formatDistanceToNow(attendance.createdAt, { addSuffix: true }),
          status: 'completed'
        })
      }
      if (attendance.checkOut) {
        activities.push({
          id: `attendance-out-${attendance.id}`,
          type: 'attendance',
          message: `${attendance.user.name} checked out at ${attendance.checkOut.toLocaleTimeString()}`,
          time: formatDistanceToNow(attendance.updatedAt, { addSuffix: true }),
          status: 'completed'
        })
      }
    }

    // Get recent task activities
    const recentTasks = await prisma.task.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            name: true
          }
        }
      }
    })

    for (const task of recentTasks) {
      if (task.status === 'COMPLETED') {
        activities.push({
          id: `task-completed-${task.id}`,
          type: 'task',
          message: `Task "${task.title}" completed by ${task.assignee?.name || task.creator.name}`,
          time: formatDistanceToNow(task.updatedAt, { addSuffix: true }),
          status: 'completed'
        })
      } else if (task.status === 'IN_PROGRESS') {
        activities.push({
          id: `task-progress-${task.id}`,
          type: 'task',
          message: `Task "${task.title}" started by ${task.assignee?.name || task.creator.name}`,
          time: formatDistanceToNow(task.updatedAt, { addSuffix: true }),
          status: 'in_progress'
        })
      }
    }

    // Get recent employee activities
    const recentEmployees = await prisma.employee.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })

    for (const employee of recentEmployees) {
      activities.push({
        id: `employee-${employee.id}`,
        type: 'employee',
        message: `New employee ${employee.user.name} added to the system`,
        time: formatDistanceToNow(employee.createdAt, { addSuffix: true }),
        status: 'completed'
      })
    }

    // Sort activities by time (most recent first)
    activities.sort((a, b) => {
      const timeA = new Date(a.time.includes('ago') ? Date.now() - 1000 : 0)
      const timeB = new Date(b.time.includes('ago') ? Date.now() - 1000 : 0)
      return timeB.getTime() - timeA.getTime()
    })

    return formatApiResponse(activities.slice(0, 10)) // Return top 10 activities
  } catch (error) {
    console.error('Error fetching activities:', error)
    return formatErrorResponse('Failed to fetch activities', 500)
  }
}
