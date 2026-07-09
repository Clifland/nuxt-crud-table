import { z } from 'zod'

/**
 * Validation Factory
 * Ensures backend and frontend never drift.
 */
export const nctValidationRules = {
  /** Compiles a standard email verification parsing sequence. */
  email: () => z.email(),
  /** Compiles a basic numerical evaluation format. */
  number: () => z.number(),
  /** Evaluates and verifies valid Date timeline patterns. */
  date: () => z.date(),
  /** Verifies boolean binary checkbox states. */
  boolean: () => z.boolean(),
  /**
   * Compiles secure password check evaluations based on operational state.
   * @param {boolean} [isEdit] - If true, permits passwords to pass as optional/empty during update workflows.
   */
  password: (isEdit?: boolean) => isEdit
    ? z.string().optional()
    : z.string().min(8).regex(/\d/).regex(/[a-z]/).regex(/[A-Z]/),
  /** Evaluates standard plain text characters formats. */
  string: () => z.string(),
  /** Evaluates multi-line content block parameters. */
  textarea: () => z.string(),
  /**
   * Evaluates discrete options maps against literal values arrays.
   * @param {string[]} [options] - Permitted enumeration item variations.
   */
  enum: (options?: string[]) => options?.length
    ? z.enum(options as [string, ...string[]])
    : z.string(),
} as const

/** Derived utility typing parsing out all available field types handled by the validation factory. */
export type FieldType = keyof typeof nctValidationRules
