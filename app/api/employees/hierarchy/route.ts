import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse
} from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS, CACHE_REVALIDATE } from '@/lib/utils/api-cache'

/**
 * Cached function to fetch employee hierarchy
 * Hierarchy structure changes infrequently, so we can cache for longer
 */
const getCachedEmployeeHierarchy = unstable_cache(
  async () => {
    // Get all employees with their manager relationship and user info
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
        manager: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true
              }
            }
          }
        },
        directReports: {
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
                name: true
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

    // Build employee map for quick lookup
    const employeeMap = new Map()
    employees.forEach(emp => {
      employeeMap.set(emp.id, {
        id: emp.id,
        userId: emp.userId,
        employeeId: emp.employeeId,
        name: emp.user.name,
        email: emp.user.email,
        position: emp.position || 'Employee',
        role: emp.user.role,
        image: emp.user.image,
        department: emp.department?.name || null,
        managerId: emp.managerId,
        directReports: emp.directReports.map(report => ({
          id: report.id,
          userId: report.userId,
          employeeId: report.employeeId,
          name: report.user.name,
          email: report.user.email,
          position: report.position || 'Employee',
          role: report.user.role,
          image: report.user.image,
          department: report.department?.name || null,
          managerId: report.managerId,
          directReports: [],
          directReportsCount: 0,
          totalReportsCount: 0
        })),
        directReportsCount: emp.directReports.length,
        totalReportsCount: 0
      })
    })

    // Find Admin (system administrator) - should be at top
    const admin = employees.find(emp => emp.user.role === 'ADMIN')
    const processedEmployees = new Set<string>()

    // Find employees directly under Admin (excluding managers)
    const adminDirectEmployees: Array<Record<string, unknown>> = []
    if (admin) {
      employees.forEach(emp => {
        // Employee is directly under Admin if:
        // 1. Has Admin as manager
        // 2. Is not a manager themselves
        // 3. Is not Admin
        if (
          emp.managerId === admin.id && 
          emp.id !== admin.id &&
          emp.user.role !== 'MANAGER' &&
          emp.directReports.length === 0
        ) {
          const employeeData = employeeMap.get(emp.id)
          if (employeeData) {
            adminDirectEmployees.push(employeeData)
            processedEmployees.add(emp.id)
          }
        }
      })
    }

    // Build managers tree (Managers with their direct reports)
    const managers: Array<Record<string, unknown>> = []
    const managerIds = new Set<string>()
    // Don't mark manager's direct reports as processed yet - they'll be shown under managers

    // Find all managers (employees with MANAGER role OR employees who have direct reports)
    employees.forEach(emp => {
      if (emp.user.role === 'MANAGER' || emp.directReports.length > 0) {
        if (!managerIds.has(emp.id) && emp.id !== admin?.id) {
          managerIds.add(emp.id)
          const managerData = employeeMap.get(emp.id)
          if (managerData) {
            managers.push(managerData)
            processedEmployees.add(emp.id)
            // Mark direct reports as processed
            managerData.directReports.forEach((report: { id: string }) => {
              processedEmployees.add(report.id)
            })
          }
        }
      }
    })

    // Calculate total reports for each manager
    const calculateTotalReports = (employeeId: string): number => {
      const employee = employeeMap.get(employeeId)
      if (!employee) return 0
      
      let total = employee.directReportsCount
      employee.directReports.forEach((report: { id: string }) => {
        total += calculateTotalReports(report.id)
      })
      return total
    }

    managers.forEach(manager => {
      manager.totalReportsCount = calculateTotalReports(manager.id as string)
    })

    // Find unassigned employees (those without managers and not managers themselves)
    const unassignedEmployees: Array<Record<string, unknown>> = []
    employees.forEach(emp => {
      // Employee is unassigned if:
      // 1. Not already processed (not a manager's direct report, not under admin, not a manager)
      // 2. Not an admin
      // 3. Not a manager themselves
      // 4. Has no manager assigned (managerId is null)
      if (
        !processedEmployees.has(emp.id) &&
        emp.id !== admin?.id &&
        emp.user.role !== 'ADMIN' &&
        emp.user.role !== 'MANAGER' &&
        !emp.managerId
      ) {
        const employeeData = employeeMap.get(emp.id)
        if (employeeData) {
          unassignedEmployees.push(employeeData)
        }
      }
    })

    // Build hierarchy structure
    const adminDirectReportsCount = managers.length + adminDirectEmployees.length
    const hierarchy = {
      admin: admin ? {
        id: admin.id,
        userId: admin.userId,
        employeeId: admin.employeeId,
        name: admin.user.name,
        email: admin.user.email,
        position: admin.position || 'System Administrator',
        role: admin.user.role,
        image: admin.user.image,
        department: admin.department?.name || null,
        directReportsCount: adminDirectReportsCount,
        totalReportsCount: employees.length - 1,
        directReports: [...managers, ...adminDirectEmployees]
      } : null,
      managers: managers,
      adminDirectEmployees: adminDirectEmployees,
      unassignedEmployees: unassignedEmployees,
      totalEmployees: employees.length
    }

    return hierarchy
  },
  ['employee-hierarchy'],
  {
    revalidate: CACHE_REVALIDATE.LONG, // 30 minutes - hierarchy changes infrequently
    tags: [CACHE_TAGS.EMPLOYEES]
  }
)

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const hierarchy = await getCachedEmployeeHierarchy()

    return formatApiResponse(hierarchy)
  } catch (error) {
    logError(error, { context: 'GET /api/employees/hierarchy' })
    return formatErrorResponse('Failed to fetch hierarchy data', 500)
  }
}
