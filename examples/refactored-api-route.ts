// Example: Refactored API route using reusable utilities
// This shows how to refactor app/api/employees/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  buildTextSearchWhere, 
  formatApiResponse, 
  formatErrorResponse,
  withAdminManagerGuard 
} from '@/lib/api/api-utils'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'
import { employeeSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

// GET /api/employees - Much cleaner with utilities
export const GET = withAdminManagerGuard(async (context, request: NextRequest) => {
  try {
    const { pagination, search } = context
    const { searchParams } = new URL(request.url)
    
    // Parse additional filters
    const department = searchParams.get('department') || ''
    
    // Build where clause using utilities
    const where: any = {
      ...buildTextSearchWhere(search.search || '', [
        'user.name',
        'user.email', 
        'employeeId'
      ])
    }
    
    if (department) {
      where.department = department
    }

    // Execute query
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
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
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.employee.count({ where })
    ])

    return formatApiResponse(employees, {
      total,
      page: pagination.page,
      limit: pagination.limit
    })
  } catch (error) {
    console.error('Employees fetch error:', error)
    return formatErrorResponse('Failed to fetch employees', 500)
  }
})

// POST /api/employees - Much cleaner with utilities
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

    const { name, email, password, role, employeeId, department, position, salary, status } = validation.data

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
      const hashedPassword = await bcrypt.hash(password, 12)
      
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role
        }
      })

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeId,
          department,
          position,
          salary,
          status,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          }
        }
      })

      return employee
    })

    return formatApiResponse(result, undefined, 'Employee created successfully')
  } catch (error) {
    console.error('Employee creation error:', error)
    return formatErrorResponse('Failed to create employee', 500)
  }
})

// BEFORE: 247 lines of code with lots of duplication
// AFTER: ~120 lines of code, much cleaner and more maintainable
