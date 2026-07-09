import { useNuxtApp } from '#app'

export function useNctHeaders(): Record<string, string> {
  const nuxtApp = useNuxtApp()
  // call the user-provided function if it exists, otherwise no-op
  const customHeaders = nuxtApp.$nctAuthHeaders?.() ?? {}
  return {
    Accept: 'application/json',
    ...customHeaders,
  }
}
