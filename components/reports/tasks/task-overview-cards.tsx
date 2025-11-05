"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { showErrorToast } from "@/lib/error-handler";

interface TaskOverviewCardsProps {
  period: string;
}

interface TaskSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  inProgressTasks: number;
  pendingTasks: number;
  cancelledTasks: number;
}

interface TaskMetrics {
  avgCompletionTime: number;
  overdueTasks: number;
  overduePercentage: number;
  backlogSize: number;
}

export function TaskOverviewCards({
  period,
}: TaskOverviewCardsProps) {
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskData();
  }, [period]);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both endpoints in parallel
      const [tasksResponse, metricsResponse] = await Promise.all([
        fetch(`/api/reports/tasks?period=${period}`),
        fetch(`/api/reports/tasks/metrics?period=${period}`),
      ]);

      if (!tasksResponse.ok || !metricsResponse.ok) {
        throw new Error("Failed to fetch task data");
      }

      const tasksData = await tasksResponse.json();
      const metricsData = await metricsResponse.json();

      setSummary(tasksData.summary);
      setMetrics(metricsData.metrics);
    } catch (err) {
      console.error("Error fetching task data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load task metrics"
      );
      showErrorToast("Failed to load task metrics");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "week":
        return "This week";
      case "year":
        return "This year";
      default:
        return "This month";
    }
  };

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Error loading task metrics</p>
              <button
                onClick={fetchTaskData}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : summary?.totalTasks || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {getPeriodLabel(period)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : `${summary?.completionRate || 0}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {getPeriodLabel(period)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : metrics?.overdueTasks || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics?.overduePercentage
              ? `${metrics.overduePercentage}% of total`
              : "Requires attention"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Avg Completion Time
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading
              ? "..."
              : metrics?.avgCompletionTime
              ? `${metrics.avgCompletionTime}d`
              : "0d"}
          </div>
          <p className="text-xs text-muted-foreground">Days to complete</p>
        </CardContent>
      </Card>
    </div>
  );
}

