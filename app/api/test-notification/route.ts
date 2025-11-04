import { NextRequest, NextResponse } from 'next/server';
import { broadcastNotification } from '@/lib/notifications/real-time';

export async function POST(request: NextRequest) {
  try {
    const { title, message, type = 'info' } = await request.json();

    // Send real-time notification
    broadcastNotification({
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      type: type || 'info',
      data: { test: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
