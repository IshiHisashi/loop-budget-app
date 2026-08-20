import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExpenseLog from './ExpenseLog.tsx'

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

    const rows = within(screen.getByTestId('expense-rows')).getAllByRole('row')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByDisplayValue('50')).toBeInTheDocument()
    expect(within(rows[1]).getByDisplayValue('1200')).toBeInTheDocument()
  })

  it('refetches with the new month when the month input changes', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

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
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')
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

    await screen.findByDisplayValue('75')
  })

  it('does not show a newly added expense whose date falls outside the selected month', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-02-01' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Added ✓')
    expect(screen.queryByDisplayValue('75')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(2)
  })

  it('rejects invalid add input client-side without calling the API', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    openAddModal()

    const postCallsBefore = vi.mocked(fetch).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('Enter a date, category, and a positive amount')
    expect(vi.mocked(fetch).mock.calls.length).toBe(postCallsBefore)
  })

  it('saves an edited row via PATCH', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')

    const foodRow = screen.getByDisplayValue('50').closest('tr') as HTMLElement
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

  it('removes a row from the list when its date is edited outside the selected month', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')

    const foodRow = screen.getByDisplayValue('50').closest('tr') as HTMLElement
    fireEvent.change(within(foodRow).getByLabelText('Expense date'), {
      target: { value: '2026-02-05' },
    })
    fireEvent.click(within(foodRow).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('50')).not.toBeInTheDocument()
    })
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(1)
  })

  it('replaces row Save/Delete with the success message, then restores them after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<ExpenseLog />)
      await screen.findByDisplayValue('50')
      selectJanuary()
      await screen.findByDisplayValue('50')

      const foodRow = screen.getByDisplayValue('50').closest('tr') as HTMLElement
      fireEvent.change(within(foodRow).getByLabelText('Expense amount'), {
        target: { value: '65' },
      })
      fireEvent.click(within(foodRow).getByRole('button', { name: 'Save' }))

      await within(foodRow).findByText('Saved ✓')
      expect(within(foodRow).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
      expect(within(foodRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(within(foodRow).getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(within(foodRow).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(within(foodRow).queryByText('Saved ✓')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('replaces Add with the success message, then restores it after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<ExpenseLog />)
      await screen.findByDisplayValue('50')
      selectJanuary()
      await screen.findByDisplayValue('50')
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

  it('clears a note via inline edit', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')

    const foodRow = screen.getByDisplayValue('50').closest('tr') as HTMLElement
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

    const foodRow = screen.getByDisplayValue('50').closest('tr') as HTMLElement
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

    const rentRow = screen.getByDisplayValue('1200').closest('tr') as HTMLElement
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

    await screen.findByDisplayValue('99')

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
      expect(screen.getByDisplayValue('99')).toBeInTheDocument()
    })
    expect(screen.queryByDisplayValue('11')).not.toBeInTheDocument()
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
    await screen.findByDisplayValue('99')

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
      expect(screen.getByDisplayValue('99')).toBeInTheDocument()
    })
    expect(screen.queryByDisplayValue('75')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(1)
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
    await screen.findByDisplayValue('50')
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
    await screen.findByDisplayValue('50')

    fireEvent.change(screen.getByLabelText('Expense amount'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.change(monthInput, { target: { value: '2026-02' } })
    await screen.findByDisplayValue('99')

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
      expect(screen.getByDisplayValue('99')).toBeInTheDocument()
    })
    expect(screen.queryByDisplayValue('65')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(1)
  })

  it('renders the calendar above the expense table', async () => {
    const { container } = render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const calendarGrid = container.querySelector('.grid') as HTMLElement
    const table = screen.getByRole('table')
    expect(calendarGrid).not.toBeNull()
    expect(
      calendarGrid.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('renders the expected column headers, in order', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

    const headers = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      'Date',
      'Amount',
      'Category',
      'Note',
      'Actions',
    ])
  })

  it("scrolls to and highlights that day's row when a calendar day is clicked, without hiding other rows", async () => {
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView)
    scrollIntoView.mockClear()

    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')

    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(2)

    const foodRow = screen.getByDisplayValue('50').closest('tr') as HTMLElement
    const rentRow = screen.getByDisplayValue('1200').closest('tr') as HTMLElement

    fireEvent.click(screen.getByRole('button', { name: /^20\$50\.00$/ }))

    // Nothing is hidden — both rows are still present.
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByDisplayValue('1200')).toBeInTheDocument()

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
    await screen.findByDisplayValue('50')
    selectJanuary()
    await screen.findByDisplayValue('50')

    const dayButton = screen.getByRole('button', { name: /^20\$50\.00$/ })
    fireEvent.click(dayButton)
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(2)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    fireEvent.click(dayButton)
    expect(within(screen.getByTestId('expense-rows')).getAllByRole('row')).toHaveLength(2)
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('shows the add-expense form in a dialog when the trigger is clicked', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')

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
    await screen.findByDisplayValue('50')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('discards typed-but-unsubmitted input when closed via Escape', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('discards typed-but-unsubmitted input when closed via backdrop click', async () => {
    render(<ExpenseLog />)
    await screen.findByDisplayValue('50')
    openAddModal()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('dialog').parentElement as Element)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddModal()

    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })
})
