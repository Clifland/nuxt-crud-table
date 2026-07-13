<script setup lang="ts">
import { ref, computed, watch } from 'vue'

/**
 * Component properties configuration.
 */
const props = defineProps<{
  /**
   * The complete dataset passed down from the parent view layer.
   */
  data: Record<string, unknown>[]
  /**
   * Optional control overriding the maximum number of structural rows per view interface.
   * @defaultValue `10`
   */
  itemsPerPage?: number
}>()

/**
 * Component custom events emitter definition.
 */
const emit = defineEmits<{
  /**
   * Emitted whenever the internal search query or page navigation slicing computes a new row slice.
   * @param e - The name of the event being triggered.
   * @param value - The newly transformed slice array containing visible model records.
   */
  (e: 'update:paginated', value: Record<string, unknown>[]): void
}>()

/**
 * The current one-indexed view page boundary location.
 */
const page = ref(1)

/**
 * The target user text criteria matching substring query constraint values.
 */
const search = ref('')

/**
 * Internal active state tracking how many localized table items are visible at once.
 */
const itemsPerPage = ref(props.itemsPerPage ?? 10)

/**
 * Computed evaluation parsing and returning rows that cross-match against the active search query.
 * @remarks
 * Performs a shallow stringification lookup across all available nested data record attributes.
 * @returns A filtered array subset derived from the original `props.data` reference block.
 */
const searchedItems = computed(() => {
  if (!search.value) return props.data ?? []
  return (props.data ?? []).filter(row =>
    Object.values(row)
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  )
})

/**
 * Computed offset tracking dynamic sub-selections based upon the active page bounds and total items per layout view.
 * @returns An updated chunk slice array matching the current pagination configuration boundaries.
 */
const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return searchedItems.value.slice(start, start + itemsPerPage.value)
})

/**
 * Keeps the root parent context completely updated relative to active slice modifications.
 */
watch(
  [paginatedItems],
  () => {
    emit('update:paginated', paginatedItems.value)
  },
  { immediate: true },
)

/**
 * Resets the display page offset backward to the initial starting index when a search modifier criteria changes.
 */
watch([search], () => {
  page.value = 1
})

/**
 * Automatically bounds-checks the active page position against the maximum allowable steps when dataset elements scale or contract.
 */
watch([searchedItems], () => {
  const maxPage
    = Math.ceil(searchedItems.value.length / itemsPerPage.value) || 1
  if (page.value > maxPage) {
    page.value = maxPage
  }
})
</script>

<template>
  <div class="flex justify-between items-center my-2">
    <UPagination
      v-model:page="page"
      :total="searchedItems.length"
      :items-per-page="itemsPerPage"
    />
    <NctCommonSearchButton v-model="search" />
  </div>
</template>
