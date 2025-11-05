/**
 * Department List Component
 * Extracted from app/dashboard/settings/page.tsx
 * Following DRY principles and component composition
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Trash2, AlertCircle } from "lucide-react";
import { Department } from "@/hooks/use-settings";

interface DepartmentListProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onDelete: (departmentId: string) => void;
  saving: boolean;
}

export function DepartmentList({
  departments,
  onEdit,
  onDelete,
  saving,
}: DepartmentListProps) {
  if (departments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>
          No departments found. Create your first department to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-visible">
      {departments
        .filter((dept) => dept && dept.id)
        .map((department, index) => (
          <Card
            key={department.id || `dept-${index}`}
            className="overflow-visible"
          >
            <CardContent className="p-4 overflow-visible">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {department.name}
                    </h3>
                    <Badge variant="secondary">
                      {department._count.employees} employees
                    </Badge>
                  </div>

                  {department.description && (
                    <p className="text-gray-600 text-sm mb-2">
                      {department.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {department.manager && (
                      <span>Manager: {department.manager.name}</span>
                    )}
                    {department.budget && (
                      <span>
                        Budget: ${department.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(department)}
                    disabled={saving}
                    title="Edit department"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(department.id)}
                    disabled={department._count.employees > 0 || saving}
                    title={
                      department._count.employees > 0
                        ? "Cannot delete department with employees"
                        : "Delete department"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>

              {department._count.employees > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Cannot delete department with employees</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

