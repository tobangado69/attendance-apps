"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useSession } from "next-auth/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  MoreVertical,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Grid3X3,
  List,
  MessageSquare,
} from "lucide-react";
import { TaskForm } from "./task-form";
import { TaskFilters, TaskFilters as TaskFiltersType } from "./task-filters";
import { TaskBulkActions } from "./task-bulk-actions";
import { TaskKanban } from "./task-kanban";
import { TaskDetails } from "./task-details";
import { exportTasksToExcel } from "@/lib/excel-export";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { apiClient } from "@/lib/utils/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { VirtualList } from "@/components/ui/virtual-list";
import { Pagination, usePagination } from "@/components/ui/pagination";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

interface EnhancedTaskListProps {
  showAll?: boolean;
}

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const priorityIcons = {
  LOW: Clock,
  MEDIUM: CheckSquare,
  HIGH: AlertCircle,
  URGENT: AlertCircle,
};

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: CheckSquare,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
};

const EnhancedTaskList = memo(function EnhancedTaskList({
  showAll = true,
}: EnhancedTaskListProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; user: { id: string; name: string; email: string } }>>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFiltersType>({
    search: "",
    status: "all",
    priority: "all",
    assignee: "all",
    dueDateFrom: "",
    dueDateTo: "",
    creator: "all",
    overdue: false,
  });
  const isInitialMount = useRef(true);
  const previousFilters = useRef<TaskFiltersType | null>(null);

  const fetchTasks = useCallback(
    async (currentFilters: TaskFiltersType, page = 1) => {
      try {
        setLoading(true);

        const filterParams = {
          search: currentFilters.search,
          status:
            currentFilters.status !== "all" ? currentFilters.status : undefined,
          priority:
            currentFilters.priority !== "all"
              ? currentFilters.priority
              : undefined,
          assignee:
            currentFilters.assignee !== "all"
              ? currentFilters.assignee
              : undefined,
          creator:
            currentFilters.creator !== "all"
              ? currentFilters.creator
              : undefined,
          dueDateFrom: currentFilters.dueDateFrom,
          dueDateTo: currentFilters.dueDateTo,
          overdue: currentFilters.overdue ? "true" : undefined,
          page: page.toString(),
          limit: itemsPerPage.toString(),
        };

        const data = await apiClient.getTasks(filterParams) as { data: Task[]; meta?: { total: number } };

        if (data.data) {
          setTasks(data.data);
          setTotalTasks(data.meta?.total || data.data.length);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        showErrorToast("Failed to fetch tasks");
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage]
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await apiClient.getEmployees(100) as { data: Array<{ id: string; user: { id: string; name: string; email: string } }> };
      if (data.data) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      showErrorToast("Failed to fetch employees");
    }
  }, []);

  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);

  // Memoized filter object for comparison
  const memoizedFilters = useMemo(
    () => filters,
    [
      filters.search,
      filters.status,
      filters.priority,
      filters.assignee,
      filters.creator,
      filters.dueDateFrom,
      filters.dueDateTo,
      filters.overdue,
    ]
  );

  // Handle filter changes
  const handleFiltersChangeWithRef = useCallback(
    (newFilters: TaskFiltersType) => {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    },
    []
  );

  // Initial data loading
  useEffect(() => {
    fetchEmployees();
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchTasks(filters, currentPage);
    }
  }, [fetchEmployees, fetchTasks, filters, currentPage]);

  // Watch for filter changes and fetch tasks (debounced)
  useEffect(() => {
    if (!isInitialMount.current) {
      fetchTasks(memoizedFilters, currentPage);
    }
  }, [debouncedSearch, memoizedFilters, currentPage, fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiClient.updateTask(taskId, { status: newStatus });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      showSuccessToast("Task status updated successfully");
    } catch (error) {
      console.error("Error updating task status:", error);
      showErrorToast("Failed to update task status");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await apiClient.deleteTask(taskId);

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
      showSuccessToast("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      showErrorToast("Failed to delete task");
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId]);
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map((task) => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (isBefore(due, today)) return "overdue";
    if (isBefore(due, tomorrow)) return "due-today";
    return "upcoming";
  };

  const getDueDateColor = (dueDate?: string) => {
    const status = getDueDateStatus(dueDate);
    switch (status) {
      case "overdue":
        return "text-red-600 bg-red-50";
      case "due-today":
        return "text-orange-600 bg-orange-50";
      case "upcoming":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const canEdit = (task: Task) => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER"
    );
  };

  const canDelete = (task: Task) => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER"
    );
  };

  const canAddTask = () => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER"
    );
  };

  const handleExport = async () => {
    try {
      const taskData = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee?.name || "Unassigned",
        dueDate: task.dueDate || "",
        createdAt: task.createdAt,
      }));
      await exportTasksToExcel(taskData);
      showSuccessToast("Tasks exported successfully");
    } catch (error) {
      console.error("Error exporting tasks:", error);
      showErrorToast("Failed to export tasks");
    }
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  const handleTaskUpdate = () => {
    fetchTasks(filters);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
    setSelectedTask(null);
    setIsDetailsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {canAddTask() && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTask(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTask ? "Edit Task" : "Create New Task"}
                  </DialogTitle>
                </DialogHeader>
                <TaskForm
                  task={editingTask}
                  onSuccess={() => {
                    setIsFormOpen(false);
                    setEditingTask(null);
                    // Refresh tasks by updating filters slightly to trigger useEffect
                    setFilters((prev) => ({ ...prev }));
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <TaskFilters
        onFiltersChange={handleFiltersChangeWithRef}
        employees={employees}
        session={session}
      />

      {/* Bulk Actions - Only for Admin and Manager */}
      {canAddTask() && (
        <TaskBulkActions
          selectedTasks={selectedTasks}
          onSelectionChange={setSelectedTasks}
          onTasksUpdate={() => setFilters((prev) => ({ ...prev }))}
          employees={employees}
        />
      )}

      {/* Task View */}
      {viewMode === "kanban" ? (
        <TaskKanban showAll={showAll} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {canAddTask() && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedTasks.length === tasks.length &&
                          tasks.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const PriorityIcon =
                    priorityIcons[task.priority as keyof typeof priorityIcons];
                  const StatusIcon =
                    statusIcons[task.status as keyof typeof statusIcons];
                  const dueDateStatus = getDueDateStatus(task.dueDate);

                  return (
                    <TableRow key={task.id}>
                      {canAddTask() && (
                        <TableCell>
                          <Checkbox
                            checked={selectedTasks.includes(task.id)}
                            onCheckedChange={(checked) =>
                              handleSelectTask(task.id, checked as boolean)
                            }
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-600 line-clamp-2">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {task.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            priorityColors[
                              task.priority as keyof typeof priorityColors
                            ]
                          }
                        >
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div
                            className={`text-sm px-2 py-1 rounded ${getDueDateColor(
                              task.dueDate
                            )}`}
                          >
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {format(new Date(task.dueDate), "MMM dd, yyyy")}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            No due date
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{task.creator.name}</span>
                      </TableCell>
                      <TableCell>
                        {session?.user?.role === "ADMIN" ||
                        session?.user?.role === "MANAGER" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(task)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingTask(task);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(task.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewDetails(task)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <CheckSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tasks found
                </h3>
                <p className="text-gray-600 mb-4">
                  {Object.values(filters).some((f) => f && f !== "all")
                    ? "Try adjusting your filters to see more tasks."
                    : "Get started by creating your first task."}
                </p>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalTasks)} of {totalTasks}{" "}
            tasks
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalTasks / itemsPerPage)}
              onPageChange={setCurrentPage}
              className="ml-4"
            />
          </div>
        </div>
      )}

      {/* Task Details Dialog */}
      <TaskDetails
        task={
          selectedTask || {
            id: "",
            title: "",
            description: "",
            status: "PENDING",
            priority: "MEDIUM",
            createdAt: new Date().toISOString(),
            creator: { id: "", name: "", email: "" },
          }
        }
        isOpen={isDetailsOpen && !!selectedTask}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        session={session}
      />
    </div>
  );
});

export { EnhancedTaskList };
