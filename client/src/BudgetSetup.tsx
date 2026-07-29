import { useEffect, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import { Budget, deleteBudget, getBudgets, setBudget } from './api/budgets.ts'

function BudgetSetup() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCategories(), getBudgets()])
      .then(([categoriesResult, budgetsResult]) => {
        setCategories(categoriesResult)
        setBudgets(budgetsResult)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleAmountChange(categoryId: string, rawValue: string) {
    try {
      const trimmed = rawValue.trim()
      const hasExisting = budgets.some((budget) => budget.category === categoryId)

      if (trimmed === '') {
        if (!hasExisting) return
        await deleteBudget(categoryId)
        setBudgets((prev) => prev.filter((budget) => budget.category !== categoryId))
        return
      }

      const amount = Number(trimmed)
      if (!Number.isFinite(amount) || amount < 0) return

      const updated = await setBudget(categoryId, amount)
      setBudgets((prev) => [
        ...prev.filter((budget) => budget.category !== categoryId),
        updated,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading) return <p>Loading…</p>
  if (error) return <p role="alert">{error}</p>

  return (
    <section>
      <h2>Monthly budgets</h2>
      <ul>
        {categories.map((category) => {
          const existing = budgets.find((budget) => budget.category === category._id)
          return (
            <li key={category._id}>
              <label>
                {category.name}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`${category.name} budget amount`}
                  defaultValue={existing ? existing.amount : ''}
                  onBlur={(event) => handleAmountChange(category._id, event.target.value)}
                />
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default BudgetSetup
