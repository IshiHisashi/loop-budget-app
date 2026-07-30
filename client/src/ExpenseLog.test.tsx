import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExpenseLog from './ExpenseLog.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch(options: { failPatch?: boolean } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/categories') && method === 'GET') {
      return jsonResponse([
        { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.endsWith('/api/expenses') && method === 'GET') {
      return jsonResponse([
        {
          _id: 'exp-food',
          date: '2026-01-20T00:00:00.000Z',
          amount: 50,
          category: 'cat1',
          note: 'Groceries',
          createdAt: '',
          updatedAt: '',
        },
        {
          _id: 'exp-rent',
          date: '2026-01-10T00:00:00.000Z',
          amount: 1200,
          category: 'cat2',
          createdAt: '',
          updatedAt: '',
        },
      ])
    }

    if (url.endsWith('/api/expenses') && method === 'POST') {
      const body = JSON.parse(init!.body as string) as {
        date: string
        amount: number
        category: string
        note?: string
      }
      return jsonResponse(
        {
          _id: 'exp-new',
          date: `${body.date}T00:00:00.000Z`,
          amount: body.amount,
          category: body.category,
          note: body.note,
          createdAt: '',
          updatedAt: '',
        },
        201
      )
    }

    if (url.endsWith('/api/expenses/exp-food') && method === 'PATCH') {
      if (options.failPatch) {
        return jsonResponse({ error: 'server exploded' }, 500)
      }
      const body = JSON.parse(init!.body as string) as { amount: number; note?: string }
      return jsonResponse({
        _id: 'exp-food',
        date: '2026-01-20T00:00:00.000Z',
        amount: body.amount,
        category: 'cat1',
        note: body.note,
        createdAt: '',
        updatedAt: '',
      })
    }

    if (url.endsWith('/api/expenses/exp-rent') && method === 'DELETE') {
      return jsonResponse({ deleted: true })
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

describe('ExpenseLog', () => {
  it('renders expenses most-recent-first with prefilled fields', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByDisplayValue('50')).toBeInTheDocument()
    expect(within(rows[1]).getByDisplayValue('1200')).toBeInTheDocument()
  })

  it('adds an expense via the form', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-25' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat2' } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Taxi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/expenses'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ date: '2026-01-25', amount: 75, category: 'cat2', note: 'Taxi' }),
        })
      )
    })

    await screen.findByDisplayValue('75')
  })

  it('rejects invalid add input client-side without calling the API', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const postCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Enter a date, category, and a positive amount')
    expect(vi.mocked(fetch).mock.calls.length).toBe(postCallsBefore)
  })

  it('saves an edited row via PATCH', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const foodRow = screen.getByDisplayValue('50').closest('li') as HTMLElement
    fireEvent.change(within(foodRow).getByLabelText('Expense amount'), {
      target: { value: '65' },
    })
    fireEvent.click(within(foodRow).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/expenses/exp-food'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            date: '2026-01-20',
            amount: 65,
            category: 'cat1',
            note: 'Groceries',
          }),
        })
      )
    })

    await within(foodRow).findByText('Saved ✓')
  })

  it('clears a note via inline edit', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const foodRow = screen.getByDisplayValue('50').closest('li') as HTMLElement
    fireEvent.change(within(foodRow).getByLabelText('Expense note'), {
      target: { value: '' },
    })
    fireEvent.click(within(foodRow).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/expenses/exp-food'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            date: '2026-01-20',
            amount: 50,
            category: 'cat1',
            note: '',
          }),
        })
      )
    })

    await within(foodRow).findByText('Saved ✓')
    expect(within(foodRow).getByLabelText('Expense note')).toHaveValue('')
  })

  it('shows a per-row error on save failure without affecting other rows', async () => {
    vi.stubGlobal('fetch', mockFetch({ failPatch: true }))
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const foodRow = screen.getByDisplayValue('50').closest('li') as HTMLElement
    fireEvent.change(within(foodRow).getByLabelText('Expense amount'), {
      target: { value: '65' },
    })
    fireEvent.click(within(foodRow).getByRole('button', { name: 'Save' }))

    await within(foodRow).findByText('server exploded')
    expect(screen.getByDisplayValue('1200')).toBeInTheDocument()
  })

  it('deletes a row via DELETE', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const rentRow = screen.getByDisplayValue('1200').closest('li') as HTMLElement
    fireEvent.click(within(rentRow).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/expenses/exp-rent'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    await waitFor(() => {
      expect(screen.queryByDisplayValue('1200')).not.toBeInTheDocument()
    })
  })
})
