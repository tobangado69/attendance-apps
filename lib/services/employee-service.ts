/**
 * Employee Service Functions
 * Extracted from app/api/employees/route.ts
 * Following DRY principles and separation of concerns
 */

import { PrismaClient, Prisma, User, Employee } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

interface EmployeeCreateData {
  name: string;
  email: string;
  password?: string;
  role: string;
  employeeId: string;
  department?: string;
  position?: string;
  salary?: number;
  status?: string;
  manager?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

interface CreateEmployeeResult {
  user: User;
  employee: Employee;
}

/**
 * Resolve department ID from department identifier (ID or name)
 */
export async function resolveDepartmentId(
  tx: Prisma.TransactionClient,
  department: string | undefined
): Promise<string | null> {
  if (!department) return null;

  // Check if department is already an ID (cuid format)
  if (department.startsWith('cmf')) {
    return department;
  }

  // It's a department name, find the ID
  const dept = await tx.department.findFirst({
    where: { name: department },
  });

  if (!dept) {
    throw new Error(`Department '${department}' not found`);
  }

  return dept.id;
}

/**
 * Resolve manager employee ID from manager identifier (user ID or employee ID)
 */
export async function resolveManagerId(
  tx: Prisma.TransactionClient,
  manager: string | undefined
): Promise<string | null> {
  if (!manager || manager === 'no-manager') {
    return null;
  }

  // Manager could be either a user ID or employee ID
  // First try to find by user ID (most common case from form)
  let managerEmployee = await tx.employee.findFirst({
    where: { userId: manager },
  });

  // If not found by user ID, try as employee ID
  if (!managerEmployee && manager.startsWith('cmf')) {
    managerEmployee = await tx.employee.findUnique({
      where: { id: manager },
    });
  }

  if (!managerEmployee) {
    throw new Error(`Manager with ID '${manager}' not found`);
  }

  return managerEmployee.id;
}

/**
 * Check for existing user or employee records
 */
export async function checkExistingRecords(
  email: string,
  employeeId: string
): Promise<{ existingUser: boolean; existingEmployee: boolean }> {
  const [existingUser, existingEmployee] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.employee.findUnique({ where: { employeeId } }),
  ]);

  return {
    existingUser: !!existingUser,
    existingEmployee: !!existingEmployee,
  };
}

/**
 * Create user record
 */
export async function createUserRecord(
  tx: Prisma.TransactionClient,
  data: { 
    name: string; 
    email: string; 
    password?: string; 
    role: string;
    phone?: string;
    address?: string;
    bio?: string;
  }
) {
  return tx.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password ? await bcrypt.hash(data.password, 12) : null,
      role: data.role || 'EMPLOYEE',
      phone: data.phone || null,
      address: data.address || null,
      bio: data.bio || null,
    },
  });
}

/**
 * Create employee record
 */
export async function createEmployeeRecord(
  tx: Prisma.TransactionClient,
  data: {
    userId: string;
    employeeId: string;
    departmentId: string | null;
    managerId: string | null;
    position?: string;
    salary?: number;
  }
) {
  return tx.employee.create({
    data: {
      userId: data.userId,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      managerId: data.managerId,
      position: data.position,
      salary: data.salary ? parseFloat(data.salary.toString()) : null,
      isActive: true,
    },
  });
}

/**
 * Create employee with user in transaction
 */
export async function createEmployeeWithUser(
  prismaClient: PrismaClient,
  data: EmployeeCreateData
): Promise<CreateEmployeeResult> {
  return prismaClient.$transaction(async (tx) => {
    // Resolve department ID
    const departmentId = await resolveDepartmentId(tx, data.department);

    // Resolve manager ID
    const managerId = await resolveManagerId(tx, data.manager);

    // Create user
    const user = await createUserRecord(tx, {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'EMPLOYEE',
      phone: data.phone,
      address: data.address,
      bio: data.bio,
    });

    // Create employee
    const employee = await createEmployeeRecord(tx, {
      userId: user.id,
      employeeId: data.employeeId,
      departmentId,
      managerId,
      position: data.position,
      salary: data.salary,
    });

    return { user, employee };
  });
}

