import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getManagersAndAdmins } from '@/lib/notifications'
import { broadcastNotification } from '@/lib/notifications/real-time'
import { getCompanySettings, calculateLateMinutes, isLateArrival } from '@/lib/settings'

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
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    })

    console.log('Employee found:', employee);

    // For admin users, allow check-in even without employee record
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
      console.log('Employee status:', employee.status, 'Type:', typeof employee.status);
      if (employee.status && employee.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Your account status is ${employee.status}. You cannot check in at this time.` },
          { status: 403 }
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
      return NextResponse.json(
        { error: 'Already checked in today' },
        { status: 400 }
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
        status: isLate ? 'late' : 'present',
        notes
      },
      update: {
        checkIn: now,
        status: isLate ? 'late' : 'present',
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
      
      // Notify managers and admins
      const managersAndAdmins = await getManagersAndAdmins()
      const notifications = managersAndAdmins.map(user => ({
        userId: user.id,
        ...(isLate 
          ? NotificationTemplates.attendanceLate(session.user.name || 'Unknown', timeString, lateMinutes)
          : NotificationTemplates.attendanceCheckedIn(session.user.name || 'Unknown', timeString)
        )
      }))

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications
        })
      }

      // Notify the employee if they're late
      if (isLate) {
        await createNotification({
          userId: session.user.id,
          title: 'Late Arrival Notice',
          message: `You arrived ${lateMinutes} minutes late today. Please try to arrive on time (08:00) in the future.`,
          type: 'warning'
        })
      }
    } catch (notificationError) {
      console.error('Error sending check-in notifications:', notificationError)
      // Don't fail the check-in if notifications fail
    }

    // Send real-time notification
    try {
      const timeString = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });

      // Broadcast to all connected users
      broadcastNotification({
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
      });
    } catch (notificationError) {
      console.error('Error sending real-time notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      data: attendance,
      message: 'Successfully checked in'
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    )
  }
}
