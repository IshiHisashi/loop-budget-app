import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch(options: { authenticated: boolean }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/auth/me')) {
      return options.authenticated
        ? jsonResponse({ ok: true })
        : jsonResponse({ error: 'authentication required' }, 401)
    }
    if (url.endsWith('/api/auth/signup') && init?.method === 'POST') {
      return jsonResponse({ ok: true }, 201)
    }
    // Layout's data-fetching children make their own requests once
    // mounted — not under test here, just keep them quiet.
    return jsonResponse([])
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the login form on a real 401 (not the unreachable message)', async () => {
    vi.stubGlobal('fetch', mockFetch({ authenticated: false }))
    render(<App />)

    await screen.findByRole('button', { name: 'Log in' })
    expect(screen.queryByRole('button', { name: 'Budgets' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders Layout when authenticated', async () => {
    vi.stubGlobal('fetch', mockFetch({ authenticated: true }))
    render(<App />)

    await screen.findByRole('button', { name: 'Budgets' })
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('renders an unreachable message, not the login form, when the session check fails outright', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )
    render(<App />)

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(/server is running/)
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('switches between the login and signup screens', async () => {
    vi.stubGlobal('fetch', mockFetch({ authenticated: false }))
    render(<App />)

    await screen.findByRole('button', { name: 'Log in' })

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument()
  })

  it('renders Layout after a successful signup', async () => {
    vi.stubGlobal('fetch', mockFetch({ authenticated: false }))
    render(<App />)

    await screen.findByRole('button', { name: 'Log in' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-good-password' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'a-good-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Budgets' })).toBeInTheDocument()
    })
  })
})
