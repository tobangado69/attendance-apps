import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatErrorResponse,
  validateRole
} from '@/lib/api/api-utils'
import { logError } from '@/lib/utils/logger'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext
    const { searchParams } = new URL(request.url)
    
    // Only Admin can export reports
    const roleCheck = validateRole(user, ['ADMIN'], 'Only Admin can export attendance reports')
    if (roleCheck) {
      return roleCheck
    }
    
    // Parse date range
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const department = searchParams.get('department') || ''

    // Default to current month if no dates provided
    const now = new Date()
    const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const defaultEndDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Build where clause
    const where: Record<string, unknown> = {
      date: {
        gte: new Date(defaultStartDate),
        lte: new Date(defaultEndDate)
      }
    }

    // If not admin, only show own records
    if (user.role !== 'ADMIN') {
      where.userId = user.id
    }

    // Department filter
    if (department) {
      where.employee = {
        department: department
      }
    }

    // Get attendance records with user and employee data
    const attendanceRecords = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            position: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Prepare data for Excel export
    const exportData = attendanceRecords.map(record => ({
      'Employee ID': record.employee?.employeeId || 'N/A',
      'Employee Name': record.user.name,
      'Email': record.user.email,
      'Department': record.employee?.department || 'N/A',
      'Position': record.employee?.position || 'N/A',
      'Date': record.date.toISOString().split('T')[0],
      'Check In': record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A',
      'Check Out': record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A',
      'Status': record.status,
      'Total Hours': record.totalHours || 0,
      'Overtime Hours': (record.totalHours && record.totalHours > 8) ? record.totalHours - 8 : 0,
      'Notes': record.notes || ''
    }))

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 25 }, // Email
      { wch: 15 }, // Department
      { wch: 20 }, // Position
      { wch: 12 }, // Date
      { wch: 12 }, // Check In
      { wch: 12 }, // Check Out
      { wch: 12 }, // Status
      { wch: 12 }, // Total Hours
      { wch: 12 }, // Overtime Hours
      { wch: 30 }  // Notes
    ]
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // Set response headers
    const filename = `attendance-report-${defaultStartDate.split('T')[0]}-to-${defaultEndDate.split('T')[0]}.xlsx`
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
  } catch (error) {
    logError(error, { context: 'GET /api/attendance/export' })
    return formatErrorResponse('Failed to export attendance data', 500)
  }
}
