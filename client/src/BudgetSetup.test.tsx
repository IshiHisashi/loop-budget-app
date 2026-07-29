import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetSetup from './BudgetSetup.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/categories') && method === 'GET') {
      return jsonResponse([
        { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.endsWith('/api/budgets') && method === 'GET') {
      return jsonResponse([
        { _id: 'b1', category: 'cat1', amount: 300, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.endsWith('/api/budgets/cat2') && method === 'PUT') {
      const body = JSON.parse(init!.body as string) as { amount: number }
      return jsonResponse({
        _id: 'b2',
        category: 'cat2',
        amount: body.amount,
        createdAt: '',
        updatedAt: '',
      })
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BudgetSetup', () => {
  it('renders every category with its current budget amount, blank if unset', async () => {
    render(<BudgetSetup />)

    const foodInput = await screen.findByLabelText('Food budget amount')
    const rentInput = await screen.findByLabelText('Rent budget amount')

    expect(foodInput).toHaveValue(300)
    expect(rentInput).toHaveValue(null)
  })

  it('saves an edited amount via PUT on blur', async () => {
    render(<BudgetSetup />)

    const rentInput = await screen.findByLabelText('Rent budget amount')
    fireEvent.change(rentInput, { target: { value: '1200' } })
    fireEvent.blur(rentInput)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/budgets/cat2'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ amount: 1200 }),
        })
      )
    })
  })
})
