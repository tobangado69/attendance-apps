/**
 * PageLayout component for consistent page layout structure
 */

import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "full" | "xl" | "2xl" | "4xl" | "6xl" | "7xl";
}

const maxWidthClasses = {
  full: "max-w-full",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

/**
 * PageLayout component for consistent page structure
 * 
 * @param props - Page layout props
 * @param props.children - Page content
 * @param props.className - Optional additional CSS classes
 * @param props.maxWidth - Maximum width constraint (default: "full")
 * 
 * @example
 * ```tsx
 * <PageLayout maxWidth="7xl">
 *   <PageHeader title="Employees" />
 *   <EmployeeList />
 * </PageLayout>
 * ```
 */
export function PageLayout({ 
  children, 
  className = "", 
  maxWidth = "full" 
}: PageLayoutProps) {
  return (
    <div className={`space-y-6 w-full ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

