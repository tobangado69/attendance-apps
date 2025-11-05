/**
 * Error Handling Utilities
 * Centralized error handling for API and component layers
 * Following DRY principles and Next.js 15 best practices
 */

import { toast } from 'sonner';

/**
 * API error interface
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Custom application error class with additional metadata
 */
export class AppError extends Error {
  public code?: string;
  public status?: number;
  public details?: Record<string, unknown>;

  constructor(message: string, code?: string, status?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Converts unknown error types to standardized ApiError format
 * 
 * @param error - Error of unknown type
 * @returns ApiError object with message and optional code/status/details
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const apiError = handleApiError(error);
 *   console.log(apiError.message, apiError.code);
 * }
 * ```
 */
export function handleApiError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      status: error.status,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    // Try to extract error code from error message or name if it's a structured error
    let code = 'UNKNOWN_ERROR';
    
    // Check if error has a code property (some errors might have it)
    if ('code' in error && typeof (error as { code?: string }).code === 'string') {
      code = (error as { code: string }).code;
    }
    
    return {
      message: error.message,
      code,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Options for showErrorToast function
 */
export interface ShowErrorToastOptions {
  context?: string;
  fallbackMessage?: string;
  useDialog?: boolean; // Show as dialog instead of toast for important errors
}

/**
 * Displays error toast notification with standardized formatting
 * Supports both legacy string context and new options object
 * For important errors (like employee status), use useDialog option to show as centered dialog
 * 
 * @param error - Error of unknown type
 * @param options - Options object or legacy string context
 * @param options.context - Context string for error message prefix
 * @param options.fallbackMessage - Fallback message if error cannot be parsed
 * @param options.useDialog - Show as dialog instead of toast (for important errors)
 * 
 * @example
 * ```typescript
 * showErrorToast(error, { context: 'Save Form', fallbackMessage: 'Failed to save data' });
 * // Show as dialog for important errors
 * showErrorToast(error, { useDialog: true, context: 'Check In' });
 * // Legacy support
 * showErrorToast(error, 'Save Form');
 * ```
 */
export function showErrorToast(error: unknown, options?: string | ShowErrorToastOptions) {
  const apiError = handleApiError(error);
  
  // Support both old signature (string context) and new signature (options object)
  const context = typeof options === 'string' ? options : options?.context;
  const fallbackMessage = typeof options === 'object' ? options.fallbackMessage : undefined;
  const useDialog = typeof options === 'object' ? options.useDialog : false;
  
  // Determine if this is an important error that should be shown as dialog
  const importantErrorCodes = [
    'EMPLOYEE_INACTIVE',
    'EMPLOYEE_STATUS_RESTRICTED',
    'FORBIDDEN',
    'UNAUTHORIZED',
  ];
  
  const isImportantError = apiError.code && importantErrorCodes.includes(apiError.code);
  
  // Show as dialog if explicitly requested or if it's an important error
  if (useDialog || isImportantError) {
    // Try to use error dialog context if available
    if (typeof window !== 'undefined') {
      // Dispatch custom event for error dialog
      const event = new CustomEvent('show-error-dialog', {
        detail: {
          error: apiError,
          title: context || 'Error',
        },
      });
      window.dispatchEvent(event);
      return;
    }
  }
  
  // Default to toast notification
  // Show only the actual error message, no error code
  const message = fallbackMessage || apiError.message;
  const toastTitle = context ? `${context}: ${message}` : message;
  
  toast.error(toastTitle, {
    duration: 5000,
  });
}

/**
 * Displays success toast notification
 * 
 * @param message - Success message to display
 * @param description - Optional detailed description
 * 
 * @example
 * ```typescript
 * showSuccessToast('Employee saved successfully', 'Employee ID: EMP-123');
 * ```
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Displays warning toast notification
 * 
 * @param message - Warning message to display
 * @param description - Optional detailed description
 */
export function showWarningToast(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

/**
 * Displays info toast notification
 * 
 * @param message - Info message to display
 * @param description - Optional detailed description
 */
export function showInfoToast(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 3000,
  });
}

/**
 * Handles API response parsing and error extraction
 * Throws AppError if response is not OK
 * 
 * @param response - Fetch Response object
 * @returns Promise resolving to parsed JSON data
 * @throws {AppError} If response is not OK or parsing fails
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/employees');
 * const data = await handleApiResponse<Employee[]>(response);
 * ```
 */
// API response handler
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = 'HTTP_ERROR';
    let details: Record<string, unknown> = {};

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      errorCode = errorData.code || errorCode;
      details = errorData.details || details;
    } catch {
      // If we can't parse the error response, use the default message
    }

    throw new AppError(errorMessage, errorCode, response.status, details);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new AppError('Failed to parse response', 'PARSE_ERROR');
  }
}

