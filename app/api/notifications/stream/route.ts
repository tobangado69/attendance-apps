import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addConnection, removeConnection } from '@/lib/notifications/real-time';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this user with their role
      addConnection(userId, controller, session.user.role);

      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        message: 'Connected to real-time notifications',
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
          controller.enqueue(`data: ${heartbeatData}\n\n`);
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeat);
        }
      }, 30000);

      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        removeConnection(userId);
        clearInterval(heartbeat);
        controller.close();
      });
    },
    cancel() {
      removeConnection(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

