<script setup lang="ts">
import { ref } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useChangeCase } from '@vueuse/integrations/useChangeCase'
import { useNctCrudFetch } from '#imports'

const props = defineProps<{
  resource: string
  schema: NctSchemaDefinition
}>()

const open = ref(false)
const loading = ref(false)

async function onSubmit(data: Record<string, unknown>) {
  loading.value = true
  try {
    await useNctCrudFetch('POST', props.resource, null, data)
    open.value = false
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <UButton
      :label="`Add New ${useChangeCase(props.resource, 'capitalCase').value}`"
      color="neutral"
      variant="subtle"
    />

    <template #content>
      <div class="p-6 w-[400px] rounded-lg shadow-lg">
        <!-- Modal header -->
        <h2 class="text-lg font-semibold mb-4">
          Add New {{ props.resource }}
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
