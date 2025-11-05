import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { employeeUpdateSchema } from '@/lib/validations'
import { formatErrorResponse } from '@/lib/api/api-utils'
import bcrypt from 'bcryptjs'
import { logError } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
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
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!employee) {
      return formatErrorResponse('Employee not found', 404)
    }

    // If not admin/manager, only allow viewing own record
    if (session.user.role === 'EMPLOYEE' && employee.userId !== session.user.id) {
      return formatErrorResponse('Forbidden', 403)
    }

    return formatApiResponse(employee)
  } catch (error) {
    logError(error, { context: 'GET /api/employees/[id]', employeeId: id })
    return formatErrorResponse('Failed to fetch employee', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    
    // Validate the request body
    const validation = employeeUpdateSchema.safeParse(body)
    if (!validation.success) {
      return formatErrorResponse('Validation failed', 400, {
        details: validation.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }
    
    const { name, email, role, department, position, salary, status, manager } = validation.data

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role === 'EMPLOYEE' && employee.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id: employee.userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(role && ['ADMIN', 'MANAGER'].includes(session.user.role) && { role })
        }
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
      if (manager !== undefined) {
        if (manager === 'no-manager' || manager === '') {
          managerId = null
        } else {
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
      }

      // Update employee
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: {
          ...(departmentId !== null && { departmentId }),
          ...(managerId !== undefined && { managerId }),
          ...(position && { position }),
          ...(salary !== undefined && { salary: typeof salary === 'string' ? parseFloat(salary) : salary }),
          ...(status !== undefined && { status })
        } as Record<string, unknown>,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
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
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return updatedEmployee
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Employee updated successfully'
    })
  } catch (error) {
    logError(error, { context: 'PUT /api/employees/[id]', employeeId: id })
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can delete employees
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { id } = await params
    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.employee.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Employee deactivated successfully'
    })
  } catch (error) {
    logError(error, { context: 'DELETE /api/employees/[id]', employeeId: id })
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
