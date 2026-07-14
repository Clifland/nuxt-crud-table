<script setup lang="ts">
import { computed } from 'vue'
import { useNuxtApp } from '#app'
import { useNctTableFormat, useNctCrudFetch, useToast, nctHasRowPermission } from '#imports'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'

/**
 * Shared renderer for a child (one-to-many) relation array, rendered as a small
 * table with an optional footer row of aggregate totals and, optionally, a
 * per-row view/edit/delete action popover identical to Table.vue's own.
 *
 * @remarks
 * Extracted from markup that previously lived independently, and slightly
 * differently, in both `Table.vue` (expanded master-detail rows, with footer
 * support) and `ViewRow.vue` (the "View" modal's child-array sections, no footer
 * support). Both now get footer *and* CRUD-action support for free by passing
 * `footer`/`resource`/`schema` when configured for that resource.
 *
 * CRUD actions require both `resource` and `schema` — the caller is responsible
 * for fetching the child resource's own `NctSchemaDefinition` (see Table.vue's
 * `childSchemas`) since this component stays presentational for the read path.
 * Without them, it renders as a plain read-only table (the original behavior).
 *
 * This assumes the child array's field key IS the child resource's plural API
 * name (e.g. an `orders` row's `orderitems` array maps 1:1 to the `orderitems`
 * resource) — already an implicit assumption elsewhere in nct (aggregatesConfig
 * keys, `relations.ts`'s query config keys), now made load-bearing here too:
 * it's what `useNctCrudFetch`/`nctHasRowPermission` use as the resource name.
 */
const props = withDefaults(defineProps<{
  /** Ordered column definitions: the raw field key plus its resolved display label. */
  columns: { key: string, label: string }[]
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
   * `schema`, to render the per-row action popover.
   */
  resource?: string
  /**
   * The child resource's own schema, needed to populate NctCrudViewRow/EditRow's
   * forms. Omit to render a plain read-only table.
   */
  schema?: NctSchemaDefinition
}>(), {
  footer: undefined,
  size: 'sm',
  resource: undefined,
  schema: undefined,
})

const { formatCellValue, getColumnValue } = useNctTableFormat()

const { $nctUser } = useNuxtApp()
const user = $nctUser ?? null

/**
 * Whether to render the trailing actions column at all — both `resource` (to
 * check permissions and issue mutations against) and `schema` (to populate the
 * view/edit forms) are required.
 */
const showActions = computed(() => !!(props.resource && props.schema))

const toast = useToast()

/**
 * Same delete confirmation flow as Table.vue's `onDelete`, scoped to this
 * child resource.
 * @param id - The child row's numeric identifier.
 */
async function onDelete(id: number) {
  if (!props.resource) return
  const resource = props.resource
  toast.add({
    title: 'Delete Record',
    description: 'Are you sure you want to permanently delete this row?',
    color: 'warning',
    duration: 0,
    actions: [
      {
        label: 'Cancel',
        variant: 'ghost',
        color: 'neutral',
        onClick: () => {},
      },
      {
        label: 'Delete',
        color: 'error',
        onClick: async () => await useNctCrudFetch('DELETE', resource, id),
      },
    ],
  })
}
</script>

<template>
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
          class="px-3 py-2 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap"
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
        >
          {{ formatCellValue(getColumnValue(row, col.key)) }}
        </td>

        <td
          v-if="showActions"
          class="relative whitespace-nowrap px-3 py-2 text-right text-sm font-medium"
        >
          <UPopover :content="{ align: 'end', side: 'bottom' }">
            <UButton
              icon="i-lucide-more-vertical"
              color="neutral"
              variant="ghost"
              size="xs"
            />

            <template #content>
              <div class="p-1 flex flex-col gap-1 min-w-[120px]">
                <NctCrudViewRow
                  v-if="schema && nctHasRowPermission(user, resource!, 'read', row)"
                  :row="row"
                  :schema="schema"
                />
                <NctCrudEditRow
                  v-if="schema && nctHasRowPermission(user, resource!, 'update', row)"
                  :resource="resource!"
                  :row="row"
                  :schema="schema"
                />
                <UButton
                  v-if="nctHasRowPermission(user, resource!, 'delete', row)"
                  label="Delete"
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash"
                  class="justify-start"
                  @click="onDelete(row.id as number)"
                />
              </div>
            </template>
          </UPopover>
        </td>
      </tr>
    </tbody>

    <tfoot v-if="footer">
      <tr class="font-semibold border-t border-gray-300 dark:border-gray-600">
        <td
          v-for="col in columns"
          :key="col.key"
          class="px-3 py-2 text-right"
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
</template>