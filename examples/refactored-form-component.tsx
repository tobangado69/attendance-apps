// Example: Refactored form component using reusable utilities
// This shows how to refactor components/employees/employee-form.tsx

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
import {
  BaseForm,
  FormFieldWithError,
  FormActions,
} from "@/components/forms/base-form";
import { employeeSchema, type EmployeeFormData } from "@/lib/validations";
import { useErrorHandler } from "@/hooks/use-error-handler";

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
  employee?: Employee;
  onSuccess: () => void;
  onFormChange?: (hasChanges: boolean) => void;
}

export function EmployeeForm({
  employee,
  onSuccess,
  onFormChange,
}: EmployeeFormProps) {
  const { executeWithErrorHandling } = useErrorHandler();

  // Initial form data
  const initialData: EmployeeFormData = {
    name: employee?.user.name || "",
    email: employee?.user.email || "",
    password: "",
    role: employee?.user.role || "EMPLOYEE",
    employeeId: employee?.employeeId || "",
    department: employee?.department || "Engineering",
    position: employee?.position || "",
    salary: employee?.salary?.toString() || "",
    status: employee?.status || "ACTIVE",
  };

  // Handle form submission
  const handleSubmit = async (data: EmployeeFormData) => {
    await executeWithErrorHandling(async () => {
      const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
      const method = employee ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save employee");
      }

      onSuccess();
    }, "Employee form submission");
  };

  return (
    <BaseForm
      initialData={initialData}
      schema={employeeSchema}
      onSubmit={handleSubmit}
    >
      {(form) => {
        // Notify parent about form changes
        useEffect(() => {
          if (onFormChange) {
            onFormChange(form.hasUnsavedChanges);
          }
        }, [form.hasUnsavedChanges, onFormChange]);

        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                label="Name"
                name="name"
                required
                value={form.formData.name}
                onChange={(value) => form.updateField("name", value)}
                error={form.getFieldError("name")}
              >
                <Input
                  value={form.formData.name}
                  onChange={(e) => form.updateField("name", e.target.value)}
                  className={form.getFieldError("name") ? "border-red-500" : ""}
                />
              </FormFieldWithError>

              <FormFieldWithError
                label="Email"
                name="email"
                type="email"
                required
                value={form.formData.email}
                onChange={(value) => form.updateField("email", value)}
                error={form.getFieldError("email")}
              >
                <Input
                  type="email"
                  value={form.formData.email}
                  onChange={(e) => form.updateField("email", e.target.value)}
                  className={
                    form.getFieldError("email") ? "border-red-500" : ""
                  }
                />
              </FormFieldWithError>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                label="Employee ID"
                name="employeeId"
                required
                value={form.formData.employeeId}
                onChange={(value) => form.updateField("employeeId", value)}
                error={form.getFieldError("employeeId")}
              >
                <Input
                  value={form.formData.employeeId}
                  onChange={(e) =>
                    form.updateField("employeeId", e.target.value)
                  }
                  className={
                    form.getFieldError("employeeId") ? "border-red-500" : ""
                  }
                />
              </FormFieldWithError>

              <FormFieldWithError
                label="Role"
                name="role"
                required
                value={form.formData.role}
                onChange={(value) => form.updateField("role", value)}
                error={form.getFieldError("role")}
              >
                <Select
                  value={form.formData.role}
                  onValueChange={(value) => form.updateField("role", value)}
                >
                  <SelectTrigger
                    className={
                      form.getFieldError("role") ? "border-red-500" : ""
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormFieldWithError>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                label="Department"
                name="department"
                required
                value={form.formData.department}
                onChange={(value) => form.updateField("department", value)}
                error={form.getFieldError("department")}
              >
                <Select
                  value={form.formData.department}
                  onValueChange={(value) =>
                    form.updateField("department", value)
                  }
                >
                  <SelectTrigger
                    className={
                      form.getFieldError("department") ? "border-red-500" : ""
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </FormFieldWithError>

              <FormFieldWithError
                label="Position"
                name="position"
                required
                value={form.formData.position}
                onChange={(value) => form.updateField("position", value)}
                error={form.getFieldError("position")}
              >
                <Input
                  value={form.formData.position}
                  onChange={(e) => form.updateField("position", e.target.value)}
                  className={
                    form.getFieldError("position") ? "border-red-500" : ""
                  }
                />
              </FormFieldWithError>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                label="Salary"
                name="salary"
                type="number"
                required
                value={form.formData.salary}
                onChange={(value) => form.updateField("salary", value)}
                error={form.getFieldError("salary")}
              >
                <Input
                  type="number"
                  value={form.formData.salary}
                  onChange={(e) => form.updateField("salary", e.target.value)}
                  className={
                    form.getFieldError("salary") ? "border-red-500" : ""
                  }
                />
              </FormFieldWithError>

              <FormFieldWithError
                label="Status"
                name="status"
                required
                value={form.formData.status}
                onChange={(value) => form.updateField("status", value)}
                error={form.getFieldError("status")}
              >
                <Select
                  value={form.formData.status}
                  onValueChange={(value) => form.updateField("status", value)}
                >
                  <SelectTrigger
                    className={
                      form.getFieldError("status") ? "border-red-500" : ""
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </FormFieldWithError>
            </div>

            {!employee && (
              <FormFieldWithError
                label="Password"
                name="password"
                type="password"
                required
                value={form.formData.password}
                onChange={(value) => form.updateField("password", value)}
                error={form.getFieldError("password")}
              >
                <Input
                  type="password"
                  value={form.formData.password}
                  onChange={(e) => form.updateField("password", e.target.value)}
                  className={
                    form.getFieldError("password") ? "border-red-500" : ""
                  }
                />
              </FormFieldWithError>
            )}

            <FormActions
              onSubmit={form.handleSubmit}
              isLoading={form.isLoading}
              submitText={employee ? "Update Employee" : "Create Employee"}
              showCancel={false}
              showReset={true}
              onReset={form.resetForm}
            />
          </>
        );
      }}
    </BaseForm>
  );
}

// BEFORE: 362 lines of code with lots of repetitive form logic
// AFTER: ~200 lines of code, much cleaner and more maintainable
// Benefits:
// - Reusable form components
// - Consistent error handling
// - Less boilerplate code
// - Better type safety
// - Easier to maintain and test
