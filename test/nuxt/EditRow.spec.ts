import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import EditRow from '../../src/runtime/app/components/nct/crud/EditRow.vue'
import type { NctSchemaDefinition } from '../../src/runtime/shared/types/schema'

const { hoisted } = vi.hoisted(() => ({
  hoisted: { crudFetch: vi.fn() },
}))

mockNuxtImport('useNctCrudFetch', () => hoisted.crudFetch)

const schema: NctSchemaDefinition = {
  resource: 'users',
  labelField: 'name',
  fields: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'createdAt', type: 'date' },
  ],
}

const row = { id: 42, name: 'Cliford', createdAt: '2026-01-01T00:00:00.000Z' }

interface EditRowInstance {
  open: boolean
  loading: boolean
  state: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

describe('EditRow.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.crudFetch.mockResolvedValue(true)
  })

  afterEach(() => {
    // UModal's #content slot is teleported to document.body, outside the
    // mounted wrapper's own DOM tree, and isn't cleaned up automatically —
    // clear it between tests so leftover teleported markup from one test
    // can't leak into another's assertions.
    document.body.innerHTML = ''
  })

  describe('state hydration', () => {
    it('does not build state while the modal is closed (watch has no `immediate`)', async () => {
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance
      expect(instance.state).toEqual({})
    })

    it('hydrates state from the row once the modal opens, excluding id/timestamp fields', async () => {
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance

      instance.open = true
      await nextTick()

      expect(instance.state).toHaveProperty('name', 'Cliford')
      expect(instance.state).not.toHaveProperty('id')
      expect(instance.state).not.toHaveProperty('createdAt')
    })
  })

  describe('submission', () => {
    it('calls useNctCrudFetch with PATCH, the resource, the row id, and the submitted data', async () => {
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance

      await instance.onSubmit({ name: 'Updated Name' })

      expect(hoisted.crudFetch).toHaveBeenCalledWith('PATCH', 'users', 42, { name: 'Updated Name' })
    })

    it('closes the modal after a successful submission', async () => {
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance
      instance.open = true
      await nextTick()

      await instance.onSubmit({ name: 'Updated Name' })

      expect(instance.open).toBe(false)
    })

    it('does NOT close the modal when the submission fails', async () => {
      hoisted.crudFetch.mockResolvedValue(false)
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance
      instance.open = true
      await nextTick()

      await instance.onSubmit({ name: 'Updated Name' })

      expect(instance.open).toBe(true)
    })

    it('preserves in-progress edit state on a failed submission, since state is never reset on failure', async () => {
      hoisted.crudFetch.mockResolvedValue(false)
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance
      instance.open = true
      await nextTick()

      const beforeState = { ...instance.state }
      await instance.onSubmit({ name: 'Attempted Update' })

      // EditRow's `state` ref is a one-way hydration source, only rebuilt by
      // the open-transition watcher — onSubmit never writes back to it
      // regardless of outcome (Form.vue owns the live editing state).
      expect(instance.state).toEqual(beforeState)
    })

    it('sets loading to true while the request is in flight, and false once it settles', async () => {
      let resolveFetch!: (value: boolean) => void
      hoisted.crudFetch.mockImplementation(() => new Promise<boolean>((resolve) => { resolveFetch = resolve }))

      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance

      const submitPromise = instance.onSubmit({ name: 'Updated Name' })
      expect(instance.loading).toBe(true)

      resolveFetch(true)
      await submitPromise

      expect(instance.loading).toBe(false)
    })

    it('sets loading back to false even when the submission fails', async () => {
      hoisted.crudFetch.mockResolvedValue(false)
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance

      await instance.onSubmit({ name: 'Updated Name' })

      expect(instance.loading).toBe(false)
    })
  })

  it('shows a fallback message when schema is falsy, even though the prop is typed as required', async () => {
    const wrapper = await mountSuspended(EditRow, {
      props: { resource: 'users', row, schema: undefined as unknown as NctSchemaDefinition },
    })
    const instance = wrapper.vm as unknown as EditRowInstance
    instance.open = true
    await nextTick()

    expect(document.body.textContent).toContain('No schema provided for users')
  })
})