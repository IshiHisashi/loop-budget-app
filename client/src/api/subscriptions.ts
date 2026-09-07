import { apiFetch } from './http.ts'

export interface Subscription {
  _id: string
  name?: string
  amount: number
  category: string
  dayOfMonth: number
  startMonth: string
  endMonth?: string
  createdAt: string
  updatedAt: string
}

export interface SubscriptionInput {
  name?: string
  amount: number
  category: string
  dayOfMonth: number
  startMonth: string
  endMonth?: string
}

export function getSubscriptions(): Promise<Subscription[]> {
  return apiFetch<Subscription[]>('/api/subscriptions')
}

export function createSubscription(data: SubscriptionInput): Promise<Subscription> {
  return apiFetch<Subscription>('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteSubscription(id: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/subscriptions/${id}`, { method: 'DELETE' })
}
