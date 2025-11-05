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
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    })
    
    // Debug: Check if position data is being retrieved
    if (employees.length > 0) {
      console.log('Sample employee position check:', {
        employeeId: employees[0].employeeId,
        position: employees[0].position,
        positionType: typeof employees[0].position,
        hasPosition: employees[0].position != null
      })
    }

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

      // Get position directly from database - ensure it's always a string
      const dbPosition = emp.position
      let positionValue = 'N/A'
      
      // Handle position value - check for null, undefined, empty string, or whitespace
      if (dbPosition != null && dbPosition !== undefined && dbPosition !== '') {
        const posStr = String(dbPosition).trim()
        if (posStr.length > 0 && posStr !== 'null' && posStr !== 'undefined') {
          positionValue = posStr
        }
      }
      
      // Final guarantee - ensure it's always a non-empty string
      positionValue = positionValue || 'N/A'

      return {
        employeeId: emp.employeeId,
        name: emp.user.name,
        email: emp.user.email,
        department: emp.department?.name || 'Unassigned',
        position: positionValue,
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
      const dept = emp.department?.name || 'Unassigned'
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
    }, {} as Record<string, { department: string; totalEmployees: number; totalPresentDays: number; totalDays: number; avgAttendanceRate?: number; totalHours?: number }>)

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
    const employeeSheetData = employeeData.map((emp) => {
      // Get position directly from original employees array
      const originalEmployee = employees.find(e => e.employeeId === emp.employeeId)
      
      // Get position - use original database value, fallback to employeeData, then 'N/A'
      let positionValue: string = 'N/A'
      
      if (originalEmployee?.position) {
        const pos = String(originalEmployee.position).trim()
        if (pos && pos.length > 0) {
          positionValue = pos
        }
      } else if (emp.position) {
        const pos = String(emp.position).trim()
        if (pos && pos.length > 0) {
          positionValue = pos
        }
      }
      
      // Build row data - ensure Position is always included and is a string
      const rowData: Record<string, string | number> = {
        'Employee ID': String(emp.employeeId || ''),
        'Name': String(emp.name || ''),
        'Email': String(emp.email || ''),
        'Department': String(emp.department || 'Unassigned'),
        'Position': String(positionValue),
        'Salary': `$${emp.salary?.toLocaleString() || '0'}`,
        'Present Days': emp.presentDays || 0,
        'Total Days': emp.totalDays || 0,
        'Attendance Rate (%)': emp.attendanceRate || 0,
        'Total Hours': emp.totalHours || 0,
        'Avg Hours/Day': emp.avgHours || 0,
        'Late Days': emp.lateDays || 0
      }
      
      // Verify Position is set
      if (!rowData['Position'] || rowData['Position'] === '') {
        rowData['Position'] = 'N/A'
      }
      
      return rowData
    })
    
    // Debug: Log first few rows to verify Position is included
    if (employeeSheetData.length > 0) {
      console.log('Employee Summary Sheet - First row:', JSON.stringify(employeeSheetData[0], null, 2))
      console.log('Position value in first row:', employeeSheetData[0]['Position'])
      console.log('Position type:', typeof employeeSheetData[0]['Position'])
    }
    
    const employeeSheet = XLSX.utils.json_to_sheet(employeeSheetData)
    
    // Verify Position column exists in sheet
    const range = XLSX.utils.decode_range(employeeSheet['!ref'] || 'A1')
    const headers: string[] = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = employeeSheet[cellAddress]
      if (cell) headers.push(cell.v)
    }
    console.log('Excel sheet headers:', headers)
    console.log('Position column index:', headers.indexOf('Position'))
    
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
      employees.map(emp => {
        // Ensure position is always a non-empty string value
        let positionValue = 'N/A'
        if (emp.position) {
          const posStr = String(emp.position).trim()
          if (posStr.length > 0) {
            positionValue = posStr
          }
        }
        
        return {
          'Employee ID': String(emp.employeeId || ''),
          'Name': String(emp.user.name || ''),
          'Email': String(emp.user.email || ''),
          'Department': String(emp.department?.name || 'Unassigned'),
          'Position': positionValue,
          'Salary': `$${emp.salary?.toLocaleString() || '0'}`,
          'Role': String(emp.user.role || ''),
          'Status': emp.isActive ? 'Active' : 'Inactive',
          'Created Date': emp.user.createdAt ? format(new Date(emp.user.createdAt), 'yyyy-MM-dd') : 'N/A'
        }
      })
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
