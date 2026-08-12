import { useEffect, useRef, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import {
  createExpense,
  deleteExpense,
  Expense,
  ExpenseInput,
  getExpenses,
  updateExpense,
} from './api/expenses.ts'
import { currentMonth } from './dateUtils.ts'
import ExpenseCalendar from './ExpenseCalendar.tsx'

type RowStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function statusTextClassName(status: RowStatus): string {
  if (status.kind === 'success') return 'text-sm text-green-600 dark:text-green-400'
  if (status.kind === 'error') return 'text-sm text-red-600 dark:text-red-400'
  return 'text-sm text-neutral-600 dark:text-neutral-400'
}

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
  const [month, setMonth] = useState(currentMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [edits, setEdits] = useState<Record<string, Draft>>({})
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft)
  const [addStatus, setAddStatus] = useState<RowStatus>({ kind: 'idle' })

  const addSuccessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rowSuccessTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const monthRef = useRef(month)

  useEffect(() => {
    monthRef.current = month
  }, [month])

  useEffect(() => {
    const rowTimers = rowSuccessTimers.current
    return () => {
      clearTimeout(addSuccessTimer.current)
      Object.values(rowTimers).forEach(clearTimeout)
    }
  }, [])

  function clearRowSuccessTimer(id: string) {
    const timer = rowSuccessTimers.current[id]
    if (timer) {
      clearTimeout(timer)
      delete rowSuccessTimers.current[id]
    }
  }

  function scheduleRowSuccessReset(id: string) {
    clearRowSuccessTimer(id)
    rowSuccessTimers.current[id] = setTimeout(() => {
      delete rowSuccessTimers.current[id]
      setRowStatus((prev) => ({ ...prev, [id]: { kind: 'idle' } }))
    }, 3000)
  }

  function scheduleAddSuccessReset() {
    clearTimeout(addSuccessTimer.current)
    addSuccessTimer.current = setTimeout(() => {
      setAddStatus({ kind: 'idle' })
    }, 3000)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSelectedDay(null)
    Promise.all([getCategories(), getExpenses(month)])
      .then(([categoriesResult, expensesResult]) => {
        if (cancelled) return
        setCategories(categoriesResult)
        setExpenses(expensesResult)
        setEdits(
          Object.fromEntries(expensesResult.map((expense) => [expense._id, toDraft(expense)]))
        )
        setNewDraft((prev) => ({ ...prev, category: categoriesResult[0]?._id ?? '' }))
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

  function handleEditChange(id: string, field: keyof Draft, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function handleAdd() {
    clearTimeout(addSuccessTimer.current)
    const parsed = parseDraft(newDraft)
    if (!parsed) {
      setAddStatus({ kind: 'error', message: 'Enter a date, category, and a positive amount' })
      return
    }

    setAddStatus({ kind: 'saving' })
    try {
      const created = await createExpense(parsed)
      if (created.date.slice(0, 7) === monthRef.current) {
        setExpenses((prev) => sortByDateDesc([...prev, created]))
        setEdits((prev) => ({ ...prev, [created._id]: toDraft(created) }))
      }
      setNewDraft((prev) => ({ ...emptyDraft, date: prev.date, category: prev.category }))
      setAddStatus({ kind: 'success' })
      scheduleAddSuccessReset()
    } catch (err) {
      setAddStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  async function handleSaveRow(id: string) {
    clearRowSuccessTimer(id)
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
      if (updated.date.slice(0, 7) === monthRef.current) {
        setExpenses((prev) =>
          sortByDateDesc(prev.map((expense) => (expense._id === id ? updated : expense)))
        )
        setEdits((prev) => ({ ...prev, [id]: toDraft(updated) }))
        setRowStatus((prev) => ({ ...prev, [id]: { kind: 'success' } }))
        scheduleRowSuccessReset(id)
      } else {
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
      }
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [id]: { kind: 'error', message: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  async function handleDeleteRow(id: string) {
    clearRowSuccessTimer(id)
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

  const cardClassName =
    'mb-6 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900'
  const inputClassName =
    'rounded border border-neutral-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800'
  const labelClassName = 'flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300'
  const primaryButtonClassName =
    'rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600'
  const secondaryButtonClassName =
    'rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-800'

  return (
    <section className={cardClassName}>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Expenses
      </h2>

      <label className={`${labelClassName} mb-6`}>
        Month
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className={`w-fit ${inputClassName}`}
        />
      </label>

      {loading && <p className="text-neutral-600 dark:text-neutral-400">Loading…</p>}
      {loadError && (
        <p role="alert" className="text-neutral-600 dark:text-neutral-400">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          <ExpenseCalendar
            month={month}
            expenses={expenses}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          {selectedDay && (
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              Showing {selectedDay} ·{' '}
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Clear
              </button>
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleAdd()
            }}
            className="mb-6 flex flex-wrap items-end gap-3 border-b border-neutral-200 pb-6 dark:border-neutral-700"
          >
            <label className={labelClassName}>
              Date
              <input
                type="date"
                value={newDraft.date}
                onChange={(event) =>
                  setNewDraft((prev) => ({ ...prev, date: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className={labelClassName}>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={newDraft.amount}
                onChange={(event) =>
                  setNewDraft((prev) => ({ ...prev, amount: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className={labelClassName}>
              Category
              <select
                value={newDraft.category}
                onChange={(event) =>
                  setNewDraft((prev) => ({ ...prev, category: event.target.value }))
                }
                className={inputClassName}
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
            <label className={labelClassName}>
              Note
              <input
                type="text"
                value={newDraft.note}
                onChange={(event) =>
                  setNewDraft((prev) => ({ ...prev, note: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            {addStatus.kind === 'success' ? (
              <span aria-live="polite" className={statusTextClassName(addStatus)}>
                Added ✓
              </span>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={addStatus.kind === 'saving'}
                  className={primaryButtonClassName}
                >
                  Add
                </button>
                <span aria-live="polite" className={statusTextClassName(addStatus)}>
                  {addStatus.kind === 'saving' && 'Saving…'}
                  {addStatus.kind === 'error' && addStatus.message}
                </span>
              </>
            )}
          </form>

          <ul className="flex list-none flex-col gap-2 p-0">
            {expenses
              .filter((expense) => !selectedDay || expense.date.slice(0, 10) === selectedDay)
              .map((expense) => {
                const draft = edits[expense._id] ?? toDraft(expense)
                const status = rowStatus[expense._id] ?? { kind: 'idle' }
                const saving = status.kind === 'saving'

                return (
                  <li key={expense._id} className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      aria-label="Expense date"
                      value={draft.date}
                      onChange={(event) =>
                        handleEditChange(expense._id, 'date', event.target.value)
                      }
                      className={inputClassName}
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      aria-label="Expense amount"
                      value={draft.amount}
                      onChange={(event) =>
                        handleEditChange(expense._id, 'amount', event.target.value)
                      }
                      className={`${inputClassName} w-24`}
                    />
                    <select
                      aria-label="Expense category"
                      value={draft.category}
                      onChange={(event) =>
                        handleEditChange(expense._id, 'category', event.target.value)
                      }
                      className={inputClassName}
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
                      onChange={(event) =>
                        handleEditChange(expense._id, 'note', event.target.value)
                      }
                      className={`${inputClassName} flex-1`}
                    />
                    {status.kind === 'success' ? (
                      <span aria-live="polite" className={statusTextClassName(status)}>
                        Saved ✓
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveRow(expense._id)}
                          disabled={saving}
                          className={primaryButtonClassName}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(expense._id)}
                          disabled={saving}
                          className={secondaryButtonClassName}
                        >
                          Delete
                        </button>
                        <span aria-live="polite" className={statusTextClassName(status)}>
                          {status.kind === 'saving' && 'Saving…'}
                          {status.kind === 'error' && status.message}
                        </span>
                      </>
                    )}
                  </li>
                )
              })}
          </ul>
        </>
      )}
    </section>
  )
}

export default ExpenseLog
