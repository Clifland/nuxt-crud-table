<script setup lang="ts">
import { useNctTableFormat } from '#imports'

/**
 * Generic tabular body for nct print templates — the thead/tbody/tfoot shell
 * shared by any print template rendering an nct child-array (columns + rows +
 * optional footer totals). Extracted out of InvoiceTemplate.vue so a second
 * print template (e.g. a shipping label needing a line-items table) doesn't
 * have to re-implement dot-path column resolution and footer-cell stacking
 * from scratch.
 */
defineProps<{
  /** Column defs as handed to the print-template slot (`{ key, label, align? }[]`). */
  columns: { key: string, label: string, align?: 'left' | 'right' }[]
  /** Row records as handed to the print-template slot. */
  rows: Record<string, unknown>[]
  /**
   * Optional footer aggregate cells, keyed by column key — same shape
   * ChildTable.vue passes through the slot. Omit to render no `<tfoot>`.
   */
  footer?: Map<string, { label: string, value: number }[]>
}>()

const { formatCellValue, getColumnValue } = useNctTableFormat()
</script>

<template>
  <table class="w-full text-sm border-collapse">
    <thead>
      <tr class="border-b border-gray-400">
        <th
          v-for="col in columns"
          :key="col.key"
          class="py-2 font-semibold"
          :class="col.align === 'right' ? 'text-right' : 'text-left'"
        >
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, idx) in rows"
        :key="String(row.id ?? idx)"
        class="border-b border-gray-200"
      >
        <td
          v-for="col in columns"
          :key="col.key"
          class="py-2"
          :class="col.align === 'right' ? 'text-right' : 'text-left'"
        >
          {{ formatCellValue(getColumnValue(row, col.key)) }}
        </td>
      </tr>
    </tbody>
    <tfoot v-if="footer">
      <tr class="font-semibold border-t-2 border-gray-800">
        <td
          v-for="col in columns"
          :key="col.key"
          class="py-2"
          :class="col.align === 'right' ? 'text-right' : 'text-left'"
        >
          <template
            v-for="cell in (footer.get(col.key) ?? [])"
            :key="cell.label"
          >
            <span>{{ formatCellValue(cell.value) }}</span>
            <span class="block text-[10px] font-normal uppercase tracking-wide text-gray-500">
              {{ cell.label }}
            </span>
          </template>
        </td>
      </tr>
    </tfoot>
  </table>
</template>