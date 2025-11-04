import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse,
  withAdminGuard 
} from '@/lib/api/api-utils'
import { z } from 'zod'

// Validation schema for department update
const departmentUpdateSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100, 'Department name too long').optional(),
  description: z.string().optional(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  managerId: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const department = await prisma.department.findUnique({
      where: { id },
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
            id: true,
            employeeId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (department) {
      // Add employee count
      const departmentWithCount = {
        ...department,
        _count: {
          employees: department.employees.length
        }
      }
      return formatApiResponse(departmentWithCount)
    }

    return formatErrorResponse('Department not found', 404)
  } catch (error) {
    console.error('Error fetching department:', error)
    return formatErrorResponse('Failed to fetch department', 500)
  }
}

export const PUT = withAdminGuard(async (context, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate request body
    const validation = departmentUpdateSchema.safeParse(body)
    if (!validation.success) {
      return formatErrorResponse('Validation failed', 400, {
        details: validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }

    const validatedData = validation.data

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id }
    })

    if (!existingDepartment) {
      return formatErrorResponse('Department not found', 404)
    }

    // If name is being updated, check for duplicates (case-insensitive for SQLite)
    if (validatedData.name && validatedData.name !== existingDepartment.name) {
      const allDepartments = await prisma.department.findMany({
        where: { id: { not: id } },
        select: { name: true }
      })
      
      const duplicateDepartment = allDepartments.find(
        dept => dept.name.toLowerCase() === validatedData.name!.toLowerCase()
      )

      if (duplicateDepartment) {
        return formatErrorResponse(
          `Department name "${duplicateDepartment.name}" already exists. Department names are case-insensitive (e.g., "IT" and "it" are considered the same).`,
          400
        )
      }
    }

    // If managerId is provided, verify the manager exists and is a manager/admin
    if (validatedData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validatedData.managerId },
        include: { employee: true }
      })

      if (!manager || !['ADMIN', 'MANAGER'].includes(manager.role)) {
        return formatErrorResponse('Manager must be an Admin or Manager role', 400)
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: validatedData,
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

    return formatApiResponse(departmentWithCount, undefined, 'Department updated successfully')
  } catch (error) {
    console.error('Error updating department:', error)
    
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
        `Failed to update department: ${error.message}`,
        500
      )
    }
    
    return formatErrorResponse('Failed to update department. Please try again.', 500)
  }
})

export const DELETE = withAdminGuard(async (context, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params

    // Check if department exists and get employee count
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true
          }
        }
      }
    })

    if (!department) {
      return formatErrorResponse('Department not found', 404)
    }

    // Check if department has employees
    if (department.employees.length > 0) {
      return formatErrorResponse('Cannot delete department with employees. Please reassign employees first.', 400)
    }

    await prisma.department.delete({
      where: { id }
    })

    return formatApiResponse(null, undefined, 'Department deleted successfully')
  } catch (error) {
    console.error('Error deleting department:', error)
    return formatErrorResponse('Failed to delete department', 500)
  }
})
