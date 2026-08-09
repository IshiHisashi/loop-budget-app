import { useEffect, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import { BudgetVsActualRow, getBudgetVsActual } from './api/budgetVsActual.ts'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function BudgetVsActual() {
  const [month, setMonth] = useState(currentMonth())
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<BudgetVsActualRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([getCategories(), getBudgetVsActual(month)])
      .then(([categoriesResult, rowsResult]) => {
        if (cancelled) return
        setCategories(categoriesResult)
        setRows(rowsResult)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [month])

  return (
    <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Budget vs actual
      </h2>
      <label>
        Month
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </label>

      {loading && <p className="text-neutral-600 dark:text-neutral-400">Loading…</p>}
      {loadError && (
        <p role="alert" className="text-neutral-600 dark:text-neutral-400">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const row = rows.find((r) => r.category === category._id)
              const budgeted = row?.budgeted ?? 0
              const actual = row?.actual ?? 0
              const difference = Math.round((budgeted - actual) * 100) / 100

              return (
                <tr key={category._id}>
                  <td>{category.name}</td>
                  <td>{budgeted}</td>
                  <td>{actual}</td>
                  <td>{difference}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default BudgetVsActual
