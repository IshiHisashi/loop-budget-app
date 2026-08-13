import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ApiError } from './http.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('throws an ApiError carrying the status and error message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'invalid credentials' }, 401))
    )

    await expect(apiFetch('/api/whatever')).rejects.toMatchObject({
      status: 401,
      message: 'invalid credentials',
    })
  })

  it('produces an ApiError that is still an instanceof Error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'nope' }, 500))
    )

    try {
      await apiFetch('/api/whatever')
      expect.unreachable('apiFetch should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect(err).toBeInstanceOf(Error)
    }
  })

  it('resolves the parsed JSON body on a 2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: true }))
    )

    await expect(apiFetch('/api/whatever')).resolves.toEqual({ ok: true })
  })
})
