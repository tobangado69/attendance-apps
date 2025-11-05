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

interface PerformanceChartsProps {
  period: string;
}

interface PerformanceData {
  employeePerformance: Array<{
    employeeId: string;
    name: string;
    productivityScore: number;
    efficiencyRate: number;
    attendanceRate: number;
    taskCompletionRate: number;
    department: string;
  }>;
  departmentPerformance: Array<{
    department: string;
    totalEmployees: number;
    avgProductivityScore: number;
    avgEfficiencyRate: number;
    avgAttendanceRate: number;
    avgTaskCompletionRate: number;
  }>;
  topPerformers: Array<{
    employeeId: string;
    name: string;
    productivityScore: number;
    rank: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export function PerformanceCharts({ period }: PerformanceChartsProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
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

      const result = await response.json();
      setData({
        employeePerformance: result.employeePerformance || [],
        departmentPerformance: result.departmentPerformance || [],
        topPerformers: result.topPerformers || [],
      });
    } catch (err) {
      console.error("Error fetching performance data:", err);
      setError(err instanceof Error ? err.message : "Failed to load performance data");
      showErrorToast("Failed to load performance charts");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Charts</CardTitle>
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
            <CardTitle>Performance Charts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>Error loading performance charts</p>
                <button
                  onClick={fetchPerformanceData}
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

  // Prepare department comparison data
  const departmentData = data.departmentPerformance.map((dept) => ({
    department: dept.department.length > 15 
      ? dept.department.substring(0, 15) + "..." 
      : dept.department,
    "Productivity": dept.avgProductivityScore,
    "Efficiency": dept.avgEfficiencyRate,
    "Attendance": dept.avgAttendanceRate,
  }));

  // Prepare top performers data
  const topPerformersData = data.topPerformers.map((performer) => ({
    name: performer.name.length > 15 
      ? performer.name.substring(0, 15) + "..." 
      : performer.name,
    score: performer.productivityScore,
    rank: performer.rank,
  }));

  // Prepare performance distribution (group by score ranges)
  const distributionRanges = [
    { range: "90-100", min: 90, max: 100, count: 0 },
    { range: "80-89", min: 80, max: 89, count: 0 },
    { range: "70-79", min: 70, max: 79, count: 0 },
    { range: "60-69", min: 60, max: 69, count: 0 },
    { range: "0-59", min: 0, max: 59, count: 0 },
  ];

  data.employeePerformance.forEach((emp) => {
    const score = emp.productivityScore;
    const range = distributionRanges.find(
      (r) => score >= r.min && score <= r.max
    );
    if (range) {
      range.count++;
    }
  });

  const distributionData = distributionRanges.map((r) => ({
    range: r.range,
    count: r.count,
  }));

  return (
    <div className="space-y-4">
      {/* Department Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance Comparison</CardTitle>
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
                <Bar dataKey="Productivity" fill="#3b82f6" />
                <Bar dataKey="Efficiency" fill="#10b981" />
                <Bar dataKey="Attendance" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Performers Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPerformersData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="score" fill="#10b981">
                    {topPerformersData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, count }) => `${range}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

