<script setup lang="ts">
import type { NctPrintTemplateProps } from 'nuxt-crud-table'

const props = defineProps<NctPrintTemplateProps>()

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

    <NctCrudPrintItems :columns="columns" :rows="rows" :footer="footer" />

    <footer class="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
      Thank you for your business.
    </footer>
  </div>
</template>