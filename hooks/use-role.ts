/**
 * Role-Based Access Control Hook
 * Provides role checking and permission utilities for components
 * Following DRY principles and Next.js 15 best practices
 */

"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { UserRole, hasRole, hasAnyRole, canAccessFeature, getUserFeatures } from "@/lib/role-guards";

/**
 * Hook for role-based access control and permissions
 * Provides user role information and permission checking functions
 * 
 * @returns Object containing user role info and permission checking functions
 * @returns {Object|null} user - Current user object or null if not authenticated
 * @returns {boolean} isAdmin - Whether user is ADMIN
 * @returns {boolean} isManager - Whether user is MANAGER
 * @returns {boolean} isEmployee - Whether user is EMPLOYEE
 * @returns {boolean} isManagerOrAdmin - Whether user is MANAGER or ADMIN
 * @returns {Function} canAccess - Function to check feature access
 * @returns {Function} canPerform - Function to check action permissions on resources
 * @returns {string[]} features - Array of accessible feature names
 * @returns {Function} hasRole - Function to check specific role
 * @returns {Function} hasAnyRole - Function to check if user has any of the specified roles
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAdmin, canPerform, features } = useRole();
 *   
 *   if (isAdmin) {
 *     return <AdminPanel />;
 *   }
 *   
 *   const canEdit = canPerform('update', 'employee', employeeId);
 *   return canEdit ? <EditButton /> : null;
 * }
 * ```
 */
export function useRole() {
  const { data: session } = useSession();

  const user = useMemo(() => {
    if (!session?.user) return null;
    
    return {
      id: session.user.id!,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role as UserRole,
    };
  }, [session]);

  const isAdmin = useMemo(() => hasRole(user, "ADMIN"), [user]);
  const isManager = useMemo(() => hasRole(user, "MANAGER"), [user]);
  const isEmployee = useMemo(() => hasRole(user, "EMPLOYEE"), [user]);
  const isManagerOrAdmin = useMemo(() => hasAnyRole(user, ["ADMIN", "MANAGER"]), [user]);

  const canAccess = useMemo(() => (feature: string) => canAccessFeature(user, feature), [user]);
  const canPerform = useMemo(() => (action: string, resource: string, resourceOwnerId?: string) => {
    if (!user) return false;
    
    // Admin can do everything
    if (isAdmin) return true;
    
    // Manager can manage employees and tasks
    if (isManagerOrAdmin) {
      if (resource === 'employee' && ['create', 'read', 'update'].includes(action)) {
        return true;
      }
      if (resource === 'task' && ['create', 'read', 'update', 'assign'].includes(action)) {
        return true;
      }
      if (resource === 'attendance' && ['read', 'update'].includes(action)) {
        return true;
      }
    }
    
    // Employee can only manage their own resources
    if (isEmployee && resourceOwnerId && user.id === resourceOwnerId) {
      if (resource === 'attendance' && ['read', 'create', 'update'].includes(action)) {
        return true;
      }
      if (resource === 'task' && ['read', 'update'].includes(action)) {
        return true;
      }
    }
    
    return false;
  }, [user, isAdmin, isManagerOrAdmin, isEmployee]);

  const features = useMemo(() => getUserFeatures(user), [user]);

  return {
    user,
    isAdmin,
    isManager,
    isEmployee,
    isManagerOrAdmin,
    canAccess,
    canPerform,
    features,
    hasRole: (role: UserRole) => hasRole(user, role),
    hasAnyRole: (roles: UserRole[]) => hasAnyRole(user, roles),
  };
}
