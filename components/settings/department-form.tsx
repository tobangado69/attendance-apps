/**
 * Department Form Component
 * Extracted from app/dashboard/settings/page.tsx
 * Following DRY principles and component composition
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormTextareaField,
  FormNumberField,
  FormSelectField,
} from "@/components/forms/form-fields";
import {
  SelectItem,
} from "@/components/ui/select";
import { Manager } from "@/hooks/use-settings";

interface DepartmentFormProps {
  form: {
    name: string;
    description: string;
    budget: string;
    managerId: string;
  };
  setForm: (form: {
    name: string;
    description: string;
    budget: string;
    managerId: string;
  }) => void;
  managers: Manager[];
  editingDepartment: { id: string } | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function DepartmentForm({
  form,
  setForm,
  managers,
  editingDepartment,
  saving,
  onSubmit,
  onCancel,
}: DepartmentFormProps) {
  return (
    <Card id="department-form-card" className="mb-6">
      <CardHeader>
        <CardTitle>
          {editingDepartment ? "Edit Department" : "Add New Department"}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-visible">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Department Name"
              id="deptName"
              value={form.name}
              onChange={(value) =>
                setForm({
                  ...form,
                  name: value,
                })
              }
              required
              placeholder="Enter department name"
            />
            <FormSelectField
              label="Manager"
              id="deptManager"
              value={form.managerId || "no-manager"}
              onChange={(value) =>
                setForm({
                  ...form,
                  managerId: value === "no-manager" ? "" : value,
                })
              }
              placeholder="Select manager"
              key={`manager-select-${editingDepartment?.id || "new"}-${form.managerId}`}
            >
              <SelectItem value="no-manager">No Manager</SelectItem>
              {managers
                .filter(
                  (manager) =>
                    manager && manager.id && manager.name
                )
                .map((manager, index) => (
                  <SelectItem
                    key={manager.id || `manager-${index}`}
                    value={manager.id}
                  >
                    {manager.name}{" "}
                    {manager.position && `(${manager.position})`}{" "}
                    - {manager.role}
                  </SelectItem>
                ))}
            </FormSelectField>
          </div>

          <FormTextareaField
            label="Description"
            id="deptDescription"
            value={form.description}
            onChange={(value) =>
              setForm({
                ...form,
                description: value,
              })
            }
            placeholder="Enter department description"
            rows={3}
          />

          <FormNumberField
            label="Budget"
            id="deptBudget"
            value={form.budget}
            onChange={(value) =>
              setForm({
                ...form,
                budget: String(value),
              })
            }
            placeholder="Enter budget amount"
            min={0}
            step={0.01}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingDepartment
                ? "Update"
                : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

