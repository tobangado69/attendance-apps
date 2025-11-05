"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Zap,
  Users,
  CheckCircle2,
} from "lucide-react";
import { showErrorToast } from "@/lib/error-handler";

interface PerformanceSummary {
  totalEmployees: number;
  avgProductivityScore: number;
  avgEfficiencyRate: number;
  avgAttendanceRate: number;
  avgTaskCompletionRate: number;
}

interface PerformanceOverviewCardsProps {
  period: string;
}

export function PerformanceOverviewCards({
  period,
}: PerformanceOverviewCardsProps) {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, [period]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/reports/performance?period=${period}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch performance data");
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Error fetching performance data:", err);
      setError(err instanceof Error ? err.message : "Failed to load performance data");
      showErrorToast("Failed to load performance metrics");
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
              <p>Error loading performance metrics</p>
              <button
                onClick={fetchPerformanceData}
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
          <CardTitle className="text-sm font-medium">
            Productivity Score
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading
              ? "..."
              : `${summary?.avgProductivityScore || 0}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {getPeriodLabel(period)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Efficiency Rate
          </CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : `${summary?.avgEfficiencyRate || 0}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {getPeriodLabel(period)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Attendance Rate
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : `${summary?.avgAttendanceRate || 0}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {getPeriodLabel(period)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Task Completion
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading
              ? "..."
              : `${summary?.avgTaskCompletionRate || 0}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {getPeriodLabel(period)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

