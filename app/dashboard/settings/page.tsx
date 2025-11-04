"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageGuard } from "@/components/auth/page-guard";
import { Role } from "@prisma/client";
import {
  Building2,
  Clock,
  Users,
  Settings as SettingsIcon,
  Save,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/utils";

interface CompanySettings {
  id: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  lateArrivalGraceMinutes: number;
  overtimeThresholdHours: number;
  workingDaysPerWeek: number;
  timezone: string;
  dateFormat: string;
  currency: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  managerId?: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    employees: number;
  };
}

function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company Settings State
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [companyForm, setCompanyForm] = useState<Partial<CompanySettings>>({});

  // Department State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    budget: "",
    managerId: "",
  });

  // Managers for department assignment
  const [managers, setManagers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      position: string;
    }>
  >([]);

  useEffect(() => {
    fetchCompanySettings();
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/settings/company");
      const result = await response.json();

      if (result.success) {
        setCompanySettings(result.data);
        setCompanyForm(result.data);
      } else {
        showErrorToast("Failed to fetch company settings");
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
      showErrorToast("Error fetching company settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/settings/departments");
      const result = await response.json();

      if (result.success) {
        setDepartments(result.data);
      } else {
        showErrorToast("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      showErrorToast("Error fetching departments");
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/settings/managers");
      const result = await response.json();

      if (result.success && result.data) {
        setManagers(
          result.data.map(
            (user: {
              id: string;
              name: string;
              email: string;
              role?: string;
              employee?: { employeeId?: string; position?: string } | null;
            }) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || "",
              position: user.employee?.position || user.role || "",
            })
          )
        );
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const handleCompanySettingsSave = async () => {
    if (!companyForm) return;

    setSaving(true);
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(companyForm),
      });

      const result = await response.json();

      if (result.success) {
        setCompanySettings(result.data);
        showSuccessToast("Company settings updated successfully");
      } else {
        showErrorToast(result.message || "Failed to update company settings");
      }
    } catch (error) {
      console.error("Error updating company settings:", error);
      showErrorToast("Error updating company settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departmentForm.name.trim()) {
      showErrorToast("Department name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingDepartment
        ? `/api/settings/departments/${editingDepartment.id}`
        : "/api/settings/departments";

      const method = editingDepartment ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...departmentForm,
          budget: departmentForm.budget
            ? parseFloat(departmentForm.budget)
            : undefined,
          managerId:
            departmentForm.managerId === "no-manager"
              ? undefined
              : departmentForm.managerId || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast(
          editingDepartment
            ? "Department updated successfully"
            : "Department created successfully"
        );
        setShowDepartmentForm(false);
        setEditingDepartment(null);
        setDepartmentForm({
          name: "",
          description: "",
          budget: "",
          managerId: "",
        });
        fetchDepartments();
      } else {
        // Show detailed error message from API
        const errorMessage =
          result.error || result.message || "Failed to save department";
        showErrorToast(errorMessage);

        // Log validation errors if present
        if (result.details) {
          console.error("Validation errors:", result.details);
        }
      }
    } catch (error) {
      console.error("Error saving department:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error saving department";
      showErrorToast(`Network error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDepartmentEdit = (department: Department) => {
    console.log("Editing department:", department);
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      description: department.description || "",
      budget: department.budget?.toString() || "",
      managerId: department.managerId || "no-manager",
    });
    setShowDepartmentForm(true);
    // Scroll to form if needed
    setTimeout(() => {
      const formElement = document.getElementById("department-form-card");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleDepartmentDelete = async (departmentId: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const response = await fetch(
        `/api/settings/departments/${departmentId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        showSuccessToast("Department deleted successfully");
        fetchDepartments();
      } else {
        showErrorToast(result.message || "Failed to delete department");
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      showErrorToast("Error deleting department");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage company settings, departments, and system configuration
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyForm.companyName || ""}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        companyName: e.target.value,
                      })
                    }
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyForm.companyEmail || ""}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        companyEmail: e.target.value,
                      })
                    }
                    placeholder="company@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Textarea
                  id="companyAddress"
                  value={companyForm.companyAddress || ""}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      companyAddress: e.target.value,
                    })
                  }
                  placeholder="Enter company address"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    value={companyForm.companyPhone || ""}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        companyPhone: e.target.value,
                      })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={companyForm.timezone || "UTC"}
                    onValueChange={(value) =>
                      setCompanyForm({ ...companyForm, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Hours & Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">Start Time *</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={companyForm.workingHoursStart || "08:00"}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        workingHoursStart: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">End Time *</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={companyForm.workingHoursEnd || "17:00"}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        workingHoursEnd: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lateArrivalGraceMinutes">
                    Late Arrival Grace (minutes)
                  </Label>
                  <Input
                    id="lateArrivalGraceMinutes"
                    type="number"
                    min="0"
                    max="60"
                    value={companyForm.lateArrivalGraceMinutes || 2}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        lateArrivalGraceMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtimeThresholdHours">
                    Overtime Threshold (hours)
                  </Label>
                  <Input
                    id="overtimeThresholdHours"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={companyForm.overtimeThresholdHours || 8}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        overtimeThresholdHours: parseFloat(e.target.value) || 8,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingDaysPerWeek">
                    Working Days per Week
                  </Label>
                  <Input
                    id="workingDaysPerWeek"
                    type="number"
                    min="1"
                    max="7"
                    value={companyForm.workingDaysPerWeek || 5}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        workingDaysPerWeek: parseInt(e.target.value) || 5,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={companyForm.dateFormat || "MM/dd/yyyy"}
                    onValueChange={(value) =>
                      setCompanyForm({ ...companyForm, dateFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={companyForm.currency || "USD"}
                    onValueChange={(value) =>
                      setCompanyForm({ ...companyForm, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCompanySettingsSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Departments
                </CardTitle>
                <Button
                  onClick={() => {
                    setEditingDepartment(null);
                    setDepartmentForm({
                      name: "",
                      description: "",
                      budget: "",
                      managerId: "",
                    });
                    setShowDepartmentForm(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible">
              {showDepartmentForm && (
                <Card id="department-form-card" className="mb-6">
                  <CardHeader>
                    <CardTitle>
                      {editingDepartment
                        ? "Edit Department"
                        : "Add New Department"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-visible">
                    <form
                      onSubmit={handleDepartmentSubmit}
                      className="space-y-4"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="deptName">Department Name *</Label>
                          <Input
                            id="deptName"
                            value={departmentForm.name}
                            onChange={(e) =>
                              setDepartmentForm({
                                ...departmentForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="Enter department name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deptManager">Manager</Label>
                          <Select
                            key={`manager-select-${
                              editingDepartment?.id || "new"
                            }-${departmentForm.managerId}`}
                            value={departmentForm.managerId || "no-manager"}
                            onValueChange={(value) =>
                              setDepartmentForm({
                                ...departmentForm,
                                managerId: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no-manager">
                                No Manager
                              </SelectItem>
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
                                    {manager.position &&
                                      `(${manager.position})`}{" "}
                                    - {manager.role}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deptDescription">Description</Label>
                        <Textarea
                          id="deptDescription"
                          value={departmentForm.description}
                          onChange={(e) =>
                            setDepartmentForm({
                              ...departmentForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter department description"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deptBudget">Budget</Label>
                        <Input
                          id="deptBudget"
                          type="number"
                          min="0"
                          step="0.01"
                          value={departmentForm.budget}
                          onChange={(e) =>
                            setDepartmentForm({
                              ...departmentForm,
                              budget: e.target.value,
                            })
                          }
                          placeholder="Enter budget amount"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={saving}>
                          {saving
                            ? "Saving..."
                            : editingDepartment
                            ? "Update"
                            : "Create"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowDepartmentForm(false);
                            setEditingDepartment(null);
                            setDepartmentForm({
                              name: "",
                              description: "",
                              budget: "",
                              managerId: "",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4 overflow-visible">
                {departments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>
                      No departments found. Create your first department to get
                      started.
                    </p>
                  </div>
                ) : (
                  departments
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
                                  <span>
                                    Manager: {department.manager.name}
                                  </span>
                                )}
                                {department.budget && (
                                  <span>
                                    Budget: $
                                    {department.budget.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDepartmentEdit(department)}
                                disabled={saving}
                                title="Edit department"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDepartmentDelete(department.id)
                                }
                                disabled={
                                  department._count.employees > 0 || saving
                                }
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
                              <span>
                                Cannot delete department with employees
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>System configuration features coming soon...</p>
                <p className="text-sm mt-2">
                  Database health, API status, and more system settings will be
                  available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PageGuard allowedRoles={[Role.ADMIN]}>
      <SettingsPageContent />
    </PageGuard>
  );
}
