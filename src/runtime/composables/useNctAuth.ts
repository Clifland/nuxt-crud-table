import { computed } from 'vue'
import { useCookie, useRuntimeConfig, useState } from '#app'
import { useNctHeaders } from '#imports'
import type { NctUser } from '../shared/types/auth'
import type { NctAuthContext } from '../shared/types/auth-strategy'
import { nctAuthStrategies } from '../auth/strategy-registry'

/**
 * Optional quick-start auth composable powering `NctAuthForm` — selects and
 * drives a pluggable {@link NctAuthStrategy} (`sanctum`, `fastapi`, `fortify`,
 * or `nuxt-auth-utils`, chosen via `crudTable.auth.authentication`) behind a
 * single, backend-agnostic login/register/logout API.
 *
 * @remarks
 * This is a convenience layer for prototyping or projects happy to lean on
 * one of nct's built-in strategies — it is **not** how nct's permission
 * system gets its user. `nctHasPermission`/`nctHasRowPermission` and friends
 * (see `abilities.ts`) only ever read `$nctUser`, provided via a host app
 * plugin (see `types.d.ts`). Wiring that plugin's `nctUser`/`nctAuthHeaders`
 * from this composable's `user`/`authHeaders` is one valid way to populate
 * it — but any other auth source works exactly as well, since nothing else
 * in nct calls this composable.
 *
 * Strategies whose `mode` is `'token'` (Sanctum, FastAPI) persist their
 * token in an `nct_token` cookie and a matching `useState`, restored on
 * next load. Strategies that supply {@link NctAuthStrategy.useSession}
 * (currently only `nuxt-auth-utils`) bypass that local state entirely and
 * defer to the external store's own persisted session instead — see that
 * field's doc comment for why.
 *
 * @example
 * ```ts
 * const { user, loggedIn, login, register, logout } = useNctAuth()
 * const result = await login({ email, password })
 * if (!result.success) console.error(result.error)
 * ```
 *
 * @returns Reactive session state (`user`, `token`, `loggedIn`, `authHeaders`)
 * plus `login`/`register`/`logout`/`fetch` action methods.
 */
export function useNctAuth() {
  const { apiBase, auth } = useRuntimeConfig().public.crudTable

  const strategyName = typeof auth === 'object' ? auth.authentication : 'none'
  const strategy = nctAuthStrategies[strategyName]!
  if (!strategy) {
    throw new Error(`[nct] Unknown auth strategy "${strategyName}". Registered: ${Object.keys(nctAuthStrategies).join(', ')}`)
  }
  /**
   * When the active strategy owns its own persisted, auto-rehydrating
   * session (see {@link NctAuthStrategy.useSession}), defer to it entirely
   * rather than tracking a second, disconnected copy locally.
   */
  const nativeSession = strategy.useSession?.()

  /** Persisted bearer token for `'token'`-mode strategies, restored from cookie on load. */
  const tokenCookie = useCookie<string | null>('nct_token', { path: '/', watch: true })
  const token = useState<string | null>('nct_auth_token', () => tokenCookie.value || null)
  /** nct's own local session-user state — only used when the strategy has no `useSession` of its own. */
  const fallbackUser = useState<NctUser | null>('nct_auth_user', () => null)

  /** The active user, sourced from `useSession` when available, otherwise nct's local state. */
  const user = nativeSession?.user ?? fallbackUser
  /** Whether a session is currently active. */
  const loggedIn = nativeSession
    ? nativeSession.loggedIn
    : computed(() => strategy.mode === 'token' ? !!token.value : !!user.value)
  /** Headers nct's own data fetches should attach for the current session, per the active strategy. */
  const authHeaders = computed<Record<string, string>>(() => strategy.getAuthHeaders(token.value))

  /**
   * Writes a resolved user/token into nct's local session state and cookie.
   * Not used when `nativeSession` is present — that store manages its own persistence.
   * @param newUser - The authenticated user, or `null` to clear the session.
   * @param newToken - The bearer token, if the active strategy is `'token'`-mode.
   */
  function setSession(newUser: NctUser | null, newToken: string | null = null) {
    fallbackUser.value = newUser
    token.value = newToken
    tokenCookie.value = newToken
  }

  /** Clears nct's local session state and cookie. */
  function clearLocalSession() {
    setSession(null, null)
  }

  const context: NctAuthContext = {
    apiBase,
    get token() { return token.value },
    useNctHeaders,
    setSession,
  }

  /**
   * Authenticates via the active strategy.
   * @param credentials - Backend-specific login fields (e.g. `email`, `password`).
   * @returns `{ success: true }`, or `{ success: false, error }` with a strategy-parsed message.
   */
  async function login(credentials: Record<string, string>) {
    try {
      await strategy.login(credentials, context)
      await nativeSession?.refresh()
      return { success: true }
    }
    catch (err) {
      return { success: false, error: strategy.parseError(err, 'Authentication failed') }
    }
  }

  /**
   * Registers a new account via the active strategy and establishes a session on success.
   * @param details - Backend-specific registration fields (e.g. `name`, `email`, `password`, `password_confirmation`).
   * @returns `{ success: true }`, or `{ success: false, error }` with a strategy-parsed message.
   */
  async function register(details: Record<string, string>) {
    try {
      await strategy.register(details, context)
      await nativeSession?.refresh()
      return { success: true }
    }
    catch (err) {
      return { success: false, error: strategy.parseError(err, 'Registration failed. Please check your details.') }
    }
  }

  /**
   * Ends the session on the backend (best-effort) and always clears local session state afterward,
   * regardless of whether the backend call succeeds.
   */
  async function logout() {
    try {
      await strategy.logout(context)
    }
    catch {
      // best-effort -- local session clears below regardless
    }
    finally {
      nativeSession ? await nativeSession.clear() : clearLocalSession()
    }
  }

  /**
   * Re-syncs session state — either by refreshing the strategy's own external
   * store (`useSession` strategies), or by re-fetching the user from the
   * backend and falling back to a cleared session if that fails.
   */
  async function fetchSession() {
    if (nativeSession) {
      await nativeSession.refresh()
      return
    }
    try {
      const fetchedUser = await strategy.fetchUser(context)
      fetchedUser ? (fallbackUser.value = fetchedUser) : clearLocalSession()
    }
    catch {
      clearLocalSession()
    }
  }

  return { user, token, loggedIn, authHeaders, login, register, logout, fetch: fetchSession }
}
