import { reactive } from 'vue'

/**
 * A composable utility that creates a reactive form state object initialized with
 * fields metadata and an optional seed dataset.
 *
 * @remarks
 * This function processes field defaults and automatically standardizes date metrics into local time
 * strings formatted for compatibility with structural forms (`YYYY-MM-DDTHH:mm`).
 *
 * @example
 * ```ts
 * const fields = [{ name: 'publishedAt', type: 'date' }]
 * const initial = { publishedAt: '2026-07-08T14:26:00.000Z' }
 * const formState = useNctFormState(fields, initial)
 * // formState.publishedAt will be formatted as: "2026-07-08T14:26"
 * ```
 *
 * @param fields - An array of metadata configurations representing form field items.
 * @param initialState - Optional payload object containing pre-existing values used to hydrate form modifications.
 * @returns A reactive Vue object map holding stateful properties key-value indicators.
 */
export function useNctFormState(
  fields: { name: string, type: string, required?: boolean }[],
  initialState?: Record<string, unknown>,
) {
  const state = reactive<Record<string, unknown>>({})

  fields.forEach((field) => {
    let value = initialState?.[field.name] ?? ''

    if (field.type === 'date' && value) {
      const date = new Date(value as string | number | Date)

      if (!Number.isNaN(date.getTime())) {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        value = local
      }
      else {
        value = ''
      }
    }

    state[field.name] = value
  })

  return state
}