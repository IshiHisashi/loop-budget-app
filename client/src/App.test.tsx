import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Loop Budget' })).toBeInTheDocument()
  })

  it('shows the Budgets tab by default, with the other two hidden', () => {
    render(<App />)

    expect(screen.getByTestId('tab-budgets')).not.toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-expenses')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-report')).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page')
  })

  it('switches to the Expenses tab and back without unmounting either panel', () => {
    render(<App />)

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
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Budget vs Actual' }))

    expect(screen.getByTestId('tab-report')).not.toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-budgets')).toHaveAttribute('hidden')
    expect(screen.getByTestId('tab-expenses')).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Budget vs Actual' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})
