/**
 * Form Field Components for Employee Form
 * Extracted from components/employees/employee-form.tsx
 * Following DRY principles and component composition
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Department, Manager, getManagerName } from "@/hooks/use-employee-form";
import { EmployeeStatus } from "@/lib/constants/status";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label} {required && '*'}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

interface TextInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}

export function TextInput({
  id,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
}: TextInputProps) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className={error ? "border-red-500" : ""}
    />
  );
}

interface SelectInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  children: React.ReactNode;
  selectKey?: string; // Renamed from 'key' to avoid React special prop conflict
}

export function SelectInput({
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  children,
  selectKey,
}: SelectInputProps) {
  return (
    <Select
      key={selectKey}
      value={value}
      onValueChange={onChange}
      modal={false}
    >
      <SelectTrigger
        className={error ? "border-red-500" : ""}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="item-aligned">
        {children}
      </SelectContent>
    </Select>
  );
}

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  departments: Department[];
  loading: boolean;
  employeeId?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  error,
  departments,
  loading,
  employeeId,
}: DepartmentSelectProps) {
  return (
    <SelectInput
      id="department"
      selectKey={`department-${employeeId || "new"}`}
      value={value}
      onChange={onChange}
      error={error}
      required
      placeholder="Select department"
    >
      {loading ? (
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
    </SelectInput>
  );
}

interface ManagerSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  managers: Manager[];
  loading: boolean;
  employeeId?: string;
  employee?: { manager?: { user?: { id: string; name: string } } } | null;
}

export function ManagerSelect({
  value,
  onChange,
  error,
  managers,
  loading,
  employeeId,
  employee,
}: ManagerSelectProps) {
  // Normalize value to "no-manager" if empty
  const normalizedValue = value || "no-manager";
  
  return (
    <Select
      key={`manager-${employeeId || "new"}-${normalizedValue}`}
      value={normalizedValue}
      onValueChange={onChange}
      modal={false}
    >
      <SelectTrigger
        className={`w-full ${error ? "border-red-500" : ""}`}
      >
        <SelectValue placeholder="Select manager (optional)">
          {normalizedValue !== "no-manager" 
            ? getManagerName(normalizedValue, managers, employee)
            : "No Manager"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="item-aligned" className="min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="no-manager" className="whitespace-normal">
          No Manager
        </SelectItem>
        {loading ? (
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
  );
}

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  employeeId?: string;
}

export function StatusSelect({
  value,
  onChange,
  error,
  employeeId,
}: StatusSelectProps) {
  // Ensure value is uppercase to match enum values
  const normalizedValue = value ? value.toUpperCase() : EmployeeStatus.ACTIVE;
  
  return (
    <SelectInput
      id="status"
      selectKey={`status-${employeeId || "new"}`}
      value={normalizedValue}
      onChange={onChange}
      error={error}
      required
      placeholder="Select status"
    >
      <SelectItem value={EmployeeStatus.ACTIVE}>Active</SelectItem>
      <SelectItem value={EmployeeStatus.INACTIVE}>Inactive</SelectItem>
      <SelectItem value={EmployeeStatus.LAYOFF}>Layoff</SelectItem>
      <SelectItem value={EmployeeStatus.TERMINATED}>Terminated</SelectItem>
      <SelectItem value={EmployeeStatus.ON_LEAVE}>On Leave</SelectItem>
      <SelectItem value={EmployeeStatus.SUSPENDED}>Suspended</SelectItem>
    </SelectInput>
  );
}

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  employeeId?: string;
}

export function RoleSelect({
  value,
  onChange,
  error,
  employeeId,
}: RoleSelectProps) {
  // Ensure value is uppercase to match enum values
  const normalizedValue = value ? value.toUpperCase() : "EMPLOYEE";
  
  return (
    <SelectInput
      id="role"
      selectKey={`role-${employeeId || "new"}`}
      value={normalizedValue}
      onChange={onChange}
      error={error}
      placeholder="Select role"
    >
      <SelectItem value="EMPLOYEE">Employee</SelectItem>
      <SelectItem value="MANAGER">Manager</SelectItem>
      <SelectItem value="ADMIN">Admin</SelectItem>
    </SelectInput>
  );
}

