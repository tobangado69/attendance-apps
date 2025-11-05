"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { exportAttendanceToExcel, exportPerformanceToExcel, exportTaskAnalyticsToExcel } from "@/lib/excel-export";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { PageGuard } from "@/components/auth/page-guard";
import { Role } from "@prisma/client";
import { PerformanceOverviewCards } from "@/components/reports/performance/performance-overview-cards";
import { PerformanceCharts } from "@/components/reports/performance/performance-charts";
import { EmployeePerformanceTable } from "@/components/reports/performance/employee-performance-table";
import { TaskOverviewCards } from "@/components/reports/tasks/task-overview-cards";
import { TaskCharts } from "@/components/reports/tasks/task-charts";
import { TaskPerformanceTable } from "@/components/reports/tasks/task-performance-table";

interface ReportStats {
  attendanceRate: number;
  averageHours: number;
  taskCompletionRate: number;
  activeEmployees: number;
}

interface AttendanceReportData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalEmployees: number;
    totalDays: number;
    overallAttendanceRate: number;
    totalHours: number;
    avgHoursPerDay: number;
  };
  dailyData: Array<{
    date: string;
    day: string;
    present: number;
    absent: number;
    late: number;
    totalHours: number;
  }>;
  employeeData: Array<{
    employeeId: string;
    name: string;
    email: string;
    department: string;
    presentDays: number;
    totalDays: number;
    attendanceRate: number;
    totalHours: number;
    avgHours: number;
    lateDays: number;
  }>;
  departmentData: Array<{
    department: string;
    totalEmployees: number;
    totalPresentDays: number;
    totalDays: number;
    avgAttendanceRate: number;
    totalHours: number;
  }>;
}

function ReportsPageContent() {
  const [stats, setStats] = useState<ReportStats>({
    attendanceRate: 0,
    averageHours: 0,
    taskCompletionRate: 0,
    activeEmployees: 0,
  });
  const [attendanceData, setAttendanceData] =
    useState<AttendanceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchReportStats(period);
    fetchAttendanceData(period);
  }, [period]);

  const fetchReportStats = async (selectedPeriod: string) => {
    try {
      const response = await fetch(
        `/api/reports/stats?period=${selectedPeriod}`
      );
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching report stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async (period: string) => {
    try {
      const response = await fetch(`/api/reports/attendance?period=${period}`);
      const data = await response.json();
      setAttendanceData(data);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
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

  const handleExportToExcel = () => {
    try {
      if (!attendanceData) {
        showErrorToast("No data available to export");
        return;
      }

      // Use client-side export with enhanced data
      exportAttendanceToExcel(
        attendanceData.dailyData,
        attendanceData.employeeData.map((emp) => ({
          ...emp,
          position: emp.position || "N/A", // Use position from API, fallback to "N/A"
          salary: emp.salary || 0,
        })),
        attendanceData.departmentData,
        {
          filename: `attendance-report-${period}-${
            new Date().toISOString().split("T")[0]
          }.xlsx`,
        }
      );

      showSuccessToast("Excel file exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast("Failed to export Excel file");
    }
  };

  const handleExportPerformanceToExcel = async () => {
    try {
      const response = await fetch(`/api/reports/performance?period=${period}`);
      if (!response.ok) {
        throw new Error("Failed to fetch performance data");
      }

      const data = await response.json();

      exportPerformanceToExcel(
        data.summary,
        data.employeePerformance || [],
        data.departmentPerformance || [],
        data.topPerformers || [],
        {
          filename: `performance-report-${period}-${
            new Date().toISOString().split("T")[0]
          }.xlsx`,
        }
      );

      showSuccessToast("Performance data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast("Failed to export performance data");
    }
  };

  const handleExportTaskAnalyticsToExcel = async () => {
    try {
      const [tasksResponse, metricsResponse] = await Promise.all([
        fetch(`/api/reports/tasks?period=${period}`),
        fetch(`/api/reports/tasks/metrics?period=${period}`),
      ]);

      if (!tasksResponse.ok || !metricsResponse.ok) {
        throw new Error("Failed to fetch task data");
      }

      const tasksData = await tasksResponse.json();
      const metricsData = await metricsResponse.json();

      exportTaskAnalyticsToExcel(
        tasksData.summary,
        metricsData.metrics,
        tasksData.byAssignee || [],
        tasksData.byDepartment || [],
        {
          filename: `task-report-${period}-${
            new Date().toISOString().split("T")[0]
          }.xlsx`,
        }
      );

      showSuccessToast("Task analytics exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast("Failed to export task analytics");
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportToExcel} disabled={!attendanceData}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Rate
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${stats.attendanceRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeriodLabel(period)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${stats.averageHours}h`}
            </div>
            <p className="text-xs text-muted-foreground">Per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Task Completion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${stats.taskCompletionRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeriodLabel(period)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.activeEmployees}
            </div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          {/* Daily Attendance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData?.dailyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        value,
                        name === "present"
                          ? "Present"
                          : name === "absent"
                          ? "Absent"
                          : "Late",
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="absent"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData?.departmentData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Attendance Rate"]}
                    />
                    <Bar dataKey="avgAttendanceRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Employee Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Employee</th>
                      <th className="text-left p-2">Department</th>
                      <th className="text-right p-2">Present Days</th>
                      <th className="text-right p-2">Attendance Rate</th>
                      <th className="text-right p-2">Total Hours</th>
                      <th className="text-right p-2">Avg Hours/Day</th>
                      <th className="text-right p-2">Late Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData?.employeeData.map((emp) => (
                      <tr key={emp.employeeId} className="border-b">
                        <td className="p-2 font-medium">{emp.name}</td>
                        <td className="p-2 text-muted-foreground">
                          {emp.department || "Unassigned"}
                        </td>
                        <td className="p-2 text-right">{emp.presentDays}</td>
                        <td className="p-2 text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              emp.attendanceRate >= 90
                                ? "bg-green-100 text-green-800"
                                : emp.attendanceRate >= 80
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {emp.attendanceRate}%
                          </span>
                        </td>
                        <td className="p-2 text-right">{emp.totalHours}h</td>
                        <td className="p-2 text-right">{emp.avgHours}h</td>
                        <td className="p-2 text-right">{emp.lateDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleExportPerformanceToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Performance Data
            </Button>
          </div>
          <PerformanceOverviewCards period={period} />
          <PerformanceCharts period={period} />
          <EmployeePerformanceTable period={period} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleExportTaskAnalyticsToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Task Data
            </Button>
          </div>
          <TaskOverviewCards period={period} />
          <TaskCharts period={period} />
          <TaskPerformanceTable period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <PageGuard allowedRoles={[Role.ADMIN]}>
      <ReportsPageContent />
    </PageGuard>
  );
}
