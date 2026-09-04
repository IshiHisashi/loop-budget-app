import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExpenseLog from './ExpenseLog.tsx'
import { truncateNote } from './noteTruncation.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const janExpenses = [
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
]

function mockFetch(options: { failPatch?: boolean } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/categories') && method === 'GET') {
      return jsonResponse([
        { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.includes('/api/expenses?month=') && method === 'GET') {
      return jsonResponse(janExpenses)
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
      const body = JSON.parse(init!.body as string) as {
        date: string
        amount: number
        category: string
        note?: string
      }
      return jsonResponse({
        _id: 'exp-food',
        date: `${body.date}T00:00:00.000Z`,
        amount: body.amount,
        category: body.category,
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

function selectJanuary() {
  fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-01' } })
}

function openAddModal() {
  fireEvent.click(screen.getByRole('button', { name: '+ Add expense' }))
}

// Amount text (e.g. "$50.00") appears both in a table row and in the
// calendar's per-day total once a day has expenses, so any text query for
// it must be scoped to the table body to avoid "multiple elements" errors.
function tableScope() {
  return within(screen.getByTestId('expense-rows'))
}

async function findInTable(text: string) {
  const rows = await screen.findByTestId('expense-rows')
  return within(rows).findByText(text)
}

function rowFor(amountText: string): HTMLElement {
  return tableScope().getByText(amountText).closest('tr') as HTMLElement
}

function openEditModal(amountText: string) {
  fireEvent.click(within(rowFor(amountText)).getByRole('button', { name: 'Edit expense' }))
}

function openDeleteModal(amountText: string) {
  fireEvent.click(within(rowFor(amountText)).getByRole('button', { name: 'Delete expense' }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ExpenseLog', () => {
  it('renders expenses most-recent-first, grouped under a date header row per day', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    const allRows = within(screen.getByTestId('expense-rows')).getAllByRole('row')
    expect(allRows).toHaveLength(4)

    expect(within(allRows[0]).getByText('2026-01-20')).toBeInTheDocument()
    expect(within(allRows[1]).getByText('$50.00')).toBeInTheDocument()
    expect(within(allRows[1]).getByText('Food')).toBeInTheDocument()
    expect(within(allRows[1]).getByText('Groceries')).toBeInTheDocument()
    expect(within(allRows[1]).queryByText('2026-01-20')).not.toBeInTheDocument()
    expect(within(allRows[1]).queryByRole('button', { name: 'more' })).not.toBeInTheDocument()

    expect(within(allRows[2]).getByText('2026-01-10')).toBeInTheDocument()
    expect(within(allRows[3]).getByText('$1200.00')).toBeInTheDocument()
    expect(within(allRows[3]).getByText('—')).toBeInTheDocument()
    expect(within(allRows[3]).queryByText('2026-01-10')).not.toBeInTheDocument()
    expect(within(allRows[3]).queryByRole('button', { name: 'more' })).not.toBeInTheDocument()

    const dataRows = within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')
    expect(dataRows).toHaveLength(2)
  })

  it('refetches with the new month when the month input changes', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    selectJanuary()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/expenses?month=2026-01'),
        expect.anything()
      )
    })
  })

  it('adds an expense via the form', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')
    openAddModal()

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

    await findInTable('$75.00')
  })

  it('keeps focus on the Amount field while typing multiple digits in a row', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    openAddModal()

    const amountInput = screen.getByLabelText('Amount')
    amountInput.focus()
    expect(document.activeElement).toBe(amountInput)

    fireEvent.change(amountInput, { target: { value: '5' } })
    expect(document.activeElement).toBe(amountInput)

    fireEvent.change(amountInput, { target: { value: '50' } })
    expect(document.activeElement).toBe(amountInput)

    fireEvent.change(amountInput, { target: { value: '500' } })
    expect(document.activeElement).toBe(amountInput)
    expect(amountInput).toHaveValue(500)
  })

  it('does not show a newly added expense whose date falls outside the selected month', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-02-01' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Added ✓')
    expect(tableScope().queryByText('$75.00')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(2)
  })

  it('rejects invalid add input client-side without calling the API', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    openAddModal()

    const postCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Enter a date, category, and a positive amount')
    expect(vi.mocked(fetch).mock.calls.length).toBe(postCallsBefore)
  })

  it('saves an edited expense via PATCH, through the edit modal', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

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

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(tableScope().getByText('$65.00')).toBeInTheDocument()
  })

  it('removes a row from the list when its date is edited outside the selected month', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-02-05' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(tableScope().queryByText('$50.00')).not.toBeInTheDocument()
    })
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(1)
  })

  it('closes the edit modal immediately on successful save, with no lingering success message', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Saved ✓')).not.toBeInTheDocument()
    expect(tableScope().getByText('$65.00')).toBeInTheDocument()
  })

  it('replaces Add with the success message, then restores it after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<ExpenseLog />)
      await findInTable('$50.00')
      selectJanuary()
      await findInTable('$50.00')
      openAddModal()

      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-25' } })
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat2' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))

      await screen.findByText('Added ✓')
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears a note via the edit modal', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

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

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(within(rowFor('$50.00')).getByText('—')).toBeInTheDocument()
  })

  it('shows an error in the edit modal on save failure, without affecting other rows', async () => {
    vi.stubGlobal('fetch', mockFetch({ failPatch: true }))
    render(<ExpenseLog />)
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('server exploded')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(tableScope().getByText('$1200.00')).toBeInTheDocument()
  })

  it('deletes an expense via the delete-confirmation modal', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    openDeleteModal('$1200.00')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/expenses/exp-rent'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    await waitFor(() => {
      expect(tableScope().queryByText('$1200.00')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an identifying summary of the target expense in the delete-confirmation modal', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    openDeleteModal('$50.00')

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/2026-01-20/)).toBeInTheDocument()
    expect(within(dialog).getByText(/\$50\.00/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Food/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Groceries/)).toBeInTheDocument()
  })

  it('discards typed changes when the edit modal is closed via Cancel', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    const callsBefore = vi.mocked(fetch).mock.calls.length
    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
    expect(tableScope().getByText('$50.00')).toBeInTheDocument()
    expect(tableScope().queryByText('$999.00')).not.toBeInTheDocument()
  })

  it('discards typed changes when the edit modal is closed via Escape or backdrop click', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '999' } })
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(tableScope().queryByText('$999.00')).not.toBeInTheDocument()

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '888' } })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(tableScope().queryByText('$888.00')).not.toBeInTheDocument()
    expect(tableScope().getByText('$50.00')).toBeInTheDocument()
  })

  it('does not call deleteExpense when the delete confirmation is cancelled', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    const callsBefore = vi.mocked(fetch).mock.calls.length
    openDeleteModal('$1200.00')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
    expect(tableScope().getByText('$1200.00')).toBeInTheDocument()
  })

  it('ignores Cancel, Escape, and backdrop-click on the edit modal while a save is in flight', async () => {
    let resolvePatch: (value: Response) => void
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse(janExpenses)
      }
      if (url.endsWith('/api/expenses/exp-food') && method === 'PATCH') {
        return patchPromise
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Saving…')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue(65)

    resolvePatch!(
      jsonResponse({
        _id: 'exp-food',
        date: '2026-01-20T00:00:00.000Z',
        amount: 65,
        category: 'cat1',
        note: 'Groceries',
        createdAt: '',
        updatedAt: '',
      })
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(tableScope().getByText('$65.00')).toBeInTheDocument()
  })

  it('ignores Cancel, Escape, and backdrop-click on the delete modal while a delete is in flight', async () => {
    let resolveDelete: (value: Response) => void
    const deletePromise = new Promise<Response>((resolve) => {
      resolveDelete = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
          { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse(janExpenses)
      }
      if (url.endsWith('/api/expenses/exp-rent') && method === 'DELETE') {
        return deletePromise
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    await findInTable('$50.00')

    openDeleteModal('$1200.00')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await screen.findByText('Deleting…')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(tableScope().getByText('$1200.00')).toBeInTheDocument()

    resolveDelete!(jsonResponse({ deleted: true }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(tableScope().queryByText('$1200.00')).not.toBeInTheDocument()
  })

  it('does not apply a stale response when switching months before an earlier fetch resolves', async () => {
    let resolveJanFetch: (value: Response) => void
    const janFetchPromise = new Promise<Response>((resolve) => {
      resolveJanFetch = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=2026-01') && method === 'GET') {
        return janFetchPromise
      }
      if (url.includes('/api/expenses?month=2026-02') && method === 'GET') {
        return jsonResponse([
          {
            _id: 'exp-feb',
            date: '2026-02-10T00:00:00.000Z',
            amount: 99,
            category: 'cat1',
            createdAt: '',
            updatedAt: '',
          },
        ])
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse([])
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    const monthInput = await screen.findByLabelText('Month')

    fireEvent.change(monthInput, { target: { value: '2026-01' } })
    fireEvent.change(monthInput, { target: { value: '2026-02' } })

    await findInTable('$99.00')

    resolveJanFetch!(
      jsonResponse([
        {
          _id: 'exp-jan',
          date: '2026-01-05T00:00:00.000Z',
          amount: 11,
          category: 'cat1',
          createdAt: '',
          updatedAt: '',
        },
      ])
    )

    await waitFor(() => {
      expect(tableScope().getByText('$99.00')).toBeInTheDocument()
    })
    expect(tableScope().queryByText('$11.00')).not.toBeInTheDocument()
  })

  it('does not let an in-flight add land in a different month after switching', async () => {
    let resolvePost: (value: Response) => void
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=2026-01') && method === 'GET') {
        return jsonResponse([])
      }
      if (url.includes('/api/expenses?month=2026-02') && method === 'GET') {
        return jsonResponse([
          {
            _id: 'exp-feb',
            date: '2026-02-10T00:00:00.000Z',
            amount: 99,
            category: 'cat1',
            createdAt: '',
            updatedAt: '',
          },
        ])
      }
      if (url.endsWith('/api/expenses') && method === 'POST') {
        return postPromise
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse([])
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    const monthInput = await screen.findByLabelText('Month')
    fireEvent.change(monthInput, { target: { value: '2026-01' } })
    await screen.findByRole('button', { name: '+ Add expense' })
    openAddModal()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-25' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    fireEvent.change(monthInput, { target: { value: '2026-02' } })
    await findInTable('$99.00')

    resolvePost!(
      jsonResponse(
        {
          _id: 'exp-new',
          date: '2026-01-25T00:00:00.000Z',
          amount: 75,
          category: 'cat1',
          createdAt: '',
          updatedAt: '',
        },
        201
      )
    )

    await waitFor(() => {
      expect(tableScope().getByText('$99.00')).toBeInTheDocument()
    })
    expect(tableScope().queryByText('$75.00')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(1)
  })

  it('ignores Cancel, Escape, and backdrop-click while an add is in flight, so the stale response cannot clobber a later draft', async () => {
    let resolvePost: (value: Response) => void
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse(janExpenses)
      }
      if (url.endsWith('/api/expenses') && method === 'POST') {
        return postPromise
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    await findInTable('$50.00')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-25' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Saving…')

    // None of these should close the modal or reset the in-progress draft
    // while the request is still in flight.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue(75)

    resolvePost!(
      jsonResponse(
        {
          _id: 'exp-new',
          date: '2026-01-25T00:00:00.000Z',
          amount: 75,
          category: 'cat1',
          createdAt: '',
          updatedAt: '',
        },
        201
      )
    )

    await screen.findByText('Added ✓')
  })

  it('does not let an in-flight edit land in a different month after switching', async () => {
    let resolvePatch: (value: Response) => void
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve
    })

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=2026-01') && method === 'GET') {
        return jsonResponse(janExpenses.filter((expense) => expense._id === 'exp-food'))
      }
      if (url.includes('/api/expenses?month=2026-02') && method === 'GET') {
        return jsonResponse([
          {
            _id: 'exp-feb',
            date: '2026-02-10T00:00:00.000Z',
            amount: 99,
            category: 'cat1',
            createdAt: '',
            updatedAt: '',
          },
        ])
      }
      if (url.endsWith('/api/expenses/exp-food') && method === 'PATCH') {
        return patchPromise
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse([])
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    const monthInput = await screen.findByLabelText('Month')
    fireEvent.change(monthInput, { target: { value: '2026-01' } })
    await findInTable('$50.00')

    openEditModal('$50.00')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.change(monthInput, { target: { value: '2026-02' } })
    await findInTable('$99.00')

    resolvePatch!(
      jsonResponse({
        _id: 'exp-food',
        date: '2026-01-20T00:00:00.000Z',
        amount: 65,
        category: 'cat1',
        note: 'Groceries',
        createdAt: '',
        updatedAt: '',
      })
    )

    await waitFor(() => {
      expect(tableScope().getByText('$99.00')).toBeInTheDocument()
    })
    expect(tableScope().queryByText('$65.00')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(1)
  })

  it('renders the calendar above the expense table', async () => {
    const { container } = render(<ExpenseLog />)
    await findInTable('$50.00')

    const calendarGrid = container.querySelector('.grid') as HTMLElement
    const table = screen.getByRole('table')
    expect(calendarGrid).not.toBeNull()
    expect(
      calendarGrid.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('renders no column-header row', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    expect(within(screen.getByRole('table')).queryAllByRole('columnheader')).toHaveLength(0)
  })

  it('groups multiple same-day expenses under one shared date header row, in date order', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse([
          {
            _id: 'exp-a',
            date: '2026-01-20T00:00:00.000Z',
            amount: 20,
            category: 'cat1',
            createdAt: '',
            updatedAt: '',
          },
          {
            _id: 'exp-b',
            date: '2026-01-20T00:00:00.000Z',
            amount: 5,
            category: 'cat1',
            createdAt: '',
            updatedAt: '',
          },
          {
            _id: 'exp-c',
            date: '2026-01-16T00:00:00.000Z',
            amount: 15,
            category: 'cat1',
            createdAt: '',
            updatedAt: '',
          },
        ])
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    await findInTable('$5.00')

    const dateHeaders = within(screen.getByTestId('expense-rows')).getAllByRole('rowheader')
    expect(dateHeaders.map((header) => header.textContent)).toEqual(['2026-01-20', '2026-01-16'])

    const allRows = within(screen.getByTestId('expense-rows')).getAllByRole('row')
    expect(allRows).toHaveLength(5)
    expect(within(allRows[0]).getByText('2026-01-20')).toBeInTheDocument()
    expect(within(allRows[1]).getByText('$20.00')).toBeInTheDocument()
    expect(within(allRows[2]).getByText('$5.00')).toBeInTheDocument()
    expect(within(allRows[3]).getByText('2026-01-16')).toBeInTheDocument()
    expect(within(allRows[4]).getByText('$15.00')).toBeInTheDocument()
  })

  it("scrolls to and highlights that day's row when a calendar day is clicked, without hiding other rows", async () => {
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView)
    scrollIntoView.mockClear()

    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(2)

    const foodRow = rowFor('$50.00')
    const rentRow = rowFor('$1200.00')

    fireEvent.click(screen.getByRole('button', { name: /^20\$50\.00$/ }))

    // Nothing is hidden — both rows are still present.
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(2)
    expect(tableScope().getByText('$1200.00')).toBeInTheDocument()

    // Scrolled to the matching row, and highlighted just that one.
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(foodRow)
    expect(foodRow.className).toContain('bg-rose-100')
    expect(rentRow.className).not.toContain('bg-rose-100')
  })

  it('re-scrolls on repeated clicks of the same day instead of toggling a filter off', async () => {
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView)
    scrollIntoView.mockClear()

    render(<ExpenseLog />)
    await findInTable('$50.00')
    selectJanuary()
    await findInTable('$50.00')

    const dayButton = screen.getByRole('button', { name: /^20\$50\.00$/ })
    fireEvent.click(dayButton)
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(2)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    fireEvent.click(dayButton)
    expect(within(screen.getByTestId('expense-rows')).getAllByTestId('expense-row')).toHaveLength(2)
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('shows the add-expense form in a dialog when the trigger is clicked', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
  })

  it('discards typed-but-unsubmitted input when closed via Cancel', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('discards typed-but-unsubmitted input when closed via Escape', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('discards typed-but-unsubmitted input when closed via backdrop click', async () => {
    render(<ExpenseLog />)
    await findInTable('$50.00')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('truncates a long note behind a toggle that expands and collapses the full text', async () => {
    const longNote = 'This is a genuinely long expense note that exceeds twenty characters easily'

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'

      if (url.endsWith('/api/categories') && method === 'GET') {
        return jsonResponse([
          { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        ])
      }
      if (url.includes('/api/expenses?month=') && method === 'GET') {
        return jsonResponse([
          {
            _id: 'exp-long-note',
            date: '2026-01-20T00:00:00.000Z',
            amount: 50,
            category: 'cat1',
            note: longNote,
            createdAt: '',
            updatedAt: '',
          },
        ])
      }

      throw new Error(`Unhandled request: ${method} ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ExpenseLog />)
    await findInTable('$50.00')

    const { display } = truncateNote(longNote)
    const row = rowFor('$50.00')
    expect(row).toHaveTextContent(display)
    expect(row).not.toHaveTextContent(longNote)

    const moreButton = within(row).getByRole('button', { name: 'more' })
    expect(moreButton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(moreButton)

    expect(row).toHaveTextContent(longNote)

    const lessButton = within(row).getByRole('button', { name: 'less' })
    expect(lessButton).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(lessButton)

    expect(row).toHaveTextContent(display)
    expect(row).not.toHaveTextContent(longNote)
  })
})
