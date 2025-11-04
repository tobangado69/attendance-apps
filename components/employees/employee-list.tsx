"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Eye, Download } from "lucide-react";
import { EmployeeForm } from "./employee-form";
import { RoleGuard } from "@/components/auth/role-guard";
import { useRole } from "@/hooks/use-role";
import { exportEmployeesToExcel } from "@/lib/excel-export";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";

interface Employee {
  id: string;
  employeeId: string;
  department?: { id: string; name: string } | string;
  position?: string;
  salary?: number;
  status?: string;
  isActive: boolean;
  managerId?: string;
  manager?: {
    id: string;
    employeeId: string;
    position: string;
    user: {
      name: string;
      email: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
}

interface EmployeeListProps {
  showAll?: boolean;
}

export function EmployeeList({ showAll = true }: EmployeeListProps) {
  const { data: session } = useSession();
  const { canPerform, isManagerOrAdmin } = useRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [currentPage, departmentFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });

      if (searchTerm) {
        params.set("search", searchTerm);
      }
      if (departmentFilter && departmentFilter !== "all") {
        params.set("department", departmentFilter);
      }

      const response = await fetch(`/api/employees?${params}`);
      const data = await response.json();

      if (data.data) {
        setEmployees(data.data);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    // Debounce search
    setTimeout(() => {
      fetchEmployees();
    }, 500);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && hasFormChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close the form?"
      );
      if (!confirmed) {
        return;
      }
    }
    setIsFormOpen(open);
    if (!open) {
      setEditingEmployee(null);
      setHasFormChanges(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEmployees();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete employee");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "MANAGER":
        return "bg-blue-100 text-blue-800";
      case "EMPLOYEE":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "secondary";
      case "LAYOFF":
        return "destructive";
      case "TERMINATED":
        return "destructive";
      case "ON_LEAVE":
        return "outline";
      case "SUSPENDED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "INACTIVE":
        return "Inactive";
      case "LAYOFF":
        return "Layoff";
      case "TERMINATED":
        return "Terminated";
      case "ON_LEAVE":
        return "On Leave";
      case "SUSPENDED":
        return "Suspended";
      default:
        return "Unknown";
    }
  };

  const canEdit = (employee: Employee) => {
    return canPerform("update", "employee", employee.user.id);
  };

  const canDelete = () => {
    return canPerform("delete", "employee");
  };

  const handleExportToExcel = () => {
    try {
      if (employees.length === 0) {
        showErrorToast("No employees to export");
        return;
      }

      const exportData = employees.map((emp) => ({
        employeeId: emp.employeeId,
        name: emp.user.name,
        email: emp.user.email,
        department:
          typeof emp.department === "object"
            ? emp.department?.name || "N/A"
            : emp.department || "N/A",
        position: emp.position || "N/A",
        salary: emp.salary || 0,
        status: emp.status || "ACTIVE",
        role: emp.user.role,
        createdAt: new Date(emp.user.createdAt).toLocaleDateString(),
      }));

      exportEmployeesToExcel(exportData, {
        filename: `employees-export-${
          new Date().toISOString().split("T")[0]
        }.xlsx`,
      });

      showSuccessToast("Employee data exported to Excel successfully!");
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast("Failed to export employee data");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Employees</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleExportToExcel}
              disabled={employees.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            {showAll && (
              <RoleGuard feature="manage-employees">
                <Dialog open={isFormOpen} onOpenChange={handleDialogClose}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingEmployee(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEmployee ? "Edit Employee" : "Add New Employee"}
                      </DialogTitle>
                    </DialogHeader>
                    <EmployeeForm
                      employee={editingEmployee}
                      onSuccess={() => {
                        setIsFormOpen(false);
                        setEditingEmployee(null);
                        setHasFormChanges(false);
                        fetchEmployees();
                      }}
                      onFormChange={setHasFormChanges}
                    />
                  </DialogContent>
                </Dialog>
              </RoleGuard>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{employee.user.name}</div>
                        <div className="text-sm text-gray-500">
                          {employee.user.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {employee.employeeId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {typeof employee.department === "object"
                        ? employee.department?.name || "N/A"
                        : employee.department || "N/A"}
                    </TableCell>
                    <TableCell>{employee.position || "N/A"}</TableCell>
                    <TableCell>
                      {employee.manager ? (
                        <div>
                          <div className="font-medium">
                            {employee.manager.user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.manager.position || employee.manager.employeeId}
                          </div>
                        </div>
                      ) : (
                        "No Manager"
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.salary
                        ? `$${employee.salary.toLocaleString()}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(employee.user.role)}>
                        {employee.user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusVariant(employee.status || "ACTIVE")}
                      >
                        {getStatusLabel(employee.status || "ACTIVE")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <RoleGuard feature="manage-employees">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            disabled={!canEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </RoleGuard>
                        <RoleGuard feature="manage-employees">
                          {canDelete() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </RoleGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {employees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No employees found
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
