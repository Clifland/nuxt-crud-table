<script setup lang="ts">
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { useChangeCase } from '@vueuse/integrations/useChangeCase'
import pluralize from 'pluralize'

const props = defineProps<{
  resource: string
  schema: NctSchemaDefinition
  initialState?: Record<string, unknown>
  forceReadonlyFields?: string[]
  /** Forwarded straight through to RowFormModal.vue / Form.vue. */
  relationLabelOverrides?: Record<string, string>
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
    :force-readonly-fields="forceReadonlyFields"
    :relation-label-overrides="relationLabelOverrides"
    :title="`Add New ${singularResourceName}`"
  >
    <template #trigger>
      <UButton :label="`Add New ${singularResourceName}`" color="neutral" variant="subtle" />
    </template>
  </NctCrudRowFormModal>
</template>
