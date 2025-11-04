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

    // Execute query
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

    const { name, email, password, role, employeeId, department, position, salary, status, manager } = validation.data

    // Check for existing records
    const [existingUser, existingEmployee] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.employee.findUnique({ where: { employeeId } })
    ])

    if (existingUser) {
      return formatErrorResponse('Email already exists', 400)
    }

    if (existingEmployee) {
      return formatErrorResponse('Employee ID already exists', 400)
    }

    // Create user and employee in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: password ? await bcrypt.hash(password, 12) : null,
          role: role || 'EMPLOYEE'
        } as { name: string; email: string; password: string | null; role: string }
      })

      // Handle department - convert name to ID if needed
      let departmentId = null
      if (department) {
        // Check if department is already an ID (cuid format)
        if (department.startsWith('cmf')) {
          departmentId = department
        } else {
          // It's a department name, find the ID
          const dept = await tx.department.findFirst({
            where: { name: department }
          })
          if (dept) {
            departmentId = dept.id
          } else {
            return formatErrorResponse(`Department '${department}' not found`, 400)
          }
        }
      }

      // Handle manager - convert user ID to employee ID if provided
      let managerId = null
      if (manager && manager !== 'no-manager') {
        // Manager could be either a user ID or employee ID
        // First try to find by user ID (most common case from form)
        let managerEmployee = await tx.employee.findFirst({
          where: { userId: manager }
        })
        
        // If not found by user ID, try as employee ID
        if (!managerEmployee && manager.startsWith('cmf')) {
          managerEmployee = await tx.employee.findUnique({
            where: { id: manager }
          })
        }
        
        if (managerEmployee) {
          managerId = managerEmployee.id
        } else {
          return formatErrorResponse(`Manager with ID '${manager}' not found`, 400)
        }
      }

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeId,
          departmentId,
          managerId,
          position,
          salary: salary ? parseFloat(salary.toString()) : null,
          isActive: true
        } as { userId: string; employeeId: string; departmentId: string | null; managerId: string | null; position: string | null; salary: number | null; isActive: boolean }
      })

      return { user, employee }
    })

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
