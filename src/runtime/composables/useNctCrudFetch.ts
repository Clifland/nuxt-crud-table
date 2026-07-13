import { useRuntimeConfig, refreshNuxtData } from '#app'
import { useNctHeaders, useToast } from '#imports'

/**
 * A shared utility composable for handling state-mutating HTTP requests (`POST`, `PATCH`, `DELETE`)
 * against backend resource endpoints. Handles automatic endpoint resolution, injection of global headers,
 * UI toast alerts for successes or errors, and reactive data cache busting via `refreshNuxtData`.
 *
 * @example
 * ```ts
 * // Create a record
 * const success = await useNctCrudFetch('POST', 'users', null, { name: 'John Doe' })
 * if (success) {
 * // e.g. close a modal, reset a form
 * }
 * ```
 *
 * @param method - The structural mutation HTTP request method to execute.
 * @param resource - The name of the target resource endpoint (e.g., 'users', 'posts').
 * @param id - The record unique ID identifier (required for 'PATCH' and 'DELETE').
 * @param data - The payload body data to pass to the request server context.
 * @returns Resolves to `true` once the mutation completes and cache tags are invalidated,
 * or `false` if the request failed — a toast is shown either way, but callers that need to gate follow-up
 * behavior (e.g. only closing a modal on success) should check this return value rather than assuming success.
 */
export async function useNctCrudFetch(
  method: 'POST' | 'PATCH' | 'DELETE',
  resource: string,
  id: number | null = null,
  data: Record<string, unknown> | null = null,
): Promise<boolean> {
  const { apiBase } = useRuntimeConfig().public.crudTable

  const toastMessage: Record<
    'POST' | 'PATCH' | 'DELETE',
    { title: string, successMessage: string, errorMessage: string }
  > = {
    POST: {
      title: `${resource} created`,
      successMessage: `A new ${resource} was added successfully.`,
      errorMessage: `Could not save ${resource}`,
    },
    PATCH: {
      title: `${resource} updated`,
      successMessage: `${resource} #${id} was updated successfully.`,
      errorMessage: `Could not update ${resource} #${id}`,
    },
    DELETE: {
      title: `${resource} deleted`,
      successMessage: `Row ${id} deleted.`,
      errorMessage: `Could not delete ${resource} #${id}`,
    },
  }

  try {
    const baseEndpoint = apiBase.replace(/\/+$/, '')
    const url = method === 'PATCH' || method === 'DELETE'
      ? `${baseEndpoint}/${resource}/${id}`
      : `${baseEndpoint}/${resource}`

    await $fetch(url, {
      method,
      ...(data && { body: data }),
      headers: useNctHeaders(),
    })

    useToast().add({
      title: toastMessage[method].title,
      description: toastMessage[method].successMessage,
      color: 'success',
    })

    await refreshNuxtData()
    return true
  }
  catch {
    useToast().add({
      title: 'Error',
      description: toastMessage[method].errorMessage,
      color: 'error',
    })
    return false
  }
}