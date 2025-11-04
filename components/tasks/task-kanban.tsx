"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  MessageSquare,
} from "lucide-react";
import { TaskForm } from "./task-form";
import { TaskDetails } from "./task-details";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { TaskStatus } from "@/lib/constants/status";

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

interface TaskKanbanProps {
  showAll?: boolean;
}

const statusColumns = [
  { id: TaskStatus.PENDING, title: "Pending", color: "bg-gray-100" },
  { id: TaskStatus.IN_PROGRESS, title: "In Progress", color: "bg-blue-100" },
  { id: TaskStatus.COMPLETED, title: "Completed", color: "bg-green-100" },
  { id: TaskStatus.CANCELLED, title: "Cancelled", color: "bg-red-100" },
];

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

export function TaskKanban({ showAll = true }: TaskKanbanProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tasks?limit=100");
      const data = await response.json();

      if (data.data) {
        setTasks(data.data);
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
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
        showSuccessToast("Task status updated successfully");
      } else {
        showErrorToast("Failed to update task status");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      showErrorToast("Failed to update task status");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        showSuccessToast("Task deleted successfully");
      } else {
        showErrorToast("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      showErrorToast("Failed to delete task");
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
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

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  const handleTaskUpdate = () => {
    fetchTasks();
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Board</h2>
          <p className="text-gray-600">Drag and drop tasks between columns</p>
        </div>
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
                  fetchTasks();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-600"
                >
                  {columnTasks.length}
                </Badge>
              </div>

              <div
                className={`p-4 rounded-lg ${column.color} min-h-[400px] space-y-3`}
              >
                {columnTasks.map((task) => {
                  const PriorityIcon =
                    priorityIcons[task.priority as keyof typeof priorityIcons];
                  const dueDateStatus = getDueDateStatus(task.dueDate);

                  return (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-md transition-shadow bg-white overflow-hidden"
                      draggable
                      onDragStart={() => setDraggedTask(task.id)}
                      onDragEnd={() => setDraggedTask(null)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-gray-900 line-clamp-2">
                              {task.title}
                            </h4>
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
                                  {canEdit(task) && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingTask(task);
                                        setIsFormOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete(task) && (
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(task.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
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
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
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

                            {task.dueDate && (
                              <div
                                className={`text-xs px-2 py-1 rounded ${getDueDateColor(
                                  task.dueDate
                                )}`}
                              >
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {format(new Date(task.dueDate), "MMM dd")}
                              </div>
                            )}
                          </div>

                          {task.assignee && (
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                              {task.assignee.name}
                            </div>
                          )}

                          <div className="space-y-3">
                            {/* Details Button - Full Width */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs px-3 py-2 h-8 text-center bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              onClick={() => handleViewDetails(task)}
                            >
                              <MessageSquare className="h-3 w-3 mr-2" />
                              View Details
                            </Button>

                            {/* Status Change Buttons - Grid Layout */}
                            <div className="grid grid-cols-2 gap-2">
                              {statusColumns
                                .filter((col) => col.id !== task.status)
                                .map((col) => {
                                  const getButtonStyle = (status: string) => {
                                    switch (status) {
                                      case "PENDING":
                                        return "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700";
                                      case "COMPLETED":
                                        return "bg-green-50 hover:bg-green-100 border-green-200 text-green-700";
                                      case "CANCELLED":
                                        return "bg-red-50 hover:bg-red-100 border-red-200 text-red-700";
                                      default:
                                        return "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700";
                                    }
                                  };

                                  return (
                                    <Button
                                      key={col.id}
                                      variant="outline"
                                      size="sm"
                                      className={`text-xs px-2 py-1 h-7 text-center font-medium ${getButtonStyle(
                                        col.id
                                      )}`}
                                      onClick={() =>
                                        handleStatusChange(task.id, col.id)
                                      }
                                    >
                                      {col.title}
                                    </Button>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks in this column</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Details Dialog */}
      <TaskDetails
        task={
          selectedTask || {
            id: "",
            title: "",
            description: "",
            status: TaskStatus.PENDING,
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
}
