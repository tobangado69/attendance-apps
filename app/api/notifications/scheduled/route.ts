import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runScheduledNotifications } from '@/lib/scheduled-notifications'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can trigger scheduled notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await runScheduledNotifications()

    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications completed'
    })
  } catch (error) {
    console.error('Error running scheduled notifications:', error)
    return NextResponse.json(
      { error: 'Failed to run scheduled notifications' },
      { status: 500 }
    )
  }
}
