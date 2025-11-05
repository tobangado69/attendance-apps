/**
 * E2E Tests for Task Management
 * Tests critical task management flows using refactored components
 */

import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication setup
    // For now, we'll skip tests that require authentication
    test.skip();
  });

  test('should display task list page', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Check for page header
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible();
    
    // Check for stats cards
    await expect(page.getByText(/total tasks/i)).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
    await expect(page.getByText(/in progress/i)).toBeVisible();
    await expect(page.getByText(/completed/i)).toBeVisible();
  });

  test('should create new task using TaskForm', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Click add task button
    const addButton = page.getByRole('button', { name: /add task/i });
    await addButton.click();
    
    // Fill in task form
    await page.getByLabel(/title/i).fill('E2E Test Task');
    await page.getByLabel(/description/i).fill('Testing task creation');
    await page.getByLabel(/priority/i).selectOption('HIGH');
    await page.getByRole('button', { name: /create task/i }).click();
    
    // Verify task was created
    await expect(page.getByText('E2E Test Task')).toBeVisible({ timeout: 5000 });
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Click filter button
    const filterButton = page.getByRole('button', { name: /filter/i });
    await filterButton.click();
    
    // Select status filter
    await page.getByLabel(/status/i).selectOption('PENDING');
    
    // Verify filtered results
    // (Implementation depends on actual filter UI)
  });

  test('should update task status', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Find a task and click to view details
    const firstTask = page.locator('[data-testid="task-item"]').first();
    await firstTask.click();
    
    // Change status
    await page.getByLabel(/status/i).selectOption('IN_PROGRESS');
    await page.getByRole('button', { name: /save|update/i }).click();
    
    // Verify status was updated
    await expect(page.getByText(/in progress/i)).toBeVisible();
  });
});