/**
 * Generic API call wrapper with automatic error handling
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param context - Optional context string for error messages
 * @returns Promise resolving to typed response data
 * @throws {AppError} If request fails
 * 
 * @example
 * ```typescript
 * const employees = await apiCall<Employee[]>('/api/employees', { method: 'GET' }, 'Fetch Employees');
 * ```
 */
// Generic API call wrapper
export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  context?: string
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    return await handleApiResponse<T>(response);
  } catch (error) {
    if (context) {
      showErrorToast(error, { context });
    }
    throw error;
  }
}

/**
 * API call wrapper with automatic retry mechanism
 * Uses exponential backoff for retries
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param context - Optional context string for error messages
 * @returns Promise resolving to typed response data
 * @throws {Error} If all retry attempts fail
 * 
 * @example
 * ```typescript
 * const data = await apiCallWithRetry('/api/critical-endpoint', { method: 'POST', body: JSON.stringify(data) }, 5, 'Critical Operation');
 * ```
 */
// Retry mechanism for failed requests
export async function apiCallWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  context?: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall<T>(url, options, context);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (context) {
    showErrorToast(lastError!, { context });
  }
  throw lastError!;
}

/**
 * Handles validation errors with user-friendly toast messages
 * 
 * @param error - Validation error of unknown type
 * @param field - Optional field name to include in error message
 */
// Validation error handler
export function handleValidationError(error: unknown, field?: string) {
  if (error instanceof Error) {
    const message = field ? `${field}: ${error.message}` : error.message;
    showErrorToast(new AppError(message, 'VALIDATION_ERROR'));
  } else {
    showErrorToast(new AppError('Validation failed', 'VALIDATION_ERROR'));
  }
}

/**
 * Handles network errors with user-friendly toast messages
 * 
 * @param error - Network error of unknown type
 */
// Network error handler
export function handleNetworkError(error: unknown) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    showErrorToast(new AppError('Network error. Please check your connection.', 'NETWORK_ERROR'));
  } else {
    showErrorToast(error, { context: 'Network Error' });
  }
}

/**
 * Handles permission errors with user-friendly toast messages
 * 
 * @param error - Permission error of unknown type
 */
// Permission error handler
export function handlePermissionError(error: unknown) {
  showErrorToast(new AppError('You do not have permission to perform this action.', 'PERMISSION_ERROR'));
}

/**
 * Handles not found errors with user-friendly toast messages
 * 
 * @param error - Not found error of unknown type
 * @param resource - Resource name (e.g., 'Employee', 'Department')
 */
// Not found error handler
export function handleNotFoundError(error: unknown, resource: string) {
  showErrorToast(new AppError(`${resource} not found.`, 'NOT_FOUND_ERROR'));
}

/**
 * Handles server errors with user-friendly toast messages
 * 
 * @param error - Server error of unknown type
 */
// Server error handler
export function handleServerError(error: unknown) {
  showErrorToast(new AppError('Server error. Please try again later.', 'SERVER_ERROR'));
}

/**
 * Handles timeout errors with user-friendly toast messages
 * 
 * @param error - Timeout error of unknown type
 */
// Timeout error handler
export function handleTimeoutError(error: unknown) {
  showErrorToast(new AppError('Request timed out. Please try again.', 'TIMEOUT_ERROR'));
}
