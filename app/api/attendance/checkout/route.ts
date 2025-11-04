import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getManagersAndAdmins } from '@/lib/notifications'
import { broadcastNotification } from '@/lib/notifications/real-time'
import { getCompanySettings, calculateOvertimeHours } from '@/lib/settings'
import { logError } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    })

    // For admin users, allow check-out even without employee record
    if (!employee && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      )
    }

    // Only check employee status for non-admin users
    if (employee && session.user.role !== 'ADMIN') {
      // Check if employee is active
      if (!employee.isActive) {
        return NextResponse.json(
          { error: 'Your employee account is inactive. Please contact HR for assistance.' },
          { status: 403 }
        )
      }

      // Check if employee status allows attendance
      if (employee.status && employee.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Your account status is ${employee.status}. You cannot check out at this time.` },
          { status: 403 }
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
      return NextResponse.json(
        { error: 'No check-in record found for today' },
        { status: 400 }
      )
    }

    if (attendance.checkOut) {
      return NextResponse.json(
        { error: 'Already checked out today' },
        { status: 400 }
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
      
      // Notify managers and admins
      const managersAndAdmins = await getManagersAndAdmins()
      const notifications = managersAndAdmins.map(user => ({
        userId: user.id,
        ...(isEarly 
          ? NotificationTemplates.attendanceEarly(session.user.name || 'Unknown', timeString, earlyMinutes)
          : NotificationTemplates.attendanceCheckedOut(session.user.name || 'Unknown', timeString)
        )
      }))

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications
        })
      }

      // Notify the employee if they're checking out early
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

      // Broadcast to all connected users
      const overtimeMessage = overtimeHours > 0 ? ` (${overtimeHours.toFixed(1)}h overtime)` : ''
      broadcastNotification({
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
      });
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/attendance/checkout - real-time', userId: session.user.id });
    }

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
    return NextResponse.json(
      { error: 'Failed to check out' },
      { status: 500 }
    )
  }
}
