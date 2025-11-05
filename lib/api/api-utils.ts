/**
 * API Utility Functions
 * Centralized utilities for API route handlers
 * Following DRY principles and Next.js 15 best practices
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { Session } from 'next-auth'
import { logger, logError } from '@/lib/utils/logger'
import { BusinessRules } from '@/lib/constants/business-rules'

// Types for API utilities
export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface SearchParams {
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  image?: string | null
}

export interface ApiContext {
  session: Session
  user: User
  pagination: PaginationParams
  search: SearchParams
}

/**
 * Validates user session and returns user data
 * 
 * @returns Promise resolving to session and user object, or NextResponse error if unauthorized
 * @throws {Error} If session validation fails unexpectedly
 * 
 * @example
 * ```typescript
 * const result = await validateSession();
 * if (result instanceof NextResponse) {
 *   return result; // Unauthorized
 * }
 * const { session, user } = result;
 * ```
 */
// Reusable session validation
export async function validateSession(): Promise<{ session: Session; user: User } | NextResponse> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return { session, user: session.user }
}

/**
 * Validates user role against allowed roles
 * 
 * @param user - User object with role property
 * @param allowedRoles - Array of allowed roles
 * @param context - Optional context string for error message
 * @returns NextResponse error if role is not allowed, null if authorized
 * 
 * @example
 * ```typescript
 * const roleCheck = validateRole(user, ['ADMIN', 'MANAGER'], 'Department management');
 * if (roleCheck) {
 *   return roleCheck; // Forbidden
 * }
 * ```
 */
// Reusable role validation
export function validateRole(
  user: User, 
  allowedRoles: Role[], 
  context?: string
): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { 
        error: 'Forbidden',
        message: context ? `Access denied: ${context}` : 'Insufficient permissions'
      },
      { status: 403 }
    )
  }
  return null
}

/**
 * Parses pagination parameters from request URL
 * 
 * @param request - Next.js request object
 * @returns PaginationParams object with page, limit, and skip values
 * @throws {Error} Logs error but returns default values on failure
 * 
 * @example
 * ```typescript
 * const { page, limit, skip } = parsePaginationParams(request);
 * const items = await prisma.model.findMany({ skip, take: limit });
 * ```
 */
// Reusable pagination parsing
export function parsePaginationParams(request: NextRequest): PaginationParams {
  try {
    const url = request.url
    if (!url) {
      logError(new Error('Request URL is undefined'), { context: 'parsePaginationParams', request: String(request) })
      return { page: BusinessRules.PAGINATION.DEFAULT_PAGE, limit: BusinessRules.PAGINATION.DEFAULT_LIMIT, skip: 0 }
    }
    
    const { searchParams } = new URL(url)
    const page = Math.max(BusinessRules.PAGINATION.DEFAULT_PAGE, parseInt(searchParams.get('page') || String(BusinessRules.PAGINATION.DEFAULT_PAGE)))
    const limit = Math.min(BusinessRules.PAGINATION.MAX_LIMIT, Math.max(BusinessRules.PAGINATION.MIN_LIMIT, parseInt(searchParams.get('limit') || String(BusinessRules.PAGINATION.DEFAULT_LIMIT))))
    const skip = (page - 1) * limit

    return { page, limit, skip }
  } catch (error) {
    logError(error, { context: 'parsePaginationParams' })
    return { page: BusinessRules.PAGINATION.DEFAULT_PAGE, limit: BusinessRules.PAGINATION.DEFAULT_LIMIT, skip: 0 }
  }
}

/**
 * Parses search and sorting parameters from request URL
 * 
 * @param request - Next.js request object
 * @returns SearchParams object with search term, sortBy, and sortOrder
 * @throws {Error} Logs error but returns default values on failure
 * 
 * @example
 * ```typescript
 * const { search, sortBy, sortOrder } = parseSearchParams(request);
 * const where = search ? { name: { contains: search } } : {};
 * ```
 */
// Reusable search params parsing
export function parseSearchParams(request: NextRequest): SearchParams {
  try {
    const url = request.url
    if (!url) {
      logError(new Error('Request URL is undefined for search params'), { context: 'parseSearchParams', request: String(request) })
      return { search: undefined, sortBy: undefined, sortOrder: 'desc' }
    }
    
    const { searchParams } = new URL(url)
    
    return {
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }
  } catch (error) {
    logError(error, { context: 'parseSearchParams' })
    return { search: undefined, sortBy: undefined, sortOrder: 'desc' }
  }
}

/**
 * Builds complete API context from request
 * Combines session validation, pagination, and search params
 * 
 * @param request - Next.js request object
 * @returns ApiContext object or NextResponse error if unauthorized
 * @throws {Error} Logs error and returns error response on failure
 * 
 * @example
 * ```typescript
 * const apiContext = await buildApiContext(request);
 * if (apiContext instanceof NextResponse) {
 *   return apiContext; // Error response
 * }
 * const { user, pagination, search } = apiContext;
 * ```
 */
// Reusable API context builder
export async function buildApiContext(request: NextRequest): Promise<ApiContext | NextResponse> {
  try {
    logger.debug('buildApiContext - Request URL:', request.url)
    logger.debug('buildApiContext - Request method:', request.method)
    
    const sessionResult = await validateSession()
    if (sessionResult instanceof NextResponse) {
      return sessionResult
    }

    const { session, user } = sessionResult
    const pagination = parsePaginationParams(request)
    const search = parseSearchParams(request)

    logger.debug('buildApiContext - Parsed pagination:', pagination)
    logger.debug('buildApiContext - Parsed search:', search)

    return { session, user, pagination, search }
  } catch (error) {
    logError(error, { context: 'buildApiContext' })
    return formatErrorResponse('Failed to build API context', 500)
  }
}

