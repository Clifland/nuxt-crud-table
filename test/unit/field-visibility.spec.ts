import { describe, it, expect } from 'vitest'
import { isFieldHidden, resolveHiddenFields } from '../../src/runtime/app/utils/field-visibility'

describe('isFieldHidden', () => {
  it('matches an exact field name', () => {
    expect(isFieldHidden('created_at', ['created_at'])).toBe(true)
  })

  it('matches a camelCase field name against a snake_case hidden entry', () => {
    expect(isFieldHidden('createdAt', ['created_at'])).toBe(true)
  })

  it('matches a snake_case field name against a camelCase hidden entry', () => {
    expect(isFieldHidden('created_at', ['createdAt'])).toBe(true)
  })

  it('returns false for a field not in the list', () => {
    expect(isFieldHidden('name', ['created_at', 'updated_at'])).toBe(false)
  })

  it('returns false for an empty hidden list', () => {
    expect(isFieldHidden('created_at', [])).toBe(false)
  })
})

describe('resolveHiddenFields', () => {
  it('returns the fallback default when rule is undefined', () => {
    expect(resolveHiddenFields(undefined, 'products', ['id', 'created_at'])).toEqual(['id', 'created_at'])
  })

  it('returns [] when rule is undefined and no fallback is given', () => {
    expect(resolveHiddenFields(undefined, 'products')).toEqual([])
  })

  it('uses a bare array as-is, ignoring the resource and fallback entirely', () => {
    const result = resolveHiddenFields(['sku'], 'products', ['id', 'created_at'])
    expect(result).toEqual(['sku'])
  })

  it('uses rule.default in place of the fallback default when provided', () => {
    const result = resolveHiddenFields({ default: ['uuid'] }, 'products', ['id', 'created_at'])
    expect(result).toEqual(['uuid'])
  })

  it('falls back to the built-in default when the rule object has no `default` of its own', () => {
    const result = resolveHiddenFields({ resources: { products: ['sku'] } }, 'products', ['id', 'created_at'])
    expect(result).toEqual(['id', 'created_at', 'sku'])
  })

  it('appends resource-specific entries on top of whichever default applies', () => {
    const result = resolveHiddenFields(
      { default: ['uuid'], resources: { products: ['sku'], users: ['avatar'] } },
      'products',
      ['id'],
    )
    expect(result).toEqual(['uuid', 'sku'])
  })

  it('returns just the default when the current resource has no matching entry in resources', () => {
    const result = resolveHiddenFields(
      { default: ['uuid'], resources: { users: ['avatar'] } },
      'products',
    )
    expect(result).toEqual(['uuid'])
  })

  it('returns an empty array when the rule is an empty object and no fallback is given', () => {
    expect(resolveHiddenFields({}, 'products')).toEqual([])
  })
})