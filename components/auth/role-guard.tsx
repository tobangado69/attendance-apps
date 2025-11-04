"use client";

import { useSession } from "next-auth/react";
import { ReactNode } from "react";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock } from "lucide-react";

interface RoleGuardProps {
  allowedRoles?: Role[];
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  feature?: string; // For feature-based access control
}

export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  showAccessDenied = true,
  feature,
}: RoleGuardProps) {
  const { data: session, status } = useSession();

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no access control is specified, allow access
  if (!allowedRoles && !feature) {
    return <>{children}</>;
  }

  // Check if user has required role
  let hasAccess = false;

  if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = Boolean(
      session?.user?.role && allowedRoles.includes(session.user.role)
    );
  } else if (feature) {
    // For now, allow all features - this can be enhanced later with proper feature-based access control
    hasAccess = true;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Lock className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  You don&apos;t have permission to access this feature.
                </p>
                <p className="text-red-600 text-sm mt-1">
                  {allowedRoles && allowedRoles.length > 0
                    ? `This feature is only available to ${allowedRoles.join(
                        " and "
                      )} users.`
                    : "You don&apos;t have permission to access this feature."}
                </p>
                {session?.user?.role && (
                  <p className="text-red-500 text-xs mt-2">
                    Your current role: {session.user.role}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return <>{children}</>;
}
