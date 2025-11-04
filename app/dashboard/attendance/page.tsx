"use client";

import { CheckInOut } from "@/components/attendance/check-in-out";
import { AttendanceList } from "@/components/attendance/attendance-list";
import { AttendanceReports } from "@/components/attendance/attendance-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, List, BarChart3 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

export default function AttendancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600">Track and manage employee attendance</p>
      </div>

      <Tabs defaultValue="checkin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checkin" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Check In/Out</span>
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Records</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="reports"
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="checkin" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CheckInOut />
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Time:</span>
                    <span className="font-medium">
                      {new Date().toLocaleTimeString("en-GB", {
                        hour12: false,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Day:</span>
                    <span className="font-medium">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <AttendanceList showAll={true} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="reports">
            <AttendanceReports />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
