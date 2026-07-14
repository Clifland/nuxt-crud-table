import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import RowFormModal from '../../src/runtime/app/components/nct/crud/RowFormModal.vue'
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

interface RowFormModalInstance {
  open: boolean
  loading: boolean
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

describe('RowFormModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.crudFetch.mockResolvedValue(true)
  })

  afterEach(() => {
    // UModal's #content slot is teleported to document.body — clear it
    // between tests so leftover teleported markup from one test can't
    // leak into another's assertions.
    document.body.innerHTML = ''
  })

  describe('create flow (method="POST")', () => {
    it('calls useNctCrudFetch with POST, the resource, a null id, and the submitted data', async () => {
      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'POST', title: 'Add New User' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance

      await instance.onSubmit({ name: 'New User' })

      expect(hoisted.crudFetch).toHaveBeenCalledWith('POST', 'users', null, { name: 'New User' })
    })

    it('ignores a rowId prop even if one is mistakenly passed alongside method="POST"', async () => {
      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'POST', rowId: 99, title: 'Add New User' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance

      await instance.onSubmit({ name: 'New User' })

      expect(hoisted.crudFetch).toHaveBeenCalledWith('POST', 'users', null, { name: 'New User' })
    })
  })

  describe('edit flow (method="PATCH")', () => {
    it('calls useNctCrudFetch with PATCH, the resource, the rowId, and the submitted data', async () => {
      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'PATCH', rowId: 42, title: 'Edit users' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance

      await instance.onSubmit({ name: 'Updated Name' })

      expect(hoisted.crudFetch).toHaveBeenCalledWith('PATCH', 'users', 42, { name: 'Updated Name' })
    })
  })

  describe('shared submit lifecycle', () => {
    it('closes the modal after a successful submission', async () => {
      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'POST', title: 'Add New User' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance
      instance.open = true

      await instance.onSubmit({ name: 'New User' })

      expect(instance.open).toBe(false)
    })

    it('does NOT close the modal when the submission fails', async () => {
      hoisted.crudFetch.mockResolvedValue(false)
      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'POST', title: 'Add New User' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance
      instance.open = true

      await instance.onSubmit({ name: 'New User' })

      expect(instance.open).toBe(true)
    })

    it('sets loading to true while the request is in flight, and false once it settles', async () => {
      let resolveFetch!: (value: boolean) => void
      hoisted.crudFetch.mockImplementation(() => new Promise<boolean>((resolve) => {
        resolveFetch = resolve
      }))

      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'POST', title: 'Add New User' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance

      const submitPromise = instance.onSubmit({ name: 'New User' })
      expect(instance.loading).toBe(true)

      resolveFetch(true)
      await submitPromise

      expect(instance.loading).toBe(false)
    })

    it('sets loading back to false even when the submission fails', async () => {
      hoisted.crudFetch.mockResolvedValue(false)
      const wrapper = await mountSuspended(RowFormModal, {
        props: { resource: 'users', schema, method: 'POST', title: 'Add New User' },
      })
      const instance = wrapper.vm as unknown as RowFormModalInstance

      await instance.onSubmit({ name: 'New User' })

      expect(instance.loading).toBe(false)
    })
  })

  it('shows a fallback message when schema is falsy, even though the prop is typed as required', async () => {
    const wrapper = await mountSuspended(RowFormModal, {
      props: {
        resource: 'users',
        schema: undefined as unknown as NctSchemaDefinition,
        method: 'POST',
        title: 'Add New User',
      },
    })
    const instance = wrapper.vm as unknown as RowFormModalInstance
    instance.open = true
    await nextTick()

    expect(document.body.textContent).toContain('No schema provided for users')
  })
})