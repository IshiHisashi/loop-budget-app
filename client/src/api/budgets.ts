import { apiFetch } from './http.ts'

export interface Budget {
  _id: string
  category: string
  amount: number
  createdAt: string
  updatedAt: string
}

export function getBudgets(): Promise<Budget[]> {
  return apiFetch<Budget[]>('/api/budgets')
}

export function setBudget(categoryId: string, amount: number): Promise<Budget> {
  return apiFetch<Budget>(`/api/budgets/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ amount }),
  })
}

export function deleteBudget(categoryId: string): Promise<void> {
  return apiFetch<void>(`/api/budgets/${categoryId}`, { method: 'DELETE' })
}
