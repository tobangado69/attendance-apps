import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates } from '@/lib/notifications'
import { logger, logError } from '@/lib/utils/logger'
import { TaskStatus } from '@/lib/constants/status'

export async function checkOverdueTasks() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find tasks that are overdue
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: today
        },
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
        }
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    for (const task of overdueTasks) {
      const dueDateString = task.dueDate?.toLocaleDateString() || 'Unknown'
      
      // Notify the assignee
      if (task.assigneeId) {
        await createNotification({
          userId: task.assigneeId,
          ...NotificationTemplates.taskOverdue(task.title, dueDateString)
        })
      }

      // Notify the creator
      if (task.creatorId !== task.assigneeId) {
        await createNotification({
          userId: task.creatorId,
          ...NotificationTemplates.taskOverdue(task.title, dueDateString)
        })
      }
    }

    logger.debug(`Checked ${overdueTasks.length} overdue tasks`)
  } catch (error) {
    logError(error, { context: 'checkOverdueTasks' })
  }
}

export async function checkTasksDueSoon() {
  try {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    // Find tasks due tomorrow
    const tasksDueSoon = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: tomorrow
        },
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
        }
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    for (const task of tasksDueSoon) {
      const dueDateString = task.dueDate?.toLocaleDateString() || 'Unknown'
      
      // Notify the assignee
      if (task.assigneeId) {
        await createNotification({
          userId: task.assigneeId,
          ...NotificationTemplates.taskDueSoon(task.title, dueDateString)
        })
      }

      // Notify the creator
      if (task.creatorId !== task.assigneeId) {
        await createNotification({
          userId: task.creatorId,
          ...NotificationTemplates.taskDueSoon(task.title, dueDateString)
        })
      }
    }

    logger.debug(`Checked ${tasksDueSoon.length} tasks due soon`)
  } catch (error) {
    logError(error, { context: 'checkTasksDueSoon' })
  }
}

// Function to run all scheduled checks
export async function runScheduledNotifications() {
  logger.info('Running scheduled notifications...')
  await Promise.all([
    checkOverdueTasks(),
    checkTasksDueSoon()
  ])
  logger.info('Scheduled notifications completed')
}
