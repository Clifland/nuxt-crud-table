<script setup lang="ts">
import { computed } from 'vue'
import pluralize from 'pluralize'
import { useNctHeaders, useFetch } from '#imports'
import { useRuntimeConfig } from '#app'

/**
 * Component properties configuration.
 */
const props = defineProps<{
  /**
   * The active unique primitive identifier representing the currently chosen relation model.
   */
  modelValue: string | number | null
  /**
   * The property name key from which to derive the pluralized endpoint target fallback string.
   */
  fieldName?: string
  /**
   * The explicit database table name to bind against directly for network path calls.
   */
  tableName?: string
}>()

/**
 * Component custom events emitter definition.
 */
const emit = defineEmits<{
  /**
   * Emitted to synchronize the two-way relationship identifier data loop back up to the parent form.
   * @param e - The name of the event being triggered.
   * @param value - The newly updated unique identification string, number value, or null state.
   */
  (e: 'update:modelValue', value: string | number | null): void
}>()

/**
 * The string endpoint fragment calculated to address specific backend network collections.
 */
let urlPath = ''
if (props.tableName) {
  urlPath = props.tableName
}
else if (props.fieldName) {
  const baseName = props.fieldName.replace(/(_id|Id)$/, '')
  urlPath = pluralize(baseName) // e.g., user_id → users
}

const { apiBase } = useRuntimeConfig().public.crudTable

/**
 * Asynchronous selection list fetched dynamically from endpoints based on schema relations.
 * @remarks
 * Uses custom row formatting mappings to resolve generic rows into readable select options.
 */
const { data: options } = await useFetch(() => `${apiBase}/${urlPath}`, {
  key: `crud-${urlPath}`,
  transform: (rows: Record<string, unknown>[]) =>
    rows?.map((row) => {
      const r = row as { id: string | number, name?: string, title?: string, email?: string, num?: string }
      return {
        label: r.name || r.title || r.num || `#${r.id}`,
        value: r.id,
        extra: r.email,
      }
    }),
  lazy: true,
  headers: useNctHeaders(),
})

/**
 * Intermediary computed property mapping selected objects down into parent-accessible primitive state updates.
 */
const selected = computed({
  get: () => options.value?.find(opt => opt.value == props.modelValue),
  set: (val: { value: string | number } | null) => {
    emit('update:modelValue', val?.value ?? null)
  },
})
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="options || []"
    option-attribute="label"
    placeholder="Select"
    class="w-full"
  >
    <template #item-label="{ item }">
      <span>{{ item.label }}</span>
      <span
        v-if="item.extra"
        class="text-gray-400 text-xs ml-2"
      >({{ item.extra }})</span>
    </template>
  </USelectMenu>
</template>
