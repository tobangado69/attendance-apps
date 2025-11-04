"use client";

import { useCallback, useState } from 'react';
import { 
  handleApiError, 
  showErrorToast, 
  showSuccessToast, 
  showWarningToast, 
  showInfoToast,
  AppError 
} from '@/lib/error-handler';

export function useErrorHandler() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: unknown, context?: string) => {
    const apiError = handleApiError(error);
    setError(new Error(apiError.message));
    showErrorToast(error, context);
  }, []);

  const handleSuccess = useCallback((message: string, description?: string) => {
    showSuccessToast(message, description);
  }, []);

  const handleWarning = useCallback((message: string, description?: string) => {
    showWarningToast(message, description);
  }, []);

  const handleInfo = useCallback((message: string, description?: string) => {
    showInfoToast(message, description);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      clearError();
      const result = await operation();
      return result;
    } catch (error) {
      handleError(error, context);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  return {
    error,
    isLoading,
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    clearError,
    executeWithErrorHandling,
  };
}

export function useAsyncOperation<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    context?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      showErrorToast(error, context);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  };
}
