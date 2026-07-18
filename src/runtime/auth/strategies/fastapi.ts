import { createBearerTokenStrategy } from '../create-bearer-strategy'
import type { NctUser } from '../../shared/types/auth'
import { asFetchError } from '../fetch-error'

interface FastApiTokenPayload {
  access_token: string
  user: NctUser
}

/**
 * A starting-point strategy for FastAPI, assuming the common
 * `OAuth2PasswordRequestForm` login shape (form-urlencoded `username`/
 * `password`, `{ access_token, user }` response). Not tied to any specific
 * FastAPI auth package -- if you land on one with a different contract
 * (e.g. `fastapi-users`), copy this file, adjust `buildLoginBody`/
 * `extractSession`/`extractErrorMessage`, and register it under your own
 * key via `registerNctAuthStrategy` instead of editing this one.
 */
export const fastapiStrategy = createBearerTokenStrategy<FastApiTokenPayload>({
  buildLoginBody: (credentials) => {
    const body = new URLSearchParams()
    body.append('username', credentials.email ?? '')
    body.append('password', credentials.password ?? '')
    return body
  },
  buildLoginHeaders: () => ({ 'Content-Type': 'application/x-www-form-urlencoded' }),
  extractSession: payload => ({ user: payload.user, token: payload.access_token }),
  extractErrorMessage: (err, fallback) => asFetchError(err)?.data?.detail ?? fallback,
})
