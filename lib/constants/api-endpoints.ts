// Centralized API endpoints configuration
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNOUT: '/auth/signout',
    SESSION: '/auth/session',
  },
  
  // Employees
  EMPLOYEES: {
    BASE: '/employees',
    ME: '/employees/me',
    STATS: '/employees/stats',
    BY_ID: (id: string) => `/employees/${id}`,
  },
  
  // Tasks
  TASKS: {
    BASE: '/tasks',
    STATS: '/tasks/stats',
    BY_ID: (id: string) => `/tasks/${id}`,
    NOTES: (id: string) => `/tasks/${id}/notes`,
  },
  
  // Attendance
  ATTENDANCE: {
    BASE: '/attendance',
    CHECKIN: '/attendance/checkin',
    CHECKOUT: '/attendance/checkout',
  },
  
  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    STREAM: '/notifications/stream',
    READ_ALL: '/notifications/read-all',
    READ_BY_ID: (id: string) => `/notifications/${id}/read`,
  },
  
  // Reports
  REPORTS: {
    BASE: '/reports',
    ATTENDANCE: '/reports/attendance',
    STATS: '/reports/stats',
  },
  
  // Export
  EXPORT: {
    EMPLOYEES: '/export/employees',
    TASKS: '/export/tasks',
    ATTENDANCE: '/export/attendance',
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    ACTIVITIES: '/dashboard/activities',
  },
} as const;

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Common query parameters
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface SearchQuery {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

// Role-based access control
export const ROLE_PERMISSIONS = {
  ADMIN: [
    'manage-employees',
    'view-all-attendance',
    'manage-tasks',
    'view-reports',
    'system-settings',
    'view-dashboard',
  ],
  MANAGER: [
    'manage-employees',
    'view-all-attendance',
    'manage-tasks',
    'view-reports',
    'view-dashboard',
  ],
  EMPLOYEE: [
    'view-own-attendance',
    'view-own-tasks',
    'view-dashboard',
  ],
} as const;

// Common validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
  PASSWORD_COMPLEXITY: 'Password must contain uppercase, lowercase, and number',
  DATE_PAST: 'Date cannot be in the past',
  DATE_FUTURE: 'Date cannot be more than 1 year in the future',
  DATE_INVALID: 'Invalid date format',
  NUMBER_POSITIVE: 'Must be a positive number',
  STRING_MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  STRING_MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
  NETWORK_ERROR: 'Network error occurred',
  TIMEOUT: 'Request timeout',
} as const;
