import { Expense } from './api/expenses.ts'

export interface ExpenseDateGroup {
  date: string
  expenses: Expense[]
}

export function groupExpensesByDate(expenses: Expense[]): ExpenseDateGroup[] {
  const groups: ExpenseDateGroup[] = []
  for (const expense of expenses) {
    const date = expense.date.slice(0, 10)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.date === date) {
      lastGroup.expenses.push(expense)
    } else {
      groups.push({ date, expenses: [expense] })
    }
  }
  return groups
}
