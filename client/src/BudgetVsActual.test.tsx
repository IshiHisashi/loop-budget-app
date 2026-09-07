import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetVsActual from './BudgetVsActual.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.endsWith('/api/categories')) {
      return jsonResponse([
        { _id: 'cat1', name: 'Food', isDefault: true, createdAt: '', updatedAt: '' },
        { _id: 'cat2', name: 'Rent', isDefault: true, createdAt: '', updatedAt: '' },
      ])
    }

    if (url.includes('/api/budget-vs-actual?month=2026-02')) {
      return jsonResponse([
        { category: 'cat1', budgeted: 300, actual: 100 },
        { category: 'cat2', budgeted: 1200, actual: 1200 },
      ])
    }

    if (url.includes('/api/budget-vs-actual?month=2026-03')) {
      return jsonResponse([
        { category: 'cat1', budgeted: 300, actual: 350 },
        { category: 'cat2', budgeted: 1200, actual: 1000 },
      ])
    }

    if (url.includes('/api/budget-vs-actual?month=2026-04')) {
      return jsonResponse([
        { category: 'cat1', budgeted: 300, actual: 400 },
        { category: 'cat2', budgeted: 1200, actual: 1500 },
      ])
    }

    if (url.includes('/api/budget-vs-actual?month=')) {
      return jsonResponse([
        { category: 'cat1', budgeted: 300, actual: 245.5 },
        { category: 'cat2', budgeted: 1200, actual: 1200 },
      ])
    }

    throw new Error(`Unhandled request: ${url}`)
  })
}

function cellTexts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '')
}

function totalsRow(): HTMLElement {
  return screen.getByText('Total').closest('tr') as HTMLElement
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BudgetVsActual', () => {
  it('renders budgeted, actual, and difference per category for the current month', async () => {
    render(<BudgetVsActual />)

    const foodRow = (await screen.findByText('Food')).closest('tr') as HTMLElement
    expect(cellTexts(foodRow)).toEqual(['Food', '300', '245.5', '54.5'])

    const rentRow = screen.getByText('Rent').closest('tr') as HTMLElement
    expect(cellTexts(rentRow)).toEqual(['Rent', '1200', '1200', '0'])

    expect(cellTexts(totalsRow())).toEqual(['Total', '1500', '1445.5', '54.5'])
  })

  it('refetches with the new month when the month input changes', async () => {
    render(<BudgetVsActual />)
    await screen.findByText('Food')

    const monthInput = screen.getByLabelText('Month')
    fireEvent.change(monthInput, { target: { value: '2026-02' } })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/budget-vs-actual?month=2026-02'),
        expect.anything()
      )
    })

    await waitFor(() => {
      const foodRow = screen.getByText('Food').closest('tr') as HTMLElement
      expect(cellTexts(foodRow)).toEqual(['Food', '300', '100', '200'])
    })
    expect(cellTexts(totalsRow())).toEqual(['Total', '1500', '1300', '200'])
  })

  it('flags an over-budget row with red styling, leaves an under-budget row unstyled', async () => {
    render(<BudgetVsActual />)
    await screen.findByText('Food')

    const monthInput = screen.getByLabelText('Month')
    fireEvent.change(monthInput, { target: { value: '2026-03' } })

    await waitFor(() => {
      const foodRow = screen.getByText('Food').closest('tr') as HTMLElement
      expect(cellTexts(foodRow)).toEqual(['Food', '300', '350', '-50'])
    })

    const foodRow = screen.getByText('Food').closest('tr') as HTMLElement
    const rentRow = screen.getByText('Rent').closest('tr') as HTMLElement
    const foodDifferenceCell = within(foodRow).getAllByRole('cell')[3]
    const rentDifferenceCell = within(rentRow).getAllByRole('cell')[3]

    expect(foodRow.className).toContain('bg-red-50')
    expect(foodRow.className).toContain('dark:bg-red-900/20')
    expect(foodDifferenceCell.className).toContain('text-red-600')
    expect(foodDifferenceCell.className).toContain('dark:text-red-400')

    expect(rentRow.className).not.toContain('bg-red-50')
    expect(rentDifferenceCell.className).not.toContain('text-red-600')
  })

  it('flags the totals row with red styling when the aggregate is over budget', async () => {
    render(<BudgetVsActual />)
    await screen.findByText('Food')

    const monthInput = screen.getByLabelText('Month')
    fireEvent.change(monthInput, { target: { value: '2026-04' } })

    await waitFor(() => {
      expect(cellTexts(totalsRow())).toEqual(['Total', '1500', '1900', '-400'])
    })

    const totalDifferenceCell = within(totalsRow()).getAllByRole('cell')[3]
    expect(totalsRow().className).toContain('bg-red-50')
    expect(totalsRow().className).toContain('dark:bg-red-900/20')
    expect(totalDifferenceCell.className).toContain('text-red-600')
    expect(totalDifferenceCell.className).toContain('dark:text-red-400')
  })
})
