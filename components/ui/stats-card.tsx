/**
 * StatsCard component for displaying statistics in a card format
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  loading?: boolean;
  className?: string;
}

/**
 * StatsCard component for displaying statistics
 * 
 * @param props - Stats card props
 * @param props.title - Card title
 * @param props.value - Value to display (can be number or string)
 * @param props.description - Optional description text
 * @param props.icon - Optional Lucide icon component
 * @param props.iconClassName - Optional CSS classes for the icon
 * @param props.loading - Whether the card is in loading state
 * @param props.className - Optional additional CSS classes
 * 
 * @example
 * ```tsx
 * <StatsCard
 *   title="Total Employees"
 *   value={stats.totalEmployees}
 *   description="Active team members"
 *   icon={Users}
 *   loading={loading}
 * />
 * ```
 */
export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName = "text-muted-foreground",
  loading = false,
  className = "",
}: StatsCardProps) {
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium break-words pr-2">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className={`h-4 w-4 ${iconClassName} flex-shrink-0`} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? "..." : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground break-words mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

