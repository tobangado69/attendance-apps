/**
 * Custom hooks for Settings Page
 * Extracted from app/dashboard/settings/page.tsx
 * Following DRY principles and Next.js 15 best practices
 */

import { useState, useEffect, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/utils';
import { logError } from '@/lib/utils/logger';

export interface CompanySettings {
  id: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  lateArrivalGraceMinutes: number;
  overtimeThresholdHours: number;
  workingDaysPerWeek: number;
  timezone: string;
  dateFormat: string;
  currency: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  managerId?: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    employees: number;
  };
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
}

/**
 * Hook for fetching and managing company settings
 */
export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<CompanySettings>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/company');
      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        setForm(result.data);
      } else {
        showErrorToast('Failed to fetch company settings');
      }
    } catch (error) {
      logError(error, { context: 'useCompanySettings - fetchSettings' });
      showErrorToast('Error fetching company settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (formData: Partial<CompanySettings>) => {
    try {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        showSuccessToast('Company settings updated successfully');
        return { success: true };
      } else {
        showErrorToast(result.message || 'Failed to update company settings');
        return { success: false, error: result.message };
      }
    } catch (error) {
      logError(error, { context: 'useCompanySettings - saveSettings' });
      showErrorToast('Error updating company settings');
      return { success: false, error: 'Network error' };
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    form,
    setForm,
    loading,
    saveSettings,
    refetch: fetchSettings,
  };
}

/**
 * Hook for fetching and managing departments
 */
export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/departments');
      const result = await response.json();

      if (result.success) {
        setDepartments(result.data);
      } else {
        showErrorToast('Failed to fetch departments');
      }
    } catch (error) {
      logError(error, { context: 'useDepartments - fetchDepartments' });
      showErrorToast('Error fetching departments');
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
      const response = await fetch('/api/settings/managers');
      const result = await response.json();

      if (result.success && result.data) {
        setManagers(
          result.data.map(
            (user: {
              id: string;
              name: string;
              email: string;
              role?: string;
              employee?: { employeeId?: string; position?: string } | null;
            }) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || '',
              position: user.employee?.position || user.role || '',
            })
          )
        );
      }
    } catch (error) {
      logError(error, { context: 'useManagers - fetchManagers' });
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
 * Hook for managing department form state and operations
 */
export function useDepartmentForm() {
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget: '',
    managerId: '',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      description: '',
      budget: '',
      managerId: '',
    });
    setEditingDepartment(null);
    setShowForm(false);
  }, []);

  const startEdit = useCallback((department: Department) => {
    setEditingDepartment(department);
    setForm({
      name: department.name,
      description: department.description || '',
      budget: department.budget?.toString() || '',
      managerId: department.managerId || 'no-manager',
    });
    setShowForm(true);
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.getElementById('department-form-card');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  const startCreate = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const submitForm = useCallback(async (
    onSuccess: () => void
  ): Promise<{ success: boolean; error?: string }> => {
    if (!form.name.trim()) {
      showErrorToast('Department name is required');
      return { success: false, error: 'Department name is required' };
    }

    setSaving(true);
    try {
      const url = editingDepartment
        ? `/api/settings/departments/${editingDepartment.id}`
        : '/api/settings/departments';

      const method = editingDepartment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          budget: form.budget ? parseFloat(form.budget) : undefined,
          managerId:
            form.managerId === 'no-manager'
              ? undefined
              : form.managerId || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast(
          editingDepartment
            ? 'Department updated successfully'
            : 'Department created successfully'
        );
        resetForm();
        onSuccess();
        return { success: true };
      } else {
        const errorMessage =
          result.error || result.message || 'Failed to save department';
        showErrorToast(errorMessage);

        if (result.details) {
          logError(new Error('Validation errors'), { 
            context: 'useDepartmentForm - submitForm',
            details: result.details 
          });
        }
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      logError(error, { context: 'useDepartmentForm - submitForm' });
      const errorMessage =
        error instanceof Error ? error.message : 'Error saving department';
      showErrorToast(`Network error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }, [form, editingDepartment]);

  const deleteDepartment = useCallback(async (
    departmentId: string,
    onSuccess: () => void
  ): Promise<{ success: boolean }> => {
    if (!confirm('Are you sure you want to delete this department?')) {
      return { success: false };
    }

    try {
      const response = await fetch(
        `/api/settings/departments/${departmentId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Department deleted successfully');
        onSuccess();
        return { success: true };
      } else {
        showErrorToast(result.message || 'Failed to delete department');
        return { success: false };
      }
    } catch (error) {
      logError(error, { context: 'useDepartmentForm - deleteDepartment' });
      showErrorToast('Error deleting department');
      return { success: false };
    }
  }, []);

  return {
    showForm,
    editingDepartment,
    form,
    setForm,
    saving,
    startEdit,
    startCreate,
    resetForm,
    submitForm,
    deleteDepartment,
  };
}

