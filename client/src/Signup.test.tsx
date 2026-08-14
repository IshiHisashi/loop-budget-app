import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Signup from './Signup.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch(options: { fail?: boolean } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/auth/signup')) {
      if (options.fail) {
        return jsonResponse({ error: 'that id is already taken' }, 409)
      }
      const body = JSON.parse(init!.body as string) as { id: string; password: string }
      expect(body).toEqual({ id: 'alice', password: 'a-good-password' })
      return jsonResponse({ ok: true }, 201)
    }

    throw new Error(`Unhandled request: ${url}`)
  })
}

function fillForm(id: string, password: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText('ID'), { target: { value: id } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: confirmPassword },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Signup', () => {
  it('renders id, password, and confirm password fields', () => {
    render(<Signup onSignupSuccess={vi.fn()} onSwitchToLogin={vi.fn()} />)

    expect(screen.getByLabelText('ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('calls onSignupSuccess after a successful signup', async () => {
    const onSignupSuccess = vi.fn()
    render(<Signup onSignupSuccess={onSignupSuccess} onSwitchToLogin={vi.fn()} />)

    fillForm('alice', 'a-good-password', 'a-good-password')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    await waitFor(() => {
      expect(onSignupSuccess).toHaveBeenCalledOnce()
    })
  })

  it('shows an inline error and does not call the API when passwords do not match', async () => {
    const onSignupSuccess = vi.fn()
    render(<Signup onSignupSuccess={onSignupSuccess} onSwitchToLogin={vi.fn()} />)

    fillForm('alice', 'a-good-password', 'a-different-password')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    await screen.findByText('Passwords do not match')
    expect(onSignupSuccess).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows the server error on a failed signup without calling onSignupSuccess', async () => {
    vi.stubGlobal('fetch', mockFetch({ fail: true }))
    const onSignupSuccess = vi.fn()
    render(<Signup onSignupSuccess={onSignupSuccess} onSwitchToLogin={vi.fn()} />)

    fillForm('alice', 'a-good-password', 'a-good-password')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    await screen.findByText('that id is already taken')
    expect(onSignupSuccess).not.toHaveBeenCalled()
  })

  it('calls onSwitchToLogin when the log-in link is clicked', () => {
    const onSwitchToLogin = vi.fn()
    render(<Signup onSignupSuccess={vi.fn()} onSwitchToLogin={onSwitchToLogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(onSwitchToLogin).toHaveBeenCalledOnce()
  })
})
