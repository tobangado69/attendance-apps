// Store active connections for real-time notifications
const connections = new Map<string, ReadableStreamDefaultController>();

// Store user roles for filtering
const userRoles = new Map<string, string>();

// Function to send notification to a specific user
export function sendNotificationToUser(userId: string, notification: Record<string, unknown>) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      const data = JSON.stringify({
        type: 'notification',
        id: notification.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: notification.title,
        message: notification.message,
        notificationType: notification.type || 'info',
        timestamp: new Date().toISOString(),
        userId: userId,
        data: notification.data
      });
      controller.enqueue(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      connections.delete(userId);
    }
  }
}

// Function to broadcast notification to all connected users
export function broadcastNotification(notification: Record<string, unknown>) {
  console.log('Broadcasting notification to', connections.size, 'connected users');
  console.log('Notification data:', notification);
  
  if (connections.size === 0) {
    console.warn('No active connections to broadcast to');
    return;
  }
  
  connections.forEach((controller, userId) => {
    try {
      const data = JSON.stringify({
        type: 'notification',
        id: notification.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: notification.title,
        message: notification.message,
        notificationType: notification.type || 'info',
        timestamp: new Date().toISOString(),
        userId: userId,
        data: notification.data
      });
      
      console.log('Sending notification to user', userId, ':', data);
      controller.enqueue(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error broadcasting notification to user', userId, ':', error);
      connections.delete(userId);
    }
  });
}

// Function to add a connection
export function addConnection(userId: string, controller: ReadableStreamDefaultController, role?: string) {
  connections.set(userId, controller);
  if (role) {
    userRoles.set(userId, role);
  }
  console.log(`SSE: User ${userId} connected with role ${role}. Total connections: ${connections.size}`);
}

// Function to remove a connection
export function removeConnection(userId: string) {
  connections.delete(userId);
  userRoles.delete(userId);
  console.log(`SSE: User ${userId} disconnected. Total connections: ${connections.size}`);
}

// Function to broadcast notification to specific roles only
export function broadcastNotificationToRoles(notification: Record<string, unknown>, allowedRoles: string[]) {
  console.log('Broadcasting notification to roles:', allowedRoles);
  console.log('Notification data:', notification);
  
  if (connections.size === 0) {
    console.warn('No active connections to broadcast to');
    return;
  }
  
  connections.forEach((controller, userId) => {
    const userRole = userRoles.get(userId);
    
    // Check if user role is in allowed roles
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log(`Skipping user ${userId} with role ${userRole} - not in allowed roles:`, allowedRoles);
      return;
    }
    
    try {
      const data = JSON.stringify({
        type: 'notification',
        id: notification.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: notification.title,
        message: notification.message,
        notificationType: notification.type || 'info',
        timestamp: new Date().toISOString(),
        userId: userId,
        data: notification.data
      });
      
      console.log('Sending notification to user', userId, 'with role', userRole, ':', data);
      controller.enqueue(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error broadcasting notification to user', userId, ':', error);
      connections.delete(userId);
      userRoles.delete(userId);
    }
  });
}

// Function to get all connections
export function getConnections() {
  return connections;
}
