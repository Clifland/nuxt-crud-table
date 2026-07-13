import { computed } from 'vue'
import { useCookie, useRuntimeConfig, useState } from '#app'
import { useNctHeaders } from '#imports'
import type { NctUser } from '../shared/types/auth'

/**
 * A Nuxt composable providing authentication states and actions for the `nuxt-crud-table` workspace.
 * Handles token storage, user session persistence, SSR-safe states, and request headers.
 *
 * @remarks
 * `user` is typed as the shared {@link NctUser} contract (the same type `$nctUser` expects) so that
 * a plugin can `provide: { nctUser: user }` directly with no widening/casting. If your backend's
 * `/auth/login`, `/auth/register`, or `/auth/user` responses don't include `role`/`permissions`,
 * those fields simply resolve to `undefined` — permission-gated UI (`nctIsAdmin`, `nctHasPermission`)
 * will treat that as "no elevated access", same as before.
 *
 * @example
 * ```ts
 * const { user, isAuthenticated, login, logout } = useNctAuth()
 * ```
 *
 * @returns An object containing reactive authentication state and action utilities.
 */
export function useNctAuth() {
  const { apiBase } = useRuntimeConfig().public.crudTable
  const tokenCookie = useCookie<string | null>('nct_token', { path: '/', watch: true })

  // SSR-safe global states
  /** The current authentication token, synced via cookies. */
  const token = useState<string | null>('nct_auth_token', () => tokenCookie.value || null)

  /** The profile information of the currently authenticated user. */
  const user = useState<NctUser | null>('nct_auth_user', () => null)

  /** Computed boolean indicating whether a valid auth token exists. */
  const isAuthenticated = computed(() => !!token.value)

  /** Computed bearer authorization headers object derived from the active token state. */
  const authHeaders = computed<Record<string, string>>(() => ({
    ...(token.value && { Authorization: `Bearer ${token.value}` }),
  }))

  /**
   * Authenticates a user using provided credentials.
   * On success, updates local cookies, local state, and session profiles.
   *
   * @param credentials - Key-value payload consisting of user credentials (e.g., email, password).
   * @returns A promise resolving to an object indicating operations success status, accompanied by error messages if applicable.
   */
  async function login(credentials: Record<string, string>) {
    try {
      const data = await $fetch<{ token: string, user: NctUser }>(`${apiBase}/auth/login`, {
        method: 'POST',
        body: credentials,
      })

      token.value = data.token
      user.value = data.user
      tokenCookie.value = data.token

      return { success: true }
    }
    catch {
      return { success: false, error: 'Authentication failed' }
    }
  }

  /**
   * Registers a new user identity and automatically establishes an active session on success.
   *
   * @param registrationDetails - Form inputs containing registration fields (e.g., name, email, password, password_confirmation).
   * @returns A promise resolving to an object indicating operations success status, accompanied by error messages if applicable.
   */
  async function register(registrationDetails: Record<string, string>) {
    try {
      // Typically Sanctum registration return structures issue a token/user payload immediately on success
      const data = await $fetch<{ token: string, user: NctUser }>(`${apiBase}/auth/register`, {
        method: 'POST',
        body: registrationDetails,
      })

      token.value = data.token
      user.value = data.user
      tokenCookie.value = data.token

      return { success: true }
    }
    catch {
      return {
        success: false,
        error: 'Registration failed. Please check your details.',
      }
    }
  }

  /**
   * Dispatches a logout operation to the backend API pool.
   * Clears the current authentication token, active user records, and global cookie state regardless of request success.
   */
  async function logout() {
    if (!token.value) return
    try {
      await $fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        headers: useNctHeaders(),
      })
    }
    catch {
      // Fall through safely
    }
    finally {
      token.value = null
      user.value = null
      tokenCookie.value = null
    }
  }

  /**
   * Populates the active user data object by fetching the logged-in profile context from the target backend API.
   * Reverts session parameters and logs out automatically if the verification sequence fails.
   */
  async function fetchUser() {
    if (!token.value) return
    try {
      user.value = await $fetch<NctUser>(`${apiBase}/auth/user`, {
        headers: useNctHeaders(),
      })
    }
    catch {
      logout()
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    authHeaders,
    login,
    register,
    logout,
    fetchUser,
  }
}
