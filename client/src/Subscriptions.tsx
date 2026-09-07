import { useEffect, useRef, useState } from 'react'
import { Category, getCategories } from './api/categories.ts'
import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  Subscription,
  SubscriptionInput,
} from './api/subscriptions.ts'
import { currentMonth } from './dateUtils.ts'
import { DeleteIcon } from './icons.tsx'
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

interface Draft {
  name: string
  amount: string
  category: string
  dayOfMonth: string
  startMonth: string
  endMonth: string
}

const emptyDraft: Draft = {
  name: '',
  amount: '',
  category: '',
  dayOfMonth: '',
  startMonth: currentMonth(),
  endMonth: '',
}

function parseDraft(draft: Draft): SubscriptionInput | null {
  if (!draft.category || !draft.startMonth) return null
  const amount = Number(draft.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const dayOfMonth = Number(draft.dayOfMonth)
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null

  return {
    amount,
    category: draft.category,
    dayOfMonth,
    startMonth: draft.startMonth,
    ...(draft.name.trim() ? { name: draft.name.trim() } : {}),
    ...(draft.endMonth ? { endMonth: draft.endMonth } : {}),
  }
}

function Subscriptions() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft)
  const [addStatus, setAddStatus] = useState<RowStatus>({ kind: 'idle' })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const addSuccessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<RowStatus>({ kind: 'idle' })
  const deletingIdRef = useRef(deletingId)

  useEffect(() => {
    deletingIdRef.current = deletingId
  }, [deletingId])

  useEffect(() => {
    return () => {
      clearTimeout(addSuccessTimer.current)
    }
  }, [])

  useEffect(() => {
    Promise.all([getCategories(), getSubscriptions()])
      .then(([categoriesResult, subscriptionsResult]) => {
        setCategories(categoriesResult)
        setSubscriptions(subscriptionsResult)
        setNewDraft((prev) => ({ ...prev, category: categoriesResult[0]?._id ?? '' }))
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  function scheduleAddSuccessReset() {
    clearTimeout(addSuccessTimer.current)
    addSuccessTimer.current = setTimeout(() => {
      setAddStatus({ kind: 'idle' })
      setIsAddModalOpen(false)
    }, 3000)
  }

  function handleOpenAdd() {
    clearTimeout(addSuccessTimer.current)
    setNewDraft((prev) => ({ ...emptyDraft, category: prev.category }))
    setAddStatus({ kind: 'idle' })
    setIsAddModalOpen(true)
  }

  function handleCancelAdd() {
    if (addStatus.kind === 'saving') return
    clearTimeout(addSuccessTimer.current)
    setNewDraft((prev) => ({ ...emptyDraft, category: prev.category }))
    setAddStatus({ kind: 'idle' })
    setIsAddModalOpen(false)
  }

  async function handleAdd() {
    clearTimeout(addSuccessTimer.current)
    const parsed = parseDraft(newDraft)
    if (!parsed) {
      setAddStatus({
        kind: 'error',
        message: 'Enter a category, start month, positive amount, and a day of month from 1–31',
      })
      return
    }

    setAddStatus({ kind: 'saving' })
    try {
      const created = await createSubscription(parsed)
      setSubscriptions((prev) => [...prev, created])
      setNewDraft((prev) => ({ ...emptyDraft, category: prev.category }))
      setAddStatus({ kind: 'success' })
      scheduleAddSuccessReset()
    } catch (err) {
      setAddStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
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

  async function handleConfirmDelete() {
    if (!deletingId) return
    const targetId = deletingId
    setDeleteStatus({ kind: 'saving' })
    try {
      await deleteSubscription(targetId)
      setSubscriptions((prev) => prev.filter((subscription) => subscription._id !== targetId))
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

  const deletingSubscription = subscriptions.find((s) => s._id === deletingId) ?? null
  const deletingLabel = deletingSubscription
    ? (deletingSubscription.name ??
      categories.find((category) => category._id === deletingSubscription.category)?.name ??
      deletingSubscription.category)
    : null

  return (
    <section className={cardClassName}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Subscriptions
        </h2>
        <button type="button" onClick={handleOpenAdd} className={primaryButtonClassName}>
          + Add subscription
        </button>
      </div>

      <Modal open={isAddModalOpen} onClose={handleCancelAdd} title="Add subscription">
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
              value={newDraft.name}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, name: event.target.value }))}
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
            Day of month
            <input
              type="number"
              min="1"
              max="31"
              step="1"
              value={newDraft.dayOfMonth}
              onChange={(event) =>
                setNewDraft((prev) => ({ ...prev, dayOfMonth: event.target.value }))
              }
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            Start month
            <input
              type="month"
              value={newDraft.startMonth}
              onChange={(event) =>
                setNewDraft((prev) => ({ ...prev, startMonth: event.target.value }))
              }
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            End month (optional)
            <input
              type="month"
              value={newDraft.endMonth}
              onChange={(event) =>
                setNewDraft((prev) => ({ ...prev, endMonth: event.target.value }))
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

      <Modal open={deletingId !== null} onClose={handleCancelDelete} title="Delete subscription">
        <div className="flex flex-col gap-3">
          {deletingSubscription && (
            <p className="text-neutral-700 dark:text-neutral-300">
              Delete &ldquo;{deletingLabel}&rdquo;?
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
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-800">
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600">
                Name
              </th>
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600">
                Category
              </th>
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600">
                Amount
              </th>
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600">
                Day
              </th>
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600">
                Start
              </th>
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600">
                End
              </th>
              <th className="border-b border-neutral-300 px-3 py-2 font-medium dark:border-neutral-600" />
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => {
              const categoryName =
                categories.find((category) => category._id === subscription.category)?.name ??
                subscription.category

              return (
                <tr key={subscription._id}>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    {subscription.name ?? '—'}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    {categoryName}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    ${subscription.amount.toFixed(2)}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    {subscription.dayOfMonth}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    {subscription.startMonth}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    {subscription.endMonth ?? 'Ongoing'}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        aria-label="Delete subscription"
                        onClick={() => handleOpenDelete(subscription._id)}
                        className={iconButtonClassName}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Subscriptions
