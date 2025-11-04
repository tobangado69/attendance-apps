"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/contexts/notification-context";
import { formatDistanceToNow } from "date-fns";

// Helper function to safely format dates
const safeFormatDistanceToNow = (date: Date | string | number): string => {
  try {
    let dateObj: Date;

    // If it's already a Date object, use it directly
    if (date instanceof Date) {
      dateObj = date;
    } else {
      // Otherwise, create a new Date
      dateObj = new Date(date);
    }

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(
        "Invalid date provided to safeFormatDistanceToNow:",
        date,
        "Type:",
        typeof date
      );
      return "Just now";
    }

    // Format the date
    const result = formatDistanceToNow(dateObj, { addSuffix: true });
    console.log(
      "Formatted date:",
      result,
      "Original date:",
      dateObj.toISOString()
    );
    return result;
  } catch (error) {
    console.error(
      "Error formatting date:",
      error,
      "Original date:",
      date,
      "Type:",
      typeof date
    );
    return "Just now";
  }
};

export function EnhancedNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } =
    useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-blue-600";
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
            {!isConnected && (
              <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Notifications
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      className="h-8 px-2 text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <span>{isConnected ? "Connected" : "Reconnecting..."}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          !notification.isRead ? "bg-blue-50/50" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4
                                className={`text-sm font-medium ${getNotificationColor(
                                  notification.type
                                )}`}
                              >
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {safeFormatDistanceToNow(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
