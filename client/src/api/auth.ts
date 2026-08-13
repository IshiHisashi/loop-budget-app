import { apiFetch } from './http.ts'

export function login(id: string, password: string): Promise<void> {
  return apiFetch<void>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ id, password }),
  })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' })
}

export function getSession(): Promise<void> {
  return apiFetch<void>('/api/auth/me')
}
