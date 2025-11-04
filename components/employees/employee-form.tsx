"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useEmployeeForm, type Employee } from "@/hooks/use-employee-form";
import {
  FormField,
  TextInput,
  DepartmentSelect,
  ManagerSelect,
  StatusSelect,
  RoleSelect,
} from "./employee-form-fields";

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
  const {
    formData,
    loading,
    hasUnsavedChanges,
    departments,
    departmentsLoading,
    managers,
    managersLoading,
    getFieldError,
    handleChange,
    handleSubmit,
  } = useEmployeeForm(employee, onSuccess);

  // Notify parent component about form changes
  useEffect(() => {
    if (onFormChange) {
      onFormChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onFormChange]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Name"
          error={getFieldError("name")}
          required
        >
          <TextInput
            id="name"
            value={formData.name}
            onChange={(value) => handleChange("name", value)}
            error={getFieldError("name")}
            required
          />
        </FormField>
        <FormField
          label="Email"
          error={getFieldError("email")}
          required
        >
          <TextInput
            id="email"
            type="email"
            value={formData.email}
            onChange={(value) => handleChange("email", value)}
            error={getFieldError("email")}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Employee ID"
          error={getFieldError("employeeId")}
          required
        >
          <TextInput
            id="employeeId"
            value={formData.employeeId}
            onChange={(value) => handleChange("employeeId", value)}
            error={getFieldError("employeeId")}
            required
          />
        </FormField>
        <FormField
          label="Role"
          error={getFieldError("role")}
        >
          <RoleSelect
            value={formData.role}
            onChange={(value) => handleChange("role", value)}
            error={getFieldError("role")}
            employeeId={employee?.id}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Department"
          error={getFieldError("department")}
          required
        >
          <DepartmentSelect
            value={formData.department}
            onChange={(value) => handleChange("department", value)}
            error={getFieldError("department")}
            departments={departments}
            loading={departmentsLoading}
            employeeId={employee?.id}
          />
        </FormField>
        <FormField
          label="Manager"
          error={getFieldError("manager")}
        >
          <ManagerSelect
            value={formData.manager}
            onChange={(value) => handleChange("manager", value)}
            error={getFieldError("manager")}
            managers={managers}
            loading={managersLoading}
            employeeId={employee?.id}
            employee={employee}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Position"
          error={getFieldError("position")}
          required
        >
          <TextInput
            id="position"
            value={formData.position}
            onChange={(value) => handleChange("position", value)}
            error={getFieldError("position")}
            required
          />
        </FormField>
        <FormField
          label="Salary"
          error={getFieldError("salary")}
        >
          <TextInput
            id="salary"
            type="number"
            value={formData.salary || ""}
            onChange={(value) => handleChange("salary", value)}
            error={getFieldError("salary")}
            placeholder="0"
          />
        </FormField>
      </div>

      {employee && (
        <FormField
          label="Status"
          error={getFieldError("status")}
          required
        >
          <StatusSelect
            value={formData.status}
            onChange={(value) => handleChange("status", value)}
            error={getFieldError("status")}
          />
        </FormField>
      )}

      {!employee && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Password"
            error={getFieldError("password")}
            required
          >
            <TextInput
              id="password"
              type="password"
              value={formData.password}
              onChange={(value) => handleChange("password", value)}
              error={getFieldError("password")}
              required
            />
          </FormField>
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
