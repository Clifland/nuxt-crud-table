import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { useNctRowDelete } from '../../src/runtime/composables/useNctRowDelete'

const { hoisted } = vi.hoisted(() => ({
  hoisted: { toastAdd: vi.fn(), crudFetch: vi.fn(() => Promise.resolve(true)) },
}))

mockNuxtImport('useToast', () => () => ({ add: hoisted.toastAdd }))
mockNuxtImport('useNctCrudFetch', () => hoisted.crudFetch)

/** Mounts a throwaway component so the composable runs inside a proper Nuxt setup() context. */
async function setupComposable(resource: string | (() => string | undefined)) {
  let onDelete!: (id: number) => Promise<void>
  const TestComponent = defineComponent({
    setup() {
      ;({ onDelete } = useNctRowDelete(resource))
      return () => null
    },
  })
  await mountSuspended(TestComponent)
  return { onDelete: (id: number) => onDelete(id) }
}

describe('useNctRowDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a delete-confirmation toast with Cancel and Delete actions', async () => {
    const { onDelete } = await setupComposable('users')

    await onDelete(1)

    expect(hoisted.toastAdd).toHaveBeenCalledTimes(1)
    const toastArgs = hoisted.toastAdd.mock.calls[0]![0] as { actions: Array<{ label: string }> }
    expect(toastArgs.actions.map(a => a.label)).toEqual(['Cancel', 'Delete'])
  })

  it('calls useNctCrudFetch with DELETE, the resource, and the id only when "Delete" is clicked', async () => {
    const { onDelete } = await setupComposable('users')
    await onDelete(1)

    const toastArgs = hoisted.toastAdd.mock.calls[0]![0] as { actions: Array<{ label: string, onClick: () => Promise<void> }> }
    await toastArgs.actions.find(a => a.label === 'Delete')!.onClick()

    expect(hoisted.crudFetch).toHaveBeenCalledWith('DELETE', 'users', 1)
  })

  it('does NOT call useNctCrudFetch when "Cancel" is clicked', async () => {
    const { onDelete } = await setupComposable('users')
    await onDelete(1)

    const toastArgs = hoisted.toastAdd.mock.calls[0]![0] as { actions: Array<{ label: string, onClick: () => void }> }
    toastArgs.actions.find(a => a.label === 'Cancel')!.onClick()

    expect(hoisted.crudFetch).not.toHaveBeenCalled()
  })

  it('accepts a resource getter and resolves it lazily at delete time (for ChildTable, whose resource may not be defined yet)', async () => {
    let currentResource = 'users'
    const { onDelete } = await setupComposable(() => currentResource)

    currentResource = 'orderitems'
    await onDelete(5)

    const toastArgs = hoisted.toastAdd.mock.calls[0]![0] as { actions: Array<{ label: string, onClick: () => Promise<void> }> }
    await toastArgs.actions.find(a => a.label === 'Delete')!.onClick()

    expect(hoisted.crudFetch).toHaveBeenCalledWith('DELETE', 'orderitems', 5)
  })

  it('does nothing if the resource getter resolves to undefined', async () => {
    const { onDelete } = await setupComposable(() => undefined)

    await onDelete(1)

    expect(hoisted.toastAdd).not.toHaveBeenCalled()
  })
})