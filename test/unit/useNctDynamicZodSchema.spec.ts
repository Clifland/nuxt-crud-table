import { describe, it, expect } from 'vitest'
import { useNctDynamicZodSchema } from '../../src/runtime/composables/useNctDynamicZodSchema'
import type { NctField } from '../../src/runtime/shared/types/schema'

describe('useNctDynamicZodSchema', () => {
  describe('required fields — create mode', () => {
    it('fails when a required string field is missing', () => {
      const fields: NctField[] = [{ name: 'name', type: 'string', required: true }]
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('passes when a required string field is present', () => {
      const fields: NctField[] = [{ name: 'name', type: 'string', required: true }]
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({ name: 'Acme' }).success).toBe(true)
    })

    it('is optional when the schema marks required: false', () => {
      const fields: NctField[] = [{ name: 'nickname', type: 'string', required: false }]
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('treats an omitted `required` key as not required', () => {
      const fields: NctField[] = [{ name: 'nickname', type: 'string' }]
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({}).success).toBe(true)
    })
  })

  describe('edit mode — every field becomes optional/nullable regardless of `required`', () => {
    it('passes even when a required field is omitted during edit', () => {
      const fields: NctField[] = [{ name: 'name', type: 'string', required: true }]
      const schema = useNctDynamicZodSchema(fields, true)
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('passes when a required field is explicitly null during edit', () => {
      const fields: NctField[] = [{ name: 'name', type: 'string', required: true }]
      const schema = useNctDynamicZodSchema(fields, true)
      expect(schema.safeParse({ name: null }).success).toBe(true)
    })

    it('still validates the field type when a value IS provided during edit', () => {
      const fields: NctField[] = [{ name: 'age', type: 'number', required: true }]
      const schema = useNctDynamicZodSchema(fields, true)
      expect(schema.safeParse({ age: 'not-a-number' }).success).toBe(false)
      expect(schema.safeParse({ age: 30 }).success).toBe(true)
    })
  })

  describe('enum fields', () => {
    const fields: NctField[] = [
      { name: 'status', type: 'enum', selectOptions: ['pending', 'shipped'], required: true },
    ]

    it('accepts a value within selectOptions', () => {
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({ status: 'pending' }).success).toBe(true)
    })

    it('rejects a value outside selectOptions', () => {
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({ status: 'archived' }).success).toBe(false)
    })

    it('falls back to a permissive string schema when selectOptions is empty', () => {
      const openFields: NctField[] = [{ name: 'status', type: 'enum', required: true }]
      const schema = useNctDynamicZodSchema(openFields, false)
      expect(schema.safeParse({ status: 'anything' }).success).toBe(true)
    })
  })

  describe('password fields', () => {
    const fields: NctField[] = [{ name: 'password', type: 'password', required: true }]

    it('enforces length + complexity rules on create', () => {
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({ password: 'weak' }).success).toBe(false) // too short, no upper/digit
      expect(schema.safeParse({ password: 'Str0ngPass' }).success).toBe(true)
    })

    it('is optional on edit, and — notably — bypasses complexity rules entirely if provided', () => {
      const schema = useNctDynamicZodSchema(fields, true)
      expect(schema.safeParse({}).success).toBe(true)
      // Documents current behavior: nctValidationRules.password(true) returns a bare
      // z.string().optional() with no regex checks, so a weak password submitted during
      // an edit (e.g. if Form.vue's password-hide-on-edit logic were ever bypassed)
      // would pass schema validation. Flip this to `false` if complexity should still
      // be enforced whenever a password value is actually present during edit.
      expect(schema.safeParse({ password: 'weak' }).success).toBe(true)
    })
  })

  describe('date fields — the datetime-local string vs z.date() mismatch', () => {
    const fields: NctField[] = [{ name: 'publishedAt', type: 'date', required: true }]

    it('documents that z.date() rejects the "YYYY-MM-DDTHH:mm" string Form.vue actually submits', () => {
      const schema = useNctDynamicZodSchema(fields, false)
      // useNctFormState() and <UInput type="datetime-local"> both produce/consume
      // plain strings like "2026-07-08T14:26" — never a real JS Date instance.
      const result = schema.safeParse({ publishedAt: '2026-07-08T14:26' })
      // THIS CURRENTLY FAILS (success === false). If/when the date rule is fixed
      // (e.g. z.coerce.date() or a string-based ISO validator), flip this assertion
      // to `true` — its failure today is the regression marker for that bug.
      expect(result.success).toBe(false)
    })

    it('accepts a real Date instance, which the current UI never actually produces', () => {
      const schema = useNctDynamicZodSchema(fields, false)
      const result = schema.safeParse({ publishedAt: new Date('2026-07-08T14:26:00Z') })
      expect(result.success).toBe(true)
    })

    it('is optional/nullable during edit, same as every other field type', () => {
      const schema = useNctDynamicZodSchema(fields, true)
      expect(schema.safeParse({}).success).toBe(true)
      expect(schema.safeParse({ publishedAt: null }).success).toBe(true)
    })
  })

  describe('type fallback', () => {
    it('falls back to nctValidationRules.string for an unrecognized field type', () => {
      const fields: NctField[] = [{ name: 'custom', type: 'some-future-type', required: true }]
      const schema = useNctDynamicZodSchema(fields, false)
      expect(schema.safeParse({ custom: 'anything' }).success).toBe(true)
      expect(schema.safeParse({ custom: 123 }).success).toBe(false)
    })
  })

  describe('multi-field schemas', () => {
    it('builds independent validators per field and reports all failures', () => {
      const fields: NctField[] = [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'email', required: true },
      ]
      const schema = useNctDynamicZodSchema(fields, false)
      const result = schema.safeParse({ email: 'not-an-email' }) // name omitted entirely
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map(i => i.path[0])
        expect(paths).toEqual(expect.arrayContaining(['name', 'email']))
      }
    })
  })

  it('documents that required string fields currently accept an empty string', () => {
    const fields: NctField[] = [{ name: 'name', type: 'string', required: true }]
    const schema = useNctDynamicZodSchema(fields, false)
    // THIS PASSES TODAY even though `name` is required — z.string() has no .min(1).
    // If required-string fields should reject '', add .min(1) conditionally in
    // useNctDynamicZodSchema and flip this assertion to `false`.
    expect(schema.safeParse({ name: '' }).success).toBe(true)
  })
})
