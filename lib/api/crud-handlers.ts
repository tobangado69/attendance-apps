/**
 * Reusable API Route Handlers
 * Extracted common patterns from API routes
 * Following DRY principles and separation of concerns
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'
import { PrismaClient } from '@prisma/client'
import { formatApiResponse, formatErrorResponse, buildApiContext, ApiContext } from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'

/**
 * Validate request body with Zod schema
 * Returns formatted validation errors or validated data
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const validation = schema.safeParse(body)
  
  if (!validation.success) {
    return {
      success: false,
      response: formatErrorResponse('Validation failed', 400, {
        details: validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }
  }
  
  return { success: true, data: validation.data }
}

/**
 * Generic GET by ID handler
 */
export async function handleGetById<T>(
  request: NextRequest,
  params: Promise<{ id: string }>,
  options: {
    findById: (id: string) => Promise<T | null>
    include?: Record<string, unknown>
    select?: Record<string, unknown>
    authorize?: (context: ApiContext, id: string) => Promise<NextResponse | null>
    transform?: (data: T) => T
    notFoundMessage?: string
  }
): Promise<NextResponse> {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { id } = await params

    // Custom authorization check
    if (options.authorize) {
      const authResult = await options.authorize(apiContext, id)
      if (authResult) {
        return authResult
      }
    }

    const data = await options.findById(id)

    if (!data) {
      return formatErrorResponse(
        options.notFoundMessage || 'Resource not found',
        404
      )
    }

    const transformedData = options.transform ? options.transform(data) : data

    return formatApiResponse(transformedData)
  } catch (error) {
    logError(error, { context: 'handleGetById' })
    return formatErrorResponse('Failed to fetch resource', 500)
  }
}

/**
 * Generic UPDATE handler
 */
export async function handleUpdate<TData, TModel>(
  request: NextRequest,
  params: Promise<{ id: string }>,
  options: {
    schema: ZodSchema<TData>
    findById: (id: string) => Promise<TModel | null>
    update: (id: string, data: TData) => Promise<TModel>
    authorize?: (context: ApiContext, id: string, data: TData) => Promise<NextResponse | null>
    validate?: (existing: TModel, data: TData) => Promise<NextResponse | null>
    transform?: (data: TModel) => TModel
    notFoundMessage?: string
    successMessage?: string
  }
): Promise<NextResponse> {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = validateRequestBody(body, options.schema)
    if (!validation.success) {
      return validation.response
    }

    // Check if resource exists
    const existing = await options.findById(id)
    if (!existing) {
      return formatErrorResponse(
        options.notFoundMessage || 'Resource not found',
        404
      )
    }

    // Custom authorization check
    if (options.authorize) {
      const authResult = await options.authorize(apiContext, id, validation.data)
      if (authResult) {
        return authResult
      }
    }

    // Custom validation (e.g., duplicate checks)
    if (options.validate) {
      const validateResult = await options.validate(existing, validation.data)
      if (validateResult) {
        return validateResult
      }
    }

    // Update resource
    const updated = await options.update(id, validation.data)
    const transformedData = options.transform ? options.transform(updated) : updated

    return formatApiResponse(
      transformedData,
      undefined,
      options.successMessage || 'Resource updated successfully'
    )
  } catch (error) {
    logError(error, { context: 'handleUpdate' })
    
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('does not exist'))) {
      return formatErrorResponse(error.message, 404)
    }
    
    return formatErrorResponse('Failed to update resource', 500)
  }
}

/**
 * Generic DELETE handler
 */
export async function handleDelete(
  request: NextRequest,
  params: Promise<{ id: string }>,
  options: {
    findById: (id: string) => Promise<unknown>
    deleteById: (id: string) => Promise<void>
    authorize?: (context: ApiContext, id: string) => Promise<NextResponse | null>
    checkDependencies?: (id: string) => Promise<NextResponse | null>
    notFoundMessage?: string
    successMessage?: string
  }
): Promise<NextResponse> {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { id } = await params

    // Check if resource exists
    const existing = await options.findById(id)
    if (!existing) {
      return formatErrorResponse(
        options.notFoundMessage || 'Resource not found',
        404
      )
    }

    // Custom authorization check
    if (options.authorize) {
      const authResult = await options.authorize(apiContext, id)
      if (authResult) {
        return authResult
      }
    }

    // Check for dependencies (e.g., employees in department)
    if (options.checkDependencies) {
      const dependencyCheck = await options.checkDependencies(id)
      if (dependencyCheck) {
        return dependencyCheck
      }
    }

    // Delete resource
    await options.deleteById(id)

    return formatApiResponse(
      { id },
      undefined,
      options.successMessage || 'Resource deleted successfully'
    )
  } catch (error) {
    logError(error, { context: 'handleDelete' })
    
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return formatErrorResponse(
        'Cannot delete resource because it is still in use',
        400
      )
    }
    
    return formatErrorResponse('Failed to delete resource', 500)
  }
}

