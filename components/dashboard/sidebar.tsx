"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  BarChart3,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    feature: "view-dashboard",
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: User,
    feature: "view-own-profile",
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: Users,
    feature: "manage-employees",
  },
  {
    name: "Attendance",
    href: "/dashboard/attendance",
    icon: Clock,
    feature: "view-own-attendance",
  },
  {
    name: "Tasks",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    feature: "view-own-tasks",
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    feature: "view-reports",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    feature: "system-settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (userRole === "EMPLOYEE") {
      // Employees can access Dashboard, Profile, Attendance, and Tasks
      return ["Dashboard", "Profile", "Attendance", "Tasks"].includes(
        item.name
      );
    }
    // Admin and Manager can access all items
    return true;
  });

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Employee Dashboard</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <RoleGuard key={item.name} feature={item.feature}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-white"
                  )}
                />
                {item.name}
              </Link>
            </RoleGuard>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={() => signOut()}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
