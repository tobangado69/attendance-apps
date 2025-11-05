import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getAttendanceNotificationRecipients } from '@/lib/notifications'
import { getCompanySettings, calculateOvertimeHours } from '@/lib/settings'
import { logError } from '@/lib/utils/logger'
import { EmployeeStatus } from '@/lib/constants/status'
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
    
    // Set expected check-out time to 17:00
    const expectedCheckOut = new Date(now)
    expectedCheckOut.setHours(17, 0, 0, 0)
    
    // Calculate if employee is checking out early (before 17:00)
    const isEarly = now < expectedCheckOut
    const earlyMinutes = isEarly ? Math.floor((expectedCheckOut.getTime() - now.getTime()) / (1000 * 60)) : 0
    
    // Get user and employee records with status validation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true,
        createdAt: true
      }
    })

    if (!user) {
      return formatErrorResponse('User account not found. Please contact support.', 404)
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    })

    // For admin users, allow check-out even without employee record
    if (!employee && session.user.role !== 'ADMIN') {
      return formatErrorResponse('Employee record not found. Please contact HR to set up your employee profile.', 404)
    }

    // Only check employee status for non-admin users
    if (employee && session.user.role !== 'ADMIN') {
      // Check if employee is active
      if (!employee.isActive) {
        return formatErrorResponse(
          'Your employee account is inactive. You cannot check out at this time. Please contact HR for assistance.',
          403,
          { code: 'EMPLOYEE_INACTIVE', reason: 'Account is marked as inactive' }
        )
      }

      // Check if employee status allows attendance
      if (employee.status && employee.status !== EmployeeStatus.ACTIVE) {
        const statusMessages: Record<string, string> = {
          [EmployeeStatus.INACTIVE]: 'Your account is inactive. Please contact HR to reactivate your account.',
          [EmployeeStatus.LAYOFF]: 'Your account is on layoff status. You cannot check out at this time.',
          [EmployeeStatus.TERMINATED]: 'Your account has been terminated. Please contact HR for assistance.',
          [EmployeeStatus.ON_LEAVE]: 'You are currently on leave. You cannot check out during leave period.',
          [EmployeeStatus.SUSPENDED]: 'Your account is suspended. Please contact HR for assistance.'
        }

        const message = statusMessages[employee.status] || `Your account status is ${employee.status}. You cannot check out at this time.`

        return formatErrorResponse(
          message,
          403,
          { code: 'EMPLOYEE_STATUS_RESTRICTED', status: employee.status }
        )
      }
    }
    
    // Find today's attendance record
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today
        },
        checkIn: {
          not: null
        }
      }
    })

    if (!attendance) {
      return formatErrorResponse(
        'No check-in record found for today. Please check in first before checking out.',
        400,
        { code: 'NO_CHECK_IN_RECORD' }
      )
    }

    if (attendance.checkOut) {
      return formatErrorResponse(
        'You have already checked out today. You can only check out once per day.',
        400,
        { code: 'ALREADY_CHECKED_OUT' }
      )
    }

    // Get company settings for overtime calculation
    const settings = await getCompanySettings()
    
    // Calculate total hours
    const checkInTime = attendance.checkIn!
    const totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    const roundedTotalHours = Math.round(totalHours * 10) / 10 // Round to 1 decimal
    
    // Calculate overtime hours using company settings
    const overtimeHours = calculateOvertimeHours(roundedTotalHours, settings)

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        totalHours: roundedTotalHours,
        notes: notes || attendance.notes
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
          ...(isEarly 
            ? NotificationTemplates.attendanceEarly(session.user.name || 'Unknown', timeString, earlyMinutes)
            : NotificationTemplates.attendanceCheckedOut(session.user.name || 'Unknown', timeString)
          )
        }))

        await prisma.notification.createMany({
          data: notifications
        })
      }

      // Notify the employee if they're checking out early (personal notification)
      if (isEarly) {
        await createNotification({
          userId: session.user.id,
          title: 'Early Departure Notice',
          message: `You checked out ${earlyMinutes} minutes early today. Please ensure you complete your full work hours (until 17:00) in the future.`,
          type: 'warning'
        })
      }
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/attendance/checkout - notifications', userId: session.user.id })
      // Don't fail the check-out if notifications fail
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
      const overtimeMessage = overtimeHours > 0 ? ` (${overtimeHours.toFixed(1)}h overtime)` : ''
      const notificationData = {
        title: 'Employee Checked Out',
        message: `${session.user.name} checked out at ${timeString}${isEarly ? ` (${earlyMinutes} minutes early)` : ''} - Total hours: ${updatedAttendance.totalHours}h${overtimeMessage}`,
        type: isEarly ? 'warning' : overtimeHours > 0 ? 'success' : 'info',
        data: {
          userId: session.user.id,
          userName: session.user.name,
          action: 'checked out',
          time: timeString,
          isEarly,
          earlyMinutes,
          totalHours: updatedAttendance.totalHours
        }
      }

      // Send to each recipient individually
      for (const recipientId of recipientIds) {
        sendNotificationToUser(recipientId, notificationData)
      }
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/attendance/checkout - real-time', userId: session.user.id });
    }

    // Invalidate attendance cache
    revalidateTag(CACHE_TAGS.ATTENDANCE)

    return NextResponse.json({
      success: true,
      data: updatedAttendance,
      message: isEarly 
        ? `Successfully checked out (${earlyMinutes} minutes early)`
        : 'Successfully checked out',
      totalHours: updatedAttendance.totalHours
    })
  } catch (error) {
    logError(error, { context: 'POST /api/attendance/checkout' })
    return formatErrorResponse(
      'An unexpected error occurred while processing your check-out. Please try again or contact support if the problem persists.',
      500
    )
  }
}
