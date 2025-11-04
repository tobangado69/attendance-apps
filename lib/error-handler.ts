import { toast } from 'sonner';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

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

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

export function showErrorToast(error: unknown, context?: string) {
  const apiError = handleApiError(error);
  const message = context ? `${context}: ${apiError.message}` : apiError.message;
  
  toast.error(message, {
    description: apiError.code ? `Error Code: ${apiError.code}` : undefined,
    duration: 5000,
  });
}

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

export function showWarningToast(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

export function showInfoToast(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 3000,
  });
}

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
      showErrorToast(error, context);
    }
    throw error;
  }
}

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

  throw lastError!;
}

// Validation error handler
export function handleValidationError(error: unknown, field?: string) {
  if (error instanceof Error) {
    const message = field ? `${field}: ${error.message}` : error.message;
    showErrorToast(new AppError(message, 'VALIDATION_ERROR'));
  } else {
    showErrorToast(new AppError('Validation failed', 'VALIDATION_ERROR'));
  }
}

// Network error handler
export function handleNetworkError(error: unknown) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    showErrorToast(new AppError('Network error. Please check your connection.', 'NETWORK_ERROR'));
  } else {
    showErrorToast(error, 'Network Error');
  }
}

// Permission error handler
export function handlePermissionError(error: unknown) {
  showErrorToast(new AppError('You do not have permission to perform this action.', 'PERMISSION_ERROR'));
}

// Not found error handler
export function handleNotFoundError(error: unknown, resource: string) {
  showErrorToast(new AppError(`${resource} not found.`, 'NOT_FOUND_ERROR'));
}

// Server error handler
export function handleServerError(error: unknown) {
  showErrorToast(new AppError('Server error. Please try again later.', 'SERVER_ERROR'));
}

// Timeout error handler
export function handleTimeoutError(error: unknown) {
  showErrorToast(new AppError('Request timed out. Please try again.', 'TIMEOUT_ERROR'));
}
