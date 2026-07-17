import type { Ref } from 'vue'
import type { NctUser } from './auth'

export interface NctAuthContext {
  apiBase: string
  token: string | null
  useNctHeaders: () => Record<string, string>
  setSession: (user: NctUser | null, token?: string | null) => void
}

export interface NctAuthStrategy {
  mode: 'token' | 'session'
  getAuthHeaders: (token: string | null) => Record<string, string>
  login: (credentials: Record<string, string>, ctx: NctAuthContext) => Promise<void>
  register: (details: Record<string, string>, ctx: NctAuthContext) => Promise<void>
  logout: (ctx: NctAuthContext) => Promise<void>
  fetchUser: (ctx: NctAuthContext) => Promise<NctUser | null>
  parseError: (error: any, fallback: string) => string
  useSession?: () => {
    user: Ref<NctUser | null>
    loggedIn: Ref<boolean>
    refresh: () => Promise<void>
    clear: () => Promise<void>
  }
}
