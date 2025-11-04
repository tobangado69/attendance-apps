"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  UserRole,
  hasRole,
  hasAnyRole,
  canAccessFeature,
} from "@/lib/role-guards";

interface WithRoleGuardOptions {
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  feature?: string;
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithRoleGuardOptions = {}
) {
  const {
    requiredRole,
    requiredRoles,
    feature,
    requireAll = false,
    redirectTo = "/dashboard",
    fallback = (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    ),
  } = options;

  return function RoleGuardedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === "loading") return;

      if (!session?.user) {
        router.push("/auth/signin");
        return;
      }

      const user = {
        id: session.user.id!,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as { role: UserRole }).role,
      };

      let hasAccess = false;

      // Check by feature
      if (feature) {
        hasAccess = canAccessFeature(user, feature);
      }
      // Check by single role
      else if (requiredRole) {
        hasAccess = hasRole(user, requiredRole);
      }
      // Check by multiple roles
      else if (requiredRoles) {
        hasAccess = requireAll
          ? requiredRoles.every((role) => hasRole(user, role))
          : hasAnyRole(user, requiredRoles);
      }

      if (!hasAccess) {
        router.push(redirectTo);
      }
    }, [session, status, router]);

    if (status === "loading") {
      return <>{fallback}</>;
    }

    if (!session?.user) {
      return <>{fallback}</>;
    }

    const user = {
      id: session.user.id!,
      name: session.user.name,
      email: session.user.email,
      role: (session.user as { role: UserRole }).role,
    };

    let hasAccess = false;

    // Check by feature
    if (feature) {
      hasAccess = canAccessFeature(user, feature);
    }
    // Check by single role
    else if (requiredRole) {
      hasAccess = hasRole(user, requiredRole);
    }
    // Check by multiple roles
    else if (requiredRoles) {
      hasAccess = requireAll
        ? requiredRoles.every((role) => hasRole(user, role))
        : hasAnyRole(user, requiredRoles);
    }

    if (!hasAccess) {
      return <>{fallback}</>;
    }

    return <WrappedComponent {...props} />;
  };
}

// Convenience HOCs for common use cases
export function withAdminGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withRoleGuard(WrappedComponent, { requiredRole: "ADMIN" });
}

export function withManagerOrAdminGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withRoleGuard(WrappedComponent, {
    requiredRoles: ["ADMIN", "MANAGER"],
  });
}

export function withEmployeeGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withRoleGuard(WrappedComponent, { requiredRole: "EMPLOYEE" });
}

export function withFeatureGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string
) {
  return withRoleGuard(WrappedComponent, { feature });
}
