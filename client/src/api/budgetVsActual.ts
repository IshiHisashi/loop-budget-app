import { apiFetch } from './http.ts'

export interface BudgetVsActualRow {
  category: string
  budgeted: number
  actual: number
}

export function getBudgetVsActual(month: string): Promise<BudgetVsActualRow[]> {
  return apiFetch<BudgetVsActualRow[]>(`/api/budget-vs-actual?month=${month}`)
}
