import { z } from 'zod'
import { Role, TaskStatus, TaskPriority, EmployeeStatus } from '@prisma/client'

// User validation schemas
export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters'),
  role: z.nativeEnum(Role),
})

export const userUpdateSchema = userSchema.partial().omit({ password: true })

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Employee validation schemas
export const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters'),
  role: z.nativeEnum(Role),
  employeeId: z.string().min(1, 'Employee ID is required').max(20, 'Employee ID must be less than 20 characters'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required').max(50, 'Position must be less than 50 characters'),
  salary: z.number().positive('Salary must be positive').optional(),
  status: z.nativeEnum(EmployeeStatus).default('ACTIVE'),
  hireDate: z.string().optional(),
  manager: z.string().optional(),
})

export const employeeUpdateSchema = employeeSchema.partial().omit({ password: true })

// Task validation schemas
export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
})

export const taskUpdateSchema = taskSchema.partial()

// Attendance validation schemas
export const attendanceSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

export const checkInSchema = z.object({
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

export const checkOutSchema = z.object({
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

// Department validation schemas
export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(50, 'Department name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
})

// Notification validation schemas
export const notificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be less than 500 characters'),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
})

// API query validation schemas
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1, 'Page must be at least 1')).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100')).default(10),
})

export const searchSchema = z.object({
  search: z.string().max(100, 'Search term must be less than 100 characters').optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
})

// Report validation schemas
export const reportSchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Utility functions for validation
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { success: true; data: T } | { success: false; errors: string[] } {
  const data = Object.fromEntries(searchParams.entries())
  return validateData(schema, data)
}

// Type exports for use in components
export type UserFormData = z.infer<typeof userSchema>
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type EmployeeFormData = z.infer<typeof employeeSchema>
export type EmployeeUpdateFormData = z.infer<typeof employeeUpdateSchema>
export type TaskFormData = z.infer<typeof taskSchema>
export type TaskUpdateFormData = z.infer<typeof taskUpdateSchema>
export type AttendanceFormData = z.infer<typeof attendanceSchema>
export type CheckInFormData = z.infer<typeof checkInSchema>
export type CheckOutFormData = z.infer<typeof checkOutSchema>
export type DepartmentFormData = z.infer<typeof departmentSchema>
export type NotificationFormData = z.infer<typeof notificationSchema>
export type PaginationQuery = z.infer<typeof paginationSchema>
export type SearchQuery = z.infer<typeof searchSchema>
export type ReportQuery = z.infer<typeof reportSchema>
