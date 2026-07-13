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
    it('passes the row directly to the props config mapping structure', async () => {
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })

      // Asserts that the component accepts and holds the prop correctly
      expect(wrapper.props('row')).toEqual(row)
      expect(wrapper.props('schema')).toEqual(schema)
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

    it('preserves the original row prop configuration on a failed submission', async () => {
      hoisted.crudFetch.mockResolvedValue(false)
      const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
      const instance = wrapper.vm as unknown as EditRowInstance
      instance.open = true
      await nextTick()

      await instance.onSubmit({ name: 'Attempted Update' })

      expect(wrapper.props('row')).toEqual(row)
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
