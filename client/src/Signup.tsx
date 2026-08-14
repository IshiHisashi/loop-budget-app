import { FormEvent, useState } from 'react'
import { signup } from './api/auth.ts'

type Status = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'error'; message: string }

interface SignupProps {
  onSignupSuccess: () => void
  onSwitchToLogin: () => void
}

function Signup({ onSignupSuccess, onSwitchToLogin }: SignupProps) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (password !== confirmPassword) {
      setStatus({ kind: 'error', message: 'Passwords do not match' })
      return
    }

    setStatus({ kind: 'submitting' })
    try {
      await signup(id, password)
      onSignupSuccess()
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  const cardClassName =
    'mx-auto mt-24 max-w-sm rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900'
  const inputClassName =
    'rounded border border-neutral-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800'
  const labelClassName = 'flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300'
  const primaryButtonClassName =
    'rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600'

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className={cardClassName}>
        <h1 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Loop Budget
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className={labelClassName}>
            ID
            <input
              type="text"
              value={id}
              onChange={(event) => setId(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
            />
          </label>
          <button
            type="submit"
            disabled={status.kind === 'submitting'}
            className={primaryButtonClassName}
          >
            Sign up
          </button>
          {status.kind === 'error' && (
            <span role="alert" className="text-sm text-red-600 dark:text-red-400">
              {status.message}
            </span>
          )}
        </form>
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          Have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}

export default Signup
