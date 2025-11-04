"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Crown,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
} from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  position: string;
  role: string;
  isManager: boolean;
}

interface Department {
  id: string;
  name: string;
  manager: {
    id: string;
    name: string;
    email: string;
  } | null;
  employees: Employee[];
  employeeCount: number;
}

interface OrganizationData {
  departments: Department[];
  totalEmployees: number;
  totalDepartments: number;
}

interface EmployeeTreeProps {
  className?: string;
}

export function EmployeeTree({ className }: EmployeeTreeProps) {
  const [organizationData, setOrganizationData] =
    useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(
    new Set()
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees/organization");
      const result = await response.json();

      if (result.success && result.data) {
        setOrganizationData(result.data);
        // Expand all departments by default
        const allDeptIds = new Set(
          result.data.departments.map((dept: Department) => dept.id)
        );
        setExpandedDepartments(allDeptIds);
      }
    } catch (error) {
      console.error("Error fetching organization data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800 border-red-200";
      case "MANAGER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "EMPLOYEE":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Crown className="h-3 w-3" />;
      case "MANAGER":
        return <Users className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading organization...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organizationData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Failed to load organization data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Tree
          </CardTitle>
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {organizationData.totalEmployees} employees
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {organizationData.totalDepartments} departments
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizationData.departments.map((department) => (
            <Collapsible
              key={department.id}
              open={expandedDepartments.has(department.id)}
              onOpenChange={() => toggleDepartment(department.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-3">
                    {expandedDepartments.has(department.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-lg">
                        {department.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {department.employeeCount} employee
                        {department.employeeCount !== 1 ? "s" : ""}
                        {department.manager && (
                          <span className="ml-2">
                            • Manager: {department.manager.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-2 ml-6">
                {department.employees.map((employee) => (
                  <Card
                    key={employee.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedEmployee?.id === employee.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" alt={employee.name} />
                          <AvatarFallback className="text-sm">
                            {employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {employee.name}
                              {employee.isManager && (
                                <Crown className="h-3 w-3 text-yellow-500 ml-1 inline" />
                              )}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getRoleColor(
                                employee.role
                              )}`}
                            >
                              {getRoleIcon(employee.role)}
                              <span className="ml-1">{employee.role}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {employee.position} • {employee.employeeId}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" alt={selectedEmployee.name} />
                  <AvatarFallback className="text-lg">
                    {selectedEmployee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-gray-600">{selectedEmployee.position}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getRoleColor(selectedEmployee.role)}`}
                  >
                    {getRoleIcon(selectedEmployee.role)}
                    <span className="ml-1">{selectedEmployee.role}</span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{selectedEmployee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>ID: {selectedEmployee.employeeId}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>
                    {organizationData?.departments.find((d) =>
                      d.employees.some((e) => e.id === selectedEmployee.id)
                    )?.name || "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEmployee(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
