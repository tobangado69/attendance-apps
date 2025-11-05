/**
 * Hook for managing attendance reports state and operations
 * Extracts business logic from AttendanceReports component
 */

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { logError } from "@/lib/utils/logger";
import { showErrorToast } from "@/lib/error-handler";

export interface AttendanceReport {
  summary: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    earlyLeaveCount: number;
    uniqueEmployees: number;
    averageHours: number;
    attendanceRate: number;
  };
  departmentStats: Record<string, { 
    department: string; 
    total: number; 
    present: number; 
    absent: number; 
    late: number; 
    earlyLeave: number 
  }>;
  dailyTrends: Record<string, { 
    date: string; 
    total: number; 
    present: number; 
    absent: number; 
    late: number; 
    earlyLeave: number 
  }>;
  topPerformers: Array<{
    user: { id: string; name: string; email: string };
    employee: {
      department: { id: string; name: string } | string;
      position: string;
    };
    totalDays: number;
    presentDays: number;
    attendancePercentage: number;
    averageHours: number;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  departments: string[];
}

interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  department: string;
  type: string;
}

interface UseAttendanceReportsReturn {
  reportData: AttendanceReport | null;
  loading: boolean;
  filters: AttendanceReportFilters;
  setFilters: (filters: AttendanceReportFilters | ((prev: AttendanceReportFilters) => AttendanceReportFilters)) => void;
  handleExport: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing attendance reports
 * 
 * @returns Attendance reports state and handlers
 * 
 * @example
 * ```tsx
 * const { reportData, loading, filters, setFilters, handleExport } = useAttendanceReports();
 * ```
 */
export function useAttendanceReports(): UseAttendanceReportsReturn {
  const [reportData, setReportData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AttendanceReportFilters>({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    department: "all",
    type: "summary",
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.department && filters.department !== "all")
        params.append("department", filters.department);
      if (filters.type) params.append("type", filters.type);

      const response = await fetch(`/api/attendance/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data.data);
      } else {
        const error = new Error("Failed to fetch reports");
        logError(error, { context: "useAttendanceReports - fetchReports" });
        showErrorToast(error, { context: "Fetch Reports" });
      }
    } catch (error) {
      logError(error, { context: "useAttendanceReports - fetchReports" });
      showErrorToast(error, { context: "Fetch Reports" });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.department && filters.department !== "all")
        params.append("department", filters.department);

      const response = await fetch(`/api/attendance/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-report-${filters.startDate}-to-${filters.endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = new Error("Failed to export report");
        logError(error, { context: "useAttendanceReports - handleExport" });
        showErrorToast(error, { context: "Export Report" });
      }
    } catch (error) {
      logError(error, { context: "useAttendanceReports - handleExport" });
      showErrorToast(error, { context: "Export Report" });
    }
  }, [filters]);

  return {
    reportData,
    loading,
    filters,
    setFilters,
    handleExport,
    refetch: fetchReports,
  };
}

