"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Download,
} from "lucide-react";
import { TaskForm } from "./task-form";
import { exportTasksToExcel } from "@/lib/excel-export";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { format } from "date-fns";

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

interface TaskListProps {
  showAll?: boolean;
}

export function TaskList({ showAll = true }: TaskListProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [currentPage, statusFilter, priorityFilter, assignedFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });

      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (priorityFilter && priorityFilter !== "all") {
        params.set("priority", priorityFilter);
      }
      if (assignedFilter && assignedFilter !== "all") {
        params.set("assigned", assignedFilter);
      }

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();

      if (data.data) {
        setTasks(data.data);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task");
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task");
    }
  };

  const handleExportToExcel = () => {
    try {
      if (tasks.length === 0) {
        showErrorToast("No tasks to export");
        return;
      }

      const exportData = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee?.name || "Unassigned",
        dueDate: task.dueDate
          ? format(new Date(task.dueDate), "yyyy-MM-dd")
          : "No due date",
        createdAt: format(new Date(task.createdAt), "yyyy-MM-dd"),
      }));

      exportTasksToExcel(exportData, {
        filename: `tasks-export-${new Date().toISOString().split("T")[0]}.xlsx`,
      });

      showSuccessToast("Task data exported to Excel successfully!");
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast("Failed to export task data");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canEdit = (task: Task) => {
    if (!session?.user) return false;
    if (session.user.role === "ADMIN") return true;
    if (session.user.role === "MANAGER") return true;
    return (
      task.creatorId === session.user.id || task.assigneeId === session.user.id
    );
  };

  const canDelete = (task: Task) => {
    if (!session?.user) return false;
    return session.user.role === "ADMIN" || task.creatorId === session.user.id;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5" />
            <span>Tasks</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleExportToExcel}
              disabled={tasks.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            {showAll &&
              ["ADMIN", "MANAGER"].includes(session?.user?.role || "") && (
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
                        {editingTask ? "Edit Task" : "Add New Task"}
                      </DialogTitle>
                    </DialogHeader>
                    <TaskForm
                      task={editingTask}
                      onSuccess={() => {
                        setIsFormOpen(false);
                        setEditingTask(null);
                        fetchTasks();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
          </div>
        </div>
        <div className="flex space-x-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="me">My Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Created by {task.creator.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) =>
                          handleStatusChange(task.id, value)
                        }
                        disabled={!canEdit(task)}
                      >
                        <SelectTrigger className="w-32">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace("_", " ")}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_PROGRESS">
                            In Progress
                          </SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {format(new Date(task.dueDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No due date
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(task)}
                          disabled={!canEdit(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canDelete(task) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tasks found
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
