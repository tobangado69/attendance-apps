"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckSquare,
  BarChart3,
  LogIn,
  LogOut,
  Calendar,
  FileText,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<{
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkInTime?: string;
    checkOutTime?: string;
    currentDate?: string;
  }>({
    hasCheckedIn: false,
    hasCheckedOut: false,
  });
  const [employeeStatus, setEmployeeStatus] = useState<{
    isActive: boolean;
    status: string;
  } | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Check employee status
  const checkEmployeeStatus = async () => {
    try {
      const response = await fetch("/api/employees/me");
      if (response.ok) {
        const data = await response.json();
        console.log("Quick Actions - Current user employee data:", data.data);

        if (data.success && data.data) {
          const status = {
            isActive: data.data.isActive,
            status: data.data.status || "ACTIVE",
          };
          console.log("Quick Actions - Setting employee status:", status);
          setEmployeeStatus(status);
        } else {
          console.log("Quick Actions - No employee data received");
          // Set default status for users without employee record
          setEmployeeStatus({
            isActive: true,
            status: "ACTIVE",
          });
        }
      } else {
        console.error(
          "Quick Actions - Failed to fetch employee data:",
          response.status
        );
        // Set default status on API error
        setEmployeeStatus({
          isActive: true,
          status: "ACTIVE",
        });
      }
    } catch (error) {
      console.error("Quick Actions - Error checking employee status:", error);
      // Set default status on error
      setEmployeeStatus({
        isActive: true,
        status: "ACTIVE",
      });
    }
  };

  // Check for day changes and reset attendance status
  const checkDayChange = () => {
    const today = new Date().toISOString().split("T")[0];
    if (currentDate !== today) {
      // Day has changed, reset attendance status
      setCurrentDate(today);
      setAttendanceStatus({
        hasCheckedIn: false,
        hasCheckedOut: false,
        currentDate: today,
      });
    }
  };

  // Check current attendance status
  const checkAttendanceStatus = async () => {
    try {
      // Get today's date range with proper timezone handling
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("Fetching attendance for date range:", {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      });

      const response = await fetch(
        `/api/attendance?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Attendance API response:", data);

        // The API automatically filters by userId for non-admin users
        const todayAttendance = data.data?.[0]; // Get the first (and should be only) record for today
        console.log("Today's attendance record:", todayAttendance);

        if (todayAttendance) {
          const newStatus = {
            hasCheckedIn: !!todayAttendance.checkIn,
            hasCheckedOut: !!todayAttendance.checkOut,
            checkInTime: todayAttendance.checkIn
              ? new Date(todayAttendance.checkIn).toLocaleTimeString("en-GB", {
                  hour12: false,
                })
              : undefined,
            checkOutTime: todayAttendance.checkOut
              ? new Date(todayAttendance.checkOut).toLocaleTimeString("en-GB", {
                  hour12: false,
                })
              : undefined,
            currentDate: today.toISOString().split("T")[0],
          };
          console.log("Setting attendance status:", newStatus);
          setAttendanceStatus(newStatus);
        } else {
          // No attendance record for today, reset status
          console.log("No attendance record found for today, resetting status");
          setAttendanceStatus({
            hasCheckedIn: false,
            hasCheckedOut: false,
            currentDate: today.toISOString().split("T")[0],
          });
        }
      } else {
        console.error(
          "Failed to fetch attendance:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error checking attendance status:", error);
    }
  };

  // Check attendance and employee status on component mount
  useEffect(() => {
    if (session?.user?.id) {
      checkAttendanceStatus();
      checkEmployeeStatus();
    }
  }, [session?.user?.id]);

  // Check for day changes every minute
  useEffect(() => {
    const interval = setInterval(() => {
      checkDayChange();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  const handleCheckIn = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to check in");
      return;
    }

    setIsCheckingIn(true);
    try {
      const response = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: "Checked in via Quick Actions",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Checked in successfully!");
        setAttendanceStatus((prev) => ({
          ...prev,
          hasCheckedIn: true,
          checkInTime: data.data.checkIn
            ? new Date(data.data.checkIn).toLocaleTimeString("en-GB", {
                hour12: false,
              })
            : undefined,
        }));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to check in");
      }
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to check out");
      return;
    }

    // Additional validation: Check if user has checked in first
    if (!attendanceStatus.hasCheckedIn) {
      toast.error("You must check in first before checking out");
      return;
    }

    if (attendanceStatus.hasCheckedOut) {
      toast.error("You have already checked out today");
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: "Checked out via Quick Actions",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Checked out successfully!");
        setAttendanceStatus((prev) => ({
          ...prev,
          hasCheckedOut: true,
          checkOutTime: data.data.checkOut
            ? new Date(data.data.checkOut).toLocaleTimeString("en-GB", {
                hour12: false,
              })
            : undefined,
        }));
      } else {
        const error = await response.json();
        if (response.status === 400) {
          toast.error(
            error.error ||
              "Cannot check out - no check-in record found for today"
          );
        } else {
          toast.error(error.error || "Failed to check out");
        }
      }
    } catch (error) {
      console.error("Check-out error:", error);
      toast.error("Failed to check out");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleViewTasks = () => {
    router.push("/dashboard/tasks");
  };

  const handleGenerateReport = () => {
    router.push("/dashboard/reports");
  };

  const getAttendanceStatusBadge = () => {
    console.log(
      "Badge render - hasCheckedIn:",
      attendanceStatus.hasCheckedIn,
      "hasCheckedOut:",
      attendanceStatus.hasCheckedOut
    );

    if (attendanceStatus.hasCheckedOut) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Completed
        </Badge>
      );
    } else if (attendanceStatus.hasCheckedIn) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Checked In
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600">
          Not Started
        </Badge>
      );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Check In/Out Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Check In/Out</div>
                <div className="text-sm text-gray-500">
                  Record your attendance
                </div>
              </div>
              {getAttendanceStatusBadge()}
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleCheckIn}
                disabled={
                  isCheckingIn ||
                  attendanceStatus.hasCheckedIn ||
                  attendanceStatus.hasCheckedOut
                }
                className="flex-1"
                size="sm"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isCheckingIn ? "Checking In..." : "Check In"}
              </Button>

              <Button
                onClick={handleCheckOut}
                disabled={
                  isCheckingOut ||
                  !attendanceStatus.hasCheckedIn ||
                  attendanceStatus.hasCheckedOut
                }
                variant="outline"
                className="flex-1"
                size="sm"
                title={
                  !attendanceStatus.hasCheckedIn
                    ? "You must check in first"
                    : attendanceStatus.hasCheckedOut
                    ? "Already checked out today"
                    : "Check out"
                }
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isCheckingOut
                  ? "Checking Out..."
                  : !attendanceStatus.hasCheckedIn
                  ? "Check In First"
                  : attendanceStatus.hasCheckedOut
                  ? "Already Out"
                  : "Check Out"}
              </Button>
            </div>

            {attendanceStatus.checkInTime && (
              <div className="text-xs text-gray-500">
                Checked in: {attendanceStatus.checkInTime}
              </div>
            )}

            {attendanceStatus.checkOutTime && (
              <div className="text-xs text-gray-500">
                Checked out: {attendanceStatus.checkOutTime}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            {/* View Tasks */}
            <Button
              onClick={handleViewTasks}
              variant="ghost"
              className="w-full justify-start p-3 h-auto"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">View Tasks</div>
                    <div className="text-sm text-gray-500">
                      Check your assigned tasks
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </Button>

            {/* Generate Report */}
            <RoleGuard requiredRoles={["ADMIN", "MANAGER"]}>
              <Button
                onClick={handleGenerateReport}
                variant="ghost"
                className="w-full justify-start p-3 h-auto mt-2"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Generate Report</div>
                      <div className="text-sm text-gray-500">
                        Create attendance reports
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Button>
            </RoleGuard>

            {/* View Attendance History */}
            <Button
              onClick={() => router.push("/dashboard/attendance")}
              variant="ghost"
              className="w-full justify-start p-3 h-auto mt-2"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Attendance History</div>
                    <div className="text-sm text-gray-500">
                      View your attendance records
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
