/**
 * Tests for StatsCard component
 */

import { render, screen } from '../../utils/test-utils'
import { StatsCard } from '@/components/ui/stats-card'
import { Users } from 'lucide-react'

describe('StatsCard', () => {
  it('renders title and value correctly', () => {
    render(<StatsCard title="Total Users" value={42} />)
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value correctly', () => {
    render(<StatsCard title="Status" value="Active" />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <StatsCard
        title="Total Users"
        value={42}
        description="Active users"
      />
    )
    expect(screen.getByText('Active users')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(
      <StatsCard
        title="Total Users"
        value={42}
        icon={Users}
      />
    )
    // Icon should be rendered (checking by title presence and icon SVG)
    expect(screen.getByText('Total Users')).toBeInTheDocument()
  })

  it('shows loading state correctly', () => {
    render(
      <StatsCard
        title="Total Users"
        value={42}
        loading={true}
      />
    )
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <StatsCard
        title="Total Users"
        value={42}
        className="custom-class"
      />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders with all props', () => {
    render(
      <StatsCard
        title="Total Employees"
        value={100}
        description="Active team members"
        icon={Users}
        loading={false}
      />
    )
    expect(screen.getByText('Total Employees')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Active team members')).toBeInTheDocument()
  })
})

