/**
 * E2E Tests for Attendance Management
 * Tests critical attendance flows using refactored components
 */

import { test, expect } from '@playwright/test';

test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication setup
    test.skip();
  });

  test('should display attendance page', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    
    // Check for page header
    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible();
    
    // Check for tabs
    await expect(page.getByRole('tab', { name: /check in/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /records/i })).toBeVisible();
  });

  test('should check in employee', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    
    // Navigate to check-in tab
    await page.getByRole('tab', { name: /check in/i }).click();
    
    // Click check in button
    const checkInButton = page.getByRole('button', { name: /check in/i });
    await checkInButton.click();
    
    // Verify success message
    await expect(page.getByText(/checked in|success/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display attendance list', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    
    // Navigate to records tab
    await page.getByRole('tab', { name: /records/i }).click();
    
    // Check for attendance list table
    await expect(page.getByRole('table')).toBeVisible();
    
    // Check for table headers
    await expect(page.getByRole('columnheader', { name: /employee/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /check in/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('should filter attendance records', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    await page.getByRole('tab', { name: /records/i }).click();
    
    // Open filters
    const filterButton = page.getByRole('button', { name: /filter/i });
    await filterButton.click();
    
    // Apply date filter
    // (Implementation depends on actual filter UI)
    
    // Verify filtered results
  });

  test('should export attendance report', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    
    // Navigate to reports tab (admin only)
    const reportsTab = page.getByRole('tab', { name: /reports/i });
    if (await reportsTab.isVisible()) {
      await reportsTab.click();
      
      // Click export button
      const exportButton = page.getByRole('button', { name: /export|download/i });
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.xlsx');
    } else {
      test.skip();
    }
  });
});

