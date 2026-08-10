import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetSetup from './BudgetSetup.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch(options: { failPut?: boolean } = {}) {
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
      if (options.failPut) {
        return jsonResponse({ error: 'server exploded' }, 500)
      }
      const body = JSON.parse(init!.body as string) as { amount: number }
      return jsonResponse({
        _id: 'b2',
        category: 'cat2',
        amount: body.amount,
        createdAt: '',
        updatedAt: '',
      })
    }

    if (url.endsWith('/api/budgets/cat1') && method === 'DELETE') {
      return jsonResponse({ deleted: true })
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  })
}

function rowFor(labelText: string) {
  return screen.getByLabelText(labelText).closest('li') as HTMLElement
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

  it('Clear is disabled for a category with no existing budget entry', async () => {
    render(<BudgetSetup />)
    await screen.findByLabelText('Rent budget amount')

    const rentClear = within(rowFor('Rent budget amount')).getByRole('button', { name: 'Clear' })
    expect(rentClear).toBeDisabled()

    const foodClear = within(rowFor('Food budget amount')).getByRole('button', { name: 'Clear' })
    expect(foodClear).not.toBeDisabled()
  })

  it('saves an edited amount via PUT when Save is clicked', async () => {
    render(<BudgetSetup />)

    const rentInput = await screen.findByLabelText('Rent budget amount')
    fireEvent.change(rentInput, { target: { value: '1200' } })
    fireEvent.click(within(rowFor('Rent budget amount')).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/budgets/cat2'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ amount: 1200 }),
        })
      )
    })

    await within(rowFor('Rent budget amount')).findByText('Saved ✓')
  })

  it('replaces Save/Clear with the success message, then restores them after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<BudgetSetup />)

      const rentInput = await screen.findByLabelText('Rent budget amount')
      fireEvent.change(rentInput, { target: { value: '1200' } })
      fireEvent.click(within(rowFor('Rent budget amount')).getByRole('button', { name: 'Save' }))

      await within(rowFor('Rent budget amount')).findByText('Saved ✓')
      expect(
        within(rowFor('Rent budget amount')).queryByRole('button', { name: 'Save' })
      ).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(
        within(rowFor('Rent budget amount')).getByRole('button', { name: 'Save' })
      ).toBeInTheDocument()
      expect(within(rowFor('Rent budget amount')).queryByText('Saved ✓')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects an invalid amount client-side without calling the API', async () => {
    render(<BudgetSetup />)

    const rentInput = await screen.findByLabelText('Rent budget amount')
    fireEvent.change(rentInput, { target: { value: '-5' } })
    const putCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(within(rowFor('Rent budget amount')).getByRole('button', { name: 'Save' }))

    await within(rowFor('Rent budget amount')).findByText('Enter a non-negative number')
    expect(vi.mocked(fetch).mock.calls.length).toBe(putCallsBefore)
  })

  it('shows a per-row error on save failure without affecting other rows', async () => {
    vi.stubGlobal('fetch', mockFetch({ failPut: true }))
    render(<BudgetSetup />)

    const rentInput = await screen.findByLabelText('Rent budget amount')
    fireEvent.change(rentInput, { target: { value: '1200' } })
    fireEvent.click(within(rowFor('Rent budget amount')).getByRole('button', { name: 'Save' }))

    await within(rowFor('Rent budget amount')).findByText('server exploded')
    expect(screen.getByLabelText('Food budget amount')).toHaveValue(300)
  })

  it('clears an existing budget via DELETE when Clear is clicked', async () => {
    render(<BudgetSetup />)
    await screen.findByLabelText('Food budget amount')

    fireEvent.click(within(rowFor('Food budget amount')).getByRole('button', { name: 'Clear' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/budgets/cat1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    await within(rowFor('Food budget amount')).findByText('Saved ✓')
    expect(screen.getByLabelText('Food budget amount')).toHaveValue(null)
  })
})
