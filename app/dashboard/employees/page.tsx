"use client";

import { useEffect, useState } from "react";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeTree } from "@/components/employees/employee-tree";
import { OrganizationChart } from "@/components/employees/organization-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  BarChart3,
  TreePine,
  List,
  Network,
} from "lucide-react";
import { PageGuard } from "@/components/auth/page-guard";
import { Role } from "@prisma/client";

interface EmployeeStats {
  totalEmployees: number;
  totalDepartments: number;
  departmentNames: string;
  newThisMonth: number;
}

function EmployeesPageContent() {
  const [stats, setStats] = useState<EmployeeStats>({
    totalEmployees: 0,
    totalDepartments: 0,
    departmentNames: "",
    newThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeStats();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      const response = await fetch("/api/employees/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching employee stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="w-full">
        <h1 className="text-3xl font-bold text-gray-900 break-words">Employees</h1>
        <p className="text-gray-600 break-words">
          Manage your team members and their information
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 w-full">
        <Card className="w-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words pr-2">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground break-words">Active team members</p>
          </CardContent>
        </Card>

        <Card className="w-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words pr-2">Departments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalDepartments}
            </div>
            <p className="text-xs text-muted-foreground break-words line-clamp-2">
              {loading ? "..." : stats.departmentNames || "No departments"}
            </p>
          </CardContent>
        </Card>

        <Card className="w-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium break-words pr-2">
              New This Month
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.newThisMonth}
            </div>
            <p className="text-xs text-muted-foreground break-words">Recently hired</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4 w-full">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="list" className="flex items-center space-x-2 whitespace-nowrap">
            <List className="h-4 w-4 flex-shrink-0" />
            <span>Employee List</span>
          </TabsTrigger>
          <TabsTrigger value="tree" className="flex items-center space-x-2 whitespace-nowrap">
            <TreePine className="h-4 w-4 flex-shrink-0" />
            <span>Organization Tree</span>
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center space-x-2 whitespace-nowrap">
            <Network className="h-4 w-4 flex-shrink-0" />
            <span>Organization Chart</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 w-full">
          <EmployeeList showAll={true} />
        </TabsContent>

        <TabsContent value="tree" className="space-y-4 w-full">
          <EmployeeTree />
        </TabsContent>

        <TabsContent value="chart" className="space-y-4 w-full">
          <OrganizationChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <PageGuard allowedRoles={[Role.ADMIN, Role.MANAGER]}>
      <EmployeesPageContent />
    </PageGuard>
  );
}
