import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBearerTokenStrategy } from '../../src/runtime/auth/create-bearer-strategy'
import type { NctAuthContext } from '../../src/runtime/shared/types/auth-strategy'

interface TestPayload {
  token: string
  user: { id: number, name: string, email: string }
}

function makeContext(overrides: Partial<NctAuthContext> = {}): NctAuthContext {
  return {
    apiBase: '/api/_nac',
    token: null,
    useNctHeaders: () => ({ Accept: 'application/json' }),
    setSession: vi.fn(),
    ...overrides,
  }
}

describe('createBearerTokenStrategy', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
  })

  it('reports "token" mode', () => {
    const strategy = createBearerTokenStrategy<TestPayload>({
      buildLoginBody: c => c,
      extractSession: p => ({ user: p.user, token: p.token }),
      extractErrorMessage: (_e, fallback) => fallback,
    })
    expect(strategy.mode).toBe('token')
  })

  describe('getAuthHeaders', () => {
    const strategy = createBearerTokenStrategy<TestPayload>({
      buildLoginBody: c => c,
      extractSession: p => ({ user: p.user, token: p.token }),
      extractErrorMessage: (_e, fallback) => fallback,
    })

    it('returns an Authorization bearer header when a token is present', () => {
      expect(strategy.getAuthHeaders('abc123')).toEqual({ Authorization: 'Bearer abc123' })
    })

    it('returns an empty object when the token is null', () => {
      expect(strategy.getAuthHeaders(null)).toEqual({})
    })
  })

  describe('login', () => {
    it('POSTs to the default login path with the built body, then calls ctx.setSession with the extracted user/token', async () => {
      fetchMock.mockResolvedValue({ token: 'tok-1', user: { id: 1, name: 'Cliford', email: 'c@c.com' } })

      const strategy = createBearerTokenStrategy<TestPayload>({
        buildLoginBody: credentials => credentials,
        extractSession: payload => ({ user: payload.user, token: payload.token }),
        extractErrorMessage: (_e, fallback) => fallback,
      })

      const ctx = makeContext()
      await strategy.login({ email: 'c@c.com', password: 'secret' }, ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/_nac/auth/login', {
        method: 'POST',
        body: { email: 'c@c.com', password: 'secret' },
      })
      expect(ctx.setSession).toHaveBeenCalledWith({ id: 1, name: 'Cliford', email: 'c@c.com' }, 'tok-1')
    })

    it('respects a custom loginPath', async () => {
      fetchMock.mockResolvedValue({ token: 't', user: { id: 1, name: 'X', email: 'x@x.com' } })
      const strategy = createBearerTokenStrategy<TestPayload>({
        loginPath: '/custom/login',
        buildLoginBody: c => c,
        extractSession: p => ({ user: p.user, token: p.token }),
        extractErrorMessage: (_e, fallback) => fallback,
      })

      await strategy.login({}, makeContext())

      expect(fetchMock).toHaveBeenCalledWith('/api/_nac/custom/login', expect.objectContaining({ method: 'POST' }))
    })

    it('includes buildLoginHeaders output when provided (e.g. FastAPI form-urlencoded)', async () => {
      fetchMock.mockResolvedValue({ token: 't', user: { id: 1, name: 'X', email: 'x@x.com' } })
      const strategy = createBearerTokenStrategy<TestPayload>({
        buildLoginBody: () => new URLSearchParams({ username: 'x@x.com' }),
        buildLoginHeaders: () => ({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        extractSession: p => ({ user: p.user, token: p.token }),
        extractErrorMessage: (_e, fallback) => fallback,
      })

      await strategy.login({ email: 'x@x.com', password: 'pw' }, makeContext())

      const [, options] = fetchMock.mock.calls[0]!
      expect(options.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' })
      expect(options.body).toBeInstanceOf(URLSearchParams)
    })

    it('omits headers entirely when buildLoginHeaders is not provided', async () => {
      fetchMock.mockResolvedValue({ token: 't', user: { id: 1, name: 'X', email: 'x@x.com' } })
      const strategy = createBearerTokenStrategy<TestPayload>({
        buildLoginBody: c => c,
        extractSession: p => ({ user: p.user, token: p.token }),
        extractErrorMessage: (_e, fallback) => fallback,
      })

      await strategy.login({}, makeContext())

      const [, options] = fetchMock.mock.calls[0]!
      expect(options).not.toHaveProperty('headers')
    })
  })

  describe('register', () => {
    it('POSTs the raw details to the register path and calls setSession with the extracted user/token', async () => {
      fetchMock.mockResolvedValue({ token: 'tok-2', user: { id: 2, name: 'New User', email: 'n@n.com' } })
      const strategy = createBearerTokenStrategy<TestPayload>({
        buildLoginBody: c => c,
        extractSession: p => ({ user: p.user, token: p.token }),
        extractErrorMessage: (_e, fallback) => fallback,
      })

      const ctx = makeContext()
      const details = { name: 'New User', email: 'n@n.com', password: 'pw' }
      await strategy.register(details, ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/_nac/auth/register', { method: 'POST', body: details })
      expect(ctx.setSession).toHaveBeenCalledWith({ id: 2, name: 'New User', email: 'n@n.com' }, 'tok-2')
    })
  })

  describe('logout', () => {
    it('POSTs to the logout path with ctx.useNctHeaders()', async () => {
      fetchMock.mockResolvedValue(undefined)
      const strategy = createBearerTokenStrategy<TestPayload>({
        buildLoginBody: c => c,
        extractSession: p => ({ user: p.user, token: p.token }),
        extractErrorMessage: (_e, fallback) => fallback,
      })

      const ctx = makeContext({ useNctHeaders: () => ({ Authorization: 'Bearer tok-1' }) })
      await strategy.logout(ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/_nac/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer tok-1' },
      })
    })
  })

  describe('fetchUser', () => {
    const strategy = createBearerTokenStrategy<TestPayload>({
      buildLoginBody: c => c,
      extractSession: p => ({ user: p.user, token: p.token }),
      extractErrorMessage: (_e, fallback) => fallback,
    })

    it('returns null without calling $fetch when there is no token', async () => {
      const result = await strategy.fetchUser(makeContext({ token: null }))
      expect(result).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('fetches the user path with headers when a token is present', async () => {
      fetchMock.mockResolvedValue({ id: 1, name: 'Cliford', email: 'c@c.com' })
      const ctx = makeContext({ token: 'tok-1', useNctHeaders: () => ({ Authorization: 'Bearer tok-1' }) })

      const result = await strategy.fetchUser(ctx)

      expect(fetchMock).toHaveBeenCalledWith('/api/_nac/auth/user', { headers: { Authorization: 'Bearer tok-1' } })
      expect(result).toEqual({ id: 1, name: 'Cliford', email: 'c@c.com' })
    })
  })

  describe('parseError', () => {
    it('delegates directly to the configured extractErrorMessage', () => {
      const strategy = createBearerTokenStrategy<TestPayload>({
        buildLoginBody: c => c,
        extractSession: p => ({ user: p.user, token: p.token }),
        extractErrorMessage: (err, fallback) => err?.data?.message ?? fallback,
      })

      expect(strategy.parseError({ data: { message: 'Invalid credentials' } }, 'fallback')).toBe('Invalid credentials')
      expect(strategy.parseError({}, 'fallback')).toBe('fallback')
    })
  })
})
