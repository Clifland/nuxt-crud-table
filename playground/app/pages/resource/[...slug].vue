<script setup lang="ts">
// definePageMeta({
//   layout: 'admin-panel',
// })

const route = useRoute()
const resource = computed(() => {
  const slug = route.params.slug
  return Array.isArray(slug) ? slug[0] : slug
})
</script>

<template>
  <div v-if="resource">
    <NctCrudTable :resource="resource" />
  </div>
  <div
    v-else
    class="p-4"
  >
    Loading Data Table...
  </div>
</template>
