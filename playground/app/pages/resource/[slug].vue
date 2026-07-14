<script setup lang="ts">
const route = useRoute()
const resource = route.params.slug as string
</script>

<template>
  <div v-if="resource">
    <NctCrudTable :resource="resource">
      <template #print-template="slotProps">
        <InvoiceTemplate v-bind="slotProps" />
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
