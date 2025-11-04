"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats, Activity } from "@/lib/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    pendingTasks: 0,
    completedTasks: 0,
    attendanceRate: 0,
  });

  const [activities, setActivities] = useState<Activity[]>([]);

  // Check if user has permission to view recent activity (only Admin/Manager)
  const canViewRecentActivity =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  useEffect(() => {
    // Fetch dashboard data for all users
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      const result = await response.json();
      // The API returns data wrapped in a 'data' property
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        console.error("Error in API response:", result);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/dashboard/activities");
      const result = await response.json();
      // The API returns data wrapped in a 'data' property
      if (result.success && result.data) {
        setActivities(result.data);
      } else {
        console.error("Error in activities API response:", result);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  useEffect(() => {
    if (canViewRecentActivity) {
      fetchActivities();
    }
  }, [canViewRecentActivity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        {canViewRecentActivity && <RecentActivity activities={activities} />}
        <QuickActions />
      </div>
    </div>
  );
}
