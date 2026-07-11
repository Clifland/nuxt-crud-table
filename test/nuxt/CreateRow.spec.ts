import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import CreateRow from '../../src/runtime/app/components/nct/crud/CreateRow.vue'
import type { NctSchemaDefinition } from '../../src/runtime/shared/types/schema'

const { hoisted } = vi.hoisted(() => ({
  hoisted: { crudFetch: vi.fn() },
}))

mockNuxtImport('useNctCrudFetch', () => hoisted.crudFetch)

const schema: NctSchemaDefinition = {
  resource: 'users',
  labelField: 'name',
  fields: [{ name: 'name', type: 'string', required: true }],
}

// CreateRow's own <script setup> bindings (open, loading, onSubmit) are
// accessed directly via wrapper.vm, the same pattern already used in
// Table.spec.ts — this lets us drive/assert the component's logic without
// needing NctCrudForm to actually render (it only mounts once the modal is
// open, which these tests never trigger via the UI).
interface CreateRowInstance {
  open: boolean
  loading: boolean
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

describe('CreateRow.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.crudFetch.mockResolvedValue(true)
  })

  it('derives a singular, capitalized resource name for the "Add New X" button label', async () => {
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    expect(wrapper.text()).toContain('Add New User')
  })

  it('calls useNctCrudFetch with POST, the resource, a null id, and the submitted data', async () => {
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    const instance = wrapper.vm as unknown as CreateRowInstance

    await instance.onSubmit({ name: 'New User' })

    expect(hoisted.crudFetch).toHaveBeenCalledWith('POST', 'users', null, { name: 'New User' })
  })

  it('closes the modal after a successful submission', async () => {
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    const instance = wrapper.vm as unknown as CreateRowInstance
    instance.open = true

    await instance.onSubmit({ name: 'New User' })

    expect(instance.open).toBe(false)
  })

  it('does NOT close the modal when the submission fails', async () => {
    hoisted.crudFetch.mockResolvedValue(false)
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    const instance = wrapper.vm as unknown as CreateRowInstance
    instance.open = true

    await instance.onSubmit({ name: 'New User' })

    expect(instance.open).toBe(true)
  })

  it('sets loading to true while the request is in flight, and false once it settles', async () => {
    let resolveFetch!: (value: boolean) => void
    hoisted.crudFetch.mockImplementation(() => new Promise<boolean>((resolve) => { resolveFetch = resolve }))

    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    const instance = wrapper.vm as unknown as CreateRowInstance

    const submitPromise = instance.onSubmit({ name: 'New User' })
    expect(instance.loading).toBe(true)

    resolveFetch(true)
    await submitPromise

    expect(instance.loading).toBe(false)
  })

  it('sets loading back to false even when the submission fails', async () => {
    hoisted.crudFetch.mockResolvedValue(false)
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    const instance = wrapper.vm as unknown as CreateRowInstance

    await instance.onSubmit({ name: 'New User' })

    expect(instance.loading).toBe(false)
  })

  it('shows a fallback message when schema is falsy, even though the prop is typed as required', async () => {
    // TS marks `schema` as required, but nothing prevents a caller from
    // passing a falsy value at runtime — the v-else fallback exists for
    // exactly that case. The fallback text lives inside UModal's #content
    // slot, which only mounts once the modal is open, so we open it first.
    const wrapper = await mountSuspended(CreateRow, {
      props: { resource: 'users', schema: undefined as unknown as NctSchemaDefinition },
    })
    const instance = wrapper.vm as unknown as CreateRowInstance
    instance.open = true
    await nextTick()

    expect(wrapper.text()).toContain('No schema provided for users')
  })
})