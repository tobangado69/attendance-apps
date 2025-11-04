"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  employeeSchema,
  employeeUpdateSchema,
  type EmployeeFormData,
  type EmployeeUpdateFormData,
} from "@/lib/validations";
import { useValidation } from "@/hooks/use-validation";

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  position: string;
  employeeId: string;
}

interface Employee {
  id: string;
  employeeId: string;
  department?: string;
  position?: string;
  salary?: number;
  status?: string;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onFormChange?: (hasChanges: boolean) => void;
}

export function EmployeeForm({
  employee,
  onSuccess,
  onFormChange,
}: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    employeeId: "",
    department: "Engineering",
    position: "Employee",
    salary: "",
    status: "ACTIVE",
    manager: "", // Manager ID
  });
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  // State for managers
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(true);
  
  // Helper to get manager name by ID
  const getManagerName = (managerId: string | null | undefined): string => {
    if (!managerId || managerId === "no-manager") return "";
    const manager = managers.find(m => m.id === managerId);
    if (manager) return manager.name;
    // Fallback: try to get from employee.manager if available
    if (employee?.manager?.user?.id === managerId) {
      return employee.manager.user.name;
    }
    return "";
  };

  const { errors, validate, validateField, clearFieldError, getFieldError } =
    useValidation(employee ? employeeUpdateSchema : employeeSchema);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const response = await fetch("/api/settings/departments");
      const result = await response.json();

      if (result.success && result.data) {
        setDepartments(result.data);
        // Set default department to first available if none selected and not editing
        if (!employee && !formData.department && result.data.length > 0) {
          setFormData((prev) => ({ ...prev, department: result.data[0].id }));
        }
      } else {
        console.error("Failed to fetch departments:", result);
        showErrorToast("Failed to load departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      showErrorToast("Failed to load departments");
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Fetch managers (employees who can be managers)
  const fetchManagers = async () => {
    try {
      setManagersLoading(true);
      const response = await fetch("/api/settings/managers");
      const result = await response.json();

      if (result.success && result.data) {
        setManagers(
          result.data.map((manager: { 
            id: string; 
            name: string; 
            email: string; 
            role?: string;
            employee?: { employeeId?: string; position?: string } | null;
          }) => ({
            id: manager.id, // User ID
            name: manager.name,
            email: manager.email,
            position: manager.employee?.position || manager.role || "",
            employeeId: manager.employee?.employeeId || manager.id,
            role: manager.role,
          }))
        );
      } else {
        console.error("Failed to fetch managers:", result);
        showErrorToast("Failed to load managers");
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
      showErrorToast("Failed to load managers");
    } finally {
      setManagersLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, []);

  // Update form data when employee changes, but wait for departments/managers to load
  useEffect(() => {
    if (employee && !departmentsLoading && !managersLoading) {
      console.log("Setting form data for employee:", {
        name: employee.user.name,
        role: employee.user.role,
        department: employee.department,
        managerId: employee.managerId,
        manager: employee.manager,
      });

      // Get department ID
      let departmentId = "";
      if (employee.department) {
        if (typeof employee.department === "object") {
          departmentId = employee.department.id || "";
        } else {
          departmentId = employee.department;
        }
      }

      // Get manager user ID from manager relation
      // The manager dropdown uses user IDs, but employee.managerId is an employee ID
      // So we need to get the user ID from the manager relation
      let managerUserId = "no-manager";
      if (employee.manager && employee.manager.user) {
        // Use the user ID directly from the manager relation (most reliable)
        managerUserId = employee.manager.user.id;
      } else if (employee.managerId && managers.length > 0) {
        // Fallback: try to find manager by matching employee record ID
        // We need to find the manager whose employee record ID matches employee.managerId
        // Since managers list contains user IDs, we need to fetch the employee record
        // But for now, we'll wait for the manager relation to be loaded from API
        // This should be handled by the API including the manager relation
      }

      setFormData({
        name: employee.user.name,
        email: employee.user.email,
        password: "",
        role: employee.user.role?.toUpperCase() || "EMPLOYEE",
        employeeId: employee.employeeId,
        department: departmentId,
        position: employee.position || "Software Developer",
        salary: employee.salary?.toString() || "",
        status: employee.status || "ACTIVE",
        manager: managerUserId,
      });

      console.log("Form data set to:", {
        department: departmentId,
        manager: managerUserId,
        managerEmployee: employee.manager,
      });
    }
  }, [employee, departmentsLoading, managersLoading, managers]);

  // Notify parent component about form changes
  useEffect(() => {
    if (onFormChange) {
      onFormChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onFormChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert form data for validation
    const dataToValidate = {
      ...formData,
      salary: formData.salary === "" ? undefined : Number(formData.salary),
    };

    // Use the validation hook
    const validation = validate(dataToValidate);

    if (!validation.success) {
      toast.error("Please fix the form errors");
      console.error("Validation errors:", validation.errors);
      console.error("Form data being validated:", dataToValidate);

      // Show specific field errors
      validation.errors?.forEach((error) => {
        console.error(`Field "${error.field}": ${error.message}`);
      });
      return;
    }

    setLoading(true);

    try {
      const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
      const method = employee ? "PUT" : "POST";

      // For new employees, always set status to ACTIVE
      const dataToSend = employee
        ? validation.data
        : { ...validation.data, status: "ACTIVE" };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Employee saved successfully");
        setHasUnsavedChanges(false);
        onSuccess();
      } else {
        toast.error(data.error || "Failed to save employee");
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error("Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Mark form as having unsaved changes
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    clearFieldError(field);

    // Validate field on change
    if (field === "salary") {
      const numValue = value === "" ? 0 : Number(value);
      validateField(field, numValue);
    } else {
      validateField(field, value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            className={getFieldError("name") ? "border-red-500" : ""}
          />
          {getFieldError("name") && (
            <p className="text-sm text-red-600 mt-1">{getFieldError("name")}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            className={getFieldError("email") ? "border-red-500" : ""}
          />
          {getFieldError("email") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("email")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employeeId">Employee ID *</Label>
          <Input
            id="employeeId"
            value={formData.employeeId}
            onChange={(e) => handleChange("employeeId", e.target.value)}
            required
            className={getFieldError("employeeId") ? "border-red-500" : ""}
          />
          {getFieldError("employeeId") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("employeeId")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            key={`role-${employee?.id || "new"}`}
            value={formData.role || "EMPLOYEE"}
            onValueChange={(value) => handleChange("role", value)}
          >
            <SelectTrigger
              className={getFieldError("role") ? "border-red-500" : ""}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
          {getFieldError("role") && (
            <p className="text-sm text-red-600 mt-1">{getFieldError("role")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">Department *</Label>
          <Select
            key={`department-${employee?.id || "new"}`}
            value={formData.department}
            onValueChange={(value) => handleChange("department", value)}
          >
            <SelectTrigger
              className={`w-full ${getFieldError("department") ? "border-red-500" : ""}`}
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departmentsLoading ? (
                <SelectItem value="loading" disabled>
                  Loading departments...
                </SelectItem>
              ) : departments.length > 0 ? (
                departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-departments" disabled>
                  No departments available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {getFieldError("department") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("department")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="manager">Manager</Label>
          <Select
            key={`manager-${employee?.id || "new"}-${formData.manager}`}
            value={formData.manager || "no-manager"}
            onValueChange={(value) => handleChange("manager", value)}
          >
            <SelectTrigger
              className={`w-full ${getFieldError("manager") ? "border-red-500" : ""}`}
            >
              <SelectValue placeholder="Select manager (optional)">
                {formData.manager && formData.manager !== "no-manager" 
                  ? getManagerName(formData.manager)
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="no-manager" className="whitespace-normal">No Manager</SelectItem>
              {managersLoading ? (
                <SelectItem value="loading" disabled className="whitespace-normal">
                  Loading managers...
                </SelectItem>
              ) : managers.length > 0 ? (
                managers.map((manager) => (
                  <SelectItem 
                    key={manager.id} 
                    value={manager.id} 
                    className="whitespace-normal break-words"
                    textValue={manager.name}
                  >
                    {manager.name} {manager.position && `(${manager.position})`} {manager.employeeId && `- ${manager.employeeId}`}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-managers" disabled className="whitespace-normal">
                  No managers available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {getFieldError("manager") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("manager")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => handleChange("position", e.target.value)}
            required
            className={getFieldError("position") ? "border-red-500" : ""}
          />
          {getFieldError("position") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("position")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="salary">Salary</Label>
          <Input
            id="salary"
            type="number"
            value={formData.salary || ""}
            onChange={(e) => handleChange("salary", e.target.value)}
            placeholder="0"
            className={getFieldError("salary") ? "border-red-500" : ""}
          />
          {getFieldError("salary") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("salary")}
            </p>
          )}
        </div>
      </div>

      {employee && (
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger
              className={getFieldError("status") ? "border-red-500" : ""}
            >
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="LAYOFF">Layoff</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
          {getFieldError("status") && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("status")}
            </p>
          )}
        </div>
      )}

      {!employee && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
              className={getFieldError("password") ? "border-red-500" : ""}
            />
            {getFieldError("password") && (
              <p className="text-sm text-red-600 mt-1">
                {getFieldError("password")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : employee
            ? "Update Employee"
            : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
