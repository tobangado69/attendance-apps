import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getAttendanceNotificationRecipients } from '@/lib/notifications'
import { getCompanySettings, calculateLateMinutes, isLateArrival } from '@/lib/settings'
import { logError } from '@/lib/utils/logger'
import { AttendanceStatus, EmployeeStatus } from '@/lib/constants/status'
import { CACHE_TAGS } from '@/lib/utils/api-cache'
import { formatErrorResponse } from '@/lib/api/api-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return formatErrorResponse('Unauthorized. Please sign in to continue.', 401)
    }

    const { notes } = await request.json()
    const now = new Date()
    
    // Get company settings for working hours and late policy
    const settings = await getCompanySettings()
    
    // Calculate if employee is late using company settings
    const lateMinutes = calculateLateMinutes(now, settings)
    const isLate = isLateArrival(now, settings)
        
        // Get user and employee records with status validation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true,
        // Check if user is active (not deleted/disabled)
        createdAt: true
      }
    })

    if (!user) {
      return formatErrorResponse('User account not found. Please contact support.', 404)
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    })

    // For admin users, allow check-in even without employee record
    if (!employee && session.user.role !== 'ADMIN') {
      return formatErrorResponse('Employee record not found. Please contact HR to set up your employee profile.', 404)
    }

    // Only check employee status for non-admin users
    if (employee && session.user.role !== 'ADMIN') {
      // Check if employee is active
      if (!employee.isActive) {
        return formatErrorResponse(
          'Your employee account is inactive. You cannot check in at this time. Please contact HR for assistance.',
          403,
          { code: 'EMPLOYEE_INACTIVE', reason: 'Account is marked as inactive' }
        )
      }

      // Check if employee status allows attendance
      if (employee.status && employee.status !== EmployeeStatus.ACTIVE) {
        const statusMessages: Record<string, string> = {
          [EmployeeStatus.INACTIVE]: 'Your account is inactive. Please contact HR to reactivate your account.',
          [EmployeeStatus.LAYOFF]: 'Your account is on layoff status. You cannot check in at this time.',
          [EmployeeStatus.TERMINATED]: 'Your account has been terminated. Please contact HR for assistance.',
          [EmployeeStatus.ON_LEAVE]: 'You are currently on leave. You cannot check in during leave period.',
          [EmployeeStatus.SUSPENDED]: 'Your account is suspended. Please contact HR for assistance.'
        }

        const message = statusMessages[employee.status] || `Your account status is ${employee.status}. You cannot check in at this time.`

        return formatErrorResponse(
          message,
          403,
          { code: 'EMPLOYEE_STATUS_RESTRICTED', status: employee.status }
        )
      }
    }
    
    // Check if user already checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today
        }
      }
    })

    if (existingAttendance?.checkIn) {
      return formatErrorResponse(
        'You have already checked in today. You can only check in once per day.',
        400,
        { code: 'ALREADY_CHECKED_IN' }
      )
    }

    // Create or update attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        id: existingAttendance?.id || 'new'
      },
      create: {
        userId: session.user.id,
        employeeId: employee?.id,
        checkIn: now,
        date: today,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        notes
      },
      update: {
        checkIn: now,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        notes
      }
    })

    // Send notifications
    try {
      const timeString = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      })
      
      // Get notification recipients based on role-based access control
      // Employee: Notify their manager + all admins
      // Manager: Notify their manager + all admins
      // Admin: Notify all admins
      const recipientIds = await getAttendanceNotificationRecipients(
        session.user.id,
        session.user.role || 'EMPLOYEE'
      )

      if (recipientIds.length > 0) {
        const notifications = recipientIds.map(userId => ({
          userId,
          ...(isLate 
            ? NotificationTemplates.attendanceLate(session.user.name || 'Unknown', timeString, lateMinutes)
            : NotificationTemplates.attendanceCheckedIn(session.user.name || 'Unknown', timeString)
          )
        }))

        await prisma.notification.createMany({
          data: notifications
        })
      }

      // Notify the employee if they're late (personal notification)
      if (isLate) {
        await createNotification({
          userId: session.user.id,
          title: 'Late Arrival Notice',
          message: `You arrived ${lateMinutes} minutes late today. Please try to arrive on time (08:00) in the future.`,
          type: 'warning'
        })
      }
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/attendance/checkin - notifications', userId: session.user.id })
      // Don't fail the check-in if notifications fail
    }

    // Send real-time notification
    try {
      const timeString = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });

      // Get recipient IDs for real-time broadcast
      const recipientIds = await getAttendanceNotificationRecipients(
        session.user.id,
        session.user.role || 'EMPLOYEE'
      )

      // Import sendNotificationToUser for targeted real-time notifications
      const { sendNotificationToUser } = await import('@/lib/notifications/real-time')

      // Send real-time notification only to authorized recipients
      const notificationData = {
        title: 'Employee Checked In',
        message: `${session.user.name} checked in at ${timeString}${isLate ? ` (${lateMinutes} minutes late)` : ''}`,
        type: isLate ? 'warning' : 'info',
        data: {
          userId: session.user.id,
          userName: session.user.name,
          action: 'checked in',
          time: timeString,
          isLate,
          lateMinutes
        }
      }

      // Send to each recipient individually
      for (const recipientId of recipientIds) {
        sendNotificationToUser(recipientId, notificationData)
      }
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/attendance/checkin - real-time', userId: session.user.id });
    }

    // Invalidate attendance cache
    revalidateTag(CACHE_TAGS.ATTENDANCE)

    return NextResponse.json({
      success: true,
      data: attendance,
      message: 'Successfully checked in'
    })
  } catch (error) {
    logError(error, { context: 'POST /api/attendance/checkin' })
    return formatErrorResponse(
      'An unexpected error occurred while processing your check-in. Please try again or contact support if the problem persists.',
      500
    )
  }
}
