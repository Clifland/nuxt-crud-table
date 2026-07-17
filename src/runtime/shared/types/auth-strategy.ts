import type { NctUser } from './auth'

export interface NctAuthContext {
  apiBase: string
  token: string | null
  useNctHeaders: () => Record<string, string>
  setSession: (user: NctUser | null, token: string | null) => void
}

export interface NctAuthStrategy {
  /**
   * `'token'`: backend returns a bearer token on login (Sanctum, FastAPI) --
   * `useNctAuth`'s `loggedIn` can check synchronously via the stored token.
   * `'session'`: backend sets an httpOnly cookie (nuxt-auth-utils, Fortify's
   * SPA mode) -- JS never sees a token, so `loggedIn` can only be known for
   * certain once `fetch()` has resolved a user.
   */
  mode: 'token' | 'session'
  getAuthHeaders(token: string | null): Record<string, string>
  login(credentials: Record<string, string>, ctx: NctAuthContext): Promise<void>
  register(details: Record<string, string>, ctx: NctAuthContext): Promise<void>
  logout(ctx: NctAuthContext): Promise<void>
  fetchUser(ctx: NctAuthContext): Promise<NctUser | null>
  /**
   * Normalizes a caught `$fetch` error into a display string. Each backend
   * shapes its validation error body differently (Laravel's `{ message }`
   * vs FastAPI's `{ detail }`), so this can't be one hardcoded lookup.
   */
  parseError(error: unknown, fallback: string): string
}