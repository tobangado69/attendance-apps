/**
 * Centralized logging utility
 * Provides consistent logging across the application
 * In production, only logs errors and warnings by default
 * 
 * Following DRY principles and Next.js 15 best practices
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger utility for consistent logging across the application
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/utils/logger'
 * 
 * logger.debug('Debug message', { data })
 * logger.info('Info message')
 * logger.warn('Warning message')
 * logger.error('Error occurred', error)
 * ```
 */
export const logger = {
  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - only in development
   * Use for informational messages
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logs - always shown
   * Use for warnings that should be visible in production
   */
  warn: (...args: unknown[]): void => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - always shown
   * Use for errors that need attention
   */
  error: (...args: unknown[]): void => {
    console.error('[ERROR]', ...args);
  },
};

/**
 * Log API request details (development only)
 * 
 * @param method - HTTP method (GET, POST, etc.)
 * @param endpoint - API endpoint path
 * @param data - Optional request data
 * 
 * @example
 * ```typescript
 * logApiRequest('POST', '/api/employees', { name: 'John' })
 * ```
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  data?: unknown
): void {
  if (isDevelopment) {
    logger.debug(`API ${method}`, endpoint, data ? { data } : '');
  }
}

/**
 * Log API response details (development only)
 * 
 * @param method - HTTP method (GET, POST, etc.)
 * @param endpoint - API endpoint path
 * @param status - HTTP status code
 * @param data - Optional response data
 * 
 * @example
 * ```typescript
 * logApiResponse('GET', '/api/employees', 200, employees)
 * ```
 */
export function logApiResponse(
  method: string,
  endpoint: string,
  status: number,
  data?: unknown
): void {
  if (isDevelopment) {
    logger.debug(`API ${method}`, endpoint, `Status: ${status}`, data ? { data } : '');
  }
}

/**
 * Log error with context (always shown)
 * 
 * @param error - Error object or message
 * @param context - Additional context information
 * 
 * @example
 * ```typescript
 * logError(new Error('Failed'), { userId: '123', action: 'createEmployee' })
 * ```
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (error instanceof Error) {
    logger.error('Error:', error.message, error.stack, context ? { context } : '');
  } else {
    logger.error('Error:', error, context ? { context } : '');
  }
}

