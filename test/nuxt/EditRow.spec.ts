import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditRow from '../../src/runtime/app/components/nct/crud/EditRow.vue'
import RowFormModal from '../../src/runtime/app/components/nct/crud/RowFormModal.vue'
import type { NctSchemaDefinition } from '../../src/runtime/shared/types/schema'

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

describe('EditRow.vue', () => {
  it('renders an "Edit" trigger button', async () => {
    const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
    expect(wrapper.text()).toContain('Edit')
  })

  it('passes PATCH method, resource, schema, the row id, and the row itself as initialState down to RowFormModal', async () => {
    const wrapper = await mountSuspended(EditRow, { props: { resource: 'users', row, schema } })
    const modal = wrapper.findComponent(RowFormModal)

    expect(modal.props('method')).toBe('PATCH')
    expect(modal.props('resource')).toBe('users')
    expect(modal.props('schema')).toEqual(schema)
    expect(modal.props('rowId')).toBe(42)
    expect(modal.props('initialState')).toEqual(row)
    expect(modal.props('title')).toBe('Edit users')
  })
})
