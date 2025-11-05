"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { showErrorToast } from "@/lib/error-handler";

interface TaskChartsProps {
  period: string;
}

interface TaskData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  trends: Array<{
    date: string;
    created: number;
    completed: number;
    inProgress: number;
  }>;
  statusDistribution: {
    PENDING: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  priorityDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  byDepartment: Array<{
    department: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
  byAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

export function TaskCharts({ period }: TaskChartsProps) {
  const [data, setData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskData();
  }, [period]);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reports/tasks?period=${period}`);

      if (!response.ok) {
        throw new Error("Failed to fetch task data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching task data:", err);
      setError(err instanceof Error ? err.message : "Failed to load task charts");
      showErrorToast("Failed to load task charts");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Task Charts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Loading charts...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Task Charts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>Error loading task charts</p>
                <button
                  onClick={fetchTaskData}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare status distribution data
  const statusData = Object.entries(data.statusDistribution).map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count,
    color: STATUS_COLORS[status] || "#8884d8",
  }));

  // Prepare priority distribution data
  const priorityData = Object.entries(data.priorityDistribution).map(([priority, count]) => ({
    name: priority,
    value: count,
    color: PRIORITY_COLORS[priority] || "#8884d8",
  }));

  // Prepare department data
  const departmentData = data.byDepartment
    .slice(0, 10)
    .map((dept) => ({
      department:
        dept.department.length > 15
          ? dept.department.substring(0, 15) + "..."
          : dept.department,
      "Completion Rate": dept.completionRate,
      "Total Tasks": dept.totalTasks,
    }));

  // Prepare top assignees data
  const topAssigneesData = data.byAssignee
    .slice(0, 10)
    .map((assignee) => ({
      name:
        assignee.assigneeName.length > 15
          ? assignee.assigneeName.substring(0, 15) + "..."
          : assignee.assigneeName,
      "Completion Rate": assignee.completionRate,
      "Total Tasks": assignee.totalTasks,
    }));

  return (
    <div className="space-y-4">
      {/* Task Completion Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  name="Created"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="Completed"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="inProgress"
                  stroke="#f59e0b"
                  name="In Progress"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {priorityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Comparison */}
      {departmentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Completion Rate" fill="#10b981" />
                  <Bar dataKey="Total Tasks" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Assignees */}
      {topAssigneesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Assignees by Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAssigneesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Completion Rate" fill="#10b981" />
                  <Bar dataKey="Total Tasks" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

