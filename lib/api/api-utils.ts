import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { Session } from 'next-auth'

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

// Reusable pagination parsing
export function parsePaginationParams(request: NextRequest): PaginationParams {
  try {
    const url = request.url
    if (!url) {
      console.error('Request URL is undefined:', request)
      return { page: 1, limit: 10, skip: 0 }
    }
    
    const { searchParams } = new URL(url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const skip = (page - 1) * limit

    return { page, limit, skip }
  } catch (error) {
    console.error('Error parsing pagination params:', error)
    return { page: 1, limit: 10, skip: 0 }
  }
}

// Reusable search params parsing
export function parseSearchParams(request: NextRequest): SearchParams {
  try {
    const url = request.url
    if (!url) {
      console.error('Request URL is undefined for search params:', request)
      return { search: undefined, sortBy: undefined, sortOrder: 'desc' }
    }
    
    const { searchParams } = new URL(url)
    
    return {
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }
  } catch (error) {
    console.error('Error parsing search params:', error)
    return { search: undefined, sortBy: undefined, sortOrder: 'desc' }
  }
}

// Reusable API context builder
export async function buildApiContext(request: NextRequest): Promise<ApiContext | NextResponse> {
  try {
    console.log('buildApiContext - Request URL:', request.url)
    console.log('buildApiContext - Request method:', request.method)
    
    const sessionResult = await validateSession()
    if (sessionResult instanceof NextResponse) {
      return sessionResult
    }

    const { session, user } = sessionResult
    const pagination = parsePaginationParams(request)
    const search = parseSearchParams(request)

    console.log('buildApiContext - Parsed pagination:', pagination)
    console.log('buildApiContext - Parsed search:', search)

    return { session, user, pagination, search }
  } catch (error) {
    console.error('Error in buildApiContext:', error)
    return formatErrorResponse('Failed to build API context', 500)
  }
}

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

// Reusable error response formatter
export function formatErrorResponse(
  error: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse {
  const response: {
    success: boolean
    error: string
    details?: Record<string, unknown>
  } = {
    success: false,
    error
  }

  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status })
}

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
