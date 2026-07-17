import { useUserSession } from '#imports'
import type { NctAuthStrategy } from '../../shared/types/auth-strategy'

/**
 * Delegates entirely to `nuxt-auth-utils`' own session — it already persists
 * and auto-rehydrates the logged-in user via its httpOnly session cookie and
 * its own app plugin, so nct's job here is just to trigger the host app's
 * `/api/login`/`/api/register`/`/api/logout` routes and then tell
 * `useUserSession` to refresh, rather than tracking a parallel copy of the
 * user in nct's own `useState`.
 */
export const nuxtAuthUtilsStrategy: NctAuthStrategy = {
  mode: 'session',

  getAuthHeaders: () => ({}), // the session cookie covers the host app's own /api/* routes automatically

  useSession: () => {
    const { user, loggedIn, fetch, clear } = useUserSession()
    return {
      user,
      loggedIn,
      refresh: fetch,
      clear,
    }
  },

  async login(credentials) {
    await $fetch('/api/login', { method: 'POST', body: credentials })
    // caller (useNctAuth) refreshes the session afterward via useSession().refresh()
  },

  async register(details) {
    await $fetch('/api/register', { method: 'POST', body: details })
  },

  async logout() {
    await $fetch('/api/logout', { method: 'POST' })
  },

  async fetchUser() {
    return null // handled reactively via useSession(); not used for this strategy
  },

  parseError: (err, fallback) => err?.data?.statusMessage ?? err?.data?.message ?? fallback,
}