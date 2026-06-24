import { render, screen } from '@testing-library/react'
import { SeverityBadge } from '@/components/SeverityBadge'

describe('SeverityBadge', () => {
  it.each(['error', 'warning', 'info'] as const)(
    'renders the %s badge with sr-only text',
    (severity) => {
      render(<SeverityBadge severity={severity} />)
      expect(screen.getByText(`${severity}:`)).toBeInTheDocument()
    },
  )

  it('applies the correct color class for error', () => {
    const { container } = render(<SeverityBadge severity="error" />)
    expect(container.firstChild).toHaveClass('text-red-400')
  })

  it('applies the correct color class for warning', () => {
    const { container } = render(<SeverityBadge severity="warning" />)
    expect(container.firstChild).toHaveClass('text-amber-400')
  })

  it('applies the correct color class for info', () => {
    const { container } = render(<SeverityBadge severity="info" />)
    expect(container.firstChild).toHaveClass('text-sky-400')
  })
})
