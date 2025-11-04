/**
 * Mock Data Factory Functions
 * Use these to create consistent test data
 */

import { Role, TaskStatus, TaskPriority, EmployeeStatus } from '@prisma/client'
import type { User, Employee, Task, Attendance, Department } from '@prisma/client'

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  password: null,
  image: null,
  role: 'EMPLOYEE' as Role,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockAdmin = (overrides?: Partial<User>): User => 
  createMockUser({ role: 'ADMIN', ...overrides })

export const createMockManager = (overrides?: Partial<User>): User => 
  createMockUser({ role: 'MANAGER', ...overrides })

export const createMockEmployee = (overrides?: Partial<Employee>): Employee => ({
  id: 'emp-1',
  userId: 'user-1',
  employeeId: 'EMP001',
  departmentId: 'dept-1',
  managerId: null,
  position: 'Software Engineer',
  hireDate: new Date('2024-01-01'),
  salary: 50000,
  status: 'ACTIVE' as EmployeeStatus,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockDepartment = (overrides?: Partial<Department>): Department => ({
  id: 'dept-1',
  name: 'Engineering',
  description: 'Engineering Department',
  managerId: null,
  budget: 100000,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'PENDING' as TaskStatus,
  priority: 'MEDIUM' as TaskPriority,
  dueDate: null,
  assigneeId: 'user-1',
  creatorId: 'user-1',
  employeeId: 'emp-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockAttendance = (overrides?: Partial<Attendance>): Attendance => ({
  id: 'att-1',
  userId: 'user-1',
  employeeId: 'emp-1',
  checkIn: new Date('2024-01-01T09:00:00'),
  checkOut: new Date('2024-01-01T17:00:00'),
  date: new Date('2024-01-01'),
  totalHours: 8,
  status: 'present',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Helper to create arrays of mock data
export const createMockUsers = (count: number, overrides?: Partial<User>): User[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({ id: `user-${i + 1}`, email: `user${i + 1}@example.com`, ...overrides })
  )
}

export const createMockEmployees = (count: number, overrides?: Partial<Employee>): Employee[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockEmployee({ id: `emp-${i + 1}`, employeeId: `EMP${String(i + 1).padStart(3, '0')}`, ...overrides })
  )
}

export const createMockTasks = (count: number, overrides?: Partial<Task>): Task[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockTask({ id: `task-${i + 1}`, title: `Task ${i + 1}`, ...overrides })
  )
}

