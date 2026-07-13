<script setup lang="ts">
import { ref } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useChangeCase } from '@vueuse/integrations/useChangeCase'
import { useNctCrudFetch } from '#imports'
import pluralize from 'pluralize'

/**
 * Component properties configuration.
 */
const props = defineProps<{
  /**
   * The target plural identifier mapping the backend resource endpoint.
   */
  resource: string
  /**
   * The metadata structural layout definition utilized to populate and validate the internal dynamic form.
   */
  schema: NctSchemaDefinition
}>()

/**
 * Local visibility flag regulating the activation status profile of the layout dialog modal framework.
 */
const open = ref(false)

/**
 * Local asynchronous network state tracking when an API network write request block is active.
 */
const loading = ref(false)

/**
 * Dispatches an asynchronous request block containing modified payload details toward backend data layers.
 * @param data - The parsed field key-value pairs captured from the form workspace layout.
 * @returns A promise resolving when the form submission lifecycle routine completes.
 */
async function onSubmit(data: Record<string, unknown>) {
  loading.value = true
  try {
    const success = await useNctCrudFetch('POST', props.resource, null, data)

    if (success) {
      open.value = false
    }
  }
  finally {
    loading.value = false
  }
}

/**
 * The singularized variation of the plural parameter string sequence.
 */
const singular = pluralize.singular(props.resource)

/**
 * Computed title string converting raw database tags into readable text representations.
 */
const singularResourceName = useChangeCase(singular, 'capitalCase').value
</script>

<template>
  <UModal v-model:open="open">
    <UButton
      :label="`Add New ${singularResourceName}`"
      color="neutral"
      variant="subtle"
    />

    <template #content>
      <div class="p-6 w-[400px] rounded-lg shadow-lg">
        <h2 class="text-lg font-semibold mb-4">
          Add New {{ singularResourceName }}
        </h2>
        <hr>

        <div class="mt-4">
          <div v-if="schema">
            <NctCrudForm
              :schema="schema"
              :loading="loading"
              @submit="onSubmit"
            />
          </div>

          <p
            v-else
            class="text-gray-500"
          >
            No schema provided for {{ props.resource }}
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* Optional: max height and scroll for long forms */
div[role="dialog"] {
  max-height: 80vh;
  overflow-y: auto;
}
</style>
