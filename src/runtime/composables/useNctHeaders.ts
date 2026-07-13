import { useNuxtApp } from '#app'

/**
 * A utility composable that aggregates mandatory network headers alongside
 * dynamic runtime authentication headers injected into the Nuxt application context.
 *
 * @remarks
 * This parser retrieves authorization payload tokens or custom tenant tags by safely invoking the
 * module's registered `$nctAuthHeaders` extension provider hook without interrupting the pipeline footprint.
 *
 * @example
 * ```ts
 * const headers = useNctHeaders()
 * // Returns: { Accept: 'application/json', Authorization: 'Bearer ...' }
 * ```
 *
 * @returns A composite object mapping of key-value network request headers.
 */
export function useNctHeaders(): Record<string, string> {
  const nuxtApp = useNuxtApp()
  // call the user-provided function if it exists, otherwise no-op
  const customHeaders = nuxtApp.$nctAuthHeaders?.() ?? {}
  return {
    Accept: 'application/json',
    ...customHeaders,
  }
}
