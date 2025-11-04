import { Role, TaskStatus, TaskPriority } from '@prisma/client'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  employeeId?: string
}

export interface Employee {
  id: string
  userId: string
  employeeId: string
  department?: string
  position?: string
  hireDate?: Date
  salary?: number
  isActive: boolean
  user: User
}

export interface Attendance {
  id: string
  userId: string
  employeeId?: string
  checkIn?: Date
  checkOut?: Date
  date: Date
  totalHours?: number
  status: string
  notes?: string
  user: User
  employee?: Employee
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: Date
  assigneeId?: string
  creatorId: string
  employeeId?: string
  assignee?: User
  creator: User
  employee?: Employee
}

export interface DashboardStats {
  totalEmployees: number
  presentToday: number
  pendingTasks: number
  completedTasks: number
  attendanceRate: number
}

export interface AttendanceReport {
  date: string
  present: number
  absent: number
  late: number
  totalHours: number
}
