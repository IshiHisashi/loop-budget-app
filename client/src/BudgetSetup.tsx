import { useEffect, useRef, useState } from 'react'
import { Category, createCategory, deleteCategory, getCategories } from './api/categories.ts'
import { Budget, getBudgets, setBudget } from './api/budgets.ts'
import { DeleteIcon, EditIcon } from './icons.tsx'
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
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function statusTextClassName(status: RowStatus): string {
  if (status.kind === 'success') return 'text-sm text-green-600 dark:text-green-400'
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addStatus, setAddStatus] = useState<RowStatus>({ kind: 'idle' })
  const addSuccessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<RowStatus>({ kind: 'idle' })
  const deletingCategoryIdRef = useRef(deletingCategoryId)

  useEffect(() => {
    editingCategoryIdRef.current = editingCategoryId
  }, [editingCategoryId])

  useEffect(() => {
    deletingCategoryIdRef.current = deletingCategoryId
  }, [deletingCategoryId])

  useEffect(() => {
    return () => {
      clearTimeout(addSuccessTimer.current)
    }
  }, [])

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

  function scheduleAddSuccessReset() {
    clearTimeout(addSuccessTimer.current)
    addSuccessTimer.current = setTimeout(() => {
      setAddStatus({ kind: 'idle' })
      setIsAddModalOpen(false)
    }, 3000)
  }

  function handleOpenAdd() {
    clearTimeout(addSuccessTimer.current)
    setNewCategoryName('')
    setAddStatus({ kind: 'idle' })
    setIsAddModalOpen(true)
  }

  function handleCancelAdd() {
    if (addStatus.kind === 'saving') return
    clearTimeout(addSuccessTimer.current)
    setNewCategoryName('')
    setAddStatus({ kind: 'idle' })
    setIsAddModalOpen(false)
  }

  async function handleAdd() {
    clearTimeout(addSuccessTimer.current)
    const name = newCategoryName.trim()
    if (!name) {
      setAddStatus({ kind: 'error', message: 'Enter a category name' })
      return
    }

    setAddStatus({ kind: 'saving' })
    try {
      const created = await createCategory(name)
      setCategories((prev) => [...prev, created])
      setNewCategoryName('')
      setAddStatus({ kind: 'success' })
      scheduleAddSuccessReset()
    } catch (err) {
      setAddStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  function handleOpenDelete(categoryId: string) {
    setDeletingCategoryId(categoryId)
    setDeleteStatus({ kind: 'idle' })
  }

  function handleCancelDelete() {
    if (deleteStatus.kind === 'saving') return
    setDeletingCategoryId(null)
    setDeleteStatus({ kind: 'idle' })
  }

  async function handleConfirmDelete() {
    if (!deletingCategoryId) return
    const targetId = deletingCategoryId
    setDeleteStatus({ kind: 'saving' })
    try {
      await deleteCategory(targetId)
      setCategories((prev) => prev.filter((category) => category._id !== targetId))
      setBudgets((prev) => prev.filter((budget) => budget.category !== targetId))
      if (deletingCategoryIdRef.current === targetId) {
        setDeletingCategoryId(null)
        setDeleteStatus({ kind: 'idle' })
      }
    } catch (err) {
      if (deletingCategoryIdRef.current === targetId) {
        setDeleteStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
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
  const deletingCategory = categories.find((category) => category._id === deletingCategoryId) ?? null
  const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.amount, 0)

  return (
    <section className={cardClassName}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Monthly budgets
        </h2>
        <button type="button" onClick={handleOpenAdd} className={primaryButtonClassName}>
          + Add category
        </button>
      </div>

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

      <Modal open={isAddModalOpen} onClose={handleCancelAdd} title="Add category">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleAdd()
          }}
          className="flex flex-col gap-3"
        >
          <label className={labelClassName}>
            Name
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
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

      <Modal open={deletingCategoryId !== null} onClose={handleCancelDelete} title="Delete category">
        <div className="flex flex-col gap-3">
          {deletingCategory && (
            <p className="text-neutral-700 dark:text-neutral-300">
              Delete &ldquo;{deletingCategory.name}&rdquo;?
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
              <button
                type="button"
                aria-label="Delete category"
                title={category.isDefault ? "Predefined categories can't be deleted" : undefined}
                disabled={category.isDefault}
                onClick={() => handleOpenDelete(category._id)}
                className={iconButtonClassName}
              >
                <DeleteIcon />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4 font-medium text-neutral-900 dark:border-neutral-700 dark:text-neutral-100">
        <span>Total budgeted</span>
        <span>${totalBudgeted.toFixed(2)}</span>
      </div>
    </section>
  )
}

export default BudgetSetup
