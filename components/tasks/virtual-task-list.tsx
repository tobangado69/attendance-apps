"use client";

import React, { memo, useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  Trash2,
  User,
  MoreVertical,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { VirtualList } from "@/components/ui/virtual-list";
import { format } from "date-fns";
import { SessionProp } from "@/lib/types/session";
import { TaskStatus } from "@/lib/constants/status";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignee?: {
    name: string;
  };
  creator?: {
    name: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface VirtualTaskListProps {
  tasks: Task[];
  selectedTasks: string[];
  onSelectTask: (taskId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
  canEdit: (task: Task) => boolean;
  canDelete: (task: Task) => boolean;
  canAddTask: () => boolean;
  session?: SessionProp;
  loading?: boolean;
}

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const priorityIcons = {
  LOW: Clock,
  MEDIUM: CheckCircle2,
  HIGH: AlertCircle,
  URGENT: AlertCircle,
};

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
};

const TaskRow = memo(function TaskRow({
  task,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onViewDetails,
  canEdit,
  canDelete,
  canAddTask,
  session,
}: {
  task: Task;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
  canEdit: (task: Task) => boolean;
  canDelete: (task: Task) => boolean;
  canAddTask: () => boolean;
  session?: SessionProp;
}) {
  const StatusIcon =
    statusIcons[task.status as keyof typeof statusIcons] || Clock;
  const PriorityIcon =
    priorityIcons[task.priority as keyof typeof priorityIcons] || Clock;

  return (
    <TableRow className={isSelected ? "bg-blue-50" : ""}>
      {canAddTask() && (
        <TableCell>
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </TableCell>
      )}
      <TableCell className="font-medium max-w-xs">
        <div className="truncate" title={task.title}>
          {task.title}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={
            task.status === TaskStatus.COMPLETED
              ? "default"
              : task.status === TaskStatus.CANCELLED
              ? "destructive"
              : "secondary"
          }
        >
          <StatusIcon className="h-3 w-3" />
          {task.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          className={
            priorityColors[task.priority as keyof typeof priorityColors]
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
            <span className="text-sm">{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </TableCell>
      <TableCell>
        {task.dueDate ? (
          <span className="text-sm">
            {format(new Date(task.dueDate), "MMM dd, yyyy")}
          </span>
        ) : (
          <span className="text-sm text-gray-400">No due date</span>
        )}
      </TableCell>
      <TableCell>
        {task.creator ? (
          <span className="text-sm">{task.creator.name}</span>
        ) : (
          <span className="text-sm text-gray-400">Unknown</span>
        )}
      </TableCell>
      <TableCell>
        {session?.user?.role === "ADMIN" ||
        session?.user?.role === "MANAGER" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(task)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canEdit(task) && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete(task) && (
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
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
            onClick={() => onViewDetails(task)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});

export const VirtualTaskList = memo(function VirtualTaskList({
  tasks,
  selectedTasks,
  onSelectTask,
  onSelectAll,
  onEdit,
  onDelete,
  onViewDetails,
  canEdit,
  canDelete,
  canAddTask,
  session,
  loading = false,
}: VirtualTaskListProps) {
  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const someSelected =
    selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const renderTaskRow = (task: Task, index: number) => (
    <TaskRow
      key={task.id}
      task={task}
      isSelected={selectedTasks.includes(task.id)}
      onSelect={(checked) => onSelectTask(task.id, checked)}
      onEdit={onEdit}
      onDelete={onDelete}
      onViewDetails={onViewDetails}
      canEdit={canEdit}
      canDelete={canDelete}
      canAddTask={canAddTask}
      session={session}
    />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <CheckCircle2 className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No tasks found
        </h3>
        <p className="text-gray-600">
          Get started by creating your first task.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {canAddTask() && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
      </Table>

      <VirtualList
        items={tasks}
        itemHeight={60} // Approximate height of each table row
        containerHeight={600} // Fixed container height
        renderItem={renderTaskRow}
        overscan={5}
        className="border-t"
      />
    </div>
  );
});
