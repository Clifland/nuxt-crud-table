import { createBearerTokenStrategy } from '../create-bearer-strategy'
import type { NctUser } from '../../shared/types/auth'

interface SanctumPayload {
  token: string
  user: NctUser
}

/** Targets a Laravel backend using Sanctum's token guard (e.g. scaffolded
 * via `php artisan install:api`). */
export const sanctumStrategy = createBearerTokenStrategy<SanctumPayload>({
  buildLoginBody: credentials => credentials,
  extractSession: payload => ({ user: payload.user, token: payload.token }),
  extractErrorMessage: (err, fallback) => err?.data?.message ?? fallback,
})