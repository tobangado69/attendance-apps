/**
 * Standardized Error Handling Hook
 * Provides consistent error handling for React components
 * Following DRY principles and Next.js 15 best practices
 */

import { useState, useCallback } from 'react';
import { showErrorToast } from '@/lib/error-handler';
import { logError } from '@/lib/utils/logger';

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Context for error logging */
  context?: string;
  /** Whether to show error toast */
  showToast?: boolean;
  /** Custom error message for toast */
  errorMessage?: string;
  /** Callback when error occurs */
  onError?: (error: unknown) => void;
}

/**
 * Return type for useErrorHandler hook
 */
export interface UseErrorHandlerReturn {
  /** Current error state */
  error: Error | null;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Execute async function with error handling */
  executeWithErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
  /** Reset error state */
  resetError: () => void;
  /** Handle error explicitly */
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;
}

/**
 * Hook for standardized error handling in components
 * 
 * @example
 * ```tsx
 * const { executeWithErrorHandling, isLoading } = useErrorHandler();
 * 
 * const handleSubmit = async () => {
 *   await executeWithErrorHandling(
 *     async () => {
 *       await saveData();
 *     },
 *     { context: 'Save Form', errorMessage: 'Failed to save data' }
 *   );
 * };
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(
    (err: unknown, options?: ErrorHandlerOptions) => {
      const {
        context,
        showToast = true,
        errorMessage,
        onError,
      } = options || {};

      // Log error
      if (context) {
        logError(err, { context });
      } else {
        logError(err, { context: 'Component Error' });
      }

      // Convert to Error if needed
      const errorObj =
        err instanceof Error
          ? err
          : new Error(errorMessage || String(err) || 'An error occurred');

      setError(errorObj);

      // Show toast if enabled
      if (showToast) {
        showErrorToast(err, {
          context,
          fallbackMessage: errorMessage,
        });
      }

      // Call custom error handler
      if (onError) {
        onError(err);
      }
    },
    []
  );

  const executeWithErrorHandling = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fn();
        setIsLoading(false);
        return result;
      } catch (err) {
        handleError(err, options);
        setIsLoading(false);
        return null;
      }
    },
    [handleError]
  );

  return {
    error,
    isLoading,
    executeWithErrorHandling,
    resetError,
    handleError,
  };
}

/**
 * Hook for async operations with loading and error states
 * Simplified version for common use cases
 * 
 * @example
 * ```tsx
 * const { execute, loading, error } = useAsyncOperation();
 * 
 * const handleSave = () => {
 *   execute(async () => {
 *     await saveData();
 *   }, 'Save Data');
 * };
 * ```
 */
export function useAsyncOperation() {
  const { executeWithErrorHandling, isLoading, error, resetError } =
    useErrorHandler();

  const execute = useCallback(
    async <T>(
      fn: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      return executeWithErrorHandling(fn, { context });
    },
    [executeWithErrorHandling]
  );

  return {
    execute,
    loading: isLoading,
    error,
    resetError,
  };
}
