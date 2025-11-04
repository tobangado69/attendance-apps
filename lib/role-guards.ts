import { Role } from '@prisma/client'

export type UserRole = Role

export interface User {
  id: string
  name?: string | null
  email?: string | null
  role: UserRole
}

export const ROLES = {
  ADMIN: 'ADMIN' as const,
  MANAGER: 'MANAGER' as const,
  EMPLOYEE: 'EMPLOYEE' as const,
} as const

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 2,
  [ROLES.EMPLOYEE]: 1,
} as const

/**
 * Check if user has required role or higher
 */
export function hasRole(user: User | null, requiredRole: UserRole): boolean {
  if (!user) return false
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false
  return requiredRoles.includes(user.role)
}

/**
 * Check if user has all of the required roles (useful for complex permissions)
 */
export function hasAllRoles(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false
  return requiredRoles.every(role => user.role === role)
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, ROLES.ADMIN)
}

/**
 * Check if user is manager or admin
 */
export function isManagerOrAdmin(user: User | null): boolean {
  return hasAnyRole(user, [ROLES.ADMIN, ROLES.MANAGER])
}

/**
 * Check if user is employee only
 */
export function isEmployee(user: User | null): boolean {
  return hasRole(user, ROLES.EMPLOYEE) && !hasRole(user, ROLES.MANAGER)
}

/**
 * Get user's role level (higher number = more permissions)
 */
export function getRoleLevel(user: User | null): number {
  if (!user) return 0
  return ROLE_HIERARCHY[user.role]
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(user: User | null, feature: string): boolean {
  if (!user) return false

  const featurePermissions: Record<string, UserRole[]> = {
    'view-dashboard': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    'manage-employees': [ROLES.ADMIN, ROLES.MANAGER],
    'create-tasks': [ROLES.ADMIN, ROLES.MANAGER],
    'assign-tasks': [ROLES.ADMIN, ROLES.MANAGER],
    'view-reports': [ROLES.ADMIN, ROLES.MANAGER],
    'manage-attendance': [ROLES.ADMIN, ROLES.MANAGER],
    'view-own-attendance': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    'check-in-out': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    'view-own-tasks': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    'update-task-status': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    'delete-employees': [ROLES.ADMIN],
    'system-settings': [ROLES.ADMIN],
    'view-all-notifications': [ROLES.ADMIN, ROLES.MANAGER],
  }

  const requiredRoles = featurePermissions[feature]
  if (!requiredRoles) return false

  return hasAnyRole(user, requiredRoles)
}

/**
 * Get all features user can access
 */
export function getUserFeatures(user: User | null): string[] {
  if (!user) return []

  const allFeatures = [
    'view-dashboard',
    'manage-employees',
    'create-tasks',
    'assign-tasks',
    'view-reports',
    'manage-attendance',
    'view-own-attendance',
    'check-in-out',
    'view-own-tasks',
    'update-task-status',
    'delete-employees',
    'system-settings',
    'view-all-notifications',
  ]

  return allFeatures.filter(feature => canAccessFeature(user, feature))
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(
  user: User | null,
  action: string,
  resource: string,
  resourceOwnerId?: string
): boolean {
  if (!user) return false

  // Admin can do everything
  if (isAdmin(user)) return true

  // Manager can manage employees and tasks
  if (isManagerOrAdmin(user)) {
    if (resource === 'employee' && ['create', 'read', 'update'].includes(action)) {
      return true
    }
    if (resource === 'task' && ['create', 'read', 'update', 'assign'].includes(action)) {
      return true
    }
    if (resource === 'attendance' && ['read', 'update'].includes(action)) {
      return true
    }
  }

  // Employee can only manage their own resources
  if (isEmployee(user)) {
    if (resourceOwnerId && user.id === resourceOwnerId) {
      if (resource === 'attendance' && ['read', 'create', 'update'].includes(action)) {
        return true
      }
      if (resource === 'task' && ['read', 'update'].includes(action)) {
        return true
      }
    }
  }

  return false
}
