"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Task {
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

interface TaskFormProps {
  task?: Task | null;
  onSuccess: () => void;
}

export function TaskForm({ task, onSuccess }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assigneeId: "",
  });
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string }>>([]);

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

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees?limit=100");
      const data = await response.json();
      if (data.data) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      if (response.ok) {
        toast.success(data.message || "Task saved successfully");
        onSuccess();
      } else {
        toast.error(data.error || "Failed to save task");
      }
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority || "MEDIUM"}
            onValueChange={(value) => handleChange("priority", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="assigneeId">Assign To</Label>
          <Select
            value={formData.assigneeId || "unassigned"}
            onValueChange={(value) => handleChange("assigneeId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.user.id}>
                  {employee.user.name} ({employee.user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={(e) => handleChange("dueDate", e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
