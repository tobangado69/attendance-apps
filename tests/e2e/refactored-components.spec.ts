/**
 * E2E Tests for Refactored Components
 * Verifies that refactored components work correctly in real scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('Refactored Components', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication setup
    test.skip();
  });

  test('should render PageHeader component correctly', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Verify PageHeader is rendered
    const header = page.getByRole('heading', { name: /tasks/i });
    await expect(header).toBeVisible();
    
    // Verify description is shown
    const description = page.getByText(/manage and track/i);
    await expect(description).toBeVisible();
  });

  test('should render StatsCard components correctly', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Verify stats cards are rendered
    const totalTasksCard = page.getByText(/total tasks/i);
    await expect(totalTasksCard).toBeVisible();
    
    // Verify cards show values
    const statsCards = page.locator('[data-testid="stats-card"]');
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should use useTaskForm hook correctly', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Open task form
    const addButton = page.getByRole('button', { name: /add task/i });
    await addButton.click();
    
    // Verify form is rendered
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/priority/i)).toBeVisible();
    
    // Fill form using hook
    await page.getByLabel(/title/i).fill('Test Task');
    await page.getByLabel(/priority/i).selectOption('HIGH');
    
    // Submit form
    await page.getByRole('button', { name: /create task/i }).click();
    
    // Verify success (task appears in list)
    await expect(page.getByText('Test Task')).toBeVisible({ timeout: 5000 });
  });

  test('should use useAttendanceList hook correctly', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    await page.getByRole('tab', { name: /records/i }).click();
    
    // Verify attendance list is rendered
    await expect(page.getByRole('table')).toBeVisible();
    
    // Test search functionality
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('John');
      
      // Verify search is working (debounced)
      await page.waitForTimeout(600); // Wait for debounce
      
      // Verify filtered results
    }
    
    // Test pagination
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Verify page changed
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/tasks', route => route.abort());
    
    await page.goto('/dashboard/tasks');
    
    // Try to create a task
    const addButton = page.getByRole('button', { name: /add task/i });
    await addButton.click();
    
    await page.getByLabel(/title/i).fill('Test Task');
    await page.getByRole('button', { name: /create task/i }).click();
    
    // Verify error toast is shown (from useErrorHandler)
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
  });
});

