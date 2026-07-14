<!--
  Example print template for the `orderitems` child resource. Drop a file like
  this in your own app's `components/` folder (flat, so Nuxt registers it under
  a predictable global name — here, `InvoiceTemplate`), then point
  `crud.printTemplates.orderitems` at that name in app.config.ts.

  This file lives outside nct's runtime — it's plain host-app code, using
  nct's exported NctPrintTemplateProps contract (a global ambient type, no
  import needed) for typing only.
-->
<script setup lang="ts">
import type { NctPrintTemplateProps } from 'nuxt-crud-table'

const props = defineProps<NctPrintTemplateProps>()

// useNctTableFormat is one of nct's own composables, auto-imported project-wide
// (not just inside nct's own runtime) — same as any other `useNct*` helper.
// Using it here, rather than reading `row[col.key]` directly, matters: nct's
// `columns` can be dot-paths for side-loaded relation data (e.g. an order
// item's `product.name`), and a plain object index doesn't resolve those —
// it just silently returns `undefined`, which is why a naive version of this
// template would show mostly-blank rows for anything beyond flat fields like
// `quantity`.
const { formatCellValue, getColumnValue } = useNctTableFormat()

// parentRow is typed as Record<string, unknown> since its shape varies by
// resource — narrow it locally for the fields this template actually uses.
const order = props.parentRow as {
  id?: number
  num?: string
  status?: string
  customer?: { name?: string, email?: string }
} | undefined
</script>

<template>
  <div class="print-invoice">
    <header class="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
      <div>
        <h1 class="text-2xl font-bold">
          Invoice
        </h1>
        <p class="text-sm text-gray-600">
          Order #{{ order?.num ?? order?.id }}
        </p>
      </div>
      <div class="text-right text-sm">
        <p class="font-semibold">
          {{ order?.customer?.name ?? 'Customer' }}
        </p>
        <p class="text-gray-600">
          {{ order?.customer?.email }}
        </p>
      </div>
    </header>

    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-gray-400">
          <th
            v-for="col in columns"
            :key="col.key"
            class="text-left py-2 font-semibold"
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
            class="py-2 text-right"
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

    <footer class="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
      Thank you for your business.
    </footer>
  </div>
</template>