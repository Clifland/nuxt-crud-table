import { z } from 'zod'
import type { NctField } from '../shared/types/schema'
import { nctValidationRules, type FieldType } from '../shared/types/validation-rules'

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
