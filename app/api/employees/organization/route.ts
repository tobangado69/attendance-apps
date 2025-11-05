import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse
} from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Get all employees with their department and manager information
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: [
        {
          department: {
            name: 'asc'
          }
        },
        {
          position: 'asc'
        }
      ]
    })

    // Build organizational structure
    const organizationData = {
      departments: [] as Array<Record<string, unknown>>,
      totalEmployees: employees.length,
      totalDepartments: 0
    }

    // Group employees by department
    const departmentMap = new Map()

    employees.forEach(employee => {
      const deptId = employee.department?.id || 'unassigned'
      const deptName = employee.department?.name || 'Unassigned'
      
      if (!departmentMap.has(deptId)) {
        departmentMap.set(deptId, {
          id: deptId,
          name: deptName,
          manager: employee.department?.manager || null,
          employees: [],
          employeeCount: 0
        })
      }

      departmentMap.get(deptId).employees.push({
        id: employee.id,
        userId: employee.userId,
        employeeId: employee.employeeId,
        name: employee.user.name,
        email: employee.user.email,
        position: employee.position,
        role: employee.user.role,
        isManager: employee.department?.manager?.id === employee.userId
      })

      departmentMap.get(deptId).employeeCount++
    })

    // Convert map to array and sort
    organizationData.departments = Array.from(departmentMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
    
    organizationData.totalDepartments = organizationData.departments.length

    return formatApiResponse(organizationData)
  } catch (error) {
    logError(error, { context: 'GET /api/employees/organization' })
    return formatErrorResponse('Failed to fetch organization data', 500)
  }
}
