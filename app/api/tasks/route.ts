import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getManagersAndAdmins } from '@/lib/notifications'
import { broadcastNotification, sendNotificationToUser, broadcastNotificationToRoles } from '@/lib/notifications/real-time'
import { 
  buildApiContext, 
  buildTextSearchWhere, 
  buildDateRangeWhere,
  formatApiResponse, 
  formatErrorResponse,
  validateRole
} from '@/lib/api/api-utils'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user, pagination, search } = apiContext

    const { searchParams } = new URL(request.url)
    
    // Parse additional filters
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const assigned = searchParams.get('assigned') || ''
    const assignee = searchParams.get('assignee') || ''
    const creator = searchParams.get('creator') || ''
    const dueDateFrom = searchParams.get('dueDateFrom') || ''
    const dueDateTo = searchParams.get('dueDateTo') || ''
    const overdue = searchParams.get('overdue') === 'true'
    const unassigned = searchParams.get('unassigned') === 'true'

    // Build where clause using utilities
    const where: Record<string, unknown> = {
      ...buildTextSearchWhere(search.search || '', [
        'title',
        'description',
        'assignee.name',
        'creator.name'
      ]),
      ...buildDateRangeWhere(dueDateFrom, dueDateTo, 'dueDate')
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by priority
    if (priority) {
      where.priority = priority
    }

    // Filter by assigned user
    if (assigned === 'me') {
      where.assigneeId = user.id
    } else if (assigned === 'others') {
      where.assigneeId = { not: user.id }
    } else if (assigned === 'unassigned') {
      where.assigneeId = null
    }

    // Filter by specific assignee
    if (assignee) {
      where.assigneeId = assignee
    }

    // Filter by creator
    if (creator) {
      where.creatorId = creator
    }

    // Overdue filter
    if (overdue) {
      where.dueDate = {
        lt: new Date(),
        not: null
      }
      where.status = { not: TaskStatus.COMPLETED }
    }

    // Unassigned filter
    if (unassigned) {
      where.assigneeId = null
    }

    // Role-based filtering
    if (user.role === 'EMPLOYEE') {
      // Employees can only see tasks assigned to them or created by them
      where.OR = [
        { assigneeId: user.id },
        { creatorId: user.id }
      ]
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit
      }),
      prisma.task.count({ where })
    ])

    return formatApiResponse(tasks, {
      total,
      page: pagination.page,
      limit: pagination.limit
    })
  } catch (error) {
    logError(error, { context: 'GET /api/tasks' })
    return formatErrorResponse('Failed to fetch tasks', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Only Admin and Manager can create tasks
    const roleCheck = validateRole(user, ['ADMIN', 'MANAGER'], 'Only Admin and Manager can create tasks')
    if (roleCheck) {
      return roleCheck
    }

    const body = await request.json()
    const { title, description, priority, dueDate, assigneeId } = body

    // Validate required fields
    if (!title) {
      return formatErrorResponse('Title is required', 400)
    }

    // Validate due date if provided
    if (dueDate) {
      const dueDateObj = new Date(dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Set to start of today
      
      // Check if due date is in the past
      if (dueDateObj < today) {
        return formatErrorResponse('Due date cannot be in the past', 400)
      }
      
      // Check if due date is too far in the future (e.g., more than 1 year)
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
      
      if (dueDateObj > oneYearFromNow) {
        return formatErrorResponse('Due date cannot be more than 1 year in the future', 400)
      }
      
      // Check if due date is a valid date
      if (isNaN(dueDateObj.getTime())) {
        return formatErrorResponse('Invalid due date format', 400)
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        creatorId: user.id
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Send notifications
    try {
      // Notify the assignee if task is assigned
      if (task.assigneeId) {
        await createNotification({
          userId: task.assigneeId,
          ...NotificationTemplates.taskAssigned(task.title, task.assignee?.name || 'Unknown')
        })

        // Send real-time notification to assignee
        sendNotificationToUser(task.assigneeId, {
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${task.title}"`,
          type: 'info',
          data: {
            taskId: task.id,
            taskTitle: task.title,
            creator: task.creator.name
          }
        })
      }

      // Notify all managers and admins about new task
      const managersAndAdmins = await getManagersAndAdmins()
      const notifications = managersAndAdmins
        .filter(manager => manager.id !== user.id) // Don't notify the creator
        .map(user => ({
          userId: user.id,
          title: 'New Task Created',
          message: `A new task "${task.title}" has been created by ${task.creator.name}`,
          type: 'info' as const
        }))

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications
        })

        // Send real-time notification only to managers and admins
        broadcastNotificationToRoles({
          title: 'New Task Created',
          message: `A new task "${task.title}" has been created by ${task.creator.name}`,
          type: 'info',
          data: {
            taskId: task.id,
            taskTitle: task.title,
            creator: task.creator.name,
            assignee: task.assignee?.name || 'Unassigned'
          }
        }, ['ADMIN', 'MANAGER'])
      }
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/tasks - notifications' })
      // Don't fail the task creation if notifications fail
    }

    return formatApiResponse(task, undefined, 'Task created successfully')
  } catch (error) {
    logError(error, { context: 'POST /api/tasks' })
    return formatErrorResponse('Failed to create task', 500)
  }
}
