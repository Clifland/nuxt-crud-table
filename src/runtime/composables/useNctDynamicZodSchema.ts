import { z } from 'zod'
import type { NctField } from '../shared/types/schema'
import { nctValidationRules, type FieldType } from '../shared/types/validation-rules'

/**
 * A composable utility that dynamically builds a runtime Zod validation schema
 * from an array of backend resource field definitions.
 * @remarks
 * This parser evaluates specific field data types (such as password complexities, structural enums,
 * or primitive text blocks) and appropriately accommodates conditional requirement states depending
 * on whether an entry context is new or being modified.
 * @example
 * ```ts
 * const fields: NctField[] = [
 * { name: 'email', type: 'email', required: true },
 * { name: 'role', type: 'enum', selectOptions: ['admin', 'user'], required: false }
 * ]
 * const schema = useNctDynamicZodSchema(fields, false)
 * ```
 * @param {NctField[]} fields - An array containing field definitions metadata fetched from the schema contract mapping.
 * @param {boolean} [isEdit] - Flag indicating if the schema target is an update workflow. If true, turns parameters optional/nullable so unmodified fields don't fail validation.
 * @returns {z.ZodObject<Record<string, z.ZodTypeAny>>} A dynamically compiled Zod object ready to parse validation states.
 */
export function useNctDynamicZodSchema(fields: NctField[], isEdit = false) {
  const validators: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    const type = field.type as FieldType
    let schema: z.ZodTypeAny

    if (type === 'password') {
      schema = nctValidationRules.password(isEdit)
    }
    else if (type === 'enum') {
      schema = nctValidationRules.enum(field.selectOptions || [])
    }
    else {
      const rule = (nctValidationRules[type] || nctValidationRules.string) as () => z.ZodTypeAny
      schema = rule()
    }

    // Treat undefined as false (not required)
    const isRequired = field.required ?? false

    if (!isRequired || isEdit) {
      schema = schema.optional().nullable()
    }

    validators[field.name] = schema
  }

  return z.object(validators)
}
