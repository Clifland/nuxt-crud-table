// runtime/auth/strategies/nuxt-auth-utils.ts
import { createCookieSessionStrategy } from '../create-cookie-strategy'

export const nuxtAuthUtilsStrategy = createCookieSessionStrategy({
  extractErrorMessage: (err, fallback) => err?.data?.message ?? fallback,
})