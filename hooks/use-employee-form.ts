/**
 * Custom hooks for Employee Form
 * Extracted from components/employees/employee-form.tsx
 * Following DRY principles and Next.js 15 best practices
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  employeeSchema,
  employeeUpdateSchema,
  type EmployeeFormData,
  type EmployeeUpdateFormData,
} from '@/lib/validations';
import { useValidation } from '@/hooks/use-validation';
import { showErrorToast } from '@/lib/error-handler';
import { logError } from '@/lib/utils/logger';
import { EmployeeStatus } from '@/lib/constants/status';

export interface Department {
  id: string;
  name: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  position: string;
  employeeId: string;
  role?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  department?: string | { id: string; name: string };
  position?: string;
  salary?: number;
  status?: string;
  managerId?: string;
  isActive: boolean;
  manager?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface EmployeeFormState {
  name: string;
  email: string;
  password: string;
  role: string;
  employeeId: string;
  department: string;
  position: string;
  salary: string;
  status: string;
  manager: string;
  phone: string;
  address: string;
  bio: string;
}

/**
 * Hook for fetching departments
 */
export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/departments');
      const result = await response.json();

      if (result.success && result.data) {
        setDepartments(result.data);
      } else {
        logError(new Error('Failed to fetch departments'), { 
          context: 'useDepartments', 
          response: result 
        });
        showErrorToast('Failed to load departments');
      }
    } catch (error) {
      logError(error, { context: 'useDepartments - fetchDepartments' });
      showErrorToast('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments,
    loading,
    refetch: fetchDepartments,
  };
}

/**
 * Hook for fetching managers
 */
export function useManagers() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManagers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/managers');
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
            id: manager.id,
            name: manager.name,
            email: manager.email,
            position: manager.employee?.position || manager.role || '',
            employeeId: manager.employee?.employeeId || manager.id,
            role: manager.role,
          }))
        );
      } else {
        logError(new Error('Failed to fetch managers'), { 
          context: 'useManagers', 
          response: result 
        });
        showErrorToast('Failed to load managers');
      }
    } catch (error) {
      logError(error, { context: 'useManagers - fetchManagers' });
      showErrorToast('Failed to load managers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  return {
    managers,
    loading,
    refetch: fetchManagers,
  };
}

/**
 * Get manager name by ID
 */
export function getManagerName(
  managerId: string | null | undefined,
  managers: Manager[],
  employee?: Employee | null
): string {
  if (!managerId || managerId === 'no-manager') return '';
  const manager = managers.find(m => m.id === managerId);
  if (manager) return manager.name;
  // Fallback: try to get from employee.manager if available
  if (employee?.manager?.user?.id === managerId) {
    return employee.manager.user.name;
  }
  return '';
}

/**
 * Extract department ID from employee data
 */
export function extractDepartmentId(employee: Employee | null | undefined): string {
  if (!employee?.department) return '';
  if (typeof employee.department === 'object') {
    return employee.department.id || '';
  }
  return employee.department;
}

/**
 * Extract manager user ID from employee data
 */
export function extractManagerUserId(
  employee: Employee | null | undefined,
  managers: Manager[]
): string {
  if (!employee) return 'no-manager';
  
  if (employee.manager && employee.manager.user) {
    return employee.manager.user.id;
  }
  
  // Fallback: try to find manager by matching employee record ID
  if (employee.managerId && managers.length > 0) {
    // This fallback logic could be enhanced if needed
  }
  
  return 'no-manager';
}

/**
 * Initialize form data from employee
 */
export function initializeFormData(
  employee: Employee | null | undefined,
  departments: Department[],
  managers: Manager[]
): EmployeeFormState {
  if (!employee) {
    return {
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      employeeId: '',
      department: departments.length > 0 ? departments[0].id : '',
      position: 'Employee',
      salary: '',
      status: EmployeeStatus.ACTIVE,
      manager: '',
      phone: '',
      address: '',
      bio: '',
    };
  }

  const departmentId = extractDepartmentId(employee);
  const managerUserId = extractManagerUserId(employee, managers);

  return {
    name: employee.user.name,
    email: employee.user.email,
    password: '',
    role: employee.user.role?.toUpperCase() || 'EMPLOYEE',
    employeeId: employee.employeeId,
    department: departmentId,
    position: employee.position || 'Software Developer',
    salary: employee.salary?.toString() || '',
    status: employee.status?.toUpperCase() || EmployeeStatus.ACTIVE,
    manager: managerUserId,
    phone: (employee.user as { phone?: string })?.phone || '',
    address: (employee.user as { address?: string })?.address || '',
    bio: (employee.user as { bio?: string })?.bio || '',
  };
}

/**
 * Main hook for employee form management
 */
export function useEmployeeForm(
  employee: Employee | null | undefined,
  onSuccess: () => void
) {
  const { departments, loading: departmentsLoading } = useDepartments();
  const { managers, loading: managersLoading } = useManagers();

  const [formData, setFormData] = useState<EmployeeFormState>(() =>
    initializeFormData(employee, departments, managers)
  );
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { errors, validate, validateField, clearFieldError, getFieldError } =
    useValidation(employee ? employeeUpdateSchema : employeeSchema);

  // Update form data when employee changes, but wait for departments/managers to load
  useEffect(() => {
    if (employee && !departmentsLoading && !managersLoading) {
      const initialized = initializeFormData(employee, departments, managers);
      setFormData(initialized);
    } else if (!employee && !departmentsLoading && departments.length > 0) {
      // Set default department for new employees
      setFormData((prev) => ({
        ...prev,
        department: prev.department || departments[0].id,
      }));
    }
  }, [employee, departmentsLoading, managersLoading, departments, managers]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setHasUnsavedChanges(true);
    clearFieldError(field);

    // Validate field on change
    if (field === 'salary') {
      const numValue = value === '' ? 0 : Number(value);
      validateField(field, numValue);
    } else {
      validateField(field, value);
    }
  }, [clearFieldError, validateField]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert form data for validation
    const dataToValidate = {
      ...formData,
      salary: formData.salary === '' ? undefined : Number(formData.salary),
    };

    // Use the validation hook
    const validation = validate(dataToValidate);

    if (!validation.success) {
      toast.error('Please fix the form errors');
      logError(new Error('Validation failed'), { 
        context: 'useEmployeeForm', 
        errors: validation.errors,
        formData: dataToValidate 
      });

      validation.errors?.forEach((error) => {
        logError(new Error(error.message), { 
          context: 'useEmployeeForm', 
          field: error.field 
        });
      });
      return;
    }

    setLoading(true);

    try {
      const url = employee ? `/api/employees/${employee.id}` : '/api/employees';
      const method = employee ? 'PUT' : 'POST';

      // For new employees, always set status to ACTIVE
      const dataToSend = employee
        ? validation.data
        : { ...validation.data, status: EmployeeStatus.ACTIVE };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Employee saved successfully');
        setHasUnsavedChanges(false);
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to save employee');
      }
    } catch (error) {
      logError(error, { context: 'useEmployeeForm - handleSubmit', employeeId: employee?.id });
      toast.error('Failed to save employee');
    } finally {
      setLoading(false);
    }
  }, [formData, employee, validate, onSuccess]);

  return {
    formData,
    setFormData,
    loading,
    hasUnsavedChanges,
    departments,
    departmentsLoading,
    managers,
    managersLoading,
    errors,
    getFieldError,
    handleChange,
    handleSubmit,
  };
}

