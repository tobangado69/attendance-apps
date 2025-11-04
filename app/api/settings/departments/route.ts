import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse,
  withAdminGuard 
} from '@/lib/api/api-utils'
import { z } from 'zod'
import { departmentSchema } from '@/lib/validations'
import { logError } from '@/lib/utils/logger'

// Validation schema for department
const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100, 'Department name too long'),
  description: z.string().optional(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  managerId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Only admin can access department management
    if (user.role !== 'ADMIN') {
      return formatErrorResponse('Access denied. Admin role required.', 403)
    }

    const departments = await prisma.department.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employees: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data to include employee count
    const departmentsWithCount = departments.map(dept => ({
      ...dept,
      _count: {
        employees: dept.employees.length
      }
    }))

    return formatApiResponse(departmentsWithCount)
  } catch (error) {
    logError(error, { context: 'GET /api/settings/departments' })
    return formatErrorResponse('Failed to fetch departments', 500)
  }
}

export const POST = withAdminGuard(async (context, request: NextRequest) => {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = departmentSchema.safeParse(body)
    if (!validation.success) {
      return formatErrorResponse('Validation failed', 400, {
        details: validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }

    const { name, description, budget, managerId } = validation.data

    // Check if department name already exists (case-insensitive check for SQLite)
    // SQLite doesn't support mode: 'insensitive', so we check manually
    const allDepartments = await prisma.department.findMany({
      select: { name: true }
    })
    
    const existingDepartment = allDepartments.find(
      dept => dept.name.toLowerCase() === name.toLowerCase()
    )
    
    if (existingDepartment) {
      return formatErrorResponse(
        `Department name "${existingDepartment.name}" already exists. Department names are case-insensitive (e.g., "IT" and "it" are considered the same).`,
        400
      )
    }

    // If managerId is provided, verify the manager exists and is a manager/admin
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        include: { employee: true }
      })

      if (!manager || !['ADMIN', 'MANAGER'].includes(manager.role)) {
        return formatErrorResponse('Manager must be an Admin or Manager role', 400)
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        description,
        budget,
        managerId: managerId || null
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employees: {
          select: {
            id: true
          }
        }
      }
    })

    // Add employee count
    const departmentWithCount = {
      ...department,
      _count: {
        employees: department.employees.length
      }
    }

    return formatApiResponse(departmentWithCount, undefined, 'Department created successfully')
  } catch (error) {
    logError(error, { context: 'POST /api/settings/departments' })
    
    // Handle Prisma errors specifically
    if (error instanceof Error) {
      // Check for unique constraint violation
      if (error.message.includes('Unique constraint') || error.message.includes('UNIQUE constraint')) {
        return formatErrorResponse(
          'A department with this name already exists. Department names must be unique (case-insensitive).',
          400
        )
      }
      
      return formatErrorResponse(
        `Failed to create department: ${error.message}`,
        500
      )
    }
    
    return formatErrorResponse('Failed to create department. Please try again.', 500)
  }
})
