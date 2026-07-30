import { useEffect, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import {
  createExpense,
  deleteExpense,
  Expense,
  ExpenseInput,
  getExpenses,
  updateExpense,
} from './api/expenses.ts'

type RowStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

interface Draft {
  date: string
  amount: string
  category: string
  note: string
}

function toDraft(expense: Expense): Draft {
  return {
    date: expense.date.slice(0, 10),
    amount: String(expense.amount),
    category: expense.category,
    note: expense.note ?? '',
  }
}

function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date))
}

function parseDraft(draft: Draft): ExpenseInput | null {
  if (!draft.date || !draft.category) return null
  const amount = Number(draft.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return {
    date: draft.date,
    amount,
    category: draft.category,
    note: draft.note.trim(),
  }
}

const emptyDraft: Draft = {
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  category: '',
  note: '',
}

function ExpenseLog() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [edits, setEdits] = useState<Record<string, Draft>>({})
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft)
  const [addStatus, setAddStatus] = useState<RowStatus>({ kind: 'idle' })

  useEffect(() => {
    Promise.all([getCategories(), getExpenses()])
      .then(([categoriesResult, expensesResult]) => {
        setCategories(categoriesResult)
        setExpenses(expensesResult)
        setEdits(
          Object.fromEntries(expensesResult.map((expense) => [expense._id, toDraft(expense)]))
        )
        setNewDraft((prev) => ({ ...prev, category: categoriesResult[0]?._id ?? '' }))
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  function handleEditChange(id: string, field: keyof Draft, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function handleAdd() {
    const parsed = parseDraft(newDraft)
    if (!parsed) {
      setAddStatus({ kind: 'error', message: 'Enter a date, category, and a positive amount' })
      return
    }

    setAddStatus({ kind: 'saving' })
    try {
      const created = await createExpense(parsed)
      setExpenses((prev) => sortByDateDesc([...prev, created]))
      setEdits((prev) => ({ ...prev, [created._id]: toDraft(created) }))
      setNewDraft((prev) => ({ ...emptyDraft, date: prev.date, category: prev.category }))
      setAddStatus({ kind: 'success' })
    } catch (err) {
      setAddStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  async function handleSaveRow(id: string) {
    const draft = edits[id]
    const parsed = draft && parseDraft(draft)
    if (!parsed) {
      setRowStatus((prev) => ({
        ...prev,
        [id]: { kind: 'error', message: 'Enter a date, category, and a positive amount' },
      }))
      return
    }

    setRowStatus((prev) => ({ ...prev, [id]: { kind: 'saving' } }))
    try {
      const updated = await updateExpense(id, parsed)
      setExpenses((prev) =>
        sortByDateDesc(prev.map((expense) => (expense._id === id ? updated : expense)))
      )
      setEdits((prev) => ({ ...prev, [id]: toDraft(updated) }))
      setRowStatus((prev) => ({ ...prev, [id]: { kind: 'success' } }))
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [id]: { kind: 'error', message: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  async function handleDeleteRow(id: string) {
    setRowStatus((prev) => ({ ...prev, [id]: { kind: 'saving' } }))
    try {
      await deleteExpense(id)
      setExpenses((prev) => prev.filter((expense) => expense._id !== id))
      setEdits((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setRowStatus((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [id]: { kind: 'error', message: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  if (loading) return <p>Loading…</p>
  if (loadError) return <p role="alert">{loadError}</p>

  return (
    <section>
      <h2>Expenses</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          handleAdd()
        }}
      >
        <label>
          Date
          <input
            type="date"
            value={newDraft.date}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, date: event.target.value }))}
          />
        </label>
        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={newDraft.amount}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, amount: event.target.value }))}
          />
        </label>
        <label>
          Category
          <select
            value={newDraft.category}
            onChange={(event) =>
              setNewDraft((prev) => ({ ...prev, category: event.target.value }))
            }
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note
          <input
            type="text"
            value={newDraft.note}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, note: event.target.value }))}
          />
        </label>
        <button type="submit" disabled={addStatus.kind === 'saving'}>
          Add
        </button>
        <span aria-live="polite">
          {addStatus.kind === 'saving' && 'Saving…'}
          {addStatus.kind === 'success' && 'Added ✓'}
          {addStatus.kind === 'error' && addStatus.message}
        </span>
      </form>

      <ul>
        {expenses.map((expense) => {
          const draft = edits[expense._id] ?? toDraft(expense)
          const status = rowStatus[expense._id] ?? { kind: 'idle' }
          const saving = status.kind === 'saving'

          return (
            <li key={expense._id}>
              <input
                type="date"
                aria-label="Expense date"
                value={draft.date}
                onChange={(event) => handleEditChange(expense._id, 'date', event.target.value)}
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                aria-label="Expense amount"
                value={draft.amount}
                onChange={(event) => handleEditChange(expense._id, 'amount', event.target.value)}
              />
              <select
                aria-label="Expense category"
                value={draft.category}
                onChange={(event) =>
                  handleEditChange(expense._id, 'category', event.target.value)
                }
              >
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                aria-label="Expense note"
                value={draft.note}
                onChange={(event) => handleEditChange(expense._id, 'note', event.target.value)}
              />
              <button type="button" onClick={() => handleSaveRow(expense._id)} disabled={saving}>
                Save
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRow(expense._id)}
                disabled={saving}
              >
                Delete
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

export default ExpenseLog
