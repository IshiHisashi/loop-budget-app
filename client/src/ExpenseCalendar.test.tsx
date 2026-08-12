import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExpenseCalendar from './ExpenseCalendar.tsx'
import { Expense } from './api/expenses.ts'

function expense(overrides: Partial<Expense>): Expense {
  return {
    _id: 'exp',
    date: '2026-01-05T00:00:00.000Z',
    amount: 10,
    category: 'cat1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('ExpenseCalendar', () => {
  it('renders one cell per day of the month, with the 1st under the correct weekday', () => {
    // 2026-01-01 is a Thursday.
    const { container } = render(
      <ExpenseCalendar month="2026-01" expenses={[]} selectedDay={null} onSelectDay={vi.fn()} />
    )

    const grid = container.querySelector('.grid') as HTMLElement
    const children = Array.from(grid.children)

    // 7 weekday headers + 4 leading blanks + 31 day cells.
    expect(children).toHaveLength(7 + 4 + 31)

    // The 5 cells right after the 7 headers should be the 4 leading
    // blanks followed by day 1.
    expect(children[7]).toHaveTextContent('')
    expect(children[8]).toHaveTextContent('')
    expect(children[9]).toHaveTextContent('')
    expect(children[10]).toHaveTextContent('')
    expect(children[11]).toHaveTextContent('1')
  })

  it("shows a day's total for a day with expenses, and just the day number for a day without", () => {
    const expenses = [
      expense({ _id: 'a', date: '2026-01-05T00:00:00.000Z', amount: 10 }),
      expense({ _id: 'b', date: '2026-01-05T00:00:00.000Z', amount: 15.5 }),
    ]

    render(
      <ExpenseCalendar
        month="2026-01"
        expenses={expenses}
        selectedDay={null}
        onSelectDay={vi.fn()}
      />
    )

    const dayFiveButton = screen.getByRole('button', { name: /5.*\$25\.50/s })
    expect(dayFiveButton).toBeInTheDocument()

    // Day 6 has no expenses: rendered as plain text, not a button.
    expect(screen.queryByRole('button', { name: '6' })).not.toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('calls onSelectDay with the day when clicking a day with expenses, and null when clicking it again', () => {
    const onSelectDay = vi.fn()
    const expenses = [expense({ date: '2026-01-05T00:00:00.000Z', amount: 10 })]

    const { rerender } = render(
      <ExpenseCalendar
        month="2026-01"
        expenses={expenses}
        selectedDay={null}
        onSelectDay={onSelectDay}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /5/ }))
    expect(onSelectDay).toHaveBeenCalledWith('2026-01-05')

    rerender(
      <ExpenseCalendar
        month="2026-01"
        expenses={expenses}
        selectedDay="2026-01-05"
        onSelectDay={onSelectDay}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /5/ }))
    expect(onSelectDay).toHaveBeenCalledWith(null)
  })
})
