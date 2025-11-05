/**
 * Company Settings Form Component
 * Extracted from app/dashboard/settings/page.tsx
 * Following DRY principles and component composition
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Building2, Clock, Save } from "lucide-react";
import { CompanySettings } from "@/hooks/use-settings";
import { BusinessRules } from "@/lib/constants/business-rules";

interface CompanySettingsFormProps {
  form: Partial<CompanySettings>;
  setForm: (form: Partial<CompanySettings>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function CompanySettingsForm({
  form,
  setForm,
  onSave,
  saving,
}: CompanySettingsFormProps) {
  return (
    <>
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
                value={form.companyName || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
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
                value={form.companyEmail || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
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
              value={form.companyAddress || ""}
              onChange={(e) =>
                setForm({
                  ...form,
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
                value={form.companyPhone || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    companyPhone: e.target.value,
                  })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone || BusinessRules.DEFAULT_TIMEZONE}
                onValueChange={(value) => setForm({ ...form, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
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
                value={
                  form.workingHoursStart ||
                  BusinessRules.DEFAULT_WORKING_HOURS_START
                }
                onChange={(e) =>
                  setForm({
                    ...form,
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
                value={
                  form.workingHoursEnd ||
                  BusinessRules.DEFAULT_WORKING_HOURS_END
                }
                onChange={(e) =>
                  setForm({
                    ...form,
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
                value={
                  form.lateArrivalGraceMinutes ||
                  BusinessRules.DEFAULT_LATE_ARRIVAL_GRACE_MINUTES
                }
                onChange={(e) =>
                  setForm({
                    ...form,
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
                value={
                  form.overtimeThresholdHours ||
                  BusinessRules.DEFAULT_OVERTIME_THRESHOLD_HOURS
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    overtimeThresholdHours:
                      parseFloat(e.target.value) ||
                      BusinessRules.DEFAULT_OVERTIME_THRESHOLD_HOURS,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workingDaysPerWeek">Working Days per Week</Label>
              <Input
                id="workingDaysPerWeek"
                type="number"
                min="1"
                max="7"
                value={
                  form.workingDaysPerWeek ||
                  BusinessRules.DEFAULT_WORKING_DAYS_PER_WEEK
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    workingDaysPerWeek:
                      parseInt(e.target.value) ||
                      BusinessRules.DEFAULT_WORKING_DAYS_PER_WEEK,
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={form.dateFormat || "MM/dd/yyyy"}
                onValueChange={(value) =>
                  setForm({ ...form, dateFormat: value })
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
                value={form.currency || BusinessRules.DEFAULT_CURRENCY}
                onValueChange={(value) => setForm({ ...form, currency: value })}
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
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
