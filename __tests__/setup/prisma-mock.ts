/**
 * Prisma Mock for Testing
 * Use this to mock Prisma client in tests
 * 
 * Usage:
 * import { prismaMock } from '../setup/prisma-mock'
 * 
 * prismaMock.employee.findMany.mockResolvedValue([...])
 */

import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Note: This file should be imported in tests that need Prisma mocking
// The actual mock setup happens in jest.setup.js or individual test files

export type PrismaMock = DeepMockProxy<PrismaClient>

// Export mock factory function
export const createPrismaMock = () => mockDeep<PrismaClient>()

// For use in tests, create and export a mock instance
export const prismaMock = mockDeep<PrismaClient>()

// Reset function for use in beforeEach
export const resetPrismaMock = () => {
  mockReset(prismaMock)
}

