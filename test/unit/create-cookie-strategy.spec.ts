import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCookieSessionStrategy } from '../../src/runtime/auth/create-cookie-strategy'
import type { NctAuthContext } from '../../src/runtime/shared/types/auth-strategy'

function makeContext(overrides: Partial<NctAuthContext> = {}): NctAuthContext {
  return {
    apiBase: '/api/_nac',
    token: null,
    useNctHeaders: () => ({ Accept: 'application/json' }),
    setSession: vi.fn(),
    ...overrides,
  }
}

describe('createCookieSessionStrategy', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  it('reports "session" mode', () => {
    const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })
    expect(strategy.mode).toBe('session')
  })

  it('getAuthHeaders always returns an empty object (no token to attach)', () => {
    const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })
    expect(strategy.getAuthHeaders('irrelevant')).toEqual({})
    expect(strategy.getAuthHeaders(null)).toEqual({})
  })

  describe('login', () => {
    it('POSTs to the default login path and calls setSession with a null token', async () => {
      fetchMock.mockResolvedValue({ user: { id: 1, name: 'Cliford', email: 'c@c.com' } })
      const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })

      const ctx = makeContext()
      await strategy.login({ email: 'c@c.com', password: 'pw' }, ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/login', { method: 'POST', body: { email: 'c@c.com', password: 'pw' } })
      expect(ctx.setSession).toHaveBeenCalledWith({ id: 1, name: 'Cliford', email: 'c@c.com' }, null)
    })

    it('runs beforeAuth before the login request, when provided', async () => {
      fetchMock.mockResolvedValue({ user: { id: 1, name: 'X', email: 'x@x.com' } })
      const callOrder: string[] = []
      const beforeAuth = vi.fn(async () => { callOrder.push('beforeAuth') })
      fetchMock.mockImplementation(async () => {
        callOrder.push('login')
        return { user: { id: 1, name: 'X', email: 'x@x.com' } }
      })

      const strategy = createCookieSessionStrategy({ beforeAuth, extractErrorMessage: (_e, fb) => fb })
      await strategy.login({}, makeContext())

      expect(beforeAuth).toHaveBeenCalledTimes(1)
      expect(callOrder).toEqual(['beforeAuth', 'login'])
    })

    it('does not error when beforeAuth is omitted', async () => {
      fetchMock.mockResolvedValue({ user: { id: 1, name: 'X', email: 'x@x.com' } })
      const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })
      await expect(strategy.login({}, makeContext())).resolves.toBeUndefined()
    })

    it('respects a custom loginPath', async () => {
      fetchMock.mockResolvedValue({ user: { id: 1, name: 'X', email: 'x@x.com' } })
      const strategy = createCookieSessionStrategy({ loginPath: '/login', extractErrorMessage: (_e, fb) => fb })
      await strategy.login({}, makeContext())
      expect(fetchMock).toHaveBeenCalledWith('/login', expect.anything())
    })
  })

  describe('register', () => {
    it('POSTs to the register path and calls setSession with a null token', async () => {
      fetchMock.mockResolvedValue({ user: { id: 2, name: 'New', email: 'n@n.com' } })
      const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })

      const ctx = makeContext()
      const details = { name: 'New', email: 'n@n.com', password: 'pw' }
      await strategy.register(details, ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/register', { method: 'POST', body: details })
      expect(ctx.setSession).toHaveBeenCalledWith({ id: 2, name: 'New', email: 'n@n.com' }, null)
    })
  })

  describe('logout', () => {
    it('POSTs to the logout path with ctx.useNctHeaders()', async () => {
      fetchMock.mockResolvedValue(undefined)
      const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })
      const ctx = makeContext({ useNctHeaders: () => ({ Accept: 'application/json' }) })

      await strategy.logout(ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/logout', { method: 'POST', headers: { Accept: 'application/json' } })
    })
  })

  describe('fetchUser', () => {
    it('returns the resolved user on success', async () => {
      fetchMock.mockResolvedValue({ user: { id: 1, name: 'Cliford', email: 'c@c.com' } })
      const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })

      const result = await strategy.fetchUser(makeContext())
      expect(result).toEqual({ id: 1, name: 'Cliford', email: 'c@c.com' })
    })

    it('returns null when the session endpoint responds with no user', async () => {
      fetchMock.mockResolvedValue(null)
      const strategy = createCookieSessionStrategy({ extractErrorMessage: (_e, fb) => fb })

      const result = await strategy.fetchUser(makeContext())
      expect(result).toBeNull()
    })
  })
})