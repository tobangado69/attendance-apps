# E2E Tests

End-to-end tests for critical user flows and refactored components.

## Setup

Install Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests in headed mode
npx playwright test --headed
```

## Test Structure

- `auth.spec.ts` - Authentication flows
- `task-management.spec.ts` - Task management using refactored TaskForm
- `attendance.spec.ts` - Attendance management using refactored components
- `employee-management.spec.ts` - Employee management flows
- `refactored-components.spec.ts` - Verification of refactored components

## Authentication Setup

Currently, tests are skipped where authentication is required. To enable:

1. Create test user accounts
2. Set up authentication helpers
3. Use `test.beforeEach` to authenticate before tests

## Coverage

These tests verify:
- ✅ Critical user flows work end-to-end
- ✅ Refactored components render and function correctly
- ✅ Hooks (useTaskForm, useAttendanceList) work in real scenarios
- ✅ Error handling works correctly
- ✅ UI components (PageHeader, StatsCard) render properly

