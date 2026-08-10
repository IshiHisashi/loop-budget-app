import { useEffect, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import { Budget, deleteBudget, getBudgets, setBudget } from './api/budgets.ts'

type RowStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function BudgetSetup() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCategories(), getBudgets()])
      .then(([categoriesResult, budgetsResult]) => {
        setCategories(categoriesResult)
        setBudgets(budgetsResult)
        setDrafts(
          Object.fromEntries(budgetsResult.map((budget) => [budget.category, String(budget.amount)]))
        )
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  function handleDraftChange(categoryId: string, value: string) {
    setDrafts((prev) => ({ ...prev, [categoryId]: value }))
  }

  async function handleSave(categoryId: string) {
    const draft = (drafts[categoryId] ?? '').trim()
    const amount = Number(draft)

    if (draft === '' || !Number.isFinite(amount) || amount < 0) {
      setRowStatus((prev) => ({
        ...prev,
        [categoryId]: { kind: 'error', message: 'Enter a non-negative number' },
      }))
      return
    }

    setRowStatus((prev) => ({ ...prev, [categoryId]: { kind: 'saving' } }))

    try {
      const updated = await setBudget(categoryId, amount)
      setBudgets((prev) => [...prev.filter((budget) => budget.category !== categoryId), updated])
      setDrafts((prev) => ({ ...prev, [categoryId]: String(updated.amount) }))
      setRowStatus((prev) => ({ ...prev, [categoryId]: { kind: 'success' } }))
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [categoryId]: { kind: 'error', message: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  async function handleClear(categoryId: string) {
    setRowStatus((prev) => ({ ...prev, [categoryId]: { kind: 'saving' } }))

    try {
      await deleteBudget(categoryId)
      setBudgets((prev) => prev.filter((budget) => budget.category !== categoryId))
      setDrafts((prev) => ({ ...prev, [categoryId]: '' }))
      setRowStatus((prev) => ({ ...prev, [categoryId]: { kind: 'success' } }))
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [categoryId]: { kind: 'error', message: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  const cardClassName =
    'mb-6 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900'
  const inputClassName =
    'rounded border border-neutral-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800'
  const primaryButtonClassName =
    'rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600'
  const secondaryButtonClassName =
    'rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-800'

  if (loading) {
    return (
      <div className={cardClassName}>
        <p className="text-neutral-600 dark:text-neutral-400">Loading…</p>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className={cardClassName}>
        <p role="alert" className="text-neutral-600 dark:text-neutral-400">
          {loadError}
        </p>
      </div>
    )
  }

  return (
    <section className={cardClassName}>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Monthly budgets
      </h2>
      <ul className="flex list-none flex-col gap-2 p-0">
        {categories.map((category) => {
          const hasExisting = budgets.some((budget) => budget.category === category._id)
          const status = rowStatus[category._id] ?? { kind: 'idle' }
          const saving = status.kind === 'saving'

          return (
            <li key={category._id} className="flex flex-wrap items-center gap-2">
              <label className="flex flex-1 items-center gap-2">
                <span className="min-w-24 text-neutral-900 dark:text-neutral-100">
                  {category.name}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`${category.name} budget amount`}
                  value={drafts[category._id] ?? ''}
                  onChange={(event) => handleDraftChange(category._id, event.target.value)}
                  className={inputClassName}
                />
              </label>
              <button
                type="button"
                onClick={() => handleSave(category._id)}
                disabled={saving}
                className={primaryButtonClassName}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => handleClear(category._id)}
                disabled={saving || !hasExisting}
                className={secondaryButtonClassName}
              >
                Clear
              </button>
              <span aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-400">
                {status.kind === 'saving' && 'Saving…'}
                {status.kind === 'success' && 'Saved ✓'}
                {status.kind === 'error' && status.message}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default BudgetSetup
