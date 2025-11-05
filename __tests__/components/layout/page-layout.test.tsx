/**
 * Tests for PageLayout component
 */

import { render, screen } from '../../utils/test-utils'
import { PageLayout } from '@/components/layout/page-layout'

describe('PageLayout', () => {
  it('renders children correctly', () => {
    render(
      <PageLayout>
        <div>Test Content</div>
      </PageLayout>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies default maxWidth class', () => {
    const { container } = render(
      <PageLayout>
        <div>Test</div>
      </PageLayout>
    )
    expect(container.firstChild).toHaveClass('max-w-full')
  })

  it('applies custom maxWidth class', () => {
    const { container } = render(
      <PageLayout maxWidth="7xl">
        <div>Test</div>
      </PageLayout>
    )
    expect(container.firstChild).toHaveClass('max-w-7xl')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <PageLayout className="custom-class">
        <div>Test</div>
      </PageLayout>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders multiple children', () => {
    render(
      <PageLayout>
        <div>First</div>
        <div>Second</div>
        <div>Third</div>
      </PageLayout>
    )
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })

  it('has space-y-6 class for spacing', () => {
    const { container } = render(
      <PageLayout>
        <div>Test</div>
      </PageLayout>
    )
    expect(container.firstChild).toHaveClass('space-y-6')
  })
})

