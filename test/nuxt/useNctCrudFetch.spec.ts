import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { hoisted } = vi.hoisted(() => ({
  hoisted: {
    fetchMock: vi.fn(),
    toastAdd: vi.fn(),
    refreshNuxtDataMock: vi.fn(),
    apiBase: 'http://localhost:8000/api/',
  },
}))

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app')>()
  return {
    ...actual,
    useRuntimeConfig: () => ({ public: { crudTable: { apiBase: hoisted.apiBase } } }),
    refreshNuxtData: hoisted.refreshNuxtDataMock,
  }
})

mockNuxtImport('useNctHeaders', () => () => ({ Accept: 'application/json' }))
mockNuxtImport('useToast', () => () => ({ add: hoisted.toastAdd }))

const { useNctCrudFetch } = await import('../../src/runtime/composables/useNctCrudFetch')

beforeEach(() => {
  vi.clearAllMocks()
  hoisted.apiBase = 'http://localhost:8000/api/'
  hoisted.fetchMock.mockReset().mockResolvedValue({ success: true })
  vi.stubGlobal('$fetch', hoisted.fetchMock)
})

describe('useNctCrudFetch', () => {
  describe('URL construction', () => {
    it('POST: hits the base resource endpoint (no id)', async () => {
      await useNctCrudFetch('POST', 'users', null, { name: 'New User' })
      expect(hoisted.fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/users',
        expect.objectContaining({ method: 'POST', body: { name: 'New User' } }),
      )
    })

    it('PATCH: hits /resource/:id', async () => {
      await useNctCrudFetch('PATCH', 'users', 42, { name: 'Updated' })
      expect(hoisted.fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/users/42',
        expect.objectContaining({ method: 'PATCH', body: { name: 'Updated' } }),
      )
    })

    it('DELETE: hits /resource/:id', async () => {
      await useNctCrudFetch('DELETE', 'users', 42)
      expect(hoisted.fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/users/42',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('trims any number of trailing slashes from apiBase', async () => {
      hoisted.apiBase = 'http://localhost:8000/api///'
      await useNctCrudFetch('POST', 'users', null, { name: 'X' })
      expect(hoisted.fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/users', expect.anything())
    })
  })

  describe('request body and headers', () => {
    it('omits the body key entirely when data is null (e.g. DELETE)', async () => {
      await useNctCrudFetch('DELETE', 'users', 42)
      const [, options] = hoisted.fetchMock.mock.calls[0]!
      expect(options).not.toHaveProperty('body')
    })

    it('passes through headers from useNctHeaders()', async () => {
      await useNctCrudFetch('POST', 'users', null, { name: 'X' })
      expect(hoisted.fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { Accept: 'application/json' } }),
      )
    })
  })

  describe('success path', () => {
    it('shows a success toast with resource-specific messaging on POST', async () => {
      await useNctCrudFetch('POST', 'users', null, { name: 'X' })
      expect(hoisted.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'users created',
        description: 'A new users was added successfully.',
        color: 'success',
      }))
    })

    it('includes the record id in the success message on PATCH', async () => {
      await useNctCrudFetch('PATCH', 'orders', 7, { status: 'shipped' })
      expect(hoisted.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'orders updated',
        description: 'orders #7 was updated successfully.',
      }))
    })

    it('includes the record id in the success message on DELETE', async () => {
      await useNctCrudFetch('DELETE', 'orders', 7)
      expect(hoisted.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'orders deleted',
        description: 'Row 7 deleted.',
      }))
    })

    it('calls refreshNuxtData() exactly once after a successful mutation', async () => {
      await useNctCrudFetch('POST', 'users', null, { name: 'X' })
      expect(hoisted.refreshNuxtDataMock).toHaveBeenCalledTimes(1)
    })

    it('resolves to true on success', async () => {
      const result = await useNctCrudFetch('POST', 'users', null, { name: 'X' })
      expect(result).toBe(true)
    })
  })

  describe('failure path', () => {
    beforeEach(() => {
      hoisted.fetchMock.mockReset().mockRejectedValue(new Error('Network error'))
    })

    it('never throws or rejects — the error is swallowed internally, resolving to false', async () => {
      await expect(useNctCrudFetch('POST', 'users', null, { name: 'X' })).resolves.toBe(false)
    })

    it('shows an error toast instead of a success toast', async () => {
      await useNctCrudFetch('POST', 'users', null, { name: 'X' })
      expect(hoisted.toastAdd).toHaveBeenCalledTimes(1)
      expect(hoisted.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        description: 'Could not save users',
        color: 'error',
      }))
    })

    it('includes the record id in the error message on PATCH', async () => {
      await useNctCrudFetch('PATCH', 'orders', 9, { status: 'x' })
      expect(hoisted.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Could not update orders #9',
      }))
    })

    it('includes the record id in the error message on DELETE', async () => {
      await useNctCrudFetch('DELETE', 'orders', 9)
      expect(hoisted.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Could not delete orders #9',
      }))
    })

    it('does NOT call refreshNuxtData when the mutation fails', async () => {
      await useNctCrudFetch('DELETE', 'users', 5)
      expect(hoisted.refreshNuxtDataMock).not.toHaveBeenCalled()
    })

    it('resolves to false on failure — callers can now branch on this (fixed)', async () => {
      const result = await useNctCrudFetch('PATCH', 'users', 5, { name: 'X' })
      expect(result).toBe(false)
    })
  })
})