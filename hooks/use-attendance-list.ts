/**
 * Hook for managing attendance list state and operations
 * Extracts business logic from AttendanceList component
 */

import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { exportAttendanceToExcel } from "@/lib/excel-export";
import { AttendanceStatus } from "@/lib/constants/status";
import { logError } from "@/lib/utils/logger";

export interface AttendanceRecord {
  id: string;
  checkIn?: string;
  checkOut?: string;
  totalHours?: number;
  status: string;
  date: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  employee?: {
    employeeId: string;
    department?: {
      name: string;
    } | string;
    position?: string;
  };
}

export type SortField =
  | "employee"
  | "date"
  | "checkIn"
  | "checkOut"
  | "totalHours"
  | "status"
  | "department";

export type SortOrder = "asc" | "desc";

interface AttendanceListFilters {
  search: string;
  dateRange: { from?: Date; to?: Date };
  department: string;
  status: string;
}

interface UseAttendanceListOptions {
  showAll?: boolean;
}

interface UseAttendanceListReturn {
  // Data
  attendance: AttendanceRecord[];
  departments: string[];
  loading: boolean;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  
  // Filters
  searchTerm: string;
  dateRange: { from?: Date; to?: Date };
  sortBy: SortField;
  sortOrder: SortOrder;
  departmentFilter: string;
  statusFilter: string;
  
  // Selection
  selectedRecords: string[];
  showFilters: boolean;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  setDepartmentFilter: (dept: string) => void;
  setStatusFilter: (status: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortBy: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setShowFilters: (show: boolean) => void;
  handleSort: (field: SortField) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: string) => void;
  clearFilters: () => void;
  handleSelectAll: (checked: boolean) => void;
  handleSelectRecord: (recordId: string, checked: boolean) => void;
  handleExport: () => Promise<void>;
  
  // Utilities
  getStatusColor: (status: string) => string;
  formatTime: (timeString?: string) => string;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing attendance list
 * 
 * @param options - Attendance list options
 * @param options.showAll - Whether to show all records or filtered
 * @returns Attendance list state and handlers
 * 
 * @example
 * ```tsx
 * const {
 *   attendance,
 *   loading,
 *   handleSort,
 *   handleExport
 * } = useAttendanceList({ showAll: false });
 * ```
 */
export function useAttendanceList({ showAll = false }: UseAttendanceListOptions = {}): UseAttendanceListReturn {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        params.set("search", debouncedSearchTerm.trim());
      }
      if (dateRange.from) {
        params.set("startDate", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.set("endDate", dateRange.to.toISOString());
      }
      if (departmentFilter && departmentFilter !== "all") {
        params.set("department", departmentFilter);
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();

      if (data.data) {
        setAttendance(data.data);
        setTotalPages(data.meta.totalPages);
        setTotalRecords(data.meta.total);
        if (data.meta.departments) {
          setDepartments(data.meta.departments);
        }
      }
    } catch (error) {
      logError(error, { context: "useAttendanceList - fetchAttendance" });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearchTerm,
    dateRange,
    departmentFilter,
    statusFilter,
  ]);

  // Refetch when dependencies change
  const refetch = useCallback(async () => {
    await fetchAttendance();
  }, [fetchAttendance]);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDateRange({});
    setDepartmentFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRecords(attendance.map((record) => record.id));
    } else {
      setSelectedRecords([]);
    }
  }, [attendance]);

  const handleSelectRecord = useCallback((recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecords((prev) => [...prev, recordId]);
    } else {
      setSelectedRecords((prev) => prev.filter((id) => id !== recordId));
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      // Create mock data for export (in real app, you'd fetch all data)
      const dailyData = attendance.map((record) => ({
        date: record.date,
        totalEmployees: 1,
        presentEmployees: record.status === AttendanceStatus.PRESENT ? 1 : 0,
        lateEmployees: record.status === AttendanceStatus.LATE ? 1 : 0,
        absentEmployees: record.status === AttendanceStatus.ABSENT ? 1 : 0,
        totalHours: record.totalHours || 0,
      }));

      const employeeData = attendance.map((record) => ({
        employeeId: record.employee?.employeeId || "",
        name: record.user.name,
        email: record.user.email,
        department:
          typeof record.employee?.department === "string"
            ? record.employee.department
            : record.employee?.department?.name || "",
        position: record.employee?.position || "",
        salary: 0, // Would need to fetch from employee data
        presentDays: record.status === AttendanceStatus.PRESENT ? 1 : 0,
        totalDays: 1,
        attendanceRate: record.status === AttendanceStatus.PRESENT ? 100 : 0,
        totalHours: record.totalHours || 0,
        avgHours: record.totalHours || 0,
        lateDays: record.status === AttendanceStatus.LATE ? 1 : 0,
      }));

      const departmentData = Object.values(
        attendance.reduce((acc, record) => {
          const dept =
            typeof record.employee?.department === "string"
              ? record.employee.department
              : record.employee?.department?.name || "Unknown";
          if (!acc[dept]) {
            acc[dept] = {
              department: dept,
              totalEmployees: 0,
              presentEmployees: 0,
              totalHours: 0,
            };
          }
          acc[dept].totalEmployees++;
          if (record.status === AttendanceStatus.PRESENT)
            acc[dept].presentEmployees++;
          acc[dept].totalHours += record.totalHours || 0;
          return acc;
        }, {} as Record<string, { department: string; totalEmployees: number; presentEmployees: number; totalHours: number }>)
      );

      exportAttendanceToExcel(dailyData, employeeData, departmentData);
    } catch (error) {
      logError(error, { context: "useAttendanceList - handleExport" });
    }
  }, [attendance]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return "bg-green-100 text-green-800";
      case AttendanceStatus.LATE:
        return "bg-yellow-100 text-yellow-800";
      case AttendanceStatus.ABSENT:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const formatTime = useCallback((timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString("en-GB", { hour12: false });
  }, []);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return {
    // Data
    attendance,
    departments,
    loading,
    
    // Pagination
    currentPage,
    totalPages,
    totalRecords,
    pageSize,
    
    // Filters
    searchTerm,
    dateRange,
    sortBy,
    sortOrder,
    departmentFilter,
    statusFilter,
    
    // Selection
    selectedRecords,
    showFilters,
    
    // Actions
    setSearchTerm,
    setDateRange,
    setDepartmentFilter,
    setStatusFilter,
    setCurrentPage,
    setPageSize,
    setSortBy,
    setSortOrder,
    setShowFilters,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    clearFilters,
    handleSelectAll,
    handleSelectRecord,
    handleExport,
    
    // Utilities
    getStatusColor,
    formatTime,
    refetch: fetchAttendance,
  };
}

