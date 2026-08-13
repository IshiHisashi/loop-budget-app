import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Login from './Login.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockFetch(options: { fail?: boolean } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/auth/login')) {
      if (options.fail) {
        return jsonResponse({ error: 'invalid credentials' }, 401)
      }
      const body = JSON.parse(init!.body as string) as { id: string; password: string }
      expect(body).toEqual({ id: 'alice', password: 'secret' })
      return jsonResponse({ ok: true })
    }

    throw new Error(`Unhandled request: ${url}`)
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Login', () => {
  it('renders id and password fields', () => {
    render(<Login onLoginSuccess={vi.fn()} />)

    expect(screen.getByLabelText('ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('calls onLoginSuccess after a successful login', async () => {
    const onLoginSuccess = vi.fn()
    render(<Login onLoginSuccess={onLoginSuccess} />)

    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledOnce()
    })
  })

  it('shows an inline error on a failed login without calling onLoginSuccess', async () => {
    vi.stubGlobal('fetch', mockFetch({ fail: true }))
    const onLoginSuccess = vi.fn()
    render(<Login onLoginSuccess={onLoginSuccess} />)

    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await screen.findByText('invalid credentials')
    expect(onLoginSuccess).not.toHaveBeenCalled()
  })
})
