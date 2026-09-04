import { describe, expect, it } from 'vitest'
import { Expense } from './api/expenses.ts'
import { groupExpensesByDate } from './groupExpensesByDate.ts'

function expense(overrides: Partial<Expense> & { _id: string; date: string }): Expense {
  return {
    amount: 1,
    category: 'cat1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('groupExpensesByDate', () => {
  it('returns an empty array for an empty list', () => {
    expect(groupExpensesByDate([])).toEqual([])
  })

  it('puts a single expense into its own group', () => {
    const exp = expense({ _id: 'a', date: '2026-01-20T00:00:00.000Z' })
    expect(groupExpensesByDate([exp])).toEqual([{ date: '2026-01-20', expenses: [exp] }])
  })

  it('groups consecutive same-date expenses together, preserving their order', () => {
    const first = expense({ _id: 'a', date: '2026-01-20T00:00:00.000Z' })
    const second = expense({ _id: 'b', date: '2026-01-20T00:00:00.000Z' })
    expect(groupExpensesByDate([first, second])).toEqual([
      { date: '2026-01-20', expenses: [first, second] },
    ])
  })

  it('starts a new group per date, in input order, without re-sorting', () => {
    const jan20 = expense({ _id: 'a', date: '2026-01-20T00:00:00.000Z' })
    const jan10 = expense({ _id: 'b', date: '2026-01-10T00:00:00.000Z' })
    expect(groupExpensesByDate([jan20, jan10])).toEqual([
      { date: '2026-01-20', expenses: [jan20] },
      { date: '2026-01-10', expenses: [jan10] },
    ])
  })
})
