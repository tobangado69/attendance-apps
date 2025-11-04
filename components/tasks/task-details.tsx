"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskForm } from "./task-form";
import { TaskNotes } from "./task-notes";
import {
  Calendar,
  User,
  Flag,
  Clock,
  Edit,
  Trash2,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  Pause,
} from "lucide-react";
import { format } from "date-fns";
import { SessionProp } from "@/lib/types/session";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
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

interface TaskDetailsProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: () => void;
  onTaskDelete: (taskId: string) => void;
  session?: SessionProp;
}

const statusIcons = {
  PENDING: Pause,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
};

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function TaskDetails({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
  onTaskDelete,
  session,
}: TaskDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const StatusIcon =
    statusIcons[task.status as keyof typeof statusIcons] || Clock;

  const canEdit = () => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER"
    );
  };

  const canDelete = () => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER"
    );
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onTaskDelete(task.id);
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTaskUpdate = () => {
    onTaskUpdate();
    setIsEditing(false);
  };

  // Don't render if no valid task
  if (!task || !task.id) {
    return null;
  }

  if (isEditing) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm task={task} onSuccess={handleTaskUpdate} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {task.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {canEdit() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
              {canDelete() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Status:
                  </span>
                  <Badge
                    className={
                      statusColors[task.status as keyof typeof statusColors]
                    }
                  >
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Priority:
                  </span>
                  <Badge
                    className={
                      priorityColors[
                        task.priority as keyof typeof priorityColors
                      ]
                    }
                  >
                    {task.priority}
                  </Badge>
                </div>

                {task.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Due Date:
                    </span>
                    <span className="text-sm text-gray-600">
                      {format(new Date(task.dueDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Created:
                  </span>
                  <span className="text-sm text-gray-600">
                    {format(new Date(task.createdAt), "MMM dd, yyyy")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Assignee
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      {task.assignee ? task.assignee.name : "Unassigned"}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Creator
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      {task.creator.name}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Notes */}
          <TaskNotes taskId={task.id} session={session} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
