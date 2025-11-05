import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  formatApiResponse, 
  formatErrorResponse,
  withAdminGuard,
  ApiContext
} from '@/lib/api/api-utils'
import { departmentUpdateSchema } from '@/lib/validations'
import { handleGetById, handleUpdate, handleDelete } from '@/lib/api/crud-handlers'

// Helper function to check duplicate department names (case-insensitive for SQLite)
async function checkDuplicateDepartmentName(
  name: string,
  excludeId?: string
): Promise<NextResponse | null> {
  const allDepartments = await prisma.department.findMany({
    where: excludeId ? { id: { not: excludeId } } : {},
    select: { name: true }
  })
  
  const duplicate = allDepartments.find(
    dept => dept.name.toLowerCase() === name.toLowerCase()
  )
  
  if (duplicate) {
    return formatErrorResponse(
      `Department name "${duplicate.name}" already exists. Department names are case-insensitive (e.g., "IT" and "it" are considered the same).`,
      400
    )
  }
  
  return null
}

// Helper function to validate manager role
async function validateManagerRole(managerId: string): Promise<NextResponse | null> {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    include: { employee: true }
  })

  if (!manager || !['ADMIN', 'MANAGER'].includes(manager.role)) {
    return formatErrorResponse('Manager must be an Admin or Manager role', 400)
  }
  
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleGetById(request, params, {
    findById: async (id: string) => {
      return prisma.department.findUnique({
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
    },
    authorize: async (context: ApiContext, id: string) => {
      if (context.user.role !== 'ADMIN') {
        return formatErrorResponse('Access denied. Admin role required.', 403)
      }
      return null
    },
    transform: (data) => {
      return {
        ...data,
        _count: {
          employees: data.employees.length
        }
      }
    },
    notFoundMessage: 'Department not found'
  })
}

export const PUT = withAdminGuard(async (context, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return handleUpdate(request, params, {
    schema: departmentUpdateSchema,
    findById: async (id: string) => {
      return prisma.department.findUnique({ where: { id } })
    },
    update: async (id: string, data) => {
      return prisma.department.update({
        where: { id },
        data,
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
    },
    validate: async (existing, data) => {
      // Check for duplicate name if name is being updated
      if (data.name && data.name !== existing.name) {
        const duplicateCheck = await checkDuplicateDepartmentName(data.name, existing.id)
        if (duplicateCheck) {
          return duplicateCheck
        }
      }
      
      // Validate manager role if managerId is provided
      if (data.managerId) {
        const managerCheck = await validateManagerRole(data.managerId)
        if (managerCheck) {
          return managerCheck
        }
      }
      
      return null
    },
    transform: (data) => {
      return {
        ...data,
        _count: {
          employees: data.employees.length
        }
      }
    },
    notFoundMessage: 'Department not found',
    successMessage: 'Department updated successfully'
  })
})

export const DELETE = withAdminGuard(async (context, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return handleDelete(request, params, {
    findById: async (id: string) => {
      return prisma.department.findUnique({
        where: { id },
        include: {
          employees: {
            select: { id: true }
          }
        }
      })
    },
    deleteById: async (id: string) => {
      await prisma.department.delete({ where: { id } })
    },
    checkDependencies: async (id: string) => {
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          employees: {
            select: { id: true }
          }
        }
      })
      
      if (department && department.employees.length > 0) {
        return formatErrorResponse(
          'Cannot delete department with employees. Please reassign employees first.',
          400
        )
      }
      
      return null
    },
    notFoundMessage: 'Department not found',
    successMessage: 'Department deleted successfully'
  })
})
