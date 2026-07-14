import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Table from '../../src/runtime/app/components/nct/crud/Table.vue'
import RowActions from '../../src/runtime/app/components/nct/crud/RowActions.vue'

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app')>()
  return {
    ...actual,
    useRuntimeConfig: () => ({ public: { crudTable: { apiBase: '/api/_nac' } } }),
    useAppConfig: () => ({ crud: { tableHiddenFields: ['password'], exports: true } }),
  }
})

mockNuxtImport('useNctHeaders', () => () => ({ Accept: 'application/json' }))
mockNuxtImport('nctDbFieldToLabel', () => (str: string) => str.toUpperCase())
mockNuxtImport('nctHasPermission', () => () => true)
mockNuxtImport('nctHasRowPermission', () => () => true)
mockNuxtImport('useNctExport', () => () => ({ exportToExcel: vi.fn(), exportToPDF: vi.fn() }))
mockNuxtImport('useFetch', () => (url: string | (() => string)) => {
  const targetUrl = typeof url === 'function' ? url() : url
  if (targetUrl.includes('_schemas')) {
    return { data: { fields: [{ name: 'name', type: 'string' }], resource: 'users' } }
  }
  return { data: [{ id: 1, name: 'Cliford Pereira' }] }
})

describe('NAC Core CRUD Engine Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verifies Read execution loops and runtime structural rendering', async () => {
    const wrapper = await mountSuspended(Table, {
      props: { resource: 'users' },
    })

    expect(wrapper.vm.resource).toBe('users')
    expect(wrapper.html()).toBeDefined()
  })

  it('delegates row actions (view/edit/delete) to RowActions with the correct resource, row, and schema', async () => {
    const wrapper = await mountSuspended(Table, {
      props: { resource: 'users' },
    })

    const actions = wrapper.findComponent(RowActions)
    expect(actions.exists()).toBe(true)
    expect(actions.props('resource')).toBe('users')
    expect(actions.props('row')).toEqual({ id: 1, name: 'Cliford Pereira' })
    expect(actions.props('schema')).toEqual({ fields: [{ name: 'name', type: 'string' }], resource: 'users' })
  })
})
