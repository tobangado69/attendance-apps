"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Crown,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  position: string;
  role: string;
  image?: string;
  department?: string | null;
  managerId?: string | null;
  directReports: Employee[];
  directReportsCount: number;
  totalReportsCount: number;
}

interface HierarchyData {
  admin: Employee | null;
  managers: Employee[];
  adminDirectEmployees?: Employee[];
  unassignedEmployees: Employee[];
  totalEmployees: number;
}

interface OrganizationChartProps {
  className?: string;
}

export function OrganizationChart({ className }: OrganizationChartProps) {
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    fetchHierarchyData();
  }, []);

  const fetchHierarchyData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees/hierarchy");
      const result = await response.json();

      if (result.success && result.data) {
        setHierarchyData(result.data);
        // Expand all nodes by default
        const allNodeIds = new Set(
          [
            result.data.admin?.id,
            ...(result.data.managers || []).map((mgr: Employee) => mgr.id),
            ...(result.data.managers || []).flatMap((mgr: Employee) =>
              mgr.directReports.map((emp: Employee) => emp.id)
            ),
            ...(result.data.adminDirectEmployees || []).map((emp: Employee) => emp.id),
            ...(result.data.unassignedEmployees || []).map((emp: Employee) => emp.id),
          ].filter(Boolean)
        );
        setExpandedNodes(allNodeIds);
      }
    } catch (error) {
      console.error("Error fetching hierarchy data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
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

  const EmployeeCard = ({
    employee,
    isAdmin = false,
    isManager = false,
  }: {
    employee: Employee;
    isAdmin?: boolean;
    isManager?: boolean;
  }) => {
    const hasReports = employee.directReportsCount > 0;
    const isExpanded = expandedNodes.has(employee.id);

    return (
      <div className="flex flex-col items-center">
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            isAdmin
              ? "ring-2 ring-red-400 bg-gradient-to-br from-red-50 to-orange-50"
              : isManager
              ? "ring-1 ring-blue-300 bg-blue-50"
              : "hover:shadow-md"
          } ${
            selectedEmployee?.id === employee.id ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => setSelectedEmployee(employee)}
        >
          <CardContent className="p-4 text-center min-w-[200px]">
            <div className="flex flex-col items-center space-y-2">
              <Avatar className={`${isAdmin ? "h-16 w-16" : "h-12 w-12"}`}>
                <AvatarImage src={employee.image || ""} alt={employee.name} />
                <AvatarFallback className={isAdmin ? "text-lg" : "text-sm"}>
                  {employee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h4
                  className={`font-semibold ${
                    isAdmin ? "text-lg" : "text-sm"
                  } truncate max-w-[180px]`}
                >
                  {employee.name}
                  {isAdmin && (
                    <Crown className="h-4 w-4 text-red-500 ml-1 inline" />
                  )}
                  {isManager && (
                    <Users className="h-3 w-3 text-blue-500 ml-1 inline" />
                  )}
                </h4>

                <p
                  className={`text-xs text-gray-600 truncate max-w-[180px] ${
                    isAdmin ? "font-medium" : ""
                  }`}
                >
                  {employee.position}
                </p>

                <p className="text-xs text-gray-500 truncate max-w-[180px]">
                  {employee.employeeId}
                </p>

                <Badge
                  variant="outline"
                  className={`text-xs ${getRoleColor(employee.role)}`}
                >
                  {getRoleIcon(employee.role)}
                  <span className="ml-1">{employee.role}</span>
                </Badge>
              </div>

              {hasReports && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded-full">
                    {employee.directReportsCount} direct
                  </span>
                  {employee.totalReportsCount > employee.directReportsCount && (
                    <span className="bg-blue-100 px-2 py-1 rounded-full">
                      {employee.totalReportsCount} total
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {hasReports && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(employee.id);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  };

  const ConnectionLine = () => (
    <div className="flex justify-center">
      <div className="w-px h-8 bg-gray-300"></div>
    </div>
  );

  const HorizontalLine = () => (
    <div className="flex justify-center">
      <div className="h-px w-8 bg-gray-300"></div>
    </div>
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">
              Loading organization chart...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchyData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Failed to load organization chart
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Chart
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">{zoomLevel}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {hierarchyData.totalEmployees} employees
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {hierarchyData.managers?.length || 0} managers
            </span>
            {hierarchyData.unassignedEmployees?.length > 0 && (
              <span className="flex items-center gap-1 text-orange-600">
                <User className="h-4 w-4" />
                {hierarchyData.unassignedEmployees.length} unassigned
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-auto p-4"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
            }}
          >
            <div className="flex flex-col items-center space-y-8 min-w-max">
              {/* Admin Level - Top */}
              {hierarchyData.admin && (
                <div className="flex flex-col items-center space-y-4">
                  <EmployeeCard employee={hierarchyData.admin} isAdmin={true} />

                  {hierarchyData.admin.directReportsCount > 0 && (
                    <>
                      <ConnectionLine />

                      {/* Managers and Direct Employees under Admin */}
                      <div className="flex flex-wrap justify-center gap-8">
                        {/* Show Managers first */}
                        {hierarchyData.managers.map((manager, index) => {
                          const isExpanded = expandedNodes.has(manager.id);
                          return (
                            <div
                              key={manager.id}
                              className="flex flex-col items-center space-y-4"
                            >
                              {index > 0 && <HorizontalLine />}
                              <EmployeeCard employee={manager} isManager={true} />

                              {/* Employees under Manager */}
                              {isExpanded && manager.directReports.length > 0 && (
                                <>
                                  <ConnectionLine />
                                  <div className="flex flex-wrap justify-center gap-4">
                                    {manager.directReports.map((employee) => (
                                      <EmployeeCard
                                        key={employee.id}
                                        employee={employee}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}

                        {/* Show Employees directly under Admin (not managers) */}
                        {hierarchyData.adminDirectEmployees &&
                          hierarchyData.adminDirectEmployees.length > 0 &&
                          hierarchyData.managers.length > 0 && (
                            <HorizontalLine />
                          )}
                        {hierarchyData.adminDirectEmployees &&
                          hierarchyData.adminDirectEmployees.length > 0 &&
                          hierarchyData.adminDirectEmployees.map((employee) => (
                            <EmployeeCard
                              key={employee.id}
                              employee={employee}
                            />
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* No Admin - Show Managers directly */}
              {!hierarchyData.admin && hierarchyData.managers.length > 0 && (
                <div className="flex flex-wrap justify-center gap-8">
                  {hierarchyData.managers.map((manager, index) => {
                    const isExpanded = expandedNodes.has(manager.id);
                    return (
                      <div
                        key={manager.id}
                        className="flex flex-col items-center space-y-4"
                      >
                        {index > 0 && <HorizontalLine />}
                        <EmployeeCard employee={manager} isManager={true} />

                        {isExpanded && manager.directReports.length > 0 && (
                          <>
                            <ConnectionLine />
                            <div className="flex flex-wrap justify-center gap-4">
                              {manager.directReports.map((employee) => (
                                <EmployeeCard
                                  key={employee.id}
                                  employee={employee}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unassigned Employees Section */}
              {hierarchyData.unassignedEmployees &&
                hierarchyData.unassignedEmployees.length > 0 && (
                  <>
                    <div className="w-full mt-12 pt-8 border-t-2 border-dashed border-gray-300">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-5 w-5" />
                          <h3 className="text-lg font-semibold text-gray-700">
                            Unassigned Employees
                          </h3>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                          {hierarchyData.unassignedEmployees.map((employee) => (
                            <EmployeeCard
                              key={employee.id}
                              employee={employee}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
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
                  <AvatarImage
                    src={selectedEmployee.image || ""}
                    alt={selectedEmployee.name}
                  />
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
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>Direct Reports: {selectedEmployee.directReportsCount}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>Total Reports: {selectedEmployee.totalReportsCount}</span>
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
