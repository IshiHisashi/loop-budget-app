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

  if (loading) return <p>Loading…</p>
  if (loadError) return <p role="alert">{loadError}</p>

  return (
    <section>
      <h2>Monthly budgets</h2>
      <ul>
        {categories.map((category) => {
          const hasExisting = budgets.some((budget) => budget.category === category._id)
          const status = rowStatus[category._id] ?? { kind: 'idle' }
          const saving = status.kind === 'saving'

          return (
            <li key={category._id}>
              <label>
                {category.name}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`${category.name} budget amount`}
                  value={drafts[category._id] ?? ''}
                  onChange={(event) => handleDraftChange(category._id, event.target.value)}
                />
              </label>
              <button type="button" onClick={() => handleSave(category._id)} disabled={saving}>
                Save
              </button>
              <button
                type="button"
                onClick={() => handleClear(category._id)}
                disabled={saving || !hasExisting}
              >
                Clear
              </button>
              <span aria-live="polite">
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
