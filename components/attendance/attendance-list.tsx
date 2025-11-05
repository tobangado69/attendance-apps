"use client";

import { useMemo, useState } from "react";
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
import { useAttendanceList, SortField } from "@/hooks/use-attendance-list";
import { AttendanceStatus } from "@/lib/constants/status";

interface AttendanceListProps {
  showAll?: boolean;
}

export function AttendanceList({ showAll = false }: AttendanceListProps) {
  const {
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
  } = useAttendanceList({ showAll });

  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

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
            {searchTerm && (
              <span className="ml-2 text-green-600">
                (filtered by &quot;{searchTerm}&quot;)
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
                {searchTerm ? (
                  <div>
                    <p>
                      No attendance records found for &quot;
                      {searchTerm}&quot;
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
