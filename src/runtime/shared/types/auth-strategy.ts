import type { Ref } from 'vue'
import type { NctUser } from './auth'

/**
 * Runtime context handed to every {@link NctAuthStrategy} method — bundles
 * the pieces a strategy needs to talk to the backend and report results back
 * up to `useNctAuth`, without each strategy having to reimplement session
 * bookkeeping itself.
 */
export interface NctAuthContext {
  /** The configured `crudTable.apiBase`, for strategies that call the backend's own auth endpoints directly (e.g. `sanctum`, `fastapi`). */
  apiBase: string
  /** The current bearer token, if any — `null` for session-cookie-based strategies. */
  token: string | null
  /** Returns nct's standard request headers (e.g. `Accept: application/json`), for strategies issuing their own `$fetch` calls. */
  useNctHeaders: () => Record<string, string>
  /**
   * Writes the resolved user (and, for token-mode strategies, the token)
   * back into `useNctAuth`'s local session state. Strategies that supply
   * {@link NctAuthStrategy.useSession} bypass this — their session lives in
   * an external, already-persisted store instead.
   */
  setSession: (user: NctUser | null, token?: string | null) => void
}

/**
 * The contract every nct auth strategy implements — the pluggable backend
 * behind `useNctAuth()`/`crudTable.auth`. Register a custom one via
 * `registerNctAuthStrategy` (exported from the module root) if none of the
 * built-ins (`sanctum`, `fastapi`, `fortify`, `nuxt-auth-utils`) match your
 * backend's contract.
 *
 * @remarks
 * This is entirely optional, quick-start infrastructure — nct's actual
 * permission system (`nctHasPermission`, `nctHasRowPermission`, etc.) never
 * reads from a strategy or from `useNctAuth()` directly. It only ever reads
 * `$nctUser`, provided via a host app plugin. See `types.d.ts`.
 */
export interface NctAuthStrategy {
  /**
   * Whether this strategy tracks a bearer token nct must carry and attach
   * itself (`'token'` — e.g. Sanctum, FastAPI), or relies on an httpOnly
   * session cookie the browser handles automatically (`'session'` — e.g.
   * `nuxt-auth-utils`, Fortify's SPA mode).
   */
  mode: 'token' | 'session'
  /** Builds the headers nct's own data fetches (`crudTable.apiBase`) should attach for the current token. Session-mode strategies typically return `{}`. */
  getAuthHeaders: (token: string | null) => Record<string, string>
  /** Authenticates against the backend and reports the result via `ctx.setSession` (or, for `useSession` strategies, by triggering that store's own refresh). */
  login: (credentials: Record<string, string>, ctx: NctAuthContext) => Promise<void>
  /** Registers a new account and, on success, establishes a session the same way `login` does. */
  register: (details: Record<string, string>, ctx: NctAuthContext) => Promise<void>
  /** Ends the session on the backend. Local session clearing is handled by `useNctAuth` afterward regardless of whether this throws. */
  logout: (ctx: NctAuthContext) => Promise<void>
  /** Fetches the currently authenticated user from the backend, or `null` if there isn't one. Not called for strategies that supply `useSession`. */
  fetchUser: (ctx: NctAuthContext) => Promise<NctUser | null>
  /** Maps a caught error into a human-readable message, falling back to `fallback` when the error has no usable message of its own. */
  parseError: (error: any, fallback: string) => string
  /**
   * Optional escape hatch for strategies backed by a framework that already
   * owns persisted, auto-rehydrating reactive session state (currently only
   * `nuxt-auth-utils`, via `useUserSession()`). When present, `useNctAuth`
   * uses these refs directly instead of its own `useState`-backed
   * `user`/`loggedIn` — avoiding two disconnected sources of truth that
   * drift out of sync across a page refresh (nct's local `useState` never
   * rehydrates on its own; the external store already does).
   */
  useSession?: () => {
    /** The current session user, reactively sourced from the external store. */
    user: Ref<NctUser | null>
    /** Whether a session is currently active. */
    loggedIn: Ref<boolean>
    /** Re-reads the external store after a login/register call succeeds. */
    refresh: () => Promise<void>
    /** Clears the external store's session (e.g. its own cookie/state) on logout. */
    clear: () => Promise<void>
  }
}