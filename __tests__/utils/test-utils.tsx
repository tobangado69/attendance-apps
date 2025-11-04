/**
 * Test Utilities for React Testing Library
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { Role } from '@prisma/client'

interface AllTheProvidersProps {
  children: React.ReactNode
  session?: {
    user: {
      id: string
      name: string
      email: string
      role: Role
    }
    expires: string
  }
}

// Custom render function that includes providers
const AllTheProviders = ({ 
  children, 
  session 
}: AllTheProvidersProps) => {
  const mockSession = session || {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'EMPLOYEE' as Role,
    },
    expires: '2024-12-31',
  }

  return (
    <SessionProvider session={mockSession}>
      {children}
    </SessionProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: AllTheProvidersProps['session']
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { session, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override render method
export { customRender as render }

