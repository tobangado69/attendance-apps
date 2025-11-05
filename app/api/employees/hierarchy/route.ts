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
            role: true,
            image: true
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

    // Build hierarchical structure
    const hierarchy = {
      ceo: null as unknown,
      departments: [] as Array<Record<string, unknown>>,
      totalEmployees: employees.length
    }

    // Find CEO (highest level admin or first admin)
    const ceo = employees.find(emp => 
      emp.user.role === 'ADMIN' && 
      (!emp.department || emp.department.manager?.id === emp.userId)
    )

    if (ceo) {
      hierarchy.ceo = {
        id: ceo.id,
        userId: ceo.userId,
        employeeId: ceo.employeeId,
        name: ceo.user.name,
        email: ceo.user.email,
        position: ceo.position || 'CEO',
        role: ceo.user.role,
        image: ceo.user.image,
        department: ceo.department?.name || 'Executive',
        directReports: 0,
        totalReports: 0
      }
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
        image: employee.user.image,
        isManager: employee.department?.manager?.id === employee.userId,
        directReports: 0,
        totalReports: 0
      })

      departmentMap.get(deptId).employeeCount++
    })

    // Convert to array and calculate direct reports
    hierarchy.departments = Array.from(departmentMap.values())
      .map(dept => ({
        ...dept,
        manager: dept.manager ? {
          ...dept.manager,
          directReports: dept.employeeCount - 1, // Exclude self
          totalReports: dept.employeeCount - 1
        } : null,
        employees: dept.employees.map(emp => ({
          ...emp,
          directReports: emp.isManager ? dept.employeeCount - 1 : 0,
          totalReports: emp.isManager ? dept.employeeCount - 1 : 0
        }))
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Calculate CEO's direct reports (department managers)
    if (hierarchy.ceo) {
      hierarchy.ceo.directReports = hierarchy.departments.filter(dept => dept.manager).length
      hierarchy.ceo.totalReports = hierarchy.totalEmployees - 1
    }

    return formatApiResponse(hierarchy)
  } catch (error) {
    logError(error, { context: 'GET /api/employees/hierarchy' })
    return formatErrorResponse('Failed to fetch hierarchy data', 500)
  }
}
