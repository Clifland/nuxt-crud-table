<script setup lang="ts">
import { useNuxtApp } from '#app'
import { nctHasRowPermission, useNctRowDelete } from '#imports'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'

/**
 * The per-row "..." popover (View / Edit / Delete), shared by Table.vue's main
 * grid and ChildTable.vue's expanded child rows. Previously implemented
 * twice, identically down to the toast copy.
 */
const props = defineProps<{
  resource: string
  row: Record<string, unknown>
  schema?: NctSchemaDefinition
}>()

const { $nctUser } = useNuxtApp()
const user = $nctUser ?? null

const { onDelete } = useNctRowDelete(() => props.resource)
</script>

<template>
  <UPopover :content="{ align: 'end', side: 'bottom' }">
    <UButton icon="i-lucide-more-vertical" color="neutral" variant="ghost" size="xs" />
    <template #content>
      <div class="p-1 flex flex-col gap-1 min-w-[120px]">
        <NctCrudViewRow
          v-if="schema && nctHasRowPermission(user, resource, 'read', row)"
          :row="row"
          :schema="schema"
        />
        <NctCrudEditRow
          v-if="schema && nctHasRowPermission(user, resource, 'update', row)"
          :resource="resource"
          :row="row"
          :schema="schema"
        />
        <UButton
          v-if="nctHasRowPermission(user, resource, 'delete', row)"
          label="Delete"
          color="error"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash"
          class="justify-start"
          @click="onDelete(row.id as number)"
        />
      </div>
    </template>
  </UPopover>
</template>