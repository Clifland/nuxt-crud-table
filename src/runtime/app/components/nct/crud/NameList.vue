<script setup lang="ts">
import { computed } from 'vue'
import pluralize from 'pluralize'
import { useNctHeaders, useFetch, stripRelationSuffix, resolveRelationLabel } from '#imports'
import { useRuntimeConfig } from '#app'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'

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
  const baseName = stripRelationSuffix(props.fieldName)
  urlPath = pluralize(baseName) // e.g., user_id → users
}

const { apiBase } = useRuntimeConfig().public.crudTable

/**
 * Fetches the row list and the related resource's own schema in parallel — the schema
 * is only needed for its `labelField`, so there's no reason to serialize the two requests
 * behind one another.
 * @remarks
 * `relatedSchema` intentionally uses a separate cache key (`crud-schema-${urlPath}`) from
 * `Table.vue`'s own `_schemas/:resource` fetch. They usually target different resources
 * (this component's `urlPath` is the *related* resource, not whatever resource the host
 * page is currently listing), so there's little cache overlap in practice — but sharing
 * the key convention means two `NameList` pickers referencing the same relation on one
 * page do dedupe against each other.
 */
const [{ data: rawOptions }, { data: relatedSchema, status }] = await Promise.all([
  useFetch<Record<string, unknown>[]>(() => `${apiBase}/${urlPath}`, {
    key: `crud-${urlPath}`,
    lazy: true,
    headers: useNctHeaders(),
  }),
  useFetch<NctSchemaDefinition>(() => `${apiBase}/_schemas/${urlPath}`, {
    key: `crud-schema-${urlPath}`,
    lazy: true,
    headers: useNctHeaders(),
  }),
])

/**
 * The formatted selectable option list, combining the raw row data with the resolved
 * display label. A computed (rather than the old `transform` callback) because the label
 * now depends on two independently-resolving fetches — `rawOptions` and `relatedSchema` —
 * and a computed re-evaluates cleanly whichever one settles second.
 */
const options = computed(() => {
  const labelField = relatedSchema.value?.labelField
  return (rawOptions.value ?? []).map((row) => {
    const r = row as { id: string | number, email?: string }
    return {
      label: resolveRelationLabel(row, labelField),
      value: r.id,
      extra: r.email,
    }
  })
})

/**
 * Intermediary computed property mapping selected objects down into parent-accessible primitive state updates.
 */
const selected = computed({
  get: () => options.value.find(opt => opt.value == props.modelValue),
  set: (val: { value: string | number } | null) => {
    emit('update:modelValue', val?.value ?? null)
  },
})
</script>

<template>
  <USelectMenu
    v-model="selected"
    virtualize
    :loading="status === 'pending'"
    :items="options"
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
