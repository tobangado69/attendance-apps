import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers and admins can export employee data
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const status = searchParams.get('status') // active, inactive, all

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (department && department !== 'all') {
      where.department = department
    }
    
    if (status && status !== 'all') {
      where.isActive = status === 'active'
    }

    // Get all employees with their user data
    const employees = await prisma.employee.findMany({
      where,
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
        user: {
          createdAt: 'desc'
        }
      }
    })

    // Get attendance data for each employee
    const employeeIds = employees.map(emp => emp.userId)
    const attendanceData = await prisma.attendance.findMany({
      where: {
        userId: { in: employeeIds }
      },
      select: {
        userId: true,
        checkIn: true,
        totalHours: true,
        status: true
      }
    })

    // Calculate attendance statistics for each employee
    const employeeStats = employees.map(emp => {
      const empAttendance = attendanceData.filter(att => att.userId === emp.userId)
      const presentDays = empAttendance.filter(att => att.checkIn !== null).length
      const totalHours = empAttendance.reduce((sum, att) => sum + (att.totalHours || 0), 0)
      const avgHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0
      const lateDays = empAttendance.filter(att => {
        if (!att.checkIn) return false
        const checkInTime = new Date(att.checkIn)
        return checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30)
      }).length

      return {
        ...emp,
        presentDays,
        totalHours: Math.round(totalHours * 10) / 10,
        avgHours,
        lateDays
      }
    })

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()
    
    // Main Employee Data Sheet
    const employeeSheet = XLSX.utils.json_to_sheet(
      employeeStats.map(emp => ({
        'Employee ID': emp.employeeId,
        'Name': emp.user.name,
        'Email': emp.user.email,
        'Department': emp.department || 'N/A',
        'Position': emp.position || 'N/A',
        'Salary': `$${(emp.salary || 0).toLocaleString()}`,
        'Role': emp.user.role,
        'Status': emp.isActive ? 'Active' : 'Inactive',
        'Present Days': emp.presentDays,
        'Total Hours': emp.totalHours,
        'Avg Hours/Day': emp.avgHours,
        'Late Days': emp.lateDays,
        'Created Date': format(new Date(emp.user.createdAt), 'yyyy-MM-dd')
      }))
    )
    
    // Set column widths
    employeeSheet['!cols'] = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Department
      { wch: 20 }, // Position
      { wch: 12 }, // Salary
      { wch: 12 }, // Role
      { wch: 10 }, // Status
      { wch: 12 }, // Present Days
      { wch: 12 }, // Total Hours
      { wch: 14 }, // Avg Hours/Day
      { wch: 10 }, // Late Days
      { wch: 12 }  // Created Date
    ]
    
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Data')
    
    // Department Summary Sheet
    const departmentSummary = employeeStats.reduce((acc, emp) => {
      const dept = emp.department || 'Unassigned'
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          totalEmployees: 0,
          activeEmployees: 0,
          totalSalary: 0,
          avgSalary: 0,
          totalHours: 0,
          avgHours: 0
        }
      }
      
      acc[dept].totalEmployees++
      if (emp.isActive) acc[dept].activeEmployees++
      acc[dept].totalSalary += emp.salary || 0
      acc[dept].totalHours += emp.totalHours
      
      return acc
    }, {} as Record<string, { department: string; totalEmployees: number; activeEmployees: number; totalSalary: number; totalHours: number; avgSalary?: number; avgHours?: number }>)

    // Calculate averages
    Object.values(departmentSummary).forEach((dept) => {
      dept.avgSalary = dept.totalEmployees > 0 ? Math.round(dept.totalSalary / dept.totalEmployees) : 0
      dept.avgHours = dept.totalEmployees > 0 ? Math.round((dept.totalHours / dept.totalEmployees) * 10) / 10 : 0
    })

    const departmentSheet = XLSX.utils.json_to_sheet(
      Object.values(departmentSummary).map((dept) => ({
        'Department': dept.department,
        'Total Employees': dept.totalEmployees,
        'Active Employees': dept.activeEmployees,
        'Total Salary': `$${dept.totalSalary.toLocaleString()}`,
        'Average Salary': `$${dept.avgSalary.toLocaleString()}`,
        'Total Hours': dept.totalHours,
        'Average Hours': dept.avgHours
      }))
    )
    
    // Set column widths for department summary
    departmentSheet['!cols'] = [
      { wch: 15 }, // Department
      { wch: 16 }, // Total Employees
      { wch: 16 }, // Active Employees
      { wch: 12 }, // Total Salary
      { wch: 14 }, // Average Salary
      { wch: 12 }, // Total Hours
      { wch: 13 }  // Average Hours
    ]
    
    XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Department Summary')
    
    // Role Summary Sheet
    const roleSummary = employeeStats.reduce((acc, emp) => {
      const role = emp.user.role
      if (!acc[role]) {
        acc[role] = {
          role: role,
          totalEmployees: 0,
          activeEmployees: 0,
          totalSalary: 0,
          avgSalary: 0
        }
      }
      
      acc[role].totalEmployees++
      if (emp.isActive) acc[role].activeEmployees++
      acc[role].totalSalary += emp.salary || 0
      
      return acc
    }, {} as Record<string, { department: string; totalEmployees: number; activeEmployees: number; totalSalary: number; totalHours: number; avgSalary?: number; avgHours?: number }>)

    // Calculate role averages
    Object.values(roleSummary).forEach((role) => {
      role.avgSalary = role.totalEmployees > 0 ? Math.round(role.totalSalary / role.totalEmployees) : 0
    })

    const roleSheet = XLSX.utils.json_to_sheet(
      Object.values(roleSummary).map((role) => ({
        'Role': role.role,
        'Total Employees': role.totalEmployees,
        'Active Employees': role.activeEmployees,
        'Total Salary': `$${role.totalSalary.toLocaleString()}`,
        'Average Salary': `$${role.avgSalary.toLocaleString()}`
      }))
    )
    
    // Set column widths for role summary
    roleSheet['!cols'] = [
      { wch: 12 }, // Role
      { wch: 16 }, // Total Employees
      { wch: 16 }, // Active Employees
      { wch: 12 }, // Total Salary
      { wch: 14 }  // Average Salary
    ]
    
    XLSX.utils.book_append_sheet(workbook, roleSheet, 'Role Summary')
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    
    // Set response headers
    const filename = `employees-export-${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error exporting employee data:', error)
    return NextResponse.json(
      { error: 'Failed to export employee data' },
      { status: 500 }
    )
  }
}
