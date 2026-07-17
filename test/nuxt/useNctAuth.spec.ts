import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import { useNctAuth } from '../../src/runtime/composables/useNctAuth'
import { registerNctAuthStrategy } from '../../src/runtime/auth/strategy-registry'
import type { NctAuthStrategy } from '../../src/runtime/shared/types/auth-strategy'

let authConfig: { authentication: string } | false = { authentication: 'test-token-strategy' }

let stateStore: Map<string, ReturnType<typeof ref>>
let cookieStore: Map<string, ReturnType<typeof ref>>

function fakeUseState<T>(key: string, init: () => T) {
  if (!stateStore.has(key)) stateStore.set(key, ref(init()))
  return stateStore.get(key)!
}

function fakeUseCookie<T>(key: string) {
  if (!cookieStore.has(key)) cookieStore.set(key, ref(null as T | null))
  return cookieStore.get(key)!
}

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app')>()
  return {
    ...actual,
    useRuntimeConfig: () => ({ public: { crudTable: { apiBase: '/api/_nac', auth: authConfig } } }),
    useState: (key: string, init: () => unknown) => fakeUseState(key, init),
    useCookie: (key: string) => fakeUseCookie(key),
  }
})

mockNuxtImport('useNctHeaders', () => () => ({ Accept: 'application/json' }))

function makeMockStrategy(mode: 'token' | 'session', overrides: Partial<NctAuthStrategy> = {}): NctAuthStrategy {
  return {
    mode,
    getAuthHeaders: token => ({ ...(token && { Authorization: `Bearer ${token}` }) }),
    login: vi.fn(async (_c, ctx) => ctx.setSession({ id: 1, name: 'Test User', email: 't@t.com' }, mode === 'token' ? 'tok-1' : null)),
    register: vi.fn(async (_d, ctx) => ctx.setSession({ id: 2, name: 'New User', email: 'n@n.com' }, mode === 'token' ? 'tok-2' : null)),
    logout: vi.fn(async () => {}),
    fetchUser: vi.fn(async () => ({ id: 1, name: 'Test User', email: 't@t.com' })),
    parseError: vi.fn((_e, fallback) => fallback),
    ...overrides,
  }
}

interface HarnessInstance {
  user: { id: number, name: string, email: string } | null
  token: string | null
  loggedIn: boolean
  authHeaders: Record<string, string>
  login: (c: Record<string, string>) => Promise<{ success: boolean, error?: string }>
  register: (d: Record<string, string>) => Promise<{ success: boolean, error?: string }>
  logout: () => Promise<void>
  fetch: () => Promise<void>
}

function mountHarness() {
  const Harness = defineComponent({
    setup: () => useNctAuth(),
    render: () => h('div'),
  })
  return mountSuspended(Harness)
}

describe('useNctAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateStore = new Map()
    cookieStore = new Map()
  })

  it('throws a descriptive error when the configured strategy is not registered', async () => {
    authConfig = { authentication: 'does-not-exist' }
    await expect(mountHarness()).rejects.toThrow(/Unknown auth strategy "does-not-exist"/)
  })

  describe('with a token-mode strategy', () => {
    beforeEach(() => {
      registerNctAuthStrategy('test-token-strategy', makeMockStrategy('token'))
      authConfig = { authentication: 'test-token-strategy' }
    })

    it('reflects loggedIn based on the presence of a stored token', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      expect(instance.loggedIn).toBe(false)

      await instance.login({ email: 't@t.com', password: 'pw' })
      await wrapper.vm.$nextTick()

      expect(instance.loggedIn).toBe(true)
      expect(instance.token).toBe('tok-1')
      expect(instance.user).toEqual({ id: 1, name: 'Test User', email: 't@t.com' })
    })

    it('returns { success: true } on successful login', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      const result = await instance.login({ email: 't@t.com', password: 'pw' })

      expect(result).toEqual({ success: true })
    })

    it('returns { success: false, error } via the strategy\'s parseError on a failed login', async () => {
      const strategy = makeMockStrategy('token', {
        login: vi.fn(async () => { throw { data: { message: 'Bad credentials' } } }),
        parseError: (err, fallback) => err?.data?.message ?? fallback,
      })
      registerNctAuthStrategy('test-token-strategy', strategy)

      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      const result = await instance.login({ email: 'x', password: 'y' })

      expect(result).toEqual({ success: false, error: 'Bad credentials' })
    })

    it('returns { success: true } on successful register, populating user/token', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      const result = await instance.register({ name: 'New User', email: 'n@n.com', password: 'pw' })
      await wrapper.vm.$nextTick()

      expect(result).toEqual({ success: true })
      expect(instance.user).toEqual({ id: 2, name: 'New User', email: 'n@n.com' })
      expect(instance.token).toBe('tok-2')
    })

    it('clears the local session on logout even if the strategy\'s network logout call throws', async () => {
      const strategy = makeMockStrategy('token', {
        logout: vi.fn(async () => { throw new Error('network down') }),
      })
      registerNctAuthStrategy('test-token-strategy', strategy)

      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      await instance.login({ email: 't@t.com', password: 'pw' })
      await wrapper.vm.$nextTick()
      expect(instance.loggedIn).toBe(true)

      await instance.logout()
      await wrapper.vm.$nextTick()

      expect(instance.loggedIn).toBe(false)
      expect(instance.user).toBeNull()
      expect(instance.token).toBeNull()
    })

    it('fetch() populates the user on success', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      await instance.fetch()
      await wrapper.vm.$nextTick()

      expect(instance.user).toEqual({ id: 1, name: 'Test User', email: 't@t.com' })
    })

    it('fetch() clears the session when the strategy resolves no user', async () => {
      const strategy = makeMockStrategy('token', { fetchUser: vi.fn(async () => null) })
      registerNctAuthStrategy('test-token-strategy', strategy)

      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      await instance.fetch()
      await wrapper.vm.$nextTick()

      expect(instance.user).toBeNull()
    })

    it('fetch() clears the session (without throwing) when the strategy call rejects', async () => {
      const strategy = makeMockStrategy('token', {
        fetchUser: vi.fn(async () => { throw new Error('401') }),
      })
      registerNctAuthStrategy('test-token-strategy', strategy)

      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      await expect(instance.fetch()).resolves.toBeUndefined()
      await wrapper.vm.$nextTick()

      expect(instance.user).toBeNull()
    })

    it('derives authHeaders from the strategy\'s getAuthHeaders using the current token', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      await instance.login({ email: 't@t.com', password: 'pw' })
      await wrapper.vm.$nextTick()

      expect(instance.authHeaders).toEqual({ Authorization: 'Bearer tok-1' })
    })
  })

  describe('with a session-mode strategy', () => {
    beforeEach(() => {
      registerNctAuthStrategy('test-session-strategy', makeMockStrategy('session'))
      authConfig = { authentication: 'test-session-strategy' }
    })

    it('reflects loggedIn based on the presence of a resolved user, not a token (no token ever exists)', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      expect(instance.loggedIn).toBe(false)

      await instance.login({ email: 't@t.com', password: 'pw' })
      await wrapper.vm.$nextTick()

      expect(instance.token).toBeNull()
      expect(instance.loggedIn).toBe(true) // driven by `user`, not `token`
    })

    it('getAuthHeaders never attaches an Authorization header', async () => {
      const wrapper = await mountHarness()
      const instance = wrapper.vm as unknown as HarnessInstance

      await instance.login({ email: 't@t.com', password: 'pw' })
      await wrapper.vm.$nextTick()

      expect(instance.authHeaders).toEqual({})
    })
  })
})
