<script setup lang="ts">
import { ref } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useNctCrudFetch } from '#imports'

const props = defineProps<{
  resource: string
  row: Record<string, unknown> // data of the row being edited
  schema: NctSchemaDefinition
}>()

const open = ref(false)
const loading = ref(false)

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

    <!-- Modal content -->
    <template #content>
      <div class="max-w-md p-6 rounded-lg shadow-lg space-y-4">
        <h2 class="text-lg font-semibold mb-2">
          Edit {{ resource }}
        </h2>
        <hr>

        <!-- Form -->
        <NctCrudForm
          v-if="schema"
          :schema="schema"
          :initial-state="row"
          :loading="loading"
          @submit="onSubmit"
        />

        <!-- Fallback -->
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