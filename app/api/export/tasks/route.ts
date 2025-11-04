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

    // Only managers and admins can export task data
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignee = searchParams.get('assignee')

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (priority && priority !== 'all') {
      where.priority = priority
    }
    
    if (assignee && assignee !== 'all') {
      where.assigneeId = assignee
    }

    // Get all tasks with assignee information
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()
    
    // Main Task Data Sheet
    const taskSheet = XLSX.utils.json_to_sheet(
      tasks.map(task => ({
        'Task ID': task.id,
        'Title': task.title,
        'Description': task.description || '',
        'Status': task.status,
        'Priority': task.priority,
        'Assignee Name': task.assignee?.name || 'Unassigned',
        'Assignee Email': task.assignee?.email || '',
        'Assignee Role': task.assignee?.role || '',
        'Due Date': task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : 'No due date',
        'Created Date': format(new Date(task.createdAt), 'yyyy-MM-dd'),
        'Updated Date': format(new Date(task.updatedAt), 'yyyy-MM-dd')
      }))
    )
    
    // Set column widths
    taskSheet['!cols'] = [
      { wch: 12 }, // Task ID
      { wch: 30 }, // Title
      { wch: 40 }, // Description
      { wch: 12 }, // Status
      { wch: 10 }, // Priority
      { wch: 20 }, // Assignee Name
      { wch: 25 }, // Assignee Email
      { wch: 12 }, // Assignee Role
      { wch: 12 }, // Due Date
      { wch: 12 }, // Created Date
      { wch: 12 }  // Updated Date
    ]
    
    XLSX.utils.book_append_sheet(workbook, taskSheet, 'Task Data')
    
    // Status Summary Sheet
    const statusSummary = tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = {
          status: task.status,
          totalTasks: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0
        }
      }
      
      acc[task.status].totalTasks++
      if (task.priority === 'HIGH') acc[task.status].highPriority++
      else if (task.priority === 'MEDIUM') acc[task.status].mediumPriority++
      else if (task.priority === 'LOW') acc[task.status].lowPriority++
      
      return acc
    }, {} as Record<string, { status: string; count: number; percentage?: number }>)

    const statusSheet = XLSX.utils.json_to_sheet(
      Object.values(statusSummary).map((status) => ({
        'Status': status.status,
        'Total Tasks': status.totalTasks,
        'High Priority': status.highPriority,
        'Medium Priority': status.mediumPriority,
        'Low Priority': status.lowPriority
      }))
    )
    
    // Set column widths for status summary
    statusSheet['!cols'] = [
      { wch: 12 }, // Status
      { wch: 12 }, // Total Tasks
      { wch: 12 }, // High Priority
      { wch: 14 }, // Medium Priority
      { wch: 11 }  // Low Priority
    ]
    
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Summary')
    
    // Priority Summary Sheet
    const prioritySummary = tasks.reduce((acc, task) => {
      if (!acc[task.priority]) {
        acc[task.priority] = {
          priority: task.priority,
          totalTasks: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          overdue: 0
        }
      }
      
      acc[task.priority].totalTasks++
      if (task.status === 'COMPLETED') acc[task.priority].completed++
      else if (task.status === 'IN_PROGRESS') acc[task.priority].inProgress++
      else if (task.status === 'PENDING') acc[task.priority].pending++
      else if (task.status === 'OVERDUE') acc[task.priority].overdue++
      
      return acc
    }, {} as Record<string, { status: string; count: number; percentage?: number }>)

    const prioritySheet = XLSX.utils.json_to_sheet(
      Object.values(prioritySummary).map((priority) => ({
        'Priority': priority.priority,
        'Total Tasks': priority.totalTasks,
        'Completed': priority.completed,
        'In Progress': priority.inProgress,
        'Pending': priority.pending,
        'Overdue': priority.overdue
      }))
    )
    
    // Set column widths for priority summary
    prioritySheet['!cols'] = [
      { wch: 10 }, // Priority
      { wch: 12 }, // Total Tasks
      { wch: 10 }, // Completed
      { wch: 12 }, // In Progress
      { wch: 8 },  // Pending
      { wch: 8 }   // Overdue
    ]
    
    XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Summary')
    
    // Assignee Summary Sheet
    const assigneeSummary = tasks.reduce((acc, task) => {
      const assigneeName = task.assignee?.name || 'Unassigned'
      const assigneeRole = task.assignee?.role || 'N/A'
      
      if (!acc[assigneeName]) {
        acc[assigneeName] = {
          assigneeName: assigneeName,
          assigneeRole: assigneeRole,
          totalTasks: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          overdue: 0
        }
      }
      
      acc[assigneeName].totalTasks++
      if (task.status === 'COMPLETED') acc[assigneeName].completed++
      else if (task.status === 'IN_PROGRESS') acc[assigneeName].inProgress++
      else if (task.status === 'PENDING') acc[assigneeName].pending++
      else if (task.status === 'OVERDUE') acc[assigneeName].overdue++
      
      return acc
    }, {} as Record<string, { status: string; count: number; percentage?: number }>)

    const assigneeSheet = XLSX.utils.json_to_sheet(
      Object.values(assigneeSummary).map((assignee) => ({
        'Assignee': assignee.assigneeName,
        'Role': assignee.assigneeRole,
        'Total Tasks': assignee.totalTasks,
        'Completed': assignee.completed,
        'In Progress': assignee.inProgress,
        'Pending': assignee.pending,
        'Overdue': assignee.overdue
      }))
    )
    
    // Set column widths for assignee summary
    assigneeSheet['!cols'] = [
      { wch: 20 }, // Assignee
      { wch: 12 }, // Role
      { wch: 12 }, // Total Tasks
      { wch: 10 }, // Completed
      { wch: 12 }, // In Progress
      { wch: 8 },  // Pending
      { wch: 8 }   // Overdue
    ]
    
    XLSX.utils.book_append_sheet(workbook, assigneeSheet, 'Assignee Summary')
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    
    // Set response headers
    const filename = `tasks-export-${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error exporting task data:', error)
    return NextResponse.json(
      { error: 'Failed to export task data' },
      { status: 500 }
    )
  }
}
