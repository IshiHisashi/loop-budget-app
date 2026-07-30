import { apiFetch } from './http.ts'

export interface Expense {
  _id: string
  date: string
  amount: number
  category: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseInput {
  date: string
  amount: number
  category: string
  note?: string
}

export function getExpenses(): Promise<Expense[]> {
  return apiFetch<Expense[]>('/api/expenses')
}

export function createExpense(data: ExpenseInput): Promise<Expense> {
  return apiFetch<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateExpense(id: string, data: Partial<ExpenseInput>): Promise<Expense> {
  return apiFetch<Expense>(`/api/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteExpense(id: string): Promise<void> {
  return apiFetch<void>(`/api/expenses/${id}`, { method: 'DELETE' })
}
