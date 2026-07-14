<script setup lang="ts">
import type { NctSchemaDefinition } from '../../../../shared/types/schema'

defineProps<{
  resource: string
  row: Record<string, unknown>
  schema: NctSchemaDefinition
}>()
</script>

<template>
  <NctCrudRowFormModal
    :resource="resource"
    :schema="schema"
    method="PATCH"
    :row-id="row.id as number"
    :initial-state="row"
    :title="`Edit ${resource}`"
  >
    <template #trigger>
      <UButton
        label="Edit"
        color="primary"
        variant="outline"
        class="font-medium"
      />
    </template>
  </NctCrudRowFormModal>
</template>
