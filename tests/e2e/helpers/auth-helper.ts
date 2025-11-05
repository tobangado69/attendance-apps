/**
 * Authentication Helper for E2E Tests
 * Provides utilities for authenticating users in tests
 */

import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
}

export const testUsers: Record<string, TestUser> = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'ADMIN',
  },
  manager: {
    email: 'manager@example.com',
    password: 'manager123',
    role: 'MANAGER',
  },
  employee: {
    email: 'employee@example.com',
    password: 'employee123',
    role: 'EMPLOYEE',
  },
};

/**
 * Authenticate a user in the test
 */
export async function authenticate(page: Page, userType: keyof typeof testUsers = 'employee') {
  const user = testUsers[userType];
  
  await page.goto('/auth/signin');
  
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });
  
  // Verify authentication
  await expect(page.getByText(user.email)).toBeVisible({ timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Import expect for helper
import { expect } from '@playwright/test';

