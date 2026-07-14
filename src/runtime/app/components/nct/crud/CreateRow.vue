<script setup lang="ts">
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useChangeCase } from '@vueuse/integrations/useChangeCase'
import pluralize from 'pluralize'

const props = defineProps<{
  resource: string
  schema: NctSchemaDefinition
  initialState?: Record<string, unknown>
}>()

const singular = pluralize.singular(props.resource)
const singularResourceName = useChangeCase(singular, 'capitalCase').value
</script>

<template>
  <NctCrudRowFormModal
    :resource="resource"
    :schema="schema"
    method="POST"
    :initial-state="initialState"
    :title="`Add New ${singularResourceName}`"
  >
    <template #trigger>
      <UButton
        :label="`Add New ${singularResourceName}`"
        color="neutral"
        variant="subtle"
      />
    </template>
  </NctCrudRowFormModal>
</template>
