/**
 * Example Utility Function Test
 * Test for utility functions
 */

import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'block')).toBe('base block')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'active')).toBe('base active')
  })

  it('handles empty strings', () => {
    expect(cn('base', '', 'active')).toBe('base active')
  })
})

