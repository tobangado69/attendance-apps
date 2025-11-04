"use client";

import { useSession } from "next-auth/react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EnhancedNotificationBell } from "@/components/notifications/enhanced-notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

export function Header() {
  const { data: session } = useSession();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<{
    name: string;
    role: string;
  } | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/employees/me");
        const result = await response.json();
        if (result.success && result.data?.user) {
          setUserImage(result.data.user.image);
          setUserData({
            name: result.data.user.name,
            role: result.data.user.role,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (session?.user) {
      fetchUserData();
    }

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchUserData();
    };

    window.addEventListener("profileImageUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileImageUpdated", handleProfileUpdate);
    };
  }, [session?.user]);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search employees, tasks..."
              className="pl-10 w-64"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <EnhancedNotificationBell />

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {userData?.name || session?.user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {userData?.role || session?.user?.role || "User"}
              </p>
            </div>
            <Avatar className="h-8 w-8">
              {userImage && userImage.trim() !== "" ? (
                <AvatarImage
                  src={userImage}
                  alt={session?.user?.name || "User"}
                />
              ) : null}
              <AvatarFallback className="text-sm font-medium text-gray-700">
                {(userData?.name || session?.user?.name)?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
