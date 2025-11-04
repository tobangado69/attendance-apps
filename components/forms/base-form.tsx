"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useValidation } from "@/hooks/use-validation";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { z } from "zod";

// Generic form field component
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children || (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

// Generic form error display
interface FormErrorProps {
  error?: string;
  className?: string;
}

export function FormError({ error, className = "" }: FormErrorProps) {
  if (!error) return null;

  return <p className={`text-sm text-red-600 mt-1 ${className}`}>{error}</p>;
}

// Base form hook for common form logic
export function useBaseForm<T extends Record<string, unknown>>(
  initialData: T,
  schema: z.ZodSchema<T>,
  onSubmit: (data: T) => Promise<void>
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { errors, validate, validateField, clearFieldError, getFieldError } =
    useValidation(schema);
  const { executeWithErrorHandling, isLoading } = useErrorHandler();

  // Update form data
  const updateField = useCallback(
    (field: keyof T, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setHasUnsavedChanges(true);
      clearFieldError(field as string);
      validateField(field as string, value);
    },
    [clearFieldError, validateField]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const result = await executeWithErrorHandling(async () => {
        const validation = validate(formData);
        if (!validation.success) {
          throw new Error("Validation failed");
        }

        await onSubmit(validation.data);
        setHasUnsavedChanges(false);
      }, "Form submission");

      return result;
    },
    [formData, validate, onSubmit, executeWithErrorHandling]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setHasUnsavedChanges(false);
  }, [initialData]);

  // Update form when initial data changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  return {
    formData,
    setFormData,
    hasUnsavedChanges,
    errors,
    getFieldError,
    updateField,
    handleSubmit,
    resetForm,
    isLoading,
  };
}

// Generic form component
interface BaseFormProps<T> {
  initialData: T;
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
  children: (form: ReturnType<typeof useBaseForm<T>>) => React.ReactNode;
  className?: string;
}

export function BaseForm<T extends Record<string, unknown>>({
  initialData,
  schema,
  onSubmit,
  children,
  className = "",
}: BaseFormProps<T>) {
  const form = useBaseForm(initialData, schema, onSubmit);

  return (
    <form onSubmit={form.handleSubmit} className={`space-y-4 ${className}`}>
      {children(form)}
    </form>
  );
}

// Generic form field with error handling
interface FormFieldWithErrorProps extends FormFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  children?: React.ReactNode;
}

export function FormFieldWithError({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  className = "",
  value,
  onChange,
  error,
  children,
}: FormFieldWithErrorProps) {
  return (
    <FormField
      label={label}
      name={name}
      type={type}
      required={required}
      placeholder={placeholder}
      className={className}
    >
      {children || (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}
      <FormError error={error} />
    </FormField>
  );
}

// Generic form actions (submit, cancel, reset)
interface FormActionsProps {
  onSubmit: () => void;
  onCancel?: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
  resetText?: string;
  showCancel?: boolean;
  showReset?: boolean;
  className?: string;
}

export function FormActions({
  onSubmit,
  onCancel,
  onReset,
  isLoading = false,
  submitText = "Submit",
  cancelText = "Cancel",
  resetText = "Reset",
  showCancel = true,
  showReset = false,
  className = "",
}: FormActionsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={isLoading}
        className="flex-1"
      >
        {isLoading ? "Processing..." : submitText}
      </Button>

      {showReset && onReset && (
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isLoading}
        >
          {resetText}
        </Button>
      )}

      {showCancel && onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      )}
    </div>
  );
}
