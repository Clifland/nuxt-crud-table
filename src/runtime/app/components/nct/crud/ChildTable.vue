<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useNuxtApp } from '#app'
import { useNctTableFormat, nctHasPermission } from '#imports'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import type { NctPrintTemplateProps } from '../../../../shared/types/print'

/**
 * Shared renderer for a child (one-to-many) relation array, rendered as a small
 * table with an optional footer row of aggregate totals and, optionally, a
 * per-row view/edit/delete action popover identical to Table.vue's own.
 */
const props = withDefaults(defineProps<{
  /** Ordered column definitions: the raw field key plus its resolved display label. */
  columns: { key: string, label: string, align?: 'left' | 'right' }[]
  /** The child row records to render, already resolved (including any virtual columns). */
  rows: Record<string, unknown>[]
  /**
   * Optional footer aggregate cells, keyed by column key. Each column can carry
   * multiple stacked values (e.g. more than one footer def targeting the same
   * column). Omit entirely to render no `<tfoot>`.
   */
  footer?: Map<string, { label: string, value: number }[]>
  /**
   * Visual density. `Table.vue`'s expanded rows use `sm` (the default); `ViewRow.vue`'s
   * modal originally used a more compact `xs` — preserved via this prop rather than
   * silently changing ViewRow's look when it adopted this shared component.
   */
  size?: 'xs' | 'sm'
  /**
   * The child resource's plural API name (e.g. 'orderitems'). Required, alongside
   * `schema`, to render the per-row action popover and the "Add New" button.
   */
  resource?: string
  /**
   * The child resource's own schema, needed to populate NctCrudViewRow/EditRow/
   * CreateRow's forms. Omit to render a plain read-only table.
   */
  schema?: NctSchemaDefinition
  /**
   * The parent resource's plural API name (e.g. 'orders'). Used to find which
   * field on `schema` points back at the parent (`field.references ===
   * parentResource`), so a newly created child row is pre-filled with the
   * correct foreign key. Required, alongside `parentRowId`, to show the
   * "Add New" button — without a way to identify the FK field, there's no
   * safe default to create against, so the button is simply omitted.
   */
  parentResource?: string
  /**
   * The specific parent row's id, pre-filled into the matched foreign-key field.
   */
  parentRowId?: string | number
  /**
   * The full parent row record — not just its id — passed through to a custom
   * print template so it can show parent-level context (e.g. an invoice
   * showing the order number and customer alongside its line items). Not used
   * for anything else; `parentRowId` remains the source of truth for the
   * "Add New" FK pre-fill.
   */
  parentRow?: Record<string, unknown>
}>(), {
  footer: undefined,
  size: 'sm',
  resource: undefined,
  schema: undefined,
  parentResource: undefined,
  parentRowId: undefined,
  parentRow: undefined,
})

defineSlots<{
  'print-template'(props: NctPrintTemplateProps): void
}>()

const { formatCellValue, getColumnValue } = useNctTableFormat()

const { $nctUser } = useNuxtApp()
const user = $nctUser ?? null

/**
 * Whether to render the trailing actions column at all — both `resource` (to
 * check permissions and issue mutations against) and `schema` (to populate the
 * view/edit forms) are required.
 */
const showActions = computed(() => !!(props.resource && props.schema))

/**
 * Resolves the child schema's field that references the parent resource, if any.
 * @remarks
 * Matched via `field.references`, which the schema contract already carries per
 * field (see `NctField`) — no naming-convention guessing required.
 */
const parentFkField = computed(() => {
  if (!props.schema || !props.parentResource) return undefined
  return props.schema.fields.find(f => f.references === props.parentResource)
})

/**
 * Pre-filled state for the "Add New" child-row form: just the resolved parent
 * FK field set to this section's parent row id. The field stays a normal,
 * editable relation picker in the form (nct has no per-instance readonly
 * override today) — pre-filled with the right default, but not locked.
 */
const createInitialState = computed<Record<string, unknown> | undefined>(() => {
  if (!parentFkField.value || props.parentRowId === undefined) return undefined
  return { [parentFkField.value.name]: props.parentRowId }
})

/**
 * Whether to show the "Add New" button: same requirements as the action
 * popover, plus a resolvable parent FK field and permission to create.
 */
const canCreate = computed(() =>
  !!(showActions.value && parentFkField.value && props.parentRowId !== undefined
    && nctHasPermission(user, props.resource!, 'create')),
)

/**
 * Whether this child table's print area is currently teleported into `<body>`
 * and should be visible per `print.css`'s `@media print` rule.
 */
const isPrinting = ref(false)

/**
 * Reveals the print area and invokes the browser print dialog.
 * @remarks
 * Only one `NctCrudChildTable` instance's print area is ever teleported into
 * `<body>` at a time (each instance's is conditional on its own `isPrinting`),
 * so multiple expanded rows on one page never conflict with each other — no
 * unique-id bookkeeping needed. The `afterprint` listener is registered fresh
 * per print (not persistently in `onMounted`) and removes itself via
 * `{ once: true }`, so there's nothing to clean up on unmount.
 */
async function triggerPrint() {
  isPrinting.value = true
  await nextTick()
  window.print()
  window.addEventListener('afterprint', () => {
    isPrinting.value = false
  }, { once: true })
}
</script>

<template>
  <div>
    <div
      v-if="rows.length || canCreate"
      class="flex items-center justify-end gap-2 mb-2"
    >
      <UButton
        v-if="rows.length"
        label="Print"
        icon="i-lucide-printer"
        color="neutral"
        variant="outline"
        size="xs"
        @click="triggerPrint"
      />
      <NctCrudCreateRow
        v-if="canCreate"
        :resource="resource!"
        :schema="schema!"
        :initial-state="createInitialState"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="isPrinting"
        class="nct-print-area p-8"
      >
        <slot
          v-if="resource"
          name="print-template"
          v-bind="{ resource, schema, columns, rows, footer, parentResource, parentRow }"
        />
      </div>
    </Teleport>

    <table
      class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
      :class="size === 'xs' ? 'text-xs' : 'text-sm'"
    >
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            class="px-3 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap"
            :class="col.align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ col.label }}
          </th>
          <th
            v-if="showActions"
            scope="col"
            class="relative py-2 pl-3 pr-3"
          >
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <tr
          v-for="(row, idx) in rows"
          :key="String(row.id ?? idx)"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/30"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400"
            :class="col.align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ formatCellValue(getColumnValue(row, col.key)) }}
          </td>

          <td v-if="showActions" class="relative whitespace-nowrap px-3 py-2 text-right text-sm font-medium">
            <NctCrudRowActions :resource="resource!" :row="row" :schema="schema" />
          </td>
        </tr>
      </tbody>

      <tfoot v-if="footer">
        <tr class="font-semibold border-t border-gray-300 dark:border-gray-600">
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-3 py-2"
            :class="col.align === 'right' ? 'text-right' : 'text-left'"
          >
            <template
              v-for="cell in (footer.get(col.key) ?? [])"
              :key="cell.label"
            >
              <span>{{ formatCellValue(cell.value) }}</span>
              <span class="block text-[10px] font-normal uppercase tracking-wide text-gray-400">
                {{ cell.label }}
              </span>
            </template>
          </td>
          <td v-if="showActions" />
        </tr>
      </tfoot>
    </table>
  </div>
</template>