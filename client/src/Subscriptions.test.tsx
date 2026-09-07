import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Subscriptions from './Subscriptions.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch(options: { failPost?: number; failDelete?: number } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/categories') && method === 'GET') {
      return jsonResponse([
        { _id: 'cat1', name: 'Streaming', isDefault: false, createdAt: '', updatedAt: '' },
        { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.endsWith('/api/subscriptions') && method === 'GET') {
      return jsonResponse([
        {
          _id: 'sub1',
          name: 'Netflix',
          amount: 9.99,
          category: 'cat1',
          dayOfMonth: 15,
          startMonth: '2026-01',
          createdAt: '',
          updatedAt: '',
        },
        {
          _id: 'sub2',
          amount: 1200,
          category: 'cat2',
          dayOfMonth: 1,
          startMonth: '2026-02',
          endMonth: '2026-12',
          createdAt: '',
          updatedAt: '',
        },
      ])
    }

    if (url.endsWith('/api/subscriptions') && method === 'POST') {
      if (options.failPost) {
        return jsonResponse({ error: 'a subscription with this name already exists' }, options.failPost)
      }
      const body = JSON.parse(init!.body as string)
      return jsonResponse(
        { _id: 'sub3', createdAt: '', updatedAt: '', ...body },
        201
      )
    }

    if (url.endsWith('/api/subscriptions/sub1') && method === 'DELETE') {
      if (options.failDelete) {
        return jsonResponse(
          { error: 'subscription has already generated expenses' },
          options.failDelete
        )
      }
      return jsonResponse({ deleted: true })
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  })
}

function rowFor(label: string): HTMLElement {
  return screen.getByText(label).closest('tr') as HTMLElement
}

function openAddModal() {
  fireEvent.click(screen.getByRole('button', { name: '+ Add subscription' }))
}

function openDeleteModal(label: string) {
  fireEvent.click(within(rowFor(label)).getByRole('button', { name: 'Delete subscription' }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Subscriptions', () => {
  it('renders every subscription with its fields, including "—" and "Ongoing" fallbacks', async () => {
    render(<Subscriptions />)

    await screen.findByText('Netflix')
    const netflixRow = rowFor('Netflix')
    expect(within(netflixRow).getByText('Streaming')).toBeInTheDocument()
    expect(within(netflixRow).getByText('$9.99')).toBeInTheDocument()
    expect(within(netflixRow).getByText('15')).toBeInTheDocument()
    expect(within(netflixRow).getByText('2026-01')).toBeInTheDocument()
    expect(within(netflixRow).getByText('Ongoing')).toBeInTheDocument()

    const rentRow = rowFor('Rent')
    expect(within(rentRow).getByText('—')).toBeInTheDocument()
    expect(within(rentRow).getByText('$1200.00')).toBeInTheDocument()
    expect(within(rentRow).getByText('2026-12')).toBeInTheDocument()
  })

  it('adds a subscription via POST, appends it to the table, and shows a success flash that auto-closes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<Subscriptions />)
      await screen.findByText('Netflix')

      openAddModal()
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Spotify' } })
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '11.99' } })
      fireEvent.change(screen.getByLabelText('Day of month'), { target: { value: '5' } })
      fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '2026-03' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))

      await screen.findByText('Added ✓')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/subscriptions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            amount: 11.99,
            category: 'cat1',
            dayOfMonth: 5,
            startMonth: '2026-03',
            name: 'Spotify',
          }),
        })
      )
      expect(screen.getByText('Spotify')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects an incomplete or invalid draft client-side without calling the API', async () => {
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openAddModal()
    const callsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText(
      'Enter a category, start month, positive amount, and a day of month from 1–31'
    )
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
  })

  it('shows the server error inline on a failed add, and keeps the modal open', async () => {
    vi.stubGlobal('fetch', mockFetch({ failPost: 409 }))
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openAddModal()
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Day of month'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '2026-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('a subscription with this name already exists')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('discards the typed draft when the add modal is cancelled', async () => {
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openAddModal()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Gym' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Gym')).not.toBeInTheDocument()

    openAddModal()
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('deletes a subscription via DELETE and removes it from the table', async () => {
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openDeleteModal('Netflix')
    expect(screen.getByText('Delete “Netflix”?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/subscriptions/sub1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
    await waitFor(() => {
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
    })
  })

  it('falls back to the category name in the delete confirmation when the subscription has no name', async () => {
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openDeleteModal('Rent')
    expect(screen.getByText('Delete “Rent”?')).toBeInTheDocument()
  })

  it('shows the server error inline on a failed delete, and leaves the row in place', async () => {
    vi.stubGlobal('fetch', mockFetch({ failDelete: 409 }))
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openDeleteModal('Netflix')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await screen.findByText('subscription has already generated expenses')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Netflix')).toBeInTheDocument()
  })

  it('cancels the delete modal without calling the API', async () => {
    render(<Subscriptions />)
    await screen.findByText('Netflix')

    openDeleteModal('Netflix')
    const callsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
    expect(screen.getByText('Netflix')).toBeInTheDocument()
  })
})
