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

export function createCategory(name: string): Promise<Category> {
  return apiFetch<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteCategory(id: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/categories/${id}`, { method: 'DELETE' })
}
