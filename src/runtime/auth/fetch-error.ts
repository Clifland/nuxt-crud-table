import type { FetchError } from 'ofetch'

/**
 * Narrows an unknown caught error to ofetch's `FetchError` shape, if it looks
 * like one. Strategy `parseError` implementations receive `error: unknown`
 * (matching `NctAuthStrategy.parseError`'s contract) and can't type their
 * parameter as `FetchError` directly — a narrower parameter type isn't
 * assignable to a callback contractually typed to accept `unknown`.
 * @param error - The caught value to test.
 * @returns The same value narrowed to `FetchError`, or `undefined` if it doesn't look like one.
 */
export function asFetchError(error: unknown): FetchError | undefined {
  return error && typeof error === 'object' && 'data' in error
    ? (error as FetchError)
    : undefined
}
