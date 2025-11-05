import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getManagersAndAdmins } from '@/lib/notifications'
import { broadcastNotification } from '@/lib/notifications/real-time'
import { logError } from '@/lib/utils/logger'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user;
    const { id } = await params
    
    // Use cached function for individual task
    const getCachedTask = unstable_cache(
      async () => {
        return prisma.task.findUnique({
          where: { id },
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
      },
      [`task_${id}`],
      {
        revalidate: CACHE_REVALIDATE.MEDIUM, // 5 minutes - individual task data
        tags: [CACHE_TAGS.TASKS]
      }
    )

    const task = await getCachedTask()

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user can view this task
    if (user.role === 'EMPLOYEE' && task.assigneeId !== user.id && task.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    logError(error, { context: 'GET /api/tasks/[id]', taskId: id })
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user;
    const { id } = await params
    const body = await request.json()
    const { title, description, status, priority, dueDate, assigneeId } = body

    // Validate due date if provided
    if (dueDate) {
      const dueDateObj = new Date(dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Set to start of today
      
      // Check if due date is in the past
      if (dueDateObj < today) {
        return NextResponse.json(
          { error: 'Due date cannot be in the past' },
          { status: 400 }
        )
      }
      
      // Check if due date is too far in the future (e.g., more than 1 year)
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
      
      if (dueDateObj > oneYearFromNow) {
        return NextResponse.json(
          { error: 'Due date cannot be more than 1 year in the future' },
          { status: 400 }
        )
      }
      
      // Check if due date is a valid date
      if (isNaN(dueDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date format' },
          { status: 400 }
        )
      }
    }

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Role-based access control
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    const isEmployee = user.role === 'EMPLOYEE';
    
    // Employee can only update status, Admin/Manager can update everything
    if (isEmployee) {
      // Check if employee is assigned to this task
      if (task.assigneeId !== user.id) {
        return NextResponse.json(
          { error: 'You can only update tasks assigned to you' },
          { status: 403 }
        )
      }
      
      // Employee can only update status
      if (title || description !== undefined || priority || dueDate || assigneeId !== undefined) {
        return NextResponse.json(
          { error: 'You can only update task status' },
          { status: 403 }
        )
      }
    } else if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'Only Admin and Manager can edit tasks' },
        { status: 403 }
      )
    }

    // Update task based on role
    const updateData: Record<string, unknown> = {};
    
    if (isAdminOrManager) {
      // Admin/Manager can update all fields
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (dueDate) updateData.dueDate = new Date(dueDate);
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    } else if (isEmployee) {
      // Employee can only update status
      if (status) updateData.status = status;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
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

    // Note: Notifications are now handled by real-time system below

    // Send real-time notification for task updates
    try {
      if (status && status !== task.status) {
        const statusText = status.replace('_', ' ').toLowerCase();
        
        // Broadcast task status change
        broadcastNotification({
          title: 'Task Status Updated',
          message: `Task "${updatedTask.title}" status changed to ${statusText} by ${session.user.name}`,
          type: 'info',
          data: {
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            action: `status changed to ${statusText}`,
            updatedBy: session.user.name,
            assigneeId: updatedTask.assigneeId,
            creatorId: updatedTask.creatorId
          }
        });
      }

      if (assigneeId && assigneeId !== task.assigneeId) {
        // Broadcast task assignment change
        broadcastNotification({
          title: 'Task Reassigned',
          message: `Task "${updatedTask.title}" has been reassigned to ${updatedTask.assignee?.name || 'Unknown'}`,
          type: 'info',
          data: {
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            action: 'reassigned',
            newAssignee: updatedTask.assignee?.name,
            previousAssigneeId: task.assigneeId,
            newAssigneeId: assigneeId
          }
        });
      }
    } catch (notificationError) {
      logError(notificationError, { context: 'PUT /api/tasks/[id] - real-time notification', taskId: id });
    }

    // Invalidate tasks cache
    revalidateTag(CACHE_TAGS.TASKS)

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    })
  } catch (error) {
    logError(error, { context: 'PUT /api/tasks/[id]', taskId: id })
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user;
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Only Admin and Manager can delete tasks
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only Admin and Manager can delete tasks' },
        { status: 403 }
      )
    }

    await prisma.task.delete({
      where: { id }
    })

    // Invalidate tasks cache
    revalidateTag(CACHE_TAGS.TASKS)

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    logError(error, { context: 'DELETE /api/tasks/[id]', taskId: id })
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
