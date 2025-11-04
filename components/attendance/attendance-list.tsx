"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { exportAttendanceToExcel } from "@/lib/excel-export";
import { AttendanceStatus } from "@/lib/constants/status";
import { logError } from "@/lib/utils/logger";

interface AttendanceRecord {
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
    department?: string;
    position?: string;
  };
}

interface AttendanceListProps {
  showAll?: boolean;
}

type SortField =
  | "employee"
  | "date"
  | "checkIn"
  | "checkOut"
  | "totalHours"
  | "status"
  | "department";
type SortOrder = "asc" | "desc";

export function AttendanceList({ showAll = false }: AttendanceListProps) {
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
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

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
      console.error("Error fetching attendance:", error);
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

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange({});
    setDepartmentFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(attendance.map((record) => record.id));
    } else {
      setSelectedRecords([]);
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecords((prev) => [...prev, recordId]);
    } else {
      setSelectedRecords((prev) => prev.filter((id) => id !== recordId));
    }
  };

  const handleExport = async () => {
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
          record.employee?.department?.name ||
          record.employee?.department ||
          "",
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
            record.employee?.department?.name ||
            record.employee?.department ||
            "Unknown";
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
        }, {} as Record<string, { department: string; totalHours: number }>)
      );

      exportAttendanceToExcel(dailyData, employeeData, departmentData);
    } catch (error) {
      logError(error, { context: "attendance-list - exportAttendance" });
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString("en-GB", { hour12: false });
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 lg:px-3"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  const paginationButtons = useMemo(() => {
    const buttons = [];
    const maxVisible = 5;
    const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    // First page
    if (start > 1) {
      buttons.push(
        <Button
          key="first"
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      );
    }

    // Previous page
    if (currentPage > 1) {
      buttons.push(
        <Button
          key="prev"
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      );
    }

    // Page numbers
    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="h-8 w-8 p-0"
        >
          {i}
        </Button>
      );
    }

    // Next page
    if (currentPage < totalPages) {
      buttons.push(
        <Button
          key="next"
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      );
    }

    // Last page
    if (end < totalPages) {
      buttons.push(
        <Button
          key="last"
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      );
    }

    return buttons;
  }, [currentPage, totalPages]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Attendance Records</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Date Range */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, employee ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                // Generate search suggestions from current data
                const suggestions = new Set<string>();
                attendance.forEach((record) => {
                  suggestions.add(record.user.name);
                  suggestions.add(record.user.email);
                  if (record.employee?.employeeId)
                    suggestions.add(record.employee.employeeId);
                  if (record.employee?.department)
                    suggestions.add(record.employee.department);
                });
                setSearchSuggestions(Array.from(suggestions).slice(0, 5));
              }}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
              >
                ×
              </Button>
            )}
            {searchSuggestions.length > 0 && !searchTerm && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                <div className="p-2 text-xs text-gray-500 border-b">
                  Try searching for:
                </div>
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchTerm(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => setDateRange(range || {})}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Department
              </label>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value={AttendanceStatus.PRESENT}>
                    Present
                  </SelectItem>
                  <SelectItem value={AttendanceStatus.LATE}>Late</SelectItem>
                  <SelectItem value={AttendanceStatus.ABSENT}>
                    Absent
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <div>
            Showing {attendance.length} of {totalRecords} records
            {selectedRecords.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({selectedRecords.length} selected)
              </span>
            )}
            {debouncedSearchTerm && (
              <span className="ml-2 text-green-600">
                (filtered by &quot;{debouncedSearchTerm}&quot;)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedRecords.length === attendance.length &&
                        attendance.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <SortButton field="employee">Employee</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="date">Date</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="checkIn">Check In</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="checkOut">Check Out</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="totalHours">Hours</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="status">Status</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow
                    key={record.id}
                    className={
                      selectedRecords.includes(record.id) ? "bg-blue-50" : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRecord(record.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.user.name}</div>
                        <div className="text-sm text-gray-500">
                          {record.user.email}
                        </div>
                        {record.employee && (
                          <div className="text-xs text-gray-400">
                            {record.employee.employeeId} •{" "}
                            {record.employee.department?.name ||
                              record.employee.department ||
                              "N/A"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatTime(record.checkIn)}</TableCell>
                    <TableCell>{formatTime(record.checkOut)}</TableCell>
                    <TableCell>
                      {record.totalHours
                        ? `${record.totalHours.toFixed(1)}h`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {attendance.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {debouncedSearchTerm ? (
                  <div>
                    <p>
                      No attendance records found for &quot;
                      {debouncedSearchTerm}&quot;
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  </div>
                ) : (
                  "No attendance records found"
                )}
              </div>
            )}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages} ({totalRecords} total
                  records)
                </div>
                <div className="flex items-center space-x-1">
                  {paginationButtons}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
