import type { NctSchemaDefinition } from './schema'

/**
 * The fixed prop contract every custom print template component receives from
 * `NctCrudChildTable`, configured via `app.config.ts`'s `crud.printTemplates`.
 *
 * @remarks
 * Declared as a **global ambient interface** rather than a normal module export.
 * A plain `export interface` here would only be reachable via an explicit import
 * path into this package's internal `src/runtime/shared/types/` tree — fine for
 * nct's own runtime files, but not usable from a host app's own components
 * without knowing (and depending on) that internal path. `declare global` makes
 * `NctPrintTemplateProps` available everywhere in the host project with no
 * import at all, the same mechanism `types.d.ts` already uses to make
 * `useAppConfig().crud` typed without anyone importing `NctCrudTableConfig`.
 *
 * A template component is a completely ordinary Vue component — nct places no
 * requirements on it beyond accepting these props (via `defineProps<NctPrintTemplateProps>()`)
 * and rendering its own header/footer/branding around the data. It is registered
 * by its Nuxt-global component name (e.g. a file at `components/InvoiceTemplate.vue`
 * registers as `InvoiceTemplate`), not imported by nct directly.
 *
 * @example
 * ```vue
 * <!-- app/components/InvoiceTemplate.vue -->
 * <script setup lang="ts">
 * // No import needed — NctPrintTemplateProps is a global ambient type.
 * const props = defineProps<NctPrintTemplateProps>()
 * </script>
 *
 * <template>
 *   <header>Invoice — Order #{{ parentRow?.num }}</header>
 *   <table>...</table>
 *   <footer>Thank you for your business.</footer>
 * </template>
 * ```
 *
 * ```ts
 * // app.config.ts
 * export default defineAppConfig({
 *   crud: {
 *     printTemplates: {
 *       orderitems: 'InvoiceTemplate',
 *     },
 *   },
 * })
 * ```
 */
declare global {
  interface NctPrintTemplateProps {
    /** The child resource's plural API name (e.g. 'orderitems'). */
    resource: string
    /** The child resource's own schema, if it was available when printing was triggered. */
    schema?: NctSchemaDefinition
    /** Ordered column definitions: the raw field key plus its resolved display label. */
    columns: { key: string, label: string }[]
    /** The child row records being printed, already resolved (including any virtual columns). */
    rows: Record<string, unknown>[]
    /** Optional footer aggregate cells, keyed by column key — same shape `NctCrudChildTable` itself uses. */
    footer?: Map<string, { label: string, value: number }[]>
    /** The parent resource's plural API name (e.g. 'orders'), if this child table has one. */
    parentResource?: string
    /**
     * The full parent row record — not just its id — so a template can show
     * parent-level context (e.g. an invoice's order number and customer)
     * alongside the child rows themselves.
     */
    parentRow?: Record<string, unknown>
  }
}

// Required so TypeScript treats this file as a module (needed for `declare
// global` to be legal) — the `import type` above already does this, but this
// makes that intent explicit rather than incidental.
export {}