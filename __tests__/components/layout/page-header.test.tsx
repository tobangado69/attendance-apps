/**
 * Tests for PageHeader component
 */

import { render, screen } from '../../utils/test-utils'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'

describe('PageHeader', () => {
  it('renders title correctly', () => {
    render(<PageHeader title="Test Page" />)
    expect(screen.getByText('Test Page')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <PageHeader
        title="Test Page"
        description="This is a test description"
      />
    )
    expect(screen.getByText('This is a test description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<PageHeader title="Test Page" />)
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <PageHeader
        title="Test Page"
        actions={<Button>Add New</Button>}
      />
    )
    expect(screen.getByRole('button', { name: /add new/i })).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <PageHeader title="Test Page" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders with title and description and actions', () => {
    render(
      <PageHeader
        title="Employees"
        description="Manage your team members"
        actions={<Button>Add Employee</Button>}
      />
    )
    expect(screen.getByText('Employees')).toBeInTheDocument()
    expect(screen.getByText('Manage your team members')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument()
  })
})

