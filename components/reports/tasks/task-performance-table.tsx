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

interface TaskPerformanceData {
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
}

interface TaskPerformanceTableProps {
  period: string;
  onAssigneeSelect?: (assigneeId: string) => void;
}

type SortField = "assigneeName" | "totalTasks" | "completedTasks" | "completionRate" | "inProgressTasks";
type SortDirection = "asc" | "desc";

export function TaskPerformanceTable({
  period,
  onAssigneeSelect,
}: TaskPerformanceTableProps) {
  const [assignees, setAssignees] = useState<TaskPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("completionRate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    fetchTaskPerformance();
  }, [period]);

  const fetchTaskPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reports/tasks?period=${period}`);

      if (!response.ok) {
        throw new Error("Failed to fetch task performance data");
      }

      const result = await response.json();
      setAssignees(result.byAssignee || []);
    } catch (err) {
      console.error("Error fetching task performance:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load task performance"
      );
      showErrorToast("Failed to load task performance data");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort assignees
  const filteredAndSortedAssignees = useMemo(() => {
    let filtered = assignees;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (assignee) =>
          assignee.assigneeName.toLowerCase().includes(query) ||
          assignee.assigneeEmail.toLowerCase().includes(query) ||
          assignee.assigneeId.toLowerCase().includes(query)
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
  }, [assignees, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
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

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "bg-green-100 text-green-800";
    if (rate >= 60) return "bg-yellow-100 text-yellow-800";
    if (rate >= 40) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Performance by Assignee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading task performance data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Performance by Assignee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Error loading task performance</p>
              <button
                onClick={fetchTaskPerformance}
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
        <CardTitle>Task Performance by Assignee</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort("assigneeName")}
                      className="flex items-center hover:text-primary"
                    >
                      Assignee
                      <SortIcon field="assigneeName" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("totalTasks")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Total Tasks
                      <SortIcon field="totalTasks" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("completedTasks")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Completed
                      <SortIcon field="completedTasks" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("inProgressTasks")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      In Progress
                      <SortIcon field="inProgressTasks" />
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => handleSort("completionRate")}
                      className="flex items-center justify-end hover:text-primary ml-auto"
                    >
                      Completion Rate
                      <SortIcon field="completionRate" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedAssignees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No assignees found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedAssignees.map((assignee) => (
                    <tr
                      key={assignee.assigneeId}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => onAssigneeSelect?.(assignee.assigneeId)}
                    >
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {assignee.assigneeName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assignee.assigneeEmail}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {assignee.totalTasks}
                      </td>
                      <td className="p-2 text-right">
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          {assignee.completedTasks}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                          {assignee.inProgressTasks}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getCompletionRateColor(
                            assignee.completionRate
                          )}`}
                        >
                          {assignee.completionRate}%
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
            Showing {filteredAndSortedAssignees.length} of {assignees.length}{" "}
            assignees
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

