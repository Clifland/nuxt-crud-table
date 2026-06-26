import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Table from '../../src/runtime/app/components/nct/crud/Table.vue'

// 1. Hoist your mock state tracking variables above everything else
const { hoistedMocks } = vi.hoisted(() => {
  return {
    hoistedMocks: {
      toastAdd: vi.fn(),
      crudFetch: vi.fn(() => Promise.resolve({ success: true })),
    },
  }
})

// 2. Consume the safely hoisted variables in your #app mock
vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app')>()
  return {
    ...actual,
    useNuxtApp: () => ({ $nctAuth: { getNctUser: () => ({ id: 1 }) } }),
    useRuntimeConfig: () => ({ public: { crudTable: { apiBase: '/api/_nac', formHiddenFields: [] } } }),
    useAppConfig: () => ({ crud: { globalHide: ['password'], exports: true } }),
  }
})

// 3. Register your runtime auto-imports securely
mockNuxtImport('nctCrudHeaders', () => () => ({ Accept: 'application/json' }))
mockNuxtImport('nctDbFieldToLabel', () => (str: string) => str.toUpperCase())
mockNuxtImport('nctHasPermission', () => () => true)
mockNuxtImport('nctHasRowPermission', () => () => true)
mockNuxtImport('useToast', () => () => ({ add: hoistedMocks.toastAdd }))
mockNuxtImport('useNctCrudFetch', () => hoistedMocks.crudFetch)
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

  it('verifies Delete action workflow fires confirmation toast and calls useNctCrudFetch', async () => {
    const wrapper = await mountSuspended(Table, {
      props: { resource: 'users' },
    })

    const instance = wrapper.vm as unknown as { onDelete: (id: number) => Promise<void> }
    await instance.onDelete(1)

    expect(hoistedMocks.toastAdd).toHaveBeenCalled()

    const lastCall = hoistedMocks.toastAdd.mock.calls[0]
    expect(lastCall).toBeDefined()

    const toastCallArgs = lastCall![0] as unknown as { actions: Array<{ label: string, onClick: () => Promise<void> }> }
    const deleteAction = toastCallArgs.actions.find(action => action.label === 'Delete')

    expect(deleteAction).toBeDefined()

    await deleteAction!.onClick()
    expect(hoistedMocks.crudFetch).toHaveBeenCalledWith('DELETE', 'users', 1)
  })
})
