"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { logError } from "@/lib/utils/logger";
import { EmployeeStatus } from "@/lib/constants/status";
import { useErrorHandler } from "@/hooks/use-error-handler";

interface AttendanceStatus {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
  status?: string;
}

interface EmployeeStatus {
  isActive: boolean;
  status: string;
}

export function CheckInOut() {
  const { data: session } = useSession();
  const { executeWithErrorHandling, isLoading } = useErrorHandler();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    isCheckedIn: false,
    isCheckedOut: false,
  });
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeStatus | null>(
    null
  );

  useEffect(() => {
    if (session?.user?.id) {
      fetchTodayAttendance();
      checkEmployeeStatus();
    }
  }, [session?.user?.id]);

  const checkEmployeeStatus = async () => {
    await executeWithErrorHandling(
      async () => {
        const response = await fetch("/api/employees/me");

        if (!response.ok) {
          throw new Error(`Failed to fetch employee data: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          setEmployeeStatus({
            isActive: data.data.isActive,
            status: data.data.status || EmployeeStatus.ACTIVE,
          });
        } else {
          // Fallback: Set default status
          setEmployeeStatus({
            isActive: true,
            status: EmployeeStatus.ACTIVE,
          });
        }
      },
      {
        context: "CheckInOut - checkEmployeeStatus",
        showToast: false, // Don't show toast for this background check
        onError: () => {
          // Set fallback status on error to prevent buttons from being disabled
          setEmployeeStatus({
            isActive: true,
            status: EmployeeStatus.ACTIVE,
          });
        },
      }
    );
  };

  const fetchTodayAttendance = async () => {
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        limit: "1",
      });

      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();

      // The API returns { success: true, data: { attendance: [...], departments: [...] } }
      const attendanceArray = data.data?.attendance || [];
      
      if (attendanceArray.length > 0) {
        const todayRecord = attendanceArray[0];
        setAttendanceStatus({
          isCheckedIn: !!todayRecord.checkIn,
          isCheckedOut: !!todayRecord.checkOut,
          checkInTime: todayRecord.checkIn
            ? new Date(todayRecord.checkIn).toLocaleTimeString("en-GB", {
                hour12: false,
              })
            : undefined,
          checkOutTime: todayRecord.checkOut
            ? new Date(todayRecord.checkOut).toLocaleTimeString("en-GB", {
                hour12: false,
              })
            : undefined,
          totalHours: todayRecord.totalHours,
          status: todayRecord.status,
        });
      } else {
        // Reset status if no attendance record for today
        setAttendanceStatus({
          isCheckedIn: false,
          isCheckedOut: false,
        });
      }
    } catch (error) {
      logError(error, { context: "CheckInOut - fetchTodayAttendance" });
    }
  };

  const handleCheckIn = async () => {
    await executeWithErrorHandling(
      async () => {
        const response = await fetch("/api/attendance/checkin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: "" }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Create AppError with proper code and details from API response
          const { AppError } = await import("@/lib/error-handler");
          throw new AppError(
            data.error || "Failed to check in",
            data.code || "UNKNOWN_ERROR",
            data.statusCode || response.status,
            data.details
          );
        }

        showSuccessToast("Successfully checked in!");
        // Refresh attendance status to get the latest data
        await fetchTodayAttendance();
      },
      {
        context: "Check In",
        errorMessage: "Failed to check in",
      }
    );
  };

  const handleCheckOut = async () => {
    // Additional validation: Check if user has checked in first
    if (!attendanceStatus.isCheckedIn) {
      showErrorToast(new Error("You must check in first before checking out"), {
        context: "Check Out",
      });
      return;
    }

    if (attendanceStatus.isCheckedOut) {
      showErrorToast(new Error("You have already checked out today"), {
        context: "Check Out",
      });
      return;
    }

    await executeWithErrorHandling(
      async () => {
        const response = await fetch("/api/attendance/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: "" }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Create AppError with proper code and details from API response
          const { AppError } = await import("@/lib/error-handler");
          throw new AppError(
            data.error ||
              (response.status === 400
                ? "Cannot check out - no check-in record found for today"
                : "Failed to check out"),
            data.code || "UNKNOWN_ERROR",
            data.statusCode || response.status,
            data.details
          );
        }

        showSuccessToast(`${data.message}! Total hours: ${data.totalHours}h`);
        // Refresh attendance status to get the latest data
        await fetchTodayAttendance();
      },
      {
        context: "Check Out",
        errorMessage: "Failed to check out",
      }
    );
  };

  const getStatusColor = () => {
    if (attendanceStatus.isCheckedOut) return "text-green-600";
    if (attendanceStatus.isCheckedIn) return "text-blue-600";
    return "text-gray-600";
  };

  const getStatusIcon = () => {
    if (attendanceStatus.isCheckedOut)
      return <CheckCircle className="h-5 w-5" />;
    if (attendanceStatus.isCheckedIn) return <Clock className="h-5 w-5" />;
    return <XCircle className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (attendanceStatus.isCheckedOut) return "Checked Out";
    if (attendanceStatus.isCheckedIn) return "Checked In";
    return "Not Checked In";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Attendance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </div>
        </div>

        {attendanceStatus.checkInTime && (
          <div className="text-sm">
            <div>Check-in: {attendanceStatus.checkInTime}</div>
            {attendanceStatus.checkOutTime && (
              <div>Check-out: {attendanceStatus.checkOutTime}</div>
            )}
            {attendanceStatus.totalHours && (
              <div className="font-medium">
                Total Hours: {attendanceStatus.totalHours}h
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          {!attendanceStatus.isCheckedIn && (
            <Button
              onClick={handleCheckIn}
              disabled={Boolean(
                isLoading ||
                  !employeeStatus?.isActive ||
                  (employeeStatus?.status &&
                    employeeStatus.status !== EmployeeStatus.ACTIVE)
              )}
              className="flex-1"
            >
              {isLoading ? "Checking In..." : "Check In"}
            </Button>
          )}

          {attendanceStatus.isCheckedIn && !attendanceStatus.isCheckedOut && (
            <Button
              onClick={handleCheckOut}
              disabled={Boolean(
                isLoading ||
                  !employeeStatus?.isActive ||
                  (employeeStatus?.status &&
                    employeeStatus.status !== EmployeeStatus.ACTIVE)
              )}
              variant="outline"
              className="flex-1"
              title={
                !attendanceStatus.isCheckedIn
                  ? "You must check in first"
                  : attendanceStatus.isCheckedOut
                  ? "Already checked out today"
                  : "Check out"
              }
            >
              {isLoading ? "Checking Out..." : "Check Out"}
            </Button>
          )}

          {!attendanceStatus.isCheckedIn && (
            <div className="text-center text-sm text-gray-500 py-2">
              Please check in first to enable checkout
            </div>
          )}

          {attendanceStatus.isCheckedOut && (
            <div className="text-center text-sm text-green-600 py-2">
              ✓ Already checked out today
            </div>
          )}
        </div>

        {employeeStatus &&
          (!employeeStatus.isActive ||
            (employeeStatus.status &&
              employeeStatus.status !== EmployeeStatus.ACTIVE)) && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              ⚠️ Your account is{" "}
              {!employeeStatus.isActive
                ? "inactive"
                : `in ${employeeStatus.status} status`}
              . You cannot check in/out at this time. Please contact HR for
              assistance.
            </div>
          )}

        {attendanceStatus.isCheckedOut && (
          <div className="text-center text-sm text-gray-500">
            You have completed your attendance for today
          </div>
        )}
      </CardContent>
    </Card>
  );
}
