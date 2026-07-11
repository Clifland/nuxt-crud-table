<script setup lang="ts">
import { ref, watch } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useNctCrudFetch, useNctFormState } from '#imports'

const props = defineProps<{
  resource: string
  row: Record<string, unknown> // data of the row being edited
  schema: NctSchemaDefinition
}>()

const state = ref<Record<string, unknown>>({})

const open = ref(false)
const loading = ref(false)

watch(open, (isOpen) => {
  if (isOpen && props.schema) {
    const filteredFields = props.schema.fields.filter(
      field => !['id', 'created_at', 'updated_at', 'deleted_at', 'createdAt', 'updatedAt', 'deletedAt'].includes(field.name),
    )
    state.value = useNctFormState(filteredFields, props.row)
  }
})

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
          :initial-state="state"
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