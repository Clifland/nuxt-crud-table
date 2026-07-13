import { describe, it, expect } from 'vitest'
import { useNctTableFormat } from '../../src/runtime/composables/useNctTableFormat'

const {
  formatCellValue,
  getColumnValue,
  flattenKeys,
  getArrayColumns,
  getForeignKeyColumns,
  getParentBackReferenceColumns,
} = useNctTableFormat()

describe('useNctTableFormat', () => {
  describe('formatCellValue', () => {
    it('formats a full ISO 8601 UTC string into a locale string', () => {
      const iso = '2026-07-08T14:26:00.000Z'
      const result = formatCellValue(iso)
      expect(result).toBe(new Date(iso).toLocaleString())
      expect(result).not.toBe(iso)
    })

    it('formats an ISO string without fractional seconds', () => {
      const iso = '2026-07-08T14:26:00Z'
      expect(formatCellValue(iso)).toBe(new Date(iso).toLocaleString())
    })

    it('does NOT format an ISO-like string missing the trailing "Z"', () => {
      // Local-time ISO strings (no "Z") or offset-qualified ones (+05:00)
      // don't match ISO_DATE_REGEX, so they pass through unchanged.
      const notUtc = '2026-07-08T14:26:00'
      expect(formatCellValue(notUtc)).toBe(notUtc)
    })

    it('does NOT format a date-only string (no time component)', () => {
      expect(formatCellValue('2026-07-08')).toBe('2026-07-08')
    })

    it('passes through a plain non-date string unchanged', () => {
      expect(formatCellValue('hello world')).toBe('hello world')
    })

    it('passes through numbers, booleans, null, and undefined unchanged', () => {
      expect(formatCellValue(42)).toBe(42)
      expect(formatCellValue(true)).toBe(true)
      expect(formatCellValue(null)).toBe(null)
      expect(formatCellValue(undefined)).toBe(undefined)
    })

    it('falls back to the original value when a regex-matching string is not calendar-valid (fixed)', () => {
      // Previously this silently rendered the literal text "Invalid Date".
      // Now it falls back to the original raw value instead.
      const bogus = '9999-99-99T99:99:99Z'
      expect(() => formatCellValue(bogus)).not.toThrow()
      expect(formatCellValue(bogus)).toBe(bogus)
    })
  })

  describe('getColumnValue', () => {
    it('resolves a top-level key', () => {
      expect(getColumnValue({ id: 1, name: 'Widget' }, 'name')).toBe('Widget')
    })

    it('resolves a nested dot-notation path', () => {
      const row = { author: { meta: { name: 'Alice' } } }
      expect(getColumnValue(row, 'author.meta.name')).toBe('Alice')
    })

    it('returns undefined when an intermediate segment is missing', () => {
      const row = { author: { meta: { name: 'Alice' } } }
      expect(getColumnValue(row, 'author.profile.name')).toBeUndefined()
    })

    it('returns undefined when an intermediate segment is null', () => {
      const row = { author: null }
      expect(getColumnValue(row, 'author.meta.name')).toBeUndefined()
    })

    it('returns undefined when an intermediate segment is a primitive, not an object', () => {
      const row = { author: 'Alice' }
      expect(getColumnValue(row, 'author.meta.name')).toBeUndefined()
    })
  })

  describe('flattenKeys', () => {
    it('returns top-level primitive keys as-is', () => {
      expect(flattenKeys({ id: 1, name: 'Widget' })).toEqual(['id', 'name'])
    })

    it('recurses into nested objects, producing dot-notation paths', () => {
      const row = { id: 1, product: { name: 'Widget', meta: { sku: 'W-1' } } }
      expect(flattenKeys(row)).toEqual(['id', 'product.name', 'product.meta.sku'])
    })

    it('skips a nested "id" field but keeps the top-level "id"', () => {
      const row = { id: 1, product: { id: 5, name: 'Widget' } }
      expect(flattenKeys(row)).toEqual(['id', 'product.name'])
    })

    it('excludes array-valued keys entirely, at any depth', () => {
      const row = {
        id: 1,
        tags: [{ id: 1, name: 'sale' }],
        product: { name: 'Widget', variants: [{ id: 1 }] },
      }
      expect(flattenKeys(row)).toEqual(['id', 'product.name'])
    })

    it('returns an empty array for an empty object', () => {
      expect(flattenKeys({})).toEqual([])
    })
  })

  describe('getArrayColumns', () => {
    it('detects a key whose value is a non-empty array of objects', () => {
      const row = { id: 1, orderitems: [{ id: 1, price: 10 }] }
      expect(getArrayColumns(row)).toEqual(['orderitems'])
    })

    it('excludes an empty array', () => {
      const row = { id: 1, orderitems: [] }
      expect(getArrayColumns(row)).toEqual([])
    })

    it('excludes an array of primitives (first element is not an object)', () => {
      const row = { id: 1, tags: ['sale', 'featured'] }
      expect(getArrayColumns(row)).toEqual([])
    })

    it('excludes non-array values entirely', () => {
      const row = { id: 1, name: 'Widget', meta: { a: 1 } }
      expect(getArrayColumns(row)).toEqual([])
    })

    it('detects multiple qualifying array columns', () => {
      const row = { id: 1, orderitems: [{ id: 1 }], comments: [{ id: 2 }] }
      expect(getArrayColumns(row)).toEqual(['orderitems', 'comments'])
    })
  })

  describe('getForeignKeyColumns', () => {
    it('detects a "_id" column when the matching relation object is side-loaded', () => {
      const row = { customer_id: 5, customer: { id: 5, name: 'Acme' } }
      expect(getForeignKeyColumns(row)).toEqual(['customer_id'])
    })

    it('does NOT detect a "_id" column when no relation object is side-loaded', () => {
      // A lean API response with only the scalar FK, no eager-loaded relation.
      const row = { customer_id: 5 }
      expect(getForeignKeyColumns(row)).toEqual([])
    })

    it('does not detect it when the relation key is explicitly null', () => {
      const row = { customer_id: 5, customer: null }
      expect(getForeignKeyColumns(row)).toEqual([])
    })

    it('does not detect it when the relation key is a primitive, not an object', () => {
      const row = { customer_id: 5, customer: 'Acme' }
      expect(getForeignKeyColumns(row)).toEqual([])
    })

    it('detects a camelCase "Id" suffix too, mirroring Form.vue/NameList.vue\'s dual-suffix convention (fixed)', () => {
      const row = { customerId: 5, customer: { id: 5, name: 'Acme' } }
      expect(getForeignKeyColumns(row)).toEqual(['customerId'])
    })

    it('detects both snake_case and camelCase FK columns in the same row', () => {
      const row = {
        customer_id: 5,
        customer: { id: 5, name: 'Acme' },
        productId: 9,
        product: { id: 9, name: 'Widget' },
      }
      expect(getForeignKeyColumns(row)).toEqual(['customer_id', 'productId'])
    })
  })

  describe('getParentBackReferenceColumns', () => {
    it('detects a child field ending in "_id" whose value matches the parent id', () => {
      const parent = { id: 1, num: 'ORD-1' }
      const child = { id: 10, order_id: 1, product_id: 5 }
      expect(getParentBackReferenceColumns(child, parent)).toEqual(['order_id'])
    })

    it('excludes a "_id" field whose value does not match the parent id', () => {
      const parent = { id: 1 }
      const child = { id: 10, order_id: 2 }
      expect(getParentBackReferenceColumns(child, parent)).toEqual([])
    })

    it('excludes a field matching the parent id in value but not ending in "_id"', () => {
      const parent = { id: 1 }
      const child = { id: 10, parentRef: 1 }
      expect(getParentBackReferenceColumns(child, parent)).toEqual([])
    })

    it('coerces values via Number(), matching nctIsOwner\'s convention elsewhere in the module (fixed)', () => {
      const parent = { id: 1 }
      const child = { id: 10, order_id: '1' }
      expect(getParentBackReferenceColumns(child, parent)).toEqual(['order_id'])
    })

    it('detects multiple matching back-reference columns', () => {
      const parent = { id: 1 }
      const child = { id: 10, order_id: 1, duplicate_order_id: 1 }
      expect(getParentBackReferenceColumns(child, parent)).toEqual(['order_id', 'duplicate_order_id'])
    })
  })
})