/**
 * Builds Prisma where clause for text search across multiple fields
 * 
 * @param searchTerm - Search term to match against fields
 * @param searchFields - Array of field names to search (supports nested fields like 'user.name')
 * @returns Prisma where clause object with OR conditions
 * 
 * @example
 * ```typescript
 * const where = buildTextSearchWhere('john', ['name', 'email', 'user.name']);
 * // Returns: { OR: [{ name: { contains: 'john' } }, { email: { contains: 'john' } }, { user: { name: { contains: 'john' } } }] }
 * ```
 */
// Reusable where clause builder for text search
export function buildTextSearchWhere(searchTerm: string, searchFields: string[]): Record<string, unknown> {
  if (!searchTerm) return {}

  return {
    OR: searchFields.map(field => {
      // Handle nested fields (e.g., 'user.name')
      if (field.includes('.')) {
        const [relation, nestedField] = field.split('.')
        return {
          [relation]: {
            [nestedField]: { contains: searchTerm }
          }
        }
      }
      return { [field]: { contains: searchTerm } }
    })
  }
}

/**
 * Builds Prisma where clause for date range filtering
 * 
 * @param startDate - Start date string (ISO format)
 * @param endDate - End date string (ISO format)
 * @param field - Field name to filter on (default: 'createdAt')
 * @returns Prisma where clause object with date range or empty object if dates not provided
 * 
 * @example
 * ```typescript
 * const dateFilter = buildDateRangeWhere('2024-01-01', '2024-12-31', 'checkIn');
 * // Returns: { checkIn: { gte: new Date('2024-01-01'), lte: new Date('2024-12-31') } }
 * ```
 */
// Reusable date range filter
export function buildDateRangeWhere(
  startDate?: string, 
  endDate?: string, 
  field: string = 'createdAt'
): Record<string, { gte: Date; lte: Date }> | Record<string, never> {
  if (!startDate || !endDate) return {}

  return {
    [field]: {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  }
}

/**
 * Formats successful API response with optional pagination metadata
 * 
 * @param data - Response data to return
 * @param pagination - Optional pagination metadata
 * @param message - Optional success message
 * @returns NextResponse with formatted JSON response
 * 
 * @example
 * ```typescript
 * return formatApiResponse(employees, { total: 100, page: 1, limit: 10 }, 'Employees fetched successfully');
 * ```
 */
// Reusable API response formatter
export function formatApiResponse<T>(
  data: T,
  pagination?: { total: number; page: number; limit: number },
  message?: string
): NextResponse {
  const response: {
    success: boolean
    data: T
    meta?: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
    message?: string
  } = {
    success: true,
    data
  }

  if (pagination) {
    response.meta = {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    }
  }

  if (message) {
    response.message = message
  }

  return NextResponse.json(response)
}

/**
 * Formats error API response with status code and optional details
 * 
 * @param error - Error message string
 * @param status - HTTP status code (default: 500)
 * @param details - Optional additional error details
 * @returns NextResponse with formatted error JSON
 * 
 * @example
 * ```typescript
 * return formatErrorResponse('Validation failed', 400, { field: 'email', message: 'Invalid email format' });
 * ```
 */
// Reusable error response formatter
export function formatErrorResponse(
  error: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse {
  const response: {
    success: boolean
    error: string
    code?: string
    details?: Record<string, unknown>
    statusCode?: number
  } = {
    success: false,
    error
  }

  // Add error code based on status
  if (status === 400) {
    response.code = 'VALIDATION_ERROR'
  } else if (status === 401) {
    response.code = 'UNAUTHORIZED'
  } else if (status === 403) {
    response.code = 'FORBIDDEN'
  } else if (status === 404) {
    response.code = 'NOT_FOUND'
  } else if (status === 409) {
    response.code = 'DUPLICATE_ENTRY'
  } else if (status >= 500) {
    response.code = 'INTERNAL_SERVER_ERROR'
  }

  if (details) {
    response.details = details
  }

  response.statusCode = status

  return NextResponse.json(response, { status })
}

/**
 * Higher-order function that wraps API route handlers with role-based access control
 * 
 * @param allowedRoles - Array of roles that can access the route
 * @param context - Optional context string for error messages
 * @returns Wrapped handler function that validates role before executing
 * 
 * @example
 * ```typescript
 * export const PUT = withRoleGuard(['ADMIN', 'MANAGER'], 'Update employee')(async (context, request, { params }) => {
 *   // Handler logic here
 * });
 * ```
 */
// Reusable role-based access control for API routes
export function withRoleGuard(allowedRoles: Role[], context?: string) {
  return function (handler: (context: ApiContext, request: NextRequest, ...args: unknown[]) => Promise<NextResponse>) {
    return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
      const apiContext = await buildApiContext(request)
      if (apiContext instanceof NextResponse) {
        return apiContext
      }

      const roleCheck = validateRole(apiContext.user, allowedRoles, context)
      if (roleCheck) {
        return roleCheck
      }

      return handler(apiContext, request, ...args)
    }
  }
}

// Reusable admin/manager guard
export const withAdminManagerGuard = withRoleGuard(['ADMIN', 'MANAGER'], 'Admin or Manager access required')

// Reusable admin-only guard
export const withAdminGuard = withRoleGuard(['ADMIN'], 'Admin access required')
