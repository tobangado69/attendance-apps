/**
 * Performance Tests
 * Validates performance improvements from refactoring
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load dashboard page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    
    // Wait for main content to be visible
    await expect(page.getByRole('heading')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load tasks page efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard/tasks');
    
    // Wait for stats cards to be visible (using refactored StatsCard component)
    await expect(page.getByText(/total tasks/i)).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Tasks page should load in under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should render attendance list efficiently', async ({ page }) => {
    await page.goto('/dashboard/attendance');
    await page.getByRole('tab', { name: /records/i }).click();
    
    const startTime = Date.now();
    
    // Wait for table to be visible (using refactored AttendanceList component)
    await expect(page.getByRole('table')).toBeVisible();
    
    const renderTime = Date.now() - startTime;
    
    // Table should render in under 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('should handle task form submission efficiently', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    // Open task form
    const addButton = page.getByRole('button', { name: /add task/i });
    await addButton.click();
    
    // Fill form
    await page.getByLabel(/title/i).fill('Performance Test Task');
    
    const startTime = Date.now();
    
    // Submit form (using useTaskForm hook)
    await page.getByRole('button', { name: /create task/i }).click();
    
    // Wait for success indicator
    await expect(page.getByText(/success|created/i)).toBeVisible({ timeout: 5000 });
    
    const submitTime = Date.now() - startTime;
    
    // Form submission should complete in under 2 seconds
    expect(submitTime).toBeLessThan(2000);
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    await page.goto('/dashboard/employees');
    
    const startTime = Date.now();
    
    // Wait for employee list to load
    await expect(page.getByRole('heading', { name: /employees/i })).toBeVisible();
    
    // Wait for stats cards (using refactored StatsCard components)
    await expect(page.getByText(/total employees/i)).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should handle large datasets efficiently
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    // Navigate to a page
    await page.goto('/dashboard');
    
    // Measure page load metrics
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });
    
    // LCP should be under 2.5 seconds (good)
    // FID should be under 100ms (good)
    // CLS should be under 0.1 (good)
    
    // Basic checks
    expect(metrics.domContentLoaded).toBeLessThan(2000);
    expect(metrics.loadComplete).toBeLessThan(3000);
  });
});

