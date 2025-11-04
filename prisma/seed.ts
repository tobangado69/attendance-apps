import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create departments (or get existing ones)
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Engineering' },
      update: {},
      create: {
        name: 'Engineering',
        description: 'Software development team',
        budget: 500000
      }
    }),
    prisma.department.upsert({
      where: { name: 'Marketing' },
      update: {},
      create: {
        name: 'Marketing',
        description: 'Marketing and sales team',
        budget: 200000
      }
    }),
    prisma.department.upsert({
      where: { name: 'HR' },
      update: {},
      create: {
        name: 'HR',
        description: 'Human resources department',
        budget: 150000
      }
    })
  ])

  // Create users with different roles
  const adminPassword = await bcrypt.hash('admin123', 12)
  const managerPassword = await bcrypt.hash('manager123', 12)
  const employeePassword = await bcrypt.hash('employee123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN'
    }
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      name: 'Manager User',
      password: managerPassword,
      role: 'MANAGER'
    }
  })

  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      email: 'employee@company.com',
      name: 'Employee User',
      password: employeePassword,
      role: 'EMPLOYEE'
    }
  })

  // Get department IDs
  const engineeringDept = await prisma.department.findFirst({ where: { name: 'Engineering' } })
  const hrDept = await prisma.department.findFirst({ where: { name: 'HR' } })
  const marketingDept = await prisma.department.findFirst({ where: { name: 'Marketing' } })

  // Create employee records
  await prisma.employee.upsert({
    where: { employeeId: 'EMP001' },
    update: {},
    create: {
      userId: admin.id,
      employeeId: 'EMP001',
      departmentId: engineeringDept?.id,
      position: 'System Administrator',
      hireDate: new Date('2023-01-15'),
      salary: 80000,
      status: 'ACTIVE',
      isActive: true
    }
  })

  await prisma.employee.upsert({
    where: { employeeId: 'EMP002' },
    update: {},
    create: {
      userId: manager.id,
      employeeId: 'EMP002',
      departmentId: engineeringDept?.id,
      position: 'Engineering Manager',
      hireDate: new Date('2023-02-01'),
      salary: 95000,
      status: 'ACTIVE',
      isActive: true
    }
  })

  await prisma.employee.upsert({
    where: { employeeId: 'EMP003' },
    update: {},
    create: {
      userId: employee.id,
      employeeId: 'EMP003',
      departmentId: engineeringDept?.id,
      position: 'Software Developer',
      hireDate: new Date('2023-03-01'),
      salary: 70000,
      status: 'ACTIVE',
      isActive: true
    }
  })

  // Create sample employees
  const sampleEmployees = [
    { name: 'John Doe', email: 'john@company.com', employeeId: 'EMP004', departmentId: engineeringDept?.id, position: 'Senior Developer', salary: 85000, status: 'ACTIVE' },
    { name: 'Jane Smith', email: 'jane@company.com', employeeId: 'EMP005', departmentId: marketingDept?.id, position: 'Marketing Specialist', salary: 60000, status: 'ON_LEAVE' },
    { name: 'Mike Johnson', email: 'mike@company.com', employeeId: 'EMP006', departmentId: hrDept?.id, position: 'HR Specialist', salary: 55000, status: 'ACTIVE' },
    { name: 'Sarah Wilson', email: 'sarah@company.com', employeeId: 'EMP007', departmentId: engineeringDept?.id, position: 'Frontend Developer', salary: 75000, status: 'INACTIVE' },
    { name: 'Tom Brown', email: 'tom@company.com', employeeId: 'EMP008', departmentId: marketingDept?.id, position: 'Content Manager', salary: 65000, status: 'ACTIVE' },
    { name: 'Rohim Ahmed', email: 'rohim1@gmail.com', employeeId: 'ROHIM1', departmentId: engineeringDept?.id, position: 'Software Engineer', salary: 72000, status: 'ACTIVE' },
    { name: 'Rohim Khan', email: 'rohim.khan@company.com', employeeId: 'EMP009', departmentId: marketingDept?.id, position: 'Digital Marketing Specialist', salary: 68000, status: 'ACTIVE' }
  ]

  for (const emp of sampleEmployees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        name: emp.name,
        password: employeePassword,
        role: 'EMPLOYEE'
      }
    })

    await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: {
        userId: user.id,
        employeeId: emp.employeeId,
        departmentId: emp.departmentId,
        position: emp.position,
        hireDate: new Date('2023-04-01'),
        salary: emp.salary,
        status: emp.status || 'ACTIVE',
        isActive: true
      }
    })
  }

  // Create sample tasks
  const tasks = [
    {
      title: 'Update company website',
      description: 'Redesign the homepage with new branding',
      priority: 'HIGH',
      dueDate: new Date('2024-02-15'),
      creatorId: manager.id,
      assigneeId: employee.id
    },
    {
      title: 'Review quarterly reports',
      description: 'Analyze Q4 performance metrics',
      priority: 'MEDIUM',
      dueDate: new Date('2024-02-20'),
      creatorId: admin.id,
      assigneeId: manager.id
    },
    {
      title: 'Update employee handbook',
      description: 'Add new policies and procedures',
      priority: 'LOW',
      dueDate: new Date('2024-02-25'),
      creatorId: admin.id
    }
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: task
    })
  }

  // Create sample attendance records
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const employees = await prisma.employee.findMany()
  
  for (const emp of employees) {
    // Today's attendance
    await prisma.attendance.create({
      data: {
        userId: emp.userId,
        employeeId: emp.id,
        checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30),
        date: today,
        totalHours: 8.5,
        status: 'present'
      }
    })

    // Yesterday's attendance
    await prisma.attendance.create({
      data: {
        userId: emp.userId,
        employeeId: emp.id,
        checkIn: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 30),
        checkOut: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0),
        date: yesterday,
        totalHours: 8.5,
        status: 'present'
      }
    })
  }

  // Create sample notifications
  const allUsers = await prisma.user.findMany()
  
  const sampleNotifications = [
    {
      title: 'Welcome to the Dashboard!',
      message: 'Your account has been successfully set up. Start by checking in for today.',
      type: 'success',
      userId: admin.id
    },
    {
      title: 'New Task Assigned',
      message: 'You have been assigned a new task: "Update company website"',
      type: 'info',
      userId: employee.id
    },
    {
      title: 'Attendance Reminder',
      message: 'Don\'t forget to check out at the end of your workday.',
      type: 'warning',
      userId: manager.id
    },
    {
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 11 PM to 1 AM.',
      type: 'info',
      userId: admin.id
    },
    {
      title: 'Task Due Soon',
      message: 'Your task "Review quarterly reports" is due in 2 days.',
      type: 'warning',
      userId: manager.id
    }
  ]

  for (const notification of sampleNotifications) {
    await prisma.notification.create({
      data: notification
    })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
