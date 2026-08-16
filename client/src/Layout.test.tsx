import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Layout from './Layout.tsx'

describe('Layout', () => {
  it('shows the Budgets tab by default, with the other two hidden', () => {
    render(<Layout onLogout={vi.fn()} />)

    expect(screen.getByTestId('tab-budgets')).not.toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-expenses')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-report')).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page')
  })

  it('switches to the Expenses tab and back without unmounting either panel', () => {
    render(<Layout onLogout={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }))

    expect(screen.getByTestId('tab-expenses')).not.toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-budgets')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-report')).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Budgets' })).not.toHaveAttribute('aria-current')

    // Both panels are still in the DOM (mounted), just one is hidden —
    // not conditionally rendered/unmounted.
    expect(screen.getByTestId('tab-budgets')).toBeInTheDocument()
    expect(screen.getByTestId('tab-expenses')).toBeInTheDocument()
  })

  it('switches to the Budget vs Actual tab', () => {
    render(<Layout onLogout={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Budget vs Actual' }))

    expect(screen.getByTestId('tab-report')).not.toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-budgets')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-expenses')).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Budget vs Actual' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('switches to the Settings tab', () => {
    render(<Layout onLogout={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(screen.getByTestId('tab-settings')).not.toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-budgets')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-expenses')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-report')).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })

  it('calls onLogout when the Log out button is clicked from the Settings tab', () => {
    const onLogout = vi.fn()
    render(<Layout onLogout={onLogout} />)

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(onLogout).toHaveBeenCalledOnce()
  })
})
