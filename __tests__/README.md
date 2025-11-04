# Testing Guide

This directory contains all tests for the Employee Dashboard application.

## Test Structure

```
__tests__/
├── components/          # Component unit tests
├── api/                 # API route tests
├── lib/                 # Utility function tests
├── utils/               # Test utilities and helpers
│   ├── test-utils.tsx   # Custom render function with providers
│   └── mock-data.ts     # Mock data factories
└── setup/               # Test setup files
    └── prisma-mock.ts   # Prisma client mock
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Writing Tests

### Component Tests

```typescript
import { render, screen } from '../utils/test-utils'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### API Route Tests

```typescript
import { NextRequest } from 'next/server'

describe('GET /api/employees', () => {
  it('returns employees', async () => {
    const { GET } = await import('@/app/api/employees/route')
    const request = new NextRequest('http://localhost:3000/api/employees')
    const response = await GET(request)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

### Using Mock Data

```typescript
import { createMockUser, createMockEmployee } from '../utils/mock-data'

const user = createMockUser({ name: 'John Doe' })
const employee = createMockEmployee({ userId: user.id })
```

### Testing with Authentication

```typescript
import { render, screen } from '../utils/test-utils'
import { createMockAdmin } from '../utils/mock-data'

const adminSession = {
  user: createMockAdmin(),
  expires: '2024-12-31',
}

render(<MyComponent />, { session: adminSession })
```

## Best Practices

1. **Test User Behavior**: Test what users see and do, not implementation details
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Keep Tests Focused**: Each test should verify one thing
4. **Use Descriptive Names**: Test names should describe what is being tested
5. **Mock External Dependencies**: Mock API calls, database, and external services
6. **Test Edge Cases**: Test error states, empty states, and boundary conditions

## Coverage Goals

- **Unit Tests**: >80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user flows covered

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

