import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification, NotificationTemplates, getManagersAndAdmins } from '@/lib/notifications'
import { AppError } from '@/lib/error-handler'
import { employeeSchema } from '@/lib/validations'
import { 
  buildApiContext, 
  buildTextSearchWhere, 
  formatApiResponse, 
  formatErrorResponse,
  withAdminManagerGuard 
} from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'
import {
  checkExistingRecords,
  createEmployeeWithUser,
} from '@/lib/services/employee-service'
import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/utils/api-cache'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user, pagination, search } = apiContext
    const { searchParams } = new URL(request.url)
    
    // Parse additional filters
    const department = searchParams.get('department') || ''
    
    // Build where clause using utilities
    const where: Record<string, unknown> = {
      ...buildTextSearchWhere(search.search || '', [
        'user.name',
        'user.email', 
        'employeeId'
      ])
    }
    
    if (department) {
      where.department = department
    }

    // Role-based access control
    if (user.role === 'EMPLOYEE') {
      // Employees can only see their own data
      where.userId = user.id
    }
    // Admin and Manager can see all employees (no additional filtering needed)

    // Execute query with optimized select
    // Note: Not caching filtered queries as cache keys would need to include all filter parameters
    // Cache invalidation is handled on create/update/delete operations
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          position: true,
          salary: true,
          status: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true
            }
          },
          manager: {
            select: {
              id: true,
              employeeId: true,
              position: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          managerId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              phone: true,
              address: true,
              bio: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit
      }),
      prisma.employee.count({ where })
    ])

    return formatApiResponse(employees, {
      total,
      page: pagination.page,
      limit: pagination.limit
    })
  } catch (error) {
    logError(error, { context: 'GET /api/employees' })
    return formatErrorResponse('Failed to fetch employees', 500)
  }
}

export const POST = withAdminManagerGuard(async (context, request: NextRequest) => {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = employeeSchema.safeParse(body)
    if (!validation.success) {
      return formatErrorResponse('Validation failed', 400, {
        details: validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }

    const { name, email, password, role, employeeId, department, position, salary, status, manager, phone, address, bio } = validation.data

    // Check for existing records
    const existing = await checkExistingRecords(email, employeeId)
    if (existing.existingUser) {
      return formatErrorResponse('Email already exists', 400)
    }
    if (existing.existingEmployee) {
      return formatErrorResponse('Employee ID already exists', 400)
    }

    // Create user and employee in transaction
    let result
    try {
      result = await createEmployeeWithUser(prisma, {
        name,
        email,
        password,
        role: role || 'EMPLOYEE',
        employeeId,
        department,
        position,
        salary,
        manager,
        phone,
        address,
        bio,
      })
    } catch (createError) {
      const errorMessage = createError instanceof Error ? createError.message : 'Failed to create employee'
      if (errorMessage.includes('Department') || errorMessage.includes('Manager')) {
        return formatErrorResponse(errorMessage, 400)
      }
      throw createError
    }

    // Send notifications
    try {
      // Notify all managers and admins about new employee
      const managersAndAdmins = await getManagersAndAdmins()
      const notifications = managersAndAdmins
        .filter(user => user.id !== context.user.id) // Don't notify the creator
        .map(user => ({
          userId: user.id,
          ...NotificationTemplates.newEmployeeAdded(name, department)
        }))

      // Send welcome notification to the new employee
      await createNotification({
        userId: result.user.id,
        title: 'Welcome to the Team!',
        message: `Welcome ${name}! Your account has been set up. You can now access the dashboard and start tracking your attendance.`,
        type: 'success'
      })
    } catch (notificationError) {
      logError(notificationError, { context: 'POST /api/employees - notifications', employeeId: result.employee.id })
      // Don't fail the employee creation if notifications fail
    }

    // Invalidate employee cache when new employee is created
    revalidateTag(CACHE_TAGS.EMPLOYEES)

    return formatApiResponse(result, undefined, 'Employee created successfully')
  } catch (error) {
    logError(error, { context: 'POST /api/employees' })
    
    if (error instanceof AppError) {
      return formatErrorResponse(error.message, error.status || 500, {
        code: error.code,
        details: error.details
      })
    }
    
    return formatErrorResponse('Failed to create employee', 500)
  }
})
