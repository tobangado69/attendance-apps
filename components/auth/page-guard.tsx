"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, ArrowLeft } from "lucide-react";

interface PageGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function PageGuard({
  allowedRoles,
  children,
  fallback,
  redirectTo = "/dashboard",
}: PageGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    const hasAccess =
      session.user.role && allowedRoles.includes(session.user.role);

    if (!hasAccess) {
      // Redirect to dashboard if user doesn't have access
      router.push(redirectTo);
    }
  }, [session, status, router, allowedRoles, redirectTo]);

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has required role
  const hasAccess =
    session?.user?.role && allowedRoles.includes(session.user.role);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Lock className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium mb-2">
                  You don&apos;t have permission to access this page.
                </p>
                <p className="text-red-600 text-sm mb-4">
                  This page is only available to {allowedRoles.join(" and ")}{" "}
                  users.
                </p>
                {session?.user?.role && (
                  <p className="text-red-500 text-xs mb-4">
                    Your current role: {session.user.role}
                  </p>
                )}
                <Button
                  onClick={() => router.push(redirectTo)}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
