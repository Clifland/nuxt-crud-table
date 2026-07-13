<script setup lang="ts">
import { ref } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useNctCrudFetch } from '#imports'

/**
 * Component properties configuration.
 */
const props = defineProps<{
  /**
   * The target plural identifier mapping the backend resource endpoint.
   */
  resource: string
  /**
   * The comprehensive record dictionary payload belonging to the specific row being edited.
   */
  row: Record<string, unknown>
  /**
   * The metadata structural layout definition utilized to populate and validate the internal dynamic form fields.
   */
  schema: NctSchemaDefinition
}>()

/**
 * Local visibility flag regulating the activation status profile of the overlay layout dialog modal framework.
 */
const open = ref(false)

/**
 * Local asynchronous network state tracking when an API patch network update request block is active.
 */
const loading = ref(false)

/**
 * Dispatches an asynchronous `PATCH` network request containing modified payload details to update data layers.
 * @param data - The fields and updated values captured directly from the form workspace layout.
 * @returns A promise resolving when the update submission lifecycle routine completes.
 */
async function onSubmit(data: Record<string, unknown>) {
  loading.value = true
  try {
    const success = await useNctCrudFetch('PATCH', props.resource, props.row.id as number, data)

    if (success) {
      open.value = false
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <UButton
      label="Edit"
      color="primary"
      variant="outline"
      class="font-medium"
    />

    <template #content>
      <div class="max-w-md p-6 rounded-lg shadow-lg space-y-4">
        <h2 class="text-lg font-semibold mb-2">
          Edit {{ resource }}
        </h2>
        <hr>

        <NctCrudForm
          v-if="schema"
          :schema="schema"
          :initial-state="row"
          :loading="loading"
          @submit="onSubmit"
        />

        <p
          v-else
          class="text-sm text-red-500"
        >
          No schema provided for {{ resource }}
        </p>
      </div>
    </template>
  </UModal>
</template>
