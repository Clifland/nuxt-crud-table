import { createCookieSessionStrategy } from '../create-cookie-strategy'
import { asFetchError } from '../fetch-error'

/**
 * Targets `nuxt-auth-utils`' httpOnly session cookie via its own auto-registered
 * `/api/_auth/session` route.
 *
 * @remarks *
 * If you *are* using `nuxt-auth-utils` and want its auto-rehydrating session
 * state directly, call `useUserSession()` from your own app code (e.g. your
 * `$nctUser` plugin) — that's safe there, since your app has genuinely
 * installed the module. See the README's auth section.
 */
export const nuxtAuthUtilsStrategy = createCookieSessionStrategy({
  extractErrorMessage: (err, fallback) => asFetchError(err)?.data?.detail ?? fallback,
})
