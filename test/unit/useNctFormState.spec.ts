import { describe, it, expect } from 'vitest'
import { isReactive } from 'vue'
import { useNctFormState } from '../../src/runtime/composables/useNctFormState'

describe('useNctFormState', () => {
  describe('basic hydration', () => {
    it('returns a reactive object', () => {
      const state = useNctFormState([{ name: 'title', type: 'string' }])
      expect(isReactive(state)).toBe(true)
    })

    it('hydrates fields with matching values from initialState', () => {
      const fields = [{ name: 'title', type: 'string' }, { name: 'stock', type: 'number' }]
      const state = useNctFormState(fields, { title: 'Widget', stock: 42 })
      expect(state.title).toBe('Widget')
      expect(state.stock).toBe(42)
    })

    it('defaults a field missing from initialState to an empty string, not undefined', () => {
      const fields = [{ name: 'title', type: 'string' }]
      const state = useNctFormState(fields, {})
      expect(state.title).toBe('')
    })

    it('defaults every field to an empty string when initialState is omitted entirely', () => {
      const fields = [{ name: 'title', type: 'string' }, { name: 'sku', type: 'string' }]
      const state = useNctFormState(fields)
      expect(state.title).toBe('')
      expect(state.sku).toBe('')
    })

    it('preserves falsy-but-defined values like 0 (nullish coalescing, not OR)', () => {
      const fields = [{ name: 'stock', type: 'number' }]
      const state = useNctFormState(fields, { stock: 0 })
      expect(state.stock).toBe(0)
    })

    it('preserves an explicit false for boolean fields', () => {
      const fields = [{ name: 'active', type: 'boolean' }]
      const state = useNctFormState(fields, { active: false })
      expect(state.active).toBe(false)
    })

    it('replaces an explicit null value with an empty string', () => {
      const fields = [{ name: 'title', type: 'string' }]
      const state = useNctFormState(fields, { title: null })
      expect(state.title).toBe('')
    })

    it('does not mutate the original initialState object', () => {
      const initial = { title: 'Widget' }
      useNctFormState([{ name: 'title', type: 'string' }], initial)
      expect(initial).toEqual({ title: 'Widget' })
    })

    it('processes multiple fields of mixed types independently', () => {
      const fields = [
        { name: 'title', type: 'string' },
        { name: 'stock', type: 'number' },
        { name: 'active', type: 'boolean' },
      ]
      const state = useNctFormState(fields, { title: 'Widget', stock: 5, active: true })
      expect(state).toEqual({ title: 'Widget', stock: 5, active: true })
    })
  })

  describe('date fields — formatting for datetime-local inputs', () => {
    it('formats a valid ISO date string into a "YYYY-MM-DDTHH:mm" local value', () => {
      const fields = [{ name: 'publishedAt', type: 'date' }]
      const isoInput = '2026-07-08T14:26:00.000Z'
      const state = useNctFormState(fields, { publishedAt: isoInput })

      expect(state.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

      // Round-trip check instead of a hardcoded string, so this test is
      // timezone-independent: re-parsing the local-format output (as local
      // time, same as a datetime-local input does) should land within the
      // same minute as the original timestamp.
      const roundTripped = new Date(state.publishedAt as string).getTime()
      const original = new Date(isoInput).getTime()
      expect(Math.abs(roundTripped - original)).toBeLessThan(60_000)
    })

    it('accepts a numeric timestamp as well as a string', () => {
      const fields = [{ name: 'publishedAt', type: 'date' }]
      const timestamp = new Date('2026-01-15T09:00:00.000Z').getTime()
      const state = useNctFormState(fields, { publishedAt: timestamp })

      expect(state.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      const roundTripped = new Date(state.publishedAt as string).getTime()
      expect(Math.abs(roundTripped - timestamp)).toBeLessThan(60_000)
    })

    it('leaves a date field as an empty string when initialState has no value for it', () => {
      const fields = [{ name: 'publishedAt', type: 'date' }]
      const state = useNctFormState(fields, {})
      expect(state.publishedAt).toBe('')
    })

    it('leaves a date field as an empty string when the initialState value is an empty string', () => {
      const fields = [{ name: 'publishedAt', type: 'date' }]
      const state = useNctFormState(fields, { publishedAt: '' })
      expect(state.publishedAt).toBe('')
    })

    it('guards against unparseable date values (e.g. MySQL zero-date) without throwing', () => {
      const fields = [{ name: 'publishedAt', type: 'date' }]

      // This is the exact regression case: `"0000-00-00 00:00:00"` is truthy
      // as a string, so a naive `if (value)` guard lets it through — but
      // `new Date(...)` on it produces an Invalid Date, and calling
      // `.toISOString()` on that throws `RangeError: Invalid time value`.
      expect(() => {
        useNctFormState(fields, { publishedAt: '0000-00-00 00:00:00' })
      }).not.toThrow()

      const state = useNctFormState(fields, { publishedAt: '0000-00-00 00:00:00' })
      expect(state.publishedAt).toBe('')
    })

    it('guards against any other unparseable string without throwing', () => {
      const fields = [{ name: 'publishedAt', type: 'date' }]
      expect(() => {
        useNctFormState(fields, { publishedAt: 'not-a-date-at-all' })
      }).not.toThrow()
      const state = useNctFormState(fields, { publishedAt: 'not-a-date-at-all' })
      expect(state.publishedAt).toBe('')
    })

    it('does not apply date formatting to non-date field types, even with a date-like value', () => {
      const fields = [{ name: 'note', type: 'string' }]
      const state = useNctFormState(fields, { note: '2026-07-08T14:26:00.000Z' })
      expect(state.note).toBe('2026-07-08T14:26:00.000Z')
    })
  })
})