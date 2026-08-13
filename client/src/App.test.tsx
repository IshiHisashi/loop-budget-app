import { render, screen } from '@testing-library/react'
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
  return vi.fn(async (url: string) => {
    if (url.endsWith('/api/auth/me')) {
      return options.authenticated
        ? jsonResponse({ ok: true })
        : jsonResponse({ error: 'authentication required' }, 401)
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
})
