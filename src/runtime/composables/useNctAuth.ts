import { computed } from 'vue'
import { useCookie, useRuntimeConfig, useState } from '#app'
import { useNctHeaders } from '#imports'
import type { NctUser } from '../shared/types/auth'
import type { NctAuthContext, NctAuthStrategy } from '../shared/types/auth-strategy'
import { nctAuthStrategies } from '../auth/strategy-registry'

/**
 * Looks up a registered strategy by name, throwing if it's unknown.
 * Pulled out as its own function (rather than an inline `if (!x) throw`
 * inside `useNctAuth`) so the return type itself is `NctAuthStrategy` --
 * not `NctAuthStrategy | undefined` -- guaranteeing every closure inside
 * `useNctAuth` that captures the result (the `computed`, and the nested
 * login/register/logout/fetch functions) sees the non-optional type
 * directly, rather than relying on control-flow narrowing to survive
 * across those closure boundaries (which TS doesn't guarantee it will).
 */
function resolveAuthStrategy(name: string): NctAuthStrategy {
  const strategy = nctAuthStrategies[name]
  if (!strategy) {
    throw new Error(`[nct] Unknown auth strategy "${name}". Registered: ${Object.keys(nctAuthStrategies).join(', ')}`)
  }
  return strategy
}

/**
 * Authentication composable for nct, backed by a pluggable strategy (see
 * `../auth/strategy-registry.ts`). Selected via `crudTable.auth.authentication`
 * in `nuxt.config.ts` -- defaults to `'sanctum'`.
 *
 * `loggedIn`/`fetch` deliberately mirror `nuxt-auth-utils`' own
 * `useUserSession()` API, so a Nuxt dev already familiar with that
 * composable can adopt nct's auth layer with near-zero relearning.
 * `login`/`register` have no equivalent in `useUserSession()` -- nct still
 * needs them since it (unlike nuxt-auth-utils) has to work across multiple
 * backend auth flows, not just a single self-defined one.
 */
export function useNctAuth() {
  const { apiBase, auth } = useRuntimeConfig().public.crudTable
  const strategyName = typeof auth === 'object' ? auth.authentication : 'sanctum'
  const strategy = resolveAuthStrategy(strategyName)

  const tokenCookie = useCookie<string | null>('nct_token', { path: '/', watch: true })
  const token = useState<string | null>('nct_auth_token', () => tokenCookie.value || null)
  const user = useState<NctUser | null>('nct_auth_user', () => null)

  /**
   * Mirrors `useUserSession().loggedIn`. Token-mode strategies know this
   * synchronously; session-mode strategies can only be sure once `fetch()`
   * has resolved a user, since the session cookie itself isn't readable
   * from JS.
   */
  const loggedIn = computed(() => strategy.mode === 'token' ? !!token.value : !!user.value)

  const authHeaders = computed<Record<string, string>>(() => strategy.getAuthHeaders(token.value))

  function setSession(newUser: NctUser | null, newToken: string | null = null) {
    user.value = newUser
    token.value = newToken
    tokenCookie.value = newToken
  }

  /**
   * Local-only reset, no network call -- used when there was never a real
   * session (e.g. `fetch()` failing on a fresh visit), where hitting the
   * backend's logout endpoint would just be a wasted, noisy request.
   */
  function clearLocalSession() {
    setSession(null, null)
  }

  const context: NctAuthContext = {
    apiBase,
    get token() { return token.value },
    useNctHeaders,
    setSession,
  }

  async function login(credentials: Record<string, string>) {
    try {
      await strategy.login(credentials, context)
      return { success: true }
    }
    catch (err) {
      return { success: false, error: strategy.parseError(err, 'Authentication failed') }
    }
  }

  async function register(details: Record<string, string>) {
    try {
      await strategy.register(details, context)
      return { success: true }
    }
    catch (err) {
      return { success: false, error: strategy.parseError(err, 'Registration failed. Please check your details.') }
    }
  }

  async function logout() {
    try {
      await strategy.logout(context)
    }
    catch {
      // best-effort -- local session clears below regardless
    }
    finally {
      clearLocalSession()
    }
  }

  /** Mirrors `useUserSession().fetch()` -- (re)resolves the current user from the backend. */
  async function fetchSession() {
    try {
      const fetchedUser = await strategy.fetchUser(context)
      fetchedUser ? (user.value = fetchedUser) : clearLocalSession()
    }
    catch {
      clearLocalSession()
    }
  }

  return {
    user,
    token,
    loggedIn,
    authHeaders,
    login,
    register,
    logout,
    fetch: fetchSession,
  }
}