"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { RoleGuard } from "@/components/auth/role-guard";
import { Role } from "@prisma/client";
import { useAttendanceReports } from "@/hooks/use-attendance-reports";

function AttendanceReportsContent() {
  const { reportData, loading, filters, setFilters, handleExport } = useAttendanceReports();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8 text-gray-500">
        No report data available
      </div>
    );
  }

  const { summary, departmentStats, dailyTrends, topPerformers } = reportData;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, department: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {reportData.departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.presentCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary.absentCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.lateCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Attendance Rate
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.attendanceRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="employees">Top Performers</TabsTrigger>
          <TabsTrigger value="trends">Daily Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Records</span>
                    <span className="font-semibold">
                      {summary.totalRecords}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unique Employees</span>
                    <span className="font-semibold">
                      {summary.uniqueEmployees}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Hours/Day</span>
                    <span className="font-semibold">
                      {summary.averageHours}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attendance Rate</span>
                    <span className="font-semibold text-blue-600">
                      {summary.attendanceRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Present</span>
                    </div>
                    <Badge variant="secondary">{summary.presentCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Absent</span>
                    </div>
                    <Badge variant="secondary">{summary.absentCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span>Late</span>
                    </div>
                    <Badge variant="secondary">{summary.lateCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span>Early Leave</span>
                    </div>
                    <Badge variant="secondary">{summary.earlyLeaveCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(departmentStats).map(([dept, stats]) => (
                  <div key={dept} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{dept}</h3>
                      <Badge variant="outline">{stats.total} records</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Present:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          {stats.present}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Absent:</span>
                        <span className="ml-2 font-semibold text-red-600">
                          {stats.absent}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Late:</span>
                        <span className="ml-2 font-semibold text-yellow-600">
                          {stats.late}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Rate:</span>
                        <span className="ml-2 font-semibold">
                          {stats.total > 0
                            ? Math.round((stats.present / stats.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((employee, index) => (
                  <div
                    key={employee.user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{employee.user.name}</h3>
                        <p className="text-sm text-gray-600">
                          {employee.employee.department?.name ||
                            employee.employee.department ||
                            "N/A"}{" "}
                          • {employee.employee.position}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {employee.attendancePercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">
                        {employee.presentDays}/{employee.totalDays} days
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(dailyTrends)
                  .sort(
                    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
                  )
                  .slice(0, 10)
                  .map(([date, stats]) => (
                    <div
                      key={date}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="font-medium">
                        {format(parseISO(date), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>{stats.present}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>{stats.absent}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span>{stats.late}</span>
                        </div>
                        <div className="text-gray-600">
                          {stats.total > 0
                            ? Math.round((stats.present / stats.total) * 100)
                            : 0}
                          %
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AttendanceReports() {
  return (
    <RoleGuard allowedRoles={[Role.ADMIN]}>
      <AttendanceReportsContent />
    </RoleGuard>
  );
}
