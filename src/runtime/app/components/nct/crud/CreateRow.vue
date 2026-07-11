<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useChangeCase } from '@vueuse/integrations/useChangeCase'
import { useNctCrudFetch } from '#imports'
import pluralize from 'pluralize'

const props = defineProps<{
  resource: string
  schema: NctSchemaDefinition
}>()

const open = ref(false)
const loading = ref(false)

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

const singularResourceName = computed(() => {
  const singular = pluralize.singular(props.resource)
  return useChangeCase(singular, 'capitalCase').value
})
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
        <!-- Modal header -->
        <h2 class="text-lg font-semibold mb-4">
          Add New {{ singularResourceName }}
        </h2>
        <hr>

        <div class="mt-4">
          <!-- Dynamic form -->
          <div v-if="schema">
            <NctCrudForm
              :schema="schema"
              :loading="loading"
              @submit="onSubmit"
            />
          </div>

          <!-- Fallback -->
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