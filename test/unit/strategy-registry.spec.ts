import { describe, it, expect } from 'vitest'
import { nctAuthStrategies, registerNctAuthStrategy } from '../../src/runtime/auth/strategy-registry'
import type { NctAuthStrategy } from '../../src/runtime/shared/types/auth-strategy'

describe('nctAuthStrategies (built-in registry)', () => {
  it('ships sanctum, fastapi, fortify, and nuxt-auth-utils by default', () => {
    expect(Object.keys(nctAuthStrategies)).toEqual(
      expect.arrayContaining(['sanctum', 'fastapi', 'fortify', 'nuxt-auth-utils']),
    )
  })

  it('registers token-mode strategies for the bearer-token backends', () => {
    expect(nctAuthStrategies.sanctum?.mode).toBe('token')
    expect(nctAuthStrategies.fastapi?.mode).toBe('token')
  })

  it('registers session-mode strategies for the cookie-session backends', () => {
    expect(nctAuthStrategies.fortify?.mode).toBe('session')
    expect(nctAuthStrategies['nuxt-auth-utils']?.mode).toBe('session')
  })
})

describe('registerNctAuthStrategy', () => {
  const fakeStrategy: NctAuthStrategy = {
    mode: 'token',
    getAuthHeaders: () => ({}),
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    fetchUser: async () => null,
    parseError: (_e, fallback) => fallback,
  }

  it('adds a new strategy under a custom name', () => {
    registerNctAuthStrategy('my-custom-backend', fakeStrategy)
    expect(nctAuthStrategies['my-custom-backend']).toBe(fakeStrategy)
  })

  it('overrides an existing key without affecting other registered strategies', () => {
    const original = nctAuthStrategies.fastapi
    const override: NctAuthStrategy = { ...fakeStrategy, mode: 'session' }

    registerNctAuthStrategy('fastapi', override)

    expect(nctAuthStrategies.fastapi).toBe(override)
    expect(nctAuthStrategies.fastapi).not.toBe(original)
    expect(nctAuthStrategies.sanctum).toBeDefined() // untouched

    // restore, so this test doesn't leak state into other spec files
    registerNctAuthStrategy('fastapi', original!)
  })
})
