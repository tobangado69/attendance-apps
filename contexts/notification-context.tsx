"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useServerSentEvents } from "@/hooks/use-server-sent-events";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  isRead: boolean;
  userId: string;
  data?: Record<string, unknown>;
}

interface SSEMessageData {
  type: string;
  id?: string;
  title?: string;
  message?: string;
  notificationType?: string;
  userId?: string;
  data?: Record<string, unknown>;
  userName?: string;
  action?: string;
  time?: string;
  taskTitle?: string;
  [key: string]: unknown;
}

interface NotificationApiResponse {
  id: string;
  title: string;
  message: string;
  type?: string;
  notificationType?: string;
  timestamp?: string;
  createdAt?: string;
  isRead: boolean;
  userId: string;
  data?: Record<string, unknown>;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "isRead">
  ) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isConnected, error } = useServerSentEvents();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationMessage = useCallback(
    (data: SSEMessageData) => {
      console.log("Received SSE message:", data);
      console.log("Message type:", data.type);
      console.log("Message data:", JSON.stringify(data, null, 2));
      console.log("Current notifications count:", notifications.length);

      switch (data.type) {
        case "notification":
          const notificationId =
            data.id ||
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Check if notification already exists to prevent duplicates
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === notificationId);
            if (exists) {
              console.log(
                "Notification already exists, skipping duplicate:",
                notificationId
              );
              return prev;
            }

            const notification: Notification = {
              id: notificationId,
              title: data.title,
              message: data.message,
              type: data.notificationType || data.type || "info",
              timestamp: (() => {
                try {
                  // Always use current time for real-time notifications
                  const now = new Date();
                  console.log(
                    "Creating notification with timestamp:",
                    now.toISOString(),
                    "Date object:",
                    now,
                    "isValid:",
                    !isNaN(now.getTime())
                  );
                  return now;
                } catch (error) {
                  console.error("Error creating timestamp:", error);
                  return new Date();
                }
              })(),
              isRead: false,
              userId: data.userId || session?.user?.id || "unknown",
              data: data.data,
            };

            console.log("Adding new notification:", notification);

            // Show toast notification
            switch (notification.type) {
              case "success":
                toast.success(notification.title, {
                  description: notification.message,
                  duration: 5000,
                });
                break;
              case "error":
                toast.error(notification.title, {
                  description: notification.message,
                  duration: 7000,
                });
                break;
              case "warning":
                toast.warning(notification.title, {
                  description: notification.message,
                  duration: 6000,
                });
                break;
              default:
                toast.info(notification.title, {
                  description: notification.message,
                  duration: 5000,
                });
            }

            return [notification, ...prev.slice(0, 49)]; // Keep last 50
          });
          break;

        case "attendance_update":
          // Handle real-time attendance updates
          toast.info("Attendance Update", {
            description: `${data.userName} ${data.action} at ${data.time}`,
            duration: 4000,
          });
          break;

        case "task_update":
          // Handle real-time task updates
          toast.info("Task Update", {
            description: `Task "${data.taskTitle}" ${data.action}`,
            duration: 4000,
          });
          break;
      }
    },
    [session?.user?.id]
  );

  // Listen for SSE messages
  useEffect(() => {
    const handleSSEMessage = (event: CustomEvent) => {
      console.log("SSE message received in context:", event.detail);
      const data = event.detail;
      handleNotificationMessage(data);
    };

    console.log("Setting up SSE message listener");
    window.addEventListener(
      "sse-notification",
      handleSSEMessage as EventListener
    );

    return () => {
      console.log("Cleaning up SSE message listener");
      window.removeEventListener(
        "sse-notification",
        handleSSEMessage as EventListener
      );
    };
  }, [handleNotificationMessage]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );

    // Update on server
    fetch(`/api/notifications/${id}/read`, {
      method: "PUT",
    })
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Failed to mark notification as read:",
            response.statusText
          );
        }
      })
      .catch((error) => {
        console.error("Error marking notification as read:", error);
      });
  }, []);

  const markAllAsRead = useCallback(() => {
    console.log("Marking all notifications as read...");
    setNotifications((prev) => {
      const updated = prev.map((notification) => ({
        ...notification,
        isRead: true,
      }));
      console.log(
        "Updated notifications locally:",
        updated.map((n) => ({ id: n.id, isRead: n.isRead }))
      );
      return updated;
    });

    // Update on server
    fetch("/api/notifications/read-all", {
      method: "PUT",
    })
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Failed to mark all notifications as read:",
            response.statusText
          );
        } else {
          console.log(
            "All notifications marked as read successfully on server"
          );
        }
      })
      .catch((error) => {
        console.error("Error marking all notifications as read:", error);
      });
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => {
      const now = new Date();
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: now,
        isRead: false,
      };

      // Validate the notification before adding
      if (!newNotification.title || !newNotification.message) {
        console.warn("Invalid notification data:", newNotification);
        return;
      }

      console.log(
        "Adding notification with timestamp:",
        now.toISOString(),
        "isValid:",
        !isNaN(now.getTime())
      );

      setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Load existing notifications on mount
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications?limit=20");
        if (response.ok) {
            const data = await response.json();
            console.log("Loaded notifications:", data.data);
            console.log(
              "Notification read statuses:",
              data.data?.map((n: NotificationApiResponse) => ({ id: n.id, isRead: n.isRead }))
            );

            // Ensure all notifications have valid timestamps and exclude user object
            const validNotifications = (data.data || []).map(
              (notification: NotificationApiResponse): Notification => {
                const { user, ...notificationData } = notification;
                return {
                  ...notificationData,
                  timestamp: (() => {
                    try {
                      const date = new Date(
                        notification.timestamp ||
                          notification.createdAt ||
                          Date.now()
                      );
                      return isNaN(date.getTime()) ? new Date() : date;
                    } catch (error) {
                      console.warn(
                        "Invalid timestamp in loaded notification:",
                        notification.timestamp
                      );
                      return new Date();
                    }
                  })(),
                } as Notification;
              }
            );

            console.log(
              "Setting notifications with read statuses:",
              validNotifications.map((n: Notification) => ({ id: n.id, isRead: n.isRead }))
            );
          setNotifications(validNotifications);
        } else {
          console.error(
            "Failed to load notifications:",
            response.status,
            response.statusText
          );
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();
  }, [session?.user?.id]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
