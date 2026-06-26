import { useRuntimeConfig, refreshNuxtData } from '#app'
import { crudHeaders, useToast } from '#imports'

export async function useNctCrudFetch(
  method: 'POST' | 'PATCH' | 'DELETE',
  resource: string,
  id: number | null = null,
  data: Record<string, unknown> | null = null,
) {
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
      headers: crudHeaders(),
    })

    useToast().add({
      title: toastMessage[method].title,
      description: toastMessage[method].successMessage,
      color: 'success',
    })

    await refreshNuxtData()
  }
  catch {
    useToast().add({
      title: 'Error',
      description: toastMessage[method].errorMessage,
      color: 'error',
    })
  }
}
