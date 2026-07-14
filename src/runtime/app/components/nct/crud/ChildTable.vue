<script setup lang="ts">
import { useNctTableFormat } from '#imports'

/**
 * Shared renderer for a child (one-to-many) relation array, rendered as a small
 * table with an optional footer row of aggregate totals.
 *
 * @remarks
 * Extracted from markup that previously lived independently, and slightly
 * differently, in both `Table.vue` (expanded master-detail rows, with footer
 * support) and `ViewRow.vue` (the "View" modal's child-array sections, no footer
 * support). `ViewRow.vue` now gets footer support for free by passing a `footer`
 * map when one is configured for that resource.
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
}>(), {
  footer: undefined,
  size: 'sm',
})

const { formatCellValue, getColumnValue } = useNctTableFormat()
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
      </tr>
    </tfoot>
  </table>
</template>