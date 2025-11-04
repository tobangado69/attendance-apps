/**
 * Server-side API caching utilities
 * Uses Next.js cache for server components and API routes
 */

import { unstable_cache } from 'next/cache'

/**
 * Cache configuration constants
 */
export const CACHE_TAGS = {
  EMPLOYEES: 'employees',
  TASKS: 'tasks',
  ATTENDANCE: 'attendance',
  NOTIFICATIONS: 'notifications',
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const

export const CACHE_REVALIDATE = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
} as const

/**
 * Create a cached function for data fetching
 * 
 * @example
 * ```typescript
 * const getCachedEmployees = createCachedFunction(
 *   async () => prisma.employee.findMany(),
 *   ['employees'],
 *   CACHE_TAGS.EMPLOYEES,
 *   CACHE_REVALIDATE.MEDIUM
 * )
 * ```
 */
export function createCachedFunction<T>(
  fn: () => Promise<T>,
  key: string[],
  tags: string[] = [],
  revalidate: number = CACHE_REVALIDATE.MEDIUM
) {
  return unstable_cache(fn, key, {
    revalidate,
    tags,
  })
}

/**
 * Cache keys for different data types
 */
export const CacheKeys = {
  employees: (filters?: string) => `employees_${filters || 'all'}`,
  employee: (id: string) => `employee_${id}`,
  tasks: (filters?: string) => `tasks_${filters || 'all'}`,
  task: (id: string) => `task_${id}`,
  attendance: (filters?: string) => `attendance_${filters || 'all'}`,
  dashboardStats: (userId: string) => `dashboard_stats_${userId}`,
  notifications: (userId: string, limit?: number) => 
    `notifications_${userId}_${limit || 20}`,
  settings: () => 'company_settings',
} as const

