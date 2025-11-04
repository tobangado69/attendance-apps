/**
 * Status constants for the Employee Dashboard application
 * 
 * Centralizes all status string values to avoid magic strings throughout the codebase.
 * Following DRY principles and Next.js 15 best practices.
 * 
 * @example
 * ```typescript
 * import { TaskStatus, EmployeeStatus, AttendanceStatus } from '@/lib/constants/status'
 * 
 * if (task.status === TaskStatus.PENDING) {
 *   // Handle pending task
 * }
 * ```
 */

/**
 * Task Status Constants
 * Matches TaskStatus enum in Prisma schema
 */
export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Task Priority Constants
 * Matches TaskPriority enum in Prisma schema
 */
export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

/**
 * Employee Status Constants
 * Matches EmployeeStatus enum in Prisma schema
 */
export const EmployeeStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LAYOFF: 'LAYOFF',
  TERMINATED: 'TERMINATED',
  ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED',
} as const;

/**
 * User Role Constants
 * Matches Role enum in Prisma schema
 */
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

/**
 * Attendance Status Constants
 * String values used in Attendance model (not an enum in Prisma)
 */
export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  HALF_DAY: 'half-day',
  EARLY_LEAVE: 'earlyLeave',
} as const;

/**
 * Notification Type Constants
 * Used in Notification model
 */
export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

/**
 * Type definitions for status values
 */
export type TaskStatusValue = typeof TaskStatus[keyof typeof TaskStatus];
export type TaskPriorityValue = typeof TaskPriority[keyof typeof TaskPriority];
export type EmployeeStatusValue = typeof EmployeeStatus[keyof typeof EmployeeStatus];
export type UserRoleValue = typeof UserRole[keyof typeof UserRole];
export type AttendanceStatusValue = typeof AttendanceStatus[keyof typeof AttendanceStatus];
export type NotificationTypeValue = typeof NotificationType[keyof typeof NotificationType];

/**
 * Helper functions to check status values
 */
export const isValidTaskStatus = (status: string): status is TaskStatusValue => {
  return Object.values(TaskStatus).includes(status as TaskStatusValue);
};

export const isValidTaskPriority = (priority: string): priority is TaskPriorityValue => {
  return Object.values(TaskPriority).includes(priority as TaskPriorityValue);
};

export const isValidEmployeeStatus = (status: string): status is EmployeeStatusValue => {
  return Object.values(EmployeeStatus).includes(status as EmployeeStatusValue);
};

export const isValidUserRole = (role: string): role is UserRoleValue => {
  return Object.values(UserRole).includes(role as UserRoleValue);
};

export const isValidAttendanceStatus = (status: string): status is AttendanceStatusValue => {
  return Object.values(AttendanceStatus).includes(status as AttendanceStatusValue);
};

export const isValidNotificationType = (type: string): type is NotificationTypeValue => {
  return Object.values(NotificationType).includes(type as NotificationTypeValue);
};

