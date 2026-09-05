import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

    throw new Error(`Unhandled request: ${method} ${url}`)
  })
}

function rowFor(categoryName: string): HTMLElement {
  return screen.getByText(categoryName).closest('li') as HTMLElement
}

function openEditModal(categoryName: string) {
  fireEvent.click(within(rowFor(categoryName)).getByRole('button', { name: 'Edit budget' }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BudgetSetup', () => {
  it('renders every category read-only, with its current budget amount or "Not budgeted"', async () => {
    render(<BudgetSetup />)

    await screen.findByText('Food')
    expect(within(rowFor('Food')).getByText('$300.00')).toBeInTheDocument()
    expect(within(rowFor('Rent')).getByText('Not budgeted')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('saves an edited amount via PUT and closes the modal immediately, with no lingering success message', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Rent')

    openEditModal('Rent')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/budgets/cat2'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ amount: 1200 }),
        })
      )
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Saved ✓')).not.toBeInTheDocument()
    expect(within(rowFor('Rent')).getByText('$1200.00')).toBeInTheDocument()
  })

  it('rejects an invalid amount client-side without calling the API', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Rent')

    openEditModal('Rent')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '-5' } })
    const putCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Enter a non-negative number')
    expect(vi.mocked(fetch).mock.calls.length).toBe(putCallsBefore)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows an inline error in the modal on save failure, without affecting other rows', async () => {
    vi.stubGlobal('fetch', mockFetch({ failPut: true }))
    render(<BudgetSetup />)
    await screen.findByText('Rent')

    openEditModal('Rent')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('server exploded')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(rowFor('Food')).getByText('$300.00')).toBeInTheDocument()
  })

  it('discards the typed draft when the edit modal is cancelled without saving', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Rent')

    openEditModal('Rent')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(rowFor('Rent')).getByText('Not budgeted')).toBeInTheDocument()

    openEditModal('Rent')
    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('ignores Cancel, Escape, and backdrop-click on the edit modal while a save is in flight', async () => {
    let resolvePut: (value: Response) => void
    const putPromise = new Promise<Response>((resolve) => {
      resolvePut = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.endsWith('/api/budgets') && method === 'GET') {
        return jsonResponse([])
      }
      if (url.endsWith('/api/budgets/cat1') && method === 'PUT') {
        return putPromise
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<BudgetSetup />)
    await screen.findByText('Food')

    openEditModal('Food')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Saving…')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue(500)

    resolvePut!(
      jsonResponse({ _id: 'b1', category: 'cat1', amount: 500, createdAt: '', updatedAt: '' })
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(within(rowFor('Food')).getByText('$500.00')).toBeInTheDocument()
  })
})
