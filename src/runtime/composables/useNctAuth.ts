// runtime/composables/useNctAuth.ts
import { computed } from 'vue'
import { useCookie, useRuntimeConfig, useState } from '#app'
import { useNctHeaders } from '#imports'
import type { NctUser } from '../shared/types/auth'
import type { NctAuthContext } from '../shared/types/auth-strategy'
import { nctAuthStrategies } from '../auth/strategy-registry'

export function useNctAuth() {
  const { apiBase, auth } = useRuntimeConfig().public.crudTable
  
  const strategyName = typeof auth === 'object' ? auth.authentication : 'none'
  const strategy = nctAuthStrategies[strategyName]
    ?? (import.meta.dev && console.warn(`[nct] Unknown auth strategy "${strategyName}", falling back to no-op. Registered: ${Object.keys(nctAuthStrategies).join(', ')}`), nctAuthStrategies.none!)

  const tokenCookie = useCookie<string | null>('nct_token', { path: '/', watch: true })
  const token = useState<string | null>('nct_auth_token', () => tokenCookie.value || null)
  const user = useState<NctUser | null>('nct_auth_user', () => null)

  const loggedIn = computed(() => strategy.mode === 'token' ? !!token.value : !!user.value)
  const authHeaders = computed<Record<string, string>>(() => strategy.getAuthHeaders(token.value))

  function setSession(newUser: NctUser | null, newToken: string | null = null) {
    user.value = newUser
    token.value = newToken
    tokenCookie.value = newToken
  }

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

  async function fetchSession() {
    try {
      const fetchedUser = await strategy.fetchUser(context)
      fetchedUser ? (user.value = fetchedUser) : clearLocalSession()
    }
    catch {
      clearLocalSession()
    }
  }

  return { user, token, loggedIn, authHeaders, login, register, logout, fetch: fetchSession }
}