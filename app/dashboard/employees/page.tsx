"use client";

import { useEffect, useState } from "react";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeTree } from "@/components/employees/employee-tree";
import { OrganizationChart } from "@/components/employees/organization-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/ui/stats-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
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
import { logError } from "@/lib/utils/logger";

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
      logError(error, { context: "EmployeesPage - fetchEmployeeStats" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout className="w-full max-w-full overflow-hidden">
      <PageHeader
        title="Employees"
        description="Manage your team members and their information"
      />

      <div className="grid gap-4 md:grid-cols-3 w-full">
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          description="Active team members"
          icon={Users}
          loading={loading}
        />

        <StatsCard
          title="Departments"
          value={stats.totalDepartments}
          description={stats.departmentNames || "No departments"}
          icon={BarChart3}
          loading={loading}
        />

        <StatsCard
          title="New This Month"
          value={stats.newThisMonth}
          description="Recently hired"
          icon={UserPlus}
          loading={loading}
        />
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
    </PageLayout>
  );
}

export default function EmployeesPage() {
  return (
    <PageGuard allowedRoles={[Role.ADMIN, Role.MANAGER]}>
      <EmployeesPageContent />
    </PageGuard>
  );
}
