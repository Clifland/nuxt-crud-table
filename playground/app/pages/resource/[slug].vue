<script setup lang="ts">
// definePageMeta({
//   layout: 'admin-panel',
// })

import InvoiceTemplate from '~/components/InvoiceTemplate.vue'

const route = useRoute()
const resource = route.params.slug as string
// import ShippingLabel from '~/components/ShippingLabel.vue'

const templateMap: Record<string, Component> = {
  orderitems: InvoiceTemplate,
  // shipments: ShippingLabel,
}
</script>

<template>
  <div v-if="resource">
    <NctCrudTable :resource="resource">
      <template #print-template="slotProps">
        <component
          :is="templateMap[slotProps.resource!]"
          v-bind="slotProps"
        />
      </template>
    </NctCrudTable>
  </div>
  <div
    v-else
    class="p-4"
  >
    Loading Data Table...
  </div>
</template>
