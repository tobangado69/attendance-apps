import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build where clause based on user role
    const where: Record<string, unknown> = {}
    
    // If employee, only show assigned tasks or tasks they created
    if (session.user.role === 'EMPLOYEE') {
      where.OR = [
        { assigneeId: session.user.id },
        { creatorId: session.user.id }
      ]
    }

    // Get total tasks
    const totalTasks = await prisma.task.count({ where })

    // Get pending tasks
    const pendingTasks = await prisma.task.count({
      where: {
        ...where,
        status: 'PENDING'
      }
    })

    // Get in progress tasks
    const inProgressTasks = await prisma.task.count({
      where: {
        ...where,
        status: 'IN_PROGRESS'
      }
    })

    // Get completed tasks
    const completedTasks = await prisma.task.count({
      where: {
        ...where,
        status: 'COMPLETED'
      }
    })

    return NextResponse.json({
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks
    })
  } catch (error) {
    logError(error, { context: 'GET /api/tasks/stats' })
    return NextResponse.json(
      { error: 'Failed to fetch task statistics' },
      { status: 500 }
    )
  }
}
