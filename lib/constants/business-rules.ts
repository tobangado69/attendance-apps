/**
 * Business rules constants for the Employee Dashboard application
 * 
 * Centralizes all business rule values (working hours, thresholds, limits, etc.)
 * to avoid magic numbers throughout the codebase.
 * Following DRY principles and Next.js 15 best practices.
 * 
 * @example
 * ```typescript
 * import { BusinessRules } from '@/lib/constants/business-rules'
 * 
 * if (totalHours > BusinessRules.OVERTIME_THRESHOLD_HOURS) {
 *   // Calculate overtime
 * }
 * ```
 */

/**
 * Working Hours Configuration
 */
export const BusinessRules = {
  /**
   * Default working hours per day
   */
  DEFAULT_WORKING_HOURS_PER_DAY: 8,
  
  /**
   * Default working hours start time (24-hour format)
   */
  DEFAULT_WORKING_HOURS_START: '08:00',
  
  /**
   * Default working hours end time (24-hour format)
   */
  DEFAULT_WORKING_HOURS_END: '17:00',
  
  /**
   * Default working days per week
   */
  DEFAULT_WORKING_DAYS_PER_WEEK: 5,
  
  /**
   * Late arrival grace period in minutes
   * Employees arriving within this period after start time are not marked as late
   */
  DEFAULT_LATE_ARRIVAL_GRACE_MINUTES: 2,
  
  /**
   * Overtime threshold hours
   * Hours worked beyond this threshold are considered overtime
   */
  DEFAULT_OVERTIME_THRESHOLD_HOURS: 8.0,
  
  /**
   * Maximum hours per day before requiring approval
   */
  MAX_HOURS_PER_DAY: 12,
  
  /**
   * Maximum hours per week before requiring approval
   */
  MAX_HOURS_PER_WEEK: 60,
  
  /**
   * Minimum hours per day for half-day attendance
   */
  MIN_HOURS_FOR_HALF_DAY: 4,
  
  /**
   * Early departure grace period in minutes
   * Employees leaving within this period before end time are not marked as early
   */
  DEFAULT_EARLY_DEPARTURE_GRACE_MINUTES: 2,
  
  /**
   * Minimum break duration in minutes (for compliance)
   */
  MIN_BREAK_DURATION_MINUTES: 30,
  
  /**
   * Maximum consecutive working days before required rest
   */
  MAX_CONSECUTIVE_WORKING_DAYS: 6,
  
  /**
   * Default timezone
   */
  DEFAULT_TIMEZONE: 'UTC',
  
  /**
   * Default date format
   */
  DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
  
  /**
   * Default currency
   */
  DEFAULT_CURRENCY: 'USD',
  
  /**
   * Pagination defaults
   */
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1,
  },
  
  /**
   * Cache durations (in milliseconds)
   */
  CACHE: {
    SHORT: 60 * 1000,        // 1 minute
    MEDIUM: 5 * 60 * 1000,   // 5 minutes
    LONG: 15 * 60 * 1000,    // 15 minutes
    VERY_LONG: 60 * 60 * 1000, // 1 hour
  },
  
  /**
   * Validation limits
   */
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    MIN_EMAIL_LENGTH: 5,
    MAX_EMAIL_LENGTH: 255,
    MIN_EMPLOYEE_ID_LENGTH: 3,
    MAX_EMPLOYEE_ID_LENGTH: 50,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_NOTES_LENGTH: 5000,
    MIN_SALARY: 0,
    MAX_SALARY: 10000000, // 10 million
    MIN_DEPARTMENT_NAME_LENGTH: 2,
    MAX_DEPARTMENT_NAME_LENGTH: 100,
    MIN_TASK_TITLE_LENGTH: 3,
    MAX_TASK_TITLE_LENGTH: 200,
  },
  
  /**
   * Task priority scoring (for sorting/filtering)
   */
  TASK_PRIORITY_SCORE: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4,
  },
  
  /**
   * Notification limits
   */
  NOTIFICATIONS: {
    MAX_PER_USER: 100,
    DEFAULT_RETENTION_DAYS: 30,
    MAX_MESSAGE_LENGTH: 500,
  },
  
  /**
   * File upload limits
   */
  FILE_UPLOAD: {
    MAX_IMAGE_SIZE_MB: 5,
    MAX_DOCUMENT_SIZE_MB: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
} as const;

/**
 * Helper functions for business rule calculations
 */
export const BusinessRuleHelpers = {
  /**
   * Calculate total working hours in a week
   */
  calculateWeeklyHours: (hoursPerDay: number, daysPerWeek: number): number => {
    return hoursPerDay * daysPerWeek;
  },
  
  /**
   * Check if hours exceed overtime threshold
   */
  isOvertime: (hours: number, threshold: number = BusinessRules.DEFAULT_OVERTIME_THRESHOLD_HOURS): boolean => {
    return hours > threshold;
  },
  
  /**
   * Calculate overtime hours
   */
  calculateOvertimeHours: (totalHours: number, threshold: number = BusinessRules.DEFAULT_OVERTIME_THRESHOLD_HOURS): number => {
    return Math.max(0, totalHours - threshold);
  },
  
  /**
   * Check if hours qualify for half-day
   */
  isHalfDay: (hours: number): boolean => {
    return hours >= BusinessRules.MIN_HOURS_FOR_HALF_DAY && hours < BusinessRules.DEFAULT_WORKING_HOURS_PER_DAY;
  },
  
  /**
   * Check if hours exceed maximum allowed
   */
  exceedsMaxHours: (hours: number, maxHours: number = BusinessRules.MAX_HOURS_PER_DAY): boolean => {
    return hours > maxHours;
  },
};

/**
 * Type definitions
 */
export type BusinessRulesType = typeof BusinessRules;
export type PaginationConfig = typeof BusinessRules.PAGINATION;
export type CacheConfig = typeof BusinessRules.CACHE;
export type ValidationConfig = typeof BusinessRules.VALIDATION;
export type TaskPriorityScore = typeof BusinessRules.TASK_PRIORITY_SCORE;

