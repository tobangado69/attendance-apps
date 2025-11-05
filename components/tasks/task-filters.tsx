"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  User,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { SessionProp } from "@/lib/types/session";
import { useDebounce } from "@/hooks/use-debounce";
import { TaskStatus } from "@/lib/constants/status";

interface TaskFiltersProps {
  onFiltersChange: (filters: TaskFilters) => void;
  employees: Array<{
    id: string;
    user: { id: string; name: string; email: string };
  }>;
  session?: SessionProp;
}

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  dueDateFrom: string;
  dueDateTo: string;
  creator: string;
  overdue: boolean;
}

const initialFilters: TaskFilters = {
  search: "",
  status: "all",
  priority: "all",
  assignee: "all",
  dueDateFrom: "",
  dueDateTo: "",
  creator: "all",
  overdue: false,
};

export function TaskFilters({
  onFiltersChange,
  employees,
  session,
}: TaskFiltersProps) {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dueDateFromOpen, setDueDateFromOpen] = useState(false);
  const [dueDateToOpen, setDueDateToOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Check if user can see assignee/creator filters (only Admin and Manager)
  const canSeeAssigneeCreatorFilters = () => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER"
    );
  };

  const debouncedSearch = useDebounce(filters.search, 300);

  // Simple effect to handle search changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      const newFilters = { ...filters, search: debouncedSearch };
      onFiltersChange(newFilters);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [debouncedSearch]);

  // Handle all other filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      onFiltersChange(filters);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    filters.status,
    filters.priority,
    filters.assignee,
    filters.creator,
    filters.dueDateFrom,
    filters.dueDateTo,
    filters.overdue,
  ]);

  const handleFilterChange = (
    key: keyof TaskFilters,
    value: string | boolean
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateChange = (
    key: "dueDateFrom" | "dueDateTo",
    date: Date | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: date ? format(date, "yyyy-MM-dd") : "",
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.priority !== "all") count++;
    if (filters.assignee !== "all") count++;
    if (filters.creator !== "all") count++;
    if (filters.dueDateFrom) count++;
    if (filters.dueDateTo) count++;
    if (filters.overdue) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search tasks by title, description, or assignee..."
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Quick Filters */}
        <div className="flex items-center space-x-2">
          <Button
            variant={filters.overdue ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("overdue", !filters.overdue)}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Overdue
          </Button>
        </div>
        {/* Advanced Filters */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Tasks</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={TaskStatus.PENDING}>Pending</SelectItem>
                      <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                      <SelectItem value={TaskStatus.COMPLETED}>Completed</SelectItem>
                      <SelectItem value={TaskStatus.CANCELLED}>Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <Select
                    value={filters.priority}
                    onValueChange={(value) =>
                      handleFilterChange("priority", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {canSeeAssigneeCreatorFilters() && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Assignee
                    </label>
                    <Select
                      value={filters.assignee}
                      onValueChange={(value) =>
                        handleFilterChange("assignee", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.user.id}
                          >
                            {employee.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Creator
                    </label>
                    <Select
                      value={filters.creator}
                      onValueChange={(value) =>
                        handleFilterChange("creator", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Creators</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.user.id}
                          >
                            {employee.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Due Date From
                  </label>
                  <Popover
                    open={dueDateFromOpen}
                    onOpenChange={setDueDateFromOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dueDateFrom
                          ? format(
                              new Date(filters.dueDateFrom),
                              "MMM dd, yyyy"
                            )
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          filters.dueDateFrom
                            ? new Date(filters.dueDateFrom)
                            : undefined
                        }
                        onSelect={(date) => {
                          handleDateChange("dueDateFrom", date);
                          setDueDateFromOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Due Date To
                  </label>
                  <Popover open={dueDateToOpen} onOpenChange={setDueDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dueDateTo
                          ? format(new Date(filters.dueDateTo), "MMM dd, yyyy")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          filters.dueDateTo
                            ? new Date(filters.dueDateTo)
                            : undefined
                        }
                        onSelect={(date) => {
                          handleDateChange("dueDateTo", date);
                          setDueDateToOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filters.status !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("status", "all")}
              />
            </Badge>
          )}
          {filters.priority !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Priority: {filters.priority}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("priority", "all")}
              />
            </Badge>
          )}
          {canSeeAssigneeCreatorFilters() && filters.assignee !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Assignee:{" "}
              {filters.assignee === "unassigned"
                ? "Unassigned"
                : employees.find((emp) => emp.user.id === filters.assignee)
                    ?.user.name || "Unknown"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("assignee", "all")}
              />
            </Badge>
          )}
          {canSeeAssigneeCreatorFilters() && filters.creator !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Creator:{" "}
              {employees.find((emp) => emp.user.id === filters.creator)?.user
                .name || "Unknown"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("creator", "all")}
              />
            </Badge>
          )}
          {filters.dueDateFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              From: {format(new Date(filters.dueDateFrom), "MMM dd")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("dueDateFrom", "")}
              />
            </Badge>
          )}
          {filters.dueDateTo && (
            <Badge variant="secondary" className="flex items-center gap-1">
              To: {format(new Date(filters.dueDateTo), "MMM dd")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("dueDateTo", "")}
              />
            </Badge>
          )}
          {filters.overdue && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Overdue
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("overdue", false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
