import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CreateRow from '../../src/runtime/app/components/nct/crud/CreateRow.vue'
import RowFormModal from '../../src/runtime/app/components/nct/crud/RowFormModal.vue'
import type { NctSchemaDefinition } from '../../src/runtime/shared/types/schema'

const schema: NctSchemaDefinition = {
  resource: 'users',
  labelField: 'name',
  fields: [{ name: 'name', type: 'string', required: true }],
}

describe('CreateRow.vue', () => {
  it('derives a singular, capitalized resource name for the "Add New X" button label', async () => {
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    expect(wrapper.text()).toContain('Add New User')
  })

  it('passes POST method, resource, schema, and a matching title down to RowFormModal', async () => {
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema } })
    const modal = wrapper.findComponent(RowFormModal)

    expect(modal.props('method')).toBe('POST')
    expect(modal.props('resource')).toBe('users')
    expect(modal.props('schema')).toEqual(schema)
    expect(modal.props('title')).toBe('Add New User')
    expect(modal.props('rowId')).toBeUndefined()
  })

  it('forwards an optional initialState prop through to RowFormModal (e.g. a parent FK pre-fill)', async () => {
    const initialState = { customer_id: 7 }
    const wrapper = await mountSuspended(CreateRow, { props: { resource: 'users', schema, initialState } })
    const modal = wrapper.findComponent(RowFormModal)

    expect(modal.props('initialState')).toEqual(initialState)
  })
})