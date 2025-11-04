import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { startOfMonth, endOfMonth, subDays, format, eachDayOfInterval } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers and admins can export attendance data
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let dateRange: { start: Date; end: Date }

    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else {
      const now = new Date()
      switch (period) {
        case 'week':
          dateRange = {
            start: subDays(now, 7),
            end: now
          }
          break
        case 'year':
          dateRange = {
            start: subDays(now, 365),
            end: now
          }
          break
        default: // month
          dateRange = {
            start: startOfMonth(now),
            end: endOfMonth(now)
          }
      }
    }

    // Get attendance data for the date range
    const attendanceData = await prisma.attendance.findMany({
      where: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get all employees for reference
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        position: true,
        salary: true,
        isActive: true,
        userId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Generate daily attendance summary
    const dailyData = eachDayOfInterval(dateRange).map(date => {
      const dayAttendance = attendanceData.filter(att => 
        format(att.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      )
      
      const present = dayAttendance.filter(att => att.checkIn !== null).length
      const absent = employees.length - present
      const late = dayAttendance.filter(att => {
        if (!att.checkIn) return false
        const checkInTime = new Date(att.checkIn)
        return checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30)
      }).length

      const totalHours = dayAttendance.reduce((sum, att) => {
        return sum + (att.totalHours || 0)
      }, 0)

      return {
        date: format(date, 'yyyy-MM-dd'),
        day: format(date, 'EEE'),
        present,
        absent,
        late,
        totalHours: Math.round(totalHours * 10) / 10
      }
    })

    // Generate employee attendance summary
    const employeeData = employees.map(emp => {
      const empAttendance = attendanceData.filter(att => att.userId === emp.userId)
      const presentDays = empAttendance.filter(att => att.checkIn !== null).length
      const totalDays = dailyData.length
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      
      const totalHours = empAttendance.reduce((sum, att) => sum + (att.totalHours || 0), 0)
      const avgHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0

      const lateDays = empAttendance.filter(att => {
        if (!att.checkIn) return false
        const checkInTime = new Date(att.checkIn)
        return checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30)
      }).length

      return {
        employeeId: emp.employeeId,
        name: emp.user.name,
        email: emp.user.email,
        department: emp.department || 'Unassigned',
        position: emp.position,
        salary: emp.salary,
        presentDays,
        totalDays,
        attendanceRate,
        totalHours: Math.round(totalHours * 10) / 10,
        avgHours,
        lateDays
      }
    })

    // Generate department summary
    const departmentData = employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unassigned'
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          totalEmployees: 0,
          totalPresentDays: 0,
          totalDays: 0,
          avgAttendanceRate: 0,
          totalHours: 0
        }
      }
      
      const empData = employeeData.find(e => e.employeeId === emp.employeeId)
      if (empData) {
        acc[dept].totalEmployees++
        acc[dept].totalPresentDays += empData.presentDays
        acc[dept].totalDays += empData.totalDays
        acc[dept].totalHours += empData.totalHours
      }
      
      return acc
    }, {} as Record<string, { department: string; totalEmployees: number; totalPresentDays: number; totalDays: number; avgAttendanceRate?: number }>)

    // Calculate department averages
    Object.values(departmentData).forEach((dept) => {
      dept.avgAttendanceRate = dept.totalDays > 0 
        ? Math.round((dept.totalPresentDays / dept.totalDays) * 100) 
        : 0
    })

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()
    
    // Daily Attendance Sheet
    const dailySheet = XLSX.utils.json_to_sheet(
      dailyData.map(day => ({
        Date: day.date,
        Day: day.day,
        'Present Employees': day.present,
        'Absent Employees': day.absent,
        'Late Employees': day.late,
        'Total Hours': day.totalHours
      }))
    )
    
    // Set column widths
    dailySheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 8 },  // Day
      { wch: 18 }, // Present Employees
      { wch: 18 }, // Absent Employees
      { wch: 16 }, // Late Employees
      { wch: 12 }  // Total Hours
    ]
    
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Attendance')
    
    // Employee Summary Sheet
    const employeeSheet = XLSX.utils.json_to_sheet(
      employeeData.map(emp => ({
        'Employee ID': emp.employeeId,
        'Name': emp.name,
        'Email': emp.email,
        'Department': emp.department || 'Unassigned',
        'Position': emp.position,
        'Salary': `$${emp.salary?.toLocaleString() || '0'}`,
        'Present Days': emp.presentDays,
        'Total Days': emp.totalDays,
        'Attendance Rate (%)': emp.attendanceRate,
        'Total Hours': emp.totalHours,
        'Avg Hours/Day': emp.avgHours,
        'Late Days': emp.lateDays
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
      { wch: 12 }, // Present Days
      { wch: 10 }, // Total Days
      { wch: 16 }, // Attendance Rate
      { wch: 12 }, // Total Hours
      { wch: 14 }, // Avg Hours/Day
      { wch: 10 }  // Late Days
    ]
    
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Summary')
    
    // Department Summary Sheet
    const departmentSheet = XLSX.utils.json_to_sheet(
      Object.values(departmentData).map((dept) => ({
        'Department': dept.department,
        'Total Employees': dept.totalEmployees,
        'Present Days': dept.totalPresentDays,
        'Total Days': dept.totalDays,
        'Avg Attendance Rate (%)': dept.avgAttendanceRate,
        'Total Hours': dept.totalHours
      }))
    )
    
    // Set column widths
    departmentSheet['!cols'] = [
      { wch: 15 }, // Department
      { wch: 16 }, // Total Employees
      { wch: 12 }, // Present Days
      { wch: 10 }, // Total Days
      { wch: 20 }, // Avg Attendance Rate
      { wch: 12 }  // Total Hours
    ]
    
    XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Department Summary')
    
    // Employee Details Sheet (Complete employee information)
    const employeeDetailsSheet = XLSX.utils.json_to_sheet(
      employees.map(emp => ({
        'Employee ID': emp.employeeId,
        'Name': emp.user.name,
        'Email': emp.user.email,
        'Department': emp.department || 'Unassigned',
        'Position': emp.position,
        'Salary': `$${emp.salary?.toLocaleString() || '0'}`,
        'Role': emp.user.role,
        'Status': emp.isActive ? 'Active' : 'Inactive',
        'Created Date': format(new Date(emp.user.createdAt), 'yyyy-MM-dd')
      }))
    )
    
    // Set column widths for employee details
    employeeDetailsSheet['!cols'] = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Department
      { wch: 20 }, // Position
      { wch: 12 }, // Salary
      { wch: 12 }, // Role
      { wch: 10 }, // Status
      { wch: 12 }  // Created Date
    ]
    
    XLSX.utils.book_append_sheet(workbook, employeeDetailsSheet, 'Employee Details')
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    
    // Set response headers
    const filename = `attendance-report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error exporting attendance data:', error)
    return NextResponse.json(
      { error: 'Failed to export attendance data' },
      { status: 500 }
    )
  }
}
