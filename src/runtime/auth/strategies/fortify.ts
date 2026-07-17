// runtime/auth/strategies/fortify.ts
import { createCookieSessionStrategy } from '../create-cookie-strategy'

/** Targets Laravel Fortify's controllers running behind Sanctum's SPA
 * (stateful-domain) session guard -- the standard setup for a decoupled
 * frontend authenticating against a separate Laravel API origin. */
export const fortifyStrategy = createCookieSessionStrategy({
  loginPath: '/login',
  registerPath: '/register',
  logoutPath: '/logout',
  sessionPath: '/api/user',
  beforeAuth: async () => { await $fetch('/sanctum/csrf-cookie') },
  extractErrorMessage: (err, fallback) => err?.data?.message ?? fallback,
})