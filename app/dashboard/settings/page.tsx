"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageGuard } from "@/components/auth/page-guard";
import { Role } from "@prisma/client";
import {
  Building2,
  Clock,
  Users,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { DepartmentForm } from "@/components/settings/department-form";
import { DepartmentList } from "@/components/settings/department-list";
import { useCompanySettings, useDepartments, useManagers, useDepartmentForm } from "@/hooks/use-settings";

function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState("company");
  const [saving, setSaving] = useState(false);

  // Custom hooks for data management
  const {
    form: companyForm,
    setForm: setCompanyForm,
    loading: companyLoading,
    saveSettings,
  } = useCompanySettings();

  const {
    departments,
    loading: departmentsLoading,
    refetch: refetchDepartments,
  } = useDepartments();

  const { managers } = useManagers();

  const {
    showForm: showDepartmentForm,
    editingDepartment,
    form: departmentForm,
    setForm: setDepartmentForm,
    saving: departmentSaving,
    startEdit,
    startCreate,
    resetForm,
    submitForm,
    deleteDepartment,
  } = useDepartmentForm();

  const loading = companyLoading || departmentsLoading;

  const handleCompanySettingsSave = async () => {
    if (!companyForm) return;
    setSaving(true);
    await saveSettings(companyForm);
    setSaving(false);
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm(() => {
      refetchDepartments();
    });
  };

  const handleDepartmentEdit = (department: ReturnType<typeof useDepartments>['departments'][0]) => {
    startEdit(department);
  };

  const handleDepartmentDelete = async (departmentId: string) => {
    await deleteDepartment(departmentId, () => {
      refetchDepartments();
    });
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
          <CompanySettingsForm
            form={companyForm}
            setForm={setCompanyForm}
            onSave={handleCompanySettingsSave}
            saving={saving}
          />
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
                  onClick={startCreate}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible">
              {showDepartmentForm && (
                <DepartmentForm
                  form={departmentForm}
                  setForm={setDepartmentForm}
                  managers={managers}
                  editingDepartment={editingDepartment}
                  saving={departmentSaving}
                  onSubmit={handleDepartmentSubmit}
                  onCancel={resetForm}
                />
              )}

              <DepartmentList
                departments={departments}
                onEdit={handleDepartmentEdit}
                onDelete={handleDepartmentDelete}
                saving={departmentSaving}
              />
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
