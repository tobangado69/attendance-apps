"use client";

import { useState, useCallback } from 'react';
import { z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
}

export function useValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((data: unknown): { success: boolean; data?: T; errors?: ValidationError[] } => {
    try {
      const result = schema.parse(data);
      setErrors({});
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const validationErrors: ValidationError[] = [];

        error.issues.forEach((err) => {
          const field = err.path.join('.');
          const message = err.message;
          fieldErrors[field] = message;
          validationErrors.push({ field, message });
        });

        setErrors(fieldErrors);
        return { success: false, errors: validationErrors };
      }
      return { success: false, errors: [{ field: 'general', message: 'Validation failed' }] };
    }
  }, [schema]);

  const validateField = useCallback((field: string, value: unknown): boolean => {
    // For now, we'll just clear the error for this field
    // Full validation will happen on form submit
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    return true;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return errors[field];
  }, [errors]);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasErrors,
  };
}
