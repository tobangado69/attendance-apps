"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { showErrorToast } from "@/lib/error-handler";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

interface EmployeePerformance {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  productivityScore: number;
  efficiencyRate: number;
  attendanceRate: number;
  taskCompletionRate: number;
  rank: number;
}

interface EmployeePerformanceTableProps {
  period: string;
  onEmployeeSelect?: (employeeId: string) => void;
}

type SortField = "rank" | "productivityScore" | "efficiencyRate" | "attendanceRate" | "taskCompletionRate" | "name";
type SortDirection = "asc" | "desc";

export function EmployeePerformanceTable({
  period,
  onEmployeeSelect,
}: EmployeePerformanceTableProps) {
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    fetchEmployeePerformance();
  }, [period]);

  const fetchEmployeePerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reports/performance?period=${period}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch employee performance data");
      }

      const result = await response.json();
      setEmployees(result.employeePerformance || []);
    } catch (err) {
      console.error("Error fetching employee performance:", err);
      setError(err instanceof Error ? err.message : "Failed to load employee performance");
      showErrorToast("Failed to load employee performance data");
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments
  const departments = useMemo(() => {
    const deptSet = new Set(employees.map((emp) => emp.department));
    return Array.from(deptSet).sort();
  }, [employees]);

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees;

    // Apply department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((emp) => emp.department === departmentFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.employeeId.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue: number | string = a[sortField];
      const bValue: number | string = b[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }
    });

    return sorted;
  }, [employees, departmentFilter, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 inline" />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-yellow-100 text-yellow-800";
    if (score >= 70) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading employee performance data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Error loading employee performance</p>
              <button
                onClick={fetchEmployeePerformance}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort("rank")}
                      className="flex items-center hover:text-primary"
                    >
                      Rank
                      <SortIcon field="rank" />
                    </button>
                  </th>
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center hover:text-primary"
                    >
                      Employee
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("productivityScore")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Productivity
                      <SortIcon field="productivityScore" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("efficiencyRate")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Efficiency
                      <SortIcon field="efficiencyRate" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("attendanceRate")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Attendance
                      <SortIcon field="attendanceRate" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("taskCompletionRate")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Task Completion
                      <SortIcon field="taskCompletionRate" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedEmployees.map((emp) => (
                    <tr
                      key={emp.employeeId}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => onEmployeeSelect?.(emp.employeeId)}
                    >
                      <td className="p-2 font-medium">#{emp.rank}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {emp.department || "Unassigned"}
                      </td>
                      <td className="p-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${getScoreColor(emp.productivityScore)}`}>
                          {emp.productivityScore}%
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${getScoreColor(emp.efficiencyRate)}`}>
                          {emp.efficiencyRate}%
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${getScoreColor(emp.attendanceRate)}`}>
                          {emp.attendanceRate}%
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${getScoreColor(emp.taskCompletionRate)}`}>
                          {emp.taskCompletionRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedEmployees.length} of {employees.length} employees
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

