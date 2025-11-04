import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get total active employees
    const totalEmployees = await prisma.employee.count({
      where: { isActive: true }
    })

    // Get unique departments count
    const departments = await prisma.department.findMany({
      select: { id: true, name: true }
    })
    const totalDepartments = departments.length

    // Get department names
    const departmentNames = departments
      .map(d => d.name)
      .join(', ')

    // Get new employees this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newThisMonth = await prisma.employee.count({
      where: {
        isActive: true,
        createdAt: {
          gte: startOfMonth
        }
      }
    })

    return NextResponse.json({
      totalEmployees,
      totalDepartments,
      departmentNames,
      newThisMonth
    })
  } catch (error) {
    console.error('Error fetching employee stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee statistics' },
      { status: 500 }
    )
  }
}
