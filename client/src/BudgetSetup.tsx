import { useEffect, useRef, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import { Budget, getBudgets, setBudget } from './api/budgets.ts'
import { EditIcon } from './icons.tsx'
import Modal from './Modal.tsx'
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
  | { kind: 'error'; message: string }

function statusTextClassName(status: RowStatus): string {
  if (status.kind === 'error') return 'text-sm text-red-600 dark:text-red-400'
  return 'text-sm text-neutral-600 dark:text-neutral-400'
}

function BudgetSetup() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editAmountDraft, setEditAmountDraft] = useState('')
  const [editStatus, setEditStatus] = useState<RowStatus>({ kind: 'idle' })
  const editingCategoryIdRef = useRef(editingCategoryId)

  useEffect(() => {
    editingCategoryIdRef.current = editingCategoryId
  }, [editingCategoryId])

  useEffect(() => {
    Promise.all([getCategories(), getBudgets()])
      .then(([categoriesResult, budgetsResult]) => {
        setCategories(categoriesResult)
        setBudgets(budgetsResult)
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  function handleOpenEdit(category: Category) {
    const existing = budgets.find((budget) => budget.category === category._id)
    setEditingCategoryId(category._id)
    setEditAmountDraft(existing ? String(existing.amount) : '')
    setEditStatus({ kind: 'idle' })
  }

  function handleCancelEdit() {
    if (editStatus.kind === 'saving') return
    setEditingCategoryId(null)
    setEditAmountDraft('')
    setEditStatus({ kind: 'idle' })
  }

  async function handleSaveEdit() {
    if (!editingCategoryId) return
    const targetId = editingCategoryId
    const draft = editAmountDraft.trim()
    const amount = Number(draft)

    if (draft === '' || !Number.isFinite(amount) || amount < 0) {
      setEditStatus({ kind: 'error', message: 'Enter a non-negative number' })
      return
    }

    setEditStatus({ kind: 'saving' })

    try {
      const updated = await setBudget(targetId, amount)
      setBudgets((prev) => [...prev.filter((budget) => budget.category !== targetId), updated])
      if (editingCategoryIdRef.current === targetId) {
        setEditingCategoryId(null)
        setEditAmountDraft('')
        setEditStatus({ kind: 'idle' })
      }
    } catch (err) {
      if (editingCategoryIdRef.current === targetId) {
        setEditStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  const cardClassName = `${baseCardClassName} mb-6`

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

  const editingCategory = categories.find((category) => category._id === editingCategoryId) ?? null

  return (
    <section className={cardClassName}>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Monthly budgets
      </h2>

      <Modal
        open={editingCategoryId !== null}
        onClose={handleCancelEdit}
        title={editingCategory ? `Edit ${editingCategory.name} budget` : 'Edit budget'}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSaveEdit()
          }}
          className="flex flex-col gap-3"
        >
          <label className={labelClassName}>
            Amount
            <input
              type="number"
              step="0.01"
              value={editAmountDraft}
              onChange={(event) => setEditAmountDraft(event.target.value)}
              className={inputClassName}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
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

      <ul className="flex list-none flex-col gap-2 p-0">
        {categories.map((category) => {
          const budget = budgets.find((b) => b.category === category._id)

          return (
            <li
              key={category._id}
              className="flex items-center justify-between gap-2 text-neutral-900 dark:text-neutral-100"
            >
              <span>{category.name}</span>
              <span className="flex-1 text-right">
                {budget ? `$${budget.amount.toFixed(2)}` : 'Not budgeted'}
              </span>
              <button
                type="button"
                aria-label="Edit budget"
                onClick={() => handleOpenEdit(category)}
                className={iconButtonClassName}
              >
                <EditIcon />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default BudgetSetup
