/**
 * PageHeader component for consistent page headers across the application
 */

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader component for consistent page titles and descriptions
 * 
 * @param props - Page header props
 * @param props.title - Page title
 * @param props.description - Optional page description
 * @param props.actions - Optional action buttons or elements to display on the right
 * @param props.className - Optional additional CSS classes
 * 
 * @example
 * ```tsx
 * <PageHeader 
 *   title="Employees" 
 *   description="Manage your team members"
 *   actions={<Button>Add Employee</Button>}
 * />
 * ```
 */
export function PageHeader({ title, description, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={`${className} ${actions ? "flex items-center justify-between" : ""}`}>
      <div className="w-full">
        <h1 className="text-3xl font-bold text-gray-900 break-words">{title}</h1>
        {description && (
          <p className="text-gray-600 break-words mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 ml-4">{actions}</div>
      )}
    </div>
  );
}

