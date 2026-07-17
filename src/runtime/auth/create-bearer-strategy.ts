import type { NctAuthStrategy } from '../shared/types/auth-strategy'
import type { NctUser } from '../shared/types/auth'

/**
 * The set of shapes `$fetch`'s `body` option actually accepts -- narrower
 * than `unknown`, wide enough to cover every login body shape nct's
 * built-in strategies need (a plain credentials object, or `fastapi.ts`'s
 * form-urlencoded `URLSearchParams`).
 */
type NctFetchBody = Record<string, unknown> | URLSearchParams

interface BearerStrategyConfig<TLoginPayload> {
  loginPath?: string
  registerPath?: string
  logoutPath?: string
  userPath?: string
  buildLoginBody: (credentials: Record<string, string>) => NctFetchBody
  buildLoginHeaders?: () => Record<string, string>
  extractSession: (payload: TLoginPayload) => { user: NctUser, token: string }
  extractErrorMessage: (error: any, fallback: string) => string
}

/**
 * Shared shape for any backend that authenticates via a bearer token
 * returned from login/register (Sanctum, FastAPI, ...). Only the
 * request/response shape differs between them -- the control flow is
 * identical, so it's centralized here rather than reimplemented per
 * strategy (same reasoning as `relation-fields.ts`/`dot-path.ts` elsewhere
 * in nct: extract shared logic before a third backend copies it again).
 */
export function createBearerTokenStrategy<TLoginPayload>(
  config: BearerStrategyConfig<TLoginPayload>,
): NctAuthStrategy {
  const {
    loginPath = '/auth/login',
    registerPath = '/auth/register',
    logoutPath = '/auth/logout',
    userPath = '/auth/user',
    buildLoginBody,
    buildLoginHeaders,
    extractSession,
    extractErrorMessage,
  } = config

  return {
    mode: 'token',

    getAuthHeaders: token => ({ ...(token && { Authorization: `Bearer ${token}` }) }),

    async login(credentials, ctx) {
      const res = await $fetch<TLoginPayload>(`${ctx.apiBase}${loginPath}`, {
        method: 'POST',
        body: buildLoginBody(credentials),
        ...(buildLoginHeaders && { headers: buildLoginHeaders() }),
      })
      const { user, token } = extractSession(res)
      ctx.setSession(user, token)
    },

    async register(details, ctx) {
      const res = await $fetch<TLoginPayload>(`${ctx.apiBase}${registerPath}`, {
        method: 'POST',
        body: details,
      })
      const { user, token } = extractSession(res)
      ctx.setSession(user, token)
    },

    async logout(ctx) {
      await $fetch(`${ctx.apiBase}${logoutPath}`, {
        method: 'POST',
        headers: ctx.useNctHeaders(),
      })
    },

    async fetchUser(ctx) {
      if (!ctx.token) return null
      return $fetch<NctUser>(`${ctx.apiBase}${userPath}`, {
        headers: ctx.useNctHeaders(),
      })
    },

    parseError: extractErrorMessage,
  }
}
