# Real-Time Notifications System

## 🚀 Overview

A comprehensive real-time notification system built with Server-Sent Events (SSE) that provides live updates for attendance tracking, task management, and system events.

## ✨ Features

### 🔔 **Real-Time Notifications**
- Live attendance check-in/out notifications
- Task status updates and assignments
- System-wide broadcasts
- Toast notifications with Sonner
- Notification center with unread count

### 📱 **Notification Center**
- Enhanced notification bell with badge
- Real-time connection status indicator
- Mark as read / Mark all as read
- Notification history (last 50)
- Categorized by type (info, success, warning, error)

### 🔄 **Real-Time Events**
- **Attendance**: Check-in/out with time and status
- **Tasks**: Status changes, assignments, updates
- **System**: Connection status, errors, announcements

## 🏗️ Architecture

### **Components**
```
contexts/notification-context.tsx     # Main notification context
hooks/use-server-sent-events.ts      # SSE connection hook
components/notifications/
├── enhanced-notification-bell.tsx   # Notification center UI
└── notification-test.tsx            # Development testing
```

### **API Endpoints**
```
app/api/notifications/
├── stream/route.ts                  # SSE endpoint
├── ws/route.ts                     # WebSocket placeholder
└── route.ts                        # REST API for notifications
```

### **Real-Time Integration**
- **Check-in/out**: `app/api/attendance/checkin/route.ts`
- **Task updates**: `app/api/tasks/[id]/route.ts`
- **Broadcasting**: `app/api/notifications/stream/route.ts`

## 🚀 Usage

### **Basic Setup**
The notification system is automatically initialized in the root layout:

```tsx
<NotificationProvider>
  <App />
</NotificationProvider>
```

### **Using Notifications in Components**
```tsx
import { useNotifications } from '@/contexts/notification-context';

function MyComponent() {
  const { addNotification, notifications, unreadCount } = useNotifications();

  const handleAction = () => {
    addNotification({
      title: 'Success!',
      message: 'Action completed successfully',
      type: 'success',
      userId: 'user-id',
    });
  };

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {/* Your component */}
    </div>
  );
}
```

### **Sending Real-Time Notifications from API**
```typescript
import { broadcastNotification, sendNotificationToUser } from '@/lib/notifications/real-time';

// Broadcast to all connected users
broadcastNotification({
  title: 'System Update',
  message: 'New feature available!',
  type: 'info',
  data: { feature: 'notifications' }
});

// Send to specific user
sendNotificationToUser('user-id', {
  title: 'Personal Message',
  message: 'Hello there!',
  type: 'info'
});
```

## 🔧 Configuration

### **Environment Variables**
```env
# Optional: Custom SSE endpoint
NEXT_PUBLIC_SSE_URL=/api/notifications/stream
```

### **Notification Types**
- `info`: General information (blue)
- `success`: Success messages (green)
- `warning`: Warnings (yellow)
- `error`: Error messages (red)

## 🧪 Testing

### **Development Mode**
In development, a test component is available in the Quick Actions panel:

```tsx
<NotificationTest />
```

This allows you to:
- Send test notifications
- Test different notification types
- Verify real-time functionality
- Check connection status

### **Manual Testing**
1. Open multiple browser tabs
2. Check in/out in one tab
3. See real-time notifications in other tabs
4. Update task status
5. Verify notification center updates

## 🔄 Real-Time Events

### **Attendance Events**
```typescript
{
  type: 'attendance_update',
  title: 'Employee Checked In',
  message: 'John Doe checked in at 09:15 (5 minutes late)',
  data: {
    userId: 'user-id',
    userName: 'John Doe',
    action: 'checked in',
    time: '09:15',
    isLate: true,
    lateMinutes: 5
  }
}
```

### **Task Events**
```typescript
{
  type: 'task_update',
  title: 'Task Status Updated',
  message: 'Task "Fix bug" status changed to completed by Jane Smith',
  data: {
    taskId: 'task-id',
    taskTitle: 'Fix bug',
    action: 'status changed to completed',
    updatedBy: 'Jane Smith'
  }
}
```

## 🚀 Future Enhancements

### **Planned Features**
- [ ] Push notifications for mobile
- [ ] Email notifications
- [ ] Notification preferences
- [ ] Rich media notifications
- [ ] Notification scheduling
- [ ] WebSocket upgrade
- [ ] Notification analytics

### **Advanced Features**
- [ ] Notification templates
- [ ] Bulk notification sending
- [ ] Notification channels (SMS, email, push)
- [ ] Notification history export
- [ ] Real-time collaboration features

## 🐛 Troubleshooting

### **Common Issues**

1. **Notifications not appearing**
   - Check browser console for errors
   - Verify SSE connection status
   - Ensure user is authenticated

2. **Connection drops frequently**
   - Check network stability
   - Verify server is running
   - Check for proxy/firewall issues

3. **Toast notifications not showing**
   - Ensure Toaster component is in layout
   - Check Sonner configuration
   - Verify notification context is provided

### **Debug Mode**
Enable debug logging by adding to your component:
```tsx
useEffect(() => {
  console.log('Notifications:', notifications);
  console.log('Unread count:', unreadCount);
  console.log('Connected:', isConnected);
}, [notifications, unreadCount, isConnected]);
```

## 📊 Performance

### **Optimizations**
- Connection pooling for SSE
- Notification limit (50 max)
- Automatic cleanup of old notifications
- Efficient reconnection logic
- Minimal data transfer

### **Monitoring**
- Connection status indicators
- Error logging and reporting
- Performance metrics
- User engagement tracking

---

**Built with ❤️ for the Employee Dashboard**
