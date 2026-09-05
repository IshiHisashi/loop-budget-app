import { Fragment, useEffect, useRef, useState } from 'react'
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
import { groupExpensesByDate } from './groupExpensesByDate.ts'
import { DeleteIcon, EditIcon } from './icons.tsx'
import Modal from './Modal.tsx'
import { truncateNote } from './noteTruncation.ts'
import {
  cardClassName as baseCardClassName,
  iconButtonClassName,
  inputClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from './theme.ts'

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

const toggleButtonClassName =
  'text-sm font-medium text-rose-600 underline hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300'

function NoteCell({ note }: { note: string }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!note) return <>—</>

  const { display, isTruncated } = truncateNote(note)
  if (!isTruncated) return <>{display}</>

  if (isExpanded) {
    return (
      <span>
        {note}{' '}
        <button
          type="button"
          aria-expanded={true}
          className={toggleButtonClassName}
          onClick={() => setIsExpanded(false)}
        >
          less
        </button>
      </span>
    )
  }

  return (
    <span>
      {display}{' '}
      <button
        type="button"
        aria-expanded={false}
        className={toggleButtonClassName}
        onClick={() => setIsExpanded(true)}
      >
        more
      </button>
    </span>
  )
}

function ExpenseLog() {
  const [month, setMonth] = useState(currentMonth())
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft)
  const [addStatus, setAddStatus] = useState<RowStatus>({ kind: 'idle' })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft)
  const [editStatus, setEditStatus] = useState<RowStatus>({ kind: 'idle' })

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<RowStatus>({ kind: 'idle' })

  const addSuccessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())
  const monthRef = useRef(month)
  const editingIdRef = useRef(editingId)
  const deletingIdRef = useRef(deletingId)

  useEffect(() => {
    monthRef.current = month
  }, [month])

  useEffect(() => {
    editingIdRef.current = editingId
  }, [editingId])

  useEffect(() => {
    deletingIdRef.current = deletingId
  }, [deletingId])

  useEffect(() => {
    return () => {
      clearTimeout(addSuccessTimer.current)
      clearTimeout(highlightTimer.current)
    }
  }, [])

  function handleDayClick(day: string) {
    clearTimeout(highlightTimer.current)
    const target = expenses.find((expense) => expense.date.slice(0, 10) === day)
    const targetRow = target && rowRefs.current.get(target._id)
    targetRow?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedDay(day)
    highlightTimer.current = setTimeout(() => setHighlightedDay(null), 1500)
  }

  function scheduleAddSuccessReset() {
    clearTimeout(addSuccessTimer.current)
    addSuccessTimer.current = setTimeout(() => {
      setAddStatus({ kind: 'idle' })
      setIsAddModalOpen(false)
    }, 3000)
  }

  function handleCancelAdd() {
    if (addStatus.kind === 'saving') return
    clearTimeout(addSuccessTimer.current)
    setNewDraft(emptyDraft)
    setAddStatus({ kind: 'idle' })
    setIsAddModalOpen(false)
  }

  function handleOpenEdit(expense: Expense) {
    setEditingId(expense._id)
    setEditDraft(toDraft(expense))
    setEditStatus({ kind: 'idle' })
  }

  function handleCancelEdit() {
    if (editStatus.kind === 'saving') return
    setEditingId(null)
    setEditDraft(emptyDraft)
    setEditStatus({ kind: 'idle' })
  }

  function handleOpenDelete(id: string) {
    setDeletingId(id)
    setDeleteStatus({ kind: 'idle' })
  }

  function handleCancelDelete() {
    if (deleteStatus.kind === 'saving') return
    setDeletingId(null)
    setDeleteStatus({ kind: 'idle' })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    clearTimeout(highlightTimer.current)
    setHighlightedDay(null)
    setEditingId(null)
    setEditStatus({ kind: 'idle' })
    setDeletingId(null)
    setDeleteStatus({ kind: 'idle' })
    Promise.all([getCategories(), getExpenses(month)])
      .then(([categoriesResult, expensesResult]) => {
        if (cancelled) return
        setCategories(categoriesResult)
        setExpenses(expensesResult)
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
      }
      setNewDraft((prev) => ({ ...emptyDraft, date: prev.date, category: prev.category }))
      setAddStatus({ kind: 'success' })
      scheduleAddSuccessReset()
    } catch (err) {
      setAddStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return
    const targetId = editingId
    const parsed = parseDraft(editDraft)
    if (!parsed) {
      setEditStatus({ kind: 'error', message: 'Enter a date, category, and a positive amount' })
      return
    }

    setEditStatus({ kind: 'saving' })
    try {
      const updated = await updateExpense(targetId, parsed)
      if (updated.date.slice(0, 7) === monthRef.current) {
        setExpenses((prev) =>
          sortByDateDesc(prev.map((expense) => (expense._id === targetId ? updated : expense)))
        )
      } else {
        setExpenses((prev) => prev.filter((expense) => expense._id !== targetId))
      }
      if (editingIdRef.current === targetId) {
        setEditingId(null)
        setEditDraft(emptyDraft)
        setEditStatus({ kind: 'idle' })
      }
    } catch (err) {
      if (editingIdRef.current === targetId) {
        setEditStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    const targetId = deletingId
    setDeleteStatus({ kind: 'saving' })
    try {
      await deleteExpense(targetId)
      setExpenses((prev) => prev.filter((expense) => expense._id !== targetId))
      if (deletingIdRef.current === targetId) {
        setDeletingId(null)
        setDeleteStatus({ kind: 'idle' })
      }
    } catch (err) {
      if (deletingIdRef.current === targetId) {
        setDeleteStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  const cardClassName = `${baseCardClassName} mb-6`
  const deletingExpense = expenses.find((expense) => expense._id === deletingId) ?? null
  const deletingCategoryName = deletingExpense
    ? (categories.find((category) => category._id === deletingExpense.category)?.name ??
      deletingExpense.category)
    : null

  return (
    <section className={cardClassName}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Expenses</h2>
        {!loading && !loadError && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={primaryButtonClassName}
          >
            + Add expense
          </button>
        )}
      </div>

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
          <ExpenseCalendar month={month} expenses={expenses} onDayClick={handleDayClick} />

          <Modal open={isAddModalOpen} onClose={handleCancelAdd} title="Add expense">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleAdd()
              }}
              className="flex flex-col gap-3"
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
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={addStatus.kind === 'saving'}
                    className={primaryButtonClassName}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    disabled={addStatus.kind === 'saving'}
                    className={secondaryButtonClassName}
                  >
                    Cancel
                  </button>
                  <span aria-live="polite" className={statusTextClassName(addStatus)}>
                    {addStatus.kind === 'saving' && 'Saving…'}
                    {addStatus.kind === 'error' && addStatus.message}
                  </span>
                </div>
              )}
            </form>
          </Modal>

          <Modal open={editingId !== null} onClose={handleCancelEdit} title="Edit expense">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleSaveEdit()
              }}
              className="flex flex-col gap-3"
            >
              <label className={labelClassName}>
                Date
                <input
                  type="date"
                  value={editDraft.date}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, date: event.target.value }))
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
                  value={editDraft.amount}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  className={inputClassName}
                />
              </label>
              <label className={labelClassName}>
                Category
                <select
                  value={editDraft.category}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, category: event.target.value }))
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
                  value={editDraft.note}
                  onChange={(event) =>
                    setEditDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                  className={inputClassName}
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={editStatus.kind === 'saving'}
                  className={primaryButtonClassName}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={editStatus.kind === 'saving'}
                  className={secondaryButtonClassName}
                >
                  Cancel
                </button>
                <span aria-live="polite" className={statusTextClassName(editStatus)}>
                  {editStatus.kind === 'saving' && 'Saving…'}
                  {editStatus.kind === 'error' && editStatus.message}
                </span>
              </div>
            </form>
          </Modal>

          <Modal open={deletingId !== null} onClose={handleCancelDelete} title="Delete expense">
            <div className="flex flex-col gap-3">
              {deletingExpense && (
                <p className="text-neutral-700 dark:text-neutral-300">
                  Delete this expense — {deletingExpense.date.slice(0, 10)} · $
                  {deletingExpense.amount.toFixed(2)} · {deletingCategoryName}
                  {deletingExpense.note ? ` · ${deletingExpense.note}` : ''}?
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteStatus.kind === 'saving'}
                  className={primaryButtonClassName}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={deleteStatus.kind === 'saving'}
                  className={secondaryButtonClassName}
                >
                  Cancel
                </button>
                <span aria-live="polite" className={statusTextClassName(deleteStatus)}>
                  {deleteStatus.kind === 'saving' && 'Deleting…'}
                  {deleteStatus.kind === 'error' && deleteStatus.message}
                </span>
              </div>
            </div>
          </Modal>

          <div className="overflow-x-auto">
            <table className="mt-4 w-full border-collapse text-left">
              <tbody data-testid="expense-rows">
                {groupExpensesByDate(expenses).map((group) => (
                  <Fragment key={group.date}>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th
                        scope="rowgroup"
                        colSpan={4}
                        className="border-b border-neutral-300 px-3 py-2 text-left font-medium dark:border-neutral-600"
                      >
                        {group.date}
                      </th>
                    </tr>
                    {group.expenses.map((expense) => {
                      const isHighlighted = highlightedDay === expense.date.slice(0, 10)
                      const categoryName =
                        categories.find((category) => category._id === expense.category)
                          ?.name ?? expense.category

                      return (
                        <tr
                          key={expense._id}
                          data-testid="expense-row"
                          ref={(el) => {
                            if (el) rowRefs.current.set(expense._id, el)
                            else rowRefs.current.delete(expense._id)
                          }}
                          className={`transition-colors duration-700 ${
                            isHighlighted ? 'bg-rose-100 dark:bg-rose-900/40' : ''
                          }`}
                        >
                          <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                            ${expense.amount.toFixed(2)}
                          </td>
                          <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                            {categoryName}
                          </td>
                          <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                            <NoteCell note={expense.note ?? ''} />
                          </td>
                          <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Edit expense"
                                onClick={() => handleOpenEdit(expense)}
                                className={iconButtonClassName}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete expense"
                                onClick={() => handleOpenDelete(expense._id)}
                                className={iconButtonClassName}
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default ExpenseLog
