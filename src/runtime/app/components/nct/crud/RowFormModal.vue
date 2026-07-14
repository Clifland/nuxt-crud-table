<script setup lang="ts">
import { ref } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useNctCrudFetch } from '#imports'

/**
 * Shared modal + form-submission shell for CreateRow and EditRow — the only
 * real differences between them are the trigger button, the title, and
 * POST-vs-PATCH. Not intended to be used directly outside those two.
 */
const props = defineProps<{
  resource: string
  schema: NctSchemaDefinition
  method: 'POST' | 'PATCH'
  /** Required when method is 'PATCH'; ignored for 'POST'. */
  rowId?: number
  initialState?: Record<string, unknown>
  title: string
}>()

const open = ref(false)
const loading = ref(false)

async function onSubmit(data: Record<string, unknown>) {
  loading.value = true
  try {
    const id = props.method === 'PATCH' ? props.rowId ?? null : null
    const success = await useNctCrudFetch(props.method, props.resource, id, data)
    if (success) open.value = false
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <slot name="trigger" />

    <template #content>
      <div class="p-6 w-[400px] rounded-lg shadow-lg">
        <h2 class="text-lg font-semibold mb-4">
          {{ title }}
        </h2>
        <hr>
        <div class="mt-4">
          <NctCrudForm
            v-if="schema"
            :schema="schema"
            :initial-state="initialState"
            :loading="loading"
            @submit="onSubmit"
          />
          <p
            v-else
            class="text-gray-500"
          >
            No schema provided for {{ resource }}
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* Cap long forms so the modal itself scrolls rather than the page. */
div[role="dialog"] {
  max-height: 80vh;
  overflow-y: auto;
}
</style>
