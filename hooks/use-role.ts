"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { UserRole, hasRole, hasAnyRole, canAccessFeature, getUserFeatures } from "@/lib/role-guards";

export function useRole() {
  const { data: session } = useSession();

  const user = useMemo(() => {
    if (!session?.user) return null;
    
    return {
      id: session.user.id!,
      name: session.user.name,
      email: session.user.email,
      role: (session.user as any).role as UserRole,
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
