import { apiFetch } from './http.ts'

export interface Category {
  _id: string
  name: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories')
}
