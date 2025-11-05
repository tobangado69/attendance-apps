/**
 * Hook for managing task form state and operations
 * Extracts business logic from TaskForm component
 */

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { useErrorHandler } from "@/hooks/use-error-handler";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Employee {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskFormState {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  assigneeId: string;
}

interface UseTaskFormOptions {
  task?: Task | null;
  onSuccess: () => void;
}

interface UseTaskFormReturn {
  formData: TaskFormState;
  employees: Employee[];
  isLoading: boolean;
  handleChange: (field: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

/**
 * Hook for managing task form
 * 
 * @param options - Task form options
 * @param options.task - Existing task to edit (null for new task)
 * @param options.onSuccess - Callback when form is successfully submitted
 * @returns Task form state and handlers
 * 
 * @example
 * ```tsx
 * const { formData, employees, isLoading, handleChange, handleSubmit } = useTaskForm({
 *   task: existingTask,
 *   onSuccess: () => router.refresh()
 * });
 * ```
 */
export function useTaskForm({ task, onSuccess }: UseTaskFormOptions): UseTaskFormReturn {
  const { executeWithErrorHandling, isLoading } = useErrorHandler();
  const [formData, setFormData] = useState<TaskFormState>({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assigneeId: "",
  });
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        dueDate: task.dueDate
          ? format(new Date(task.dueDate), "yyyy-MM-dd")
          : "",
        assigneeId: task.assigneeId || "",
      });
    }
    fetchEmployees();
  }, [task]);

  const fetchEmployees = useCallback(async () => {
    await executeWithErrorHandling(
      async () => {
        const response = await fetch("/api/employees?limit=100");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch employees: ${response.status}`);
        }

        const data = await response.json();
        if (data.data) {
          setEmployees(data.data);
        }
      },
      {
        context: "TaskForm - fetchEmployees",
        showToast: false, // Don't show toast for background data fetching
      }
    );
  }, [executeWithErrorHandling]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    await executeWithErrorHandling(
      async () => {
        const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
        const method = task ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            assigneeId:
              formData.assigneeId === "unassigned"
                ? null
                : formData.assigneeId || null,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to save task");
        }

        showSuccessToast(data.message || "Task saved successfully");
        onSuccess();
      },
      {
        context: "Save Task",
        errorMessage: "Failed to save task",
      }
    );
  }, [formData, task, onSuccess, executeWithErrorHandling]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  return {
    formData,
    employees,
    isLoading,
    handleChange,
    handleSubmit,
  };
}

