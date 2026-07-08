import { computed } from 'vue'
import { useCookie, useRuntimeConfig, useState } from "#app"
import { useNctHeaders } from "#imports"

interface AuthUser {
  id: number
  name: string
  email: string
}

export function useNctAuth() {
  const { apiBase } = useRuntimeConfig().public.crudTable
  const tokenCookie = useCookie<string | null>('nct_token', { path: '/', watch: true })

  // SSR-safe global states
  const token = useState<string | null>('nct_auth_token', () => tokenCookie.value || null)
  const user = useState<AuthUser | null>('nct_auth_user', () => null)

  const isAuthenticated = computed(() => !!token.value)

  const authHeaders = computed<Record<string, string>>(() => ({
    ...(token.value && { Authorization: `Bearer ${token.value}` })
  }))

  async function login(credentials: Record<string, string>) {
    try {
      const data = await $fetch<{ token: string; user: AuthUser }>(`${apiBase}/auth/login`, {
        method: 'POST',
        body: credentials,
      })

      token.value = data.token
      user.value = data.user
      tokenCookie.value = data.token
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.data?.message || 'Authentication failed' }
    }
  }

  async function logout() {
    if (!token.value) return
    try {
      await $fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        headers: useNctHeaders(),
      })
    } catch {
      // Fall through safely
    } finally {
      token.value = null
      user.value = null
      tokenCookie.value = null
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      user.value = await $fetch<AuthUser>(`${apiBase}/auth/user`, {
        headers: useNctHeaders(),
      })
    } catch {
      logout()
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    authHeaders,
    login,
    logout,
    fetchUser,
  }
}