import type { NctAuthContext, NctAuthStrategy } from '../shared/types/auth-strategy'
import type { NctUser } from '../shared/types/auth'

interface CookieSessionStrategyConfig {
  loginPath?: string
  registerPath?: string
  logoutPath?: string
  sessionPath?: string
  extractErrorMessage: (error: any, fallback: string) => string
  /**
   * Optional pre-flight hook, run before login/register. Exists for
   * CSRF-cookie-first backends -- Fortify's SPA mode requires a
   * `GET /sanctum/csrf-cookie` before any stateful POST -- without forcing
   * that request on backends that don't need it (nuxt-auth-utils).
   */
  beforeAuth?: (ctx: NctAuthContext) => Promise<void>
}

/**
 * Shared shape for any backend that authenticates via an httpOnly session
 * cookie rather than a bearer token nct has to carry around (nuxt-auth-utils,
 * Fortify's SPA mode). No token to store or attach -- the browser handles
 * the cookie automatically.
 */
export function createCookieSessionStrategy(config: CookieSessionStrategyConfig): NctAuthStrategy {
  const {
    loginPath = '/api/login',
    registerPath = '/api/register',
    logoutPath = '/api/logout',
    sessionPath = '/api/_auth/session',
    extractErrorMessage,
    beforeAuth,
  } = config

  return {
    mode: 'session',

    getAuthHeaders: () => ({}),

    async login(credentials, ctx) {
      await beforeAuth?.(ctx)
      const res = await $fetch<{ user: NctUser }>(loginPath, { method: 'POST', body: credentials })
      ctx.setSession(res.user, null)
    },

    async register(details, ctx) {
      await beforeAuth?.(ctx)
      const res = await $fetch<{ user: NctUser }>(registerPath, { method: 'POST', body: details })
      ctx.setSession(res.user, null)
    },

    async logout(ctx) {
      await $fetch(logoutPath, { method: 'POST', headers: ctx.useNctHeaders() })
    },

    async fetchUser(ctx) {
      const res = await $fetch<{ user: NctUser } | null>(sessionPath, { headers: ctx.useNctHeaders() })
      return res?.user ?? null
    },

    parseError: extractErrorMessage,
  }
}