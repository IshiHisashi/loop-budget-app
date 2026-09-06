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

function mockFetch(
  options: { failPut?: boolean; failPost?: number; failDelete?: number } = {}
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/categories') && method === 'GET') {
      return jsonResponse([
        { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
        { _id: 'cat3', name: 'Gifts', isDefault: false, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.endsWith('/api/categories') && method === 'POST') {
      if (options.failPost) {
        return jsonResponse({ error: 'a category with this name already exists' }, options.failPost)
      }
      const body = JSON.parse(init!.body as string) as { name: string }
      return jsonResponse(
        { _id: 'cat4', name: body.name, isDefault: false, createdAt: '', updatedAt: '' },
        201
      )
    }

    if (url.endsWith('/api/categories/cat3') && method === 'DELETE') {
      if (options.failDelete) {
        return jsonResponse(
          { error: 'category has a budget entry and cannot be deleted' },
          options.failDelete
        )
      }
      return jsonResponse({ deleted: true })
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

function openDeleteModal(categoryName: string) {
  fireEvent.click(within(rowFor(categoryName)).getByRole('button', { name: 'Delete category' }))
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

  it('shows a delete icon on every row, disabled for default categories', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    expect(within(rowFor('Food')).getByRole('button', { name: 'Delete category' })).toBeDisabled()
    expect(within(rowFor('Rent')).getByRole('button', { name: 'Delete category' })).toBeDisabled()
    expect(
      within(rowFor('Gifts')).getByRole('button', { name: 'Delete category' })
    ).not.toBeDisabled()
  })

  it('does nothing when clicking the delete icon on a default category', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    const callsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(within(rowFor('Food')).getByRole('button', { name: 'Delete category' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
  })

  it('adds a category via POST, appends it to the list, and shows a success flash that auto-closes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<BudgetSetup />)
      await screen.findByText('Gifts')

      fireEvent.click(screen.getByRole('button', { name: '+ Add category' }))
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Hobbies' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))

      await screen.findByText('Added ✓')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/categories'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Hobbies' }) })
      )
      expect(screen.getByText('Hobbies')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a blank category name client-side without calling the API', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    fireEvent.click(screen.getByRole('button', { name: '+ Add category' }))
    const postCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Enter a category name')
    expect(vi.mocked(fetch).mock.calls.length).toBe(postCallsBefore)
  })

  it('shows the server error inline when adding a duplicate category name, and keeps the modal open', async () => {
    vi.stubGlobal('fetch', mockFetch({ failPost: 409 }))
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    fireEvent.click(screen.getByRole('button', { name: '+ Add category' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Gifts' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('a category with this name already exists')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryAllByText('Gifts')).toHaveLength(1)
  })

  it('discards the typed name when the add-category modal is cancelled', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    fireEvent.click(screen.getByRole('button', { name: '+ Add category' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Hobbies' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Hobbies')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Add category' }))
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('deletes a category via DELETE and removes it from the list', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    openDeleteModal('Gifts')
    expect(screen.getByText('Delete “Gifts”?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/categories/cat3'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
    await waitFor(() => {
      expect(screen.queryByText('Gifts')).not.toBeInTheDocument()
    })
  })

  it('shows the server error inline on a failed delete, and leaves the row in place', async () => {
    vi.stubGlobal('fetch', mockFetch({ failDelete: 409 }))
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    openDeleteModal('Gifts')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await screen.findByText('category has a budget entry and cannot be deleted')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Gifts')).toBeInTheDocument()
  })

  it('cancels the delete-category modal without calling the API', async () => {
    render(<BudgetSetup />)
    await screen.findByText('Gifts')

    openDeleteModal('Gifts')
    const deleteCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(deleteCallsBefore)
    expect(screen.getByText('Gifts')).toBeInTheDocument()
  })
})
