import { describe, it, expect } from 'vitest'
import { nctDbFieldToLabel } from '../../src/runtime/app/utils/formatter'

describe('nctDbFieldToLabel', () => {
  describe('foreign-key suffix stripping', () => {
    it('strips a trailing "_id" suffix', () => {
      expect(nctDbFieldToLabel('customer_id')).toBe('Customer')
    })

    it('strips a trailing camelCase "Id" suffix', () => {
      expect(nctDbFieldToLabel('customerId')).toBe('Customer')
    })

    it('does not strip "Id" or "id" from the middle of a field name', () => {
      expect(nctDbFieldToLabel('identity_number')).toBe('Identity number')
    })

    it('does not strip a suffix that merely contains "id" as a substring, not the literal token', () => {
      // "valid" ends in "id" but not the "_id"/"Id" token the regex targets
      expect(nctDbFieldToLabel('valid')).toBe('Valid')
    })
  })

  describe('separator normalization', () => {
    it('converts underscores to spaces', () => {
      expect(nctDbFieldToLabel('first_name')).toBe('First name')
    })

    it('converts hyphens to spaces', () => {
      expect(nctDbFieldToLabel('first-name')).toBe('First name')
    })

    it('collapses consecutive separators into a single space rather than leaving blanks', () => {
      expect(nctDbFieldToLabel('foo__bar')).toBe('Foo bar')
    })
  })

  describe('camelCase boundary splitting', () => {
    it('inserts a space before each internal capital letter', () => {
      expect(nctDbFieldToLabel('createdAt')).toBe('Created At')
    })

    it('handles a field with no camelCase boundaries at all', () => {
      expect(nctDbFieldToLabel('stock')).toBe('Stock')
    })
  })

  describe('capitalization — documents that only the FIRST character of the whole string is capitalized', () => {
    it('does NOT title-case every word in a multi-word snake_case field', () => {
      expect(nctDbFieldToLabel('user_profile_id')).toBe('User profile')
    })

    it('leaves later words lowercase for any multi-word snake_case input', () => {
      expect(nctDbFieldToLabel('first_name_last_name')).toBe('First name last name')
    })

    it('capitalizes correctly when camelCase already supplies the capital letters', () => {
      expect(nctDbFieldToLabel('updatedAt')).toBe('Updated At')
    })
  })

  describe('all-caps / acronym fields — a known rough edge', () => {
    it('spaces out an all-caps acronym into individual letters rather than preserving it', () => {
      expect(nctDbFieldToLabel('SKU')).toBe('S K U')
    })

    it('trims a leading space produced when the very first character is itself a capital letter', () => {
      expect(nctDbFieldToLabel('Name')).toBe('Name')
    })
  })

  describe('edge cases', () => {
    it('returns an empty string for empty input', () => {
      expect(nctDbFieldToLabel('')).toBe('')
    })

    it('coerces non-string input via String()', () => {
      // @ts-expect-error intentionally passing a non-string to verify the String(str) coercion
      expect(nctDbFieldToLabel(123)).toBe('123')
    })

    it('capitalizes correctly even with leading/trailing separators (fixed: trim happens before capitalizing)', () => {
      expect(nctDbFieldToLabel('_leading_and_trailing_')).toBe('Leading and trailing')
    })

    it('capitalizes correctly for field names starting with an underscore or hyphen', () => {
      expect(nctDbFieldToLabel('_hub_migrations')).toBe('Hub migrations')
      expect(nctDbFieldToLabel('-leading-hyphen')).toBe('Leading hyphen')
    })
  })
})
