import type { NctAuthStrategy } from '../../shared/types/auth-strategy'

/**
 * Default strategy used when `crudTable.auth` is unset/`false`, or when a
 * configured `authentication` name isn't found in the registry. Every
 * method is a safe no-op: `login`/`register` return a clear rejection
 * rather than silently pretending to succeed, `logout`/`fetchUser` do
 * nothing, and no headers are ever attached. This is what makes toggling
 * `auth: false` in nuxt.config.ts (e.g. developing without a backend auth
 * setup) safe -- nct's auth plugin, `AuthForm.vue`, and any custom
 * component all fall through to the same inert behavior automatically,
 * with no per-consumer guard needed.
 */
export const noneStrategy: NctAuthStrategy = {
  mode: 'session', // no token exists to check -- loggedIn tracks `user`, which never gets set

  getAuthHeaders: () => ({}),

  async login() {
    throw new Error('Authentication is not configured for this project.')
  },

  async register() {
    throw new Error('Authentication is not configured for this project.')
  },

  async logout() {},

  async fetchUser() {
    return null
  },

  parseError: (_error, fallback) => fallback,
}
