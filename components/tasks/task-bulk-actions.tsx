"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckSquare,
  Trash2,
  MoreVertical,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";

interface TaskBulkActionsProps {
  selectedTasks: string[];
  onSelectionChange: (taskIds: string[]) => void;
  onTasksUpdate: () => void;
  employees: Array<{
    id: string;
    user: { id: string; name: string; email: string };
  }>;
}

export function TaskBulkActions({
  selectedTasks,
  onSelectionChange,
  onTasksUpdate,
  employees,
}: TaskBulkActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");

  const selectedCount = selectedTasks.length;

  const handleBulkStatusChange = async (status: string) => {
    if (selectedCount === 0) return;

    setIsUpdating(true);
    try {
      const promises = selectedTasks.map((taskId) =>
        fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        showSuccessToast(`Successfully updated ${successful} task(s)`);
        onTasksUpdate();
        onSelectionChange([]);
      }

      if (failed > 0) {
        showErrorToast(`Failed to update ${failed} task(s)`);
      }
    } catch (error) {
      console.error("Error updating tasks:", error);
      showErrorToast("Failed to update tasks");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkPriorityChange = async (priority: string) => {
    if (selectedCount === 0) return;

    setIsUpdating(true);
    try {
      const promises = selectedTasks.map((taskId) =>
        fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ priority }),
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        showSuccessToast(`Successfully updated ${successful} task(s)`);
        onTasksUpdate();
        onSelectionChange([]);
      }

      if (failed > 0) {
        showErrorToast(`Failed to update ${failed} task(s)`);
      }
    } catch (error) {
      console.error("Error updating tasks:", error);
      showErrorToast("Failed to update tasks");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkAssigneeChange = async (assigneeId: string) => {
    if (selectedCount === 0) return;

    setIsUpdating(true);
    try {
      const promises = selectedTasks.map((taskId) =>
        fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assigneeId: assigneeId === "unassigned" ? null : assigneeId,
          }),
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        showSuccessToast(`Successfully updated ${successful} task(s)`);
        onTasksUpdate();
        onSelectionChange([]);
      }

      if (failed > 0) {
        showErrorToast(`Failed to update ${failed} task(s)`);
      }
    } catch (error) {
      console.error("Error updating tasks:", error);
      showErrorToast("Failed to update tasks");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    setIsUpdating(true);
    try {
      const promises = selectedTasks.map((taskId) =>
        fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        showSuccessToast(`Successfully deleted ${successful} task(s)`);
        onTasksUpdate();
        onSelectionChange([]);
      }

      if (failed > 0) {
        showErrorToast(`Failed to delete ${failed} task(s)`);
      }
    } catch (error) {
      console.error("Error deleting tasks:", error);
      showErrorToast("Failed to delete tasks");
    } finally {
      setIsUpdating(false);
      setShowDeleteDialog(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedCount} task{selectedCount !== 1 ? "s" : ""} selected
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Bulk Status Change */}
            <Select
              value={bulkAction}
              onValueChange={(value) => {
                if (value.startsWith("status:")) {
                  handleBulkStatusChange(value.replace("status:", ""));
                } else if (value.startsWith("priority:")) {
                  handleBulkPriorityChange(value.replace("priority:", ""));
                } else if (value.startsWith("assignee:")) {
                  handleBulkAssigneeChange(value.replace("assignee:", ""));
                }
                setBulkAction("");
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Bulk actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status:PENDING">Mark as Pending</SelectItem>
                <SelectItem value="status:IN_PROGRESS">
                  Mark as In Progress
                </SelectItem>
                <SelectItem value="status:COMPLETED">
                  Mark as Completed
                </SelectItem>
                <SelectItem value="status:CANCELLED">
                  Mark as Cancelled
                </SelectItem>
                <SelectItem value="priority:LOW">Set Priority: Low</SelectItem>
                <SelectItem value="priority:MEDIUM">
                  Set Priority: Medium
                </SelectItem>
                <SelectItem value="priority:HIGH">
                  Set Priority: High
                </SelectItem>
                <SelectItem value="priority:URGENT">
                  Set Priority: Urgent
                </SelectItem>
                <SelectItem value="assignee:unassigned">
                  Unassign All
                </SelectItem>
                {employees.map((employee) => (
                  <SelectItem
                    key={employee.id}
                    value={`assignee:${employee.user.id}`}
                  >
                    Assign to {employee.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Delete Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} task
              {selectedCount !== 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isUpdating}
            >
              {isUpdating ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
