import { useNctCrudFetch, useToast } from '#imports'

/**
 * Shared delete-confirmation flow: shows a toast with Cancel/Delete actions,
 * dispatching the DELETE request only if confirmed.
 * @param resource - The target resource name, or a getter for it (so callers
 * whose resource may not be defined yet — e.g. ChildTable before its
 * `resource` prop resolves — can pass `() => props.resource`).
 */
export function useNctRowDelete(resource: string | (() => string | undefined)) {
  const toast = useToast()

  async function onDelete(id: number) {
    const target = typeof resource === 'function' ? resource() : resource
    if (!target) return

    toast.add({
      title: 'Delete Record',
      description: 'Are you sure you want to permanently delete this row?',
      color: 'warning',
      duration: 0,
      actions: [
        { label: 'Cancel', variant: 'ghost', color: 'neutral', onClick: () => {} },
        { label: 'Delete', color: 'error', onClick: async () => await useNctCrudFetch('DELETE', target, id) },
      ],
    })
  }

  return { onDelete }
}