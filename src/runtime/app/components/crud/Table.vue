<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNuxtApp, useRuntimeConfig, useAppConfig } from '#app'
import { crudHeaders, dbFieldToLabel, hasRowPermission, hasPermission, useExport, useFetch, useToast, useCrudFetch } from '#imports'

import type { SchemaDefinition } from '../../../shared/types/schema'
import type { CrudTableConfig } from '../../../shared/types/config'

const { $crudAuth } = useNuxtApp()
const user = computed(() => $crudAuth.getUser())

const props = defineProps<{
  resource: string
}>()

const config = useRuntimeConfig()
const crudEndpointPrefix = config.public.crudTable.crudEndpointPrefix


const { data } = await useFetch(`${crudEndpointPrefix}/${props.resource}`, {
  headers: crudHeaders(),
})

const { data: schema } = await useFetch<SchemaDefinition>(`${crudEndpointPrefix}/_schemas/${props.resource}`, {
  headers: crudHeaders(),
})

const toast = useToast()

async function onDelete(id: number) {
  if (!confirm('Are you sure you want to permanently delete this row?')) return  
  await useCrudFetch('DELETE', props.resource, id)
  
  // toast.add({
  //   title: 'Delete Record',
  //   description: 'Are you sure you want to permanently delete this row?',
  //   color: 'warning',
  //   duration: 0, // Keeps the toast visible until an action is clicked
  //   actions: [
  //     {
  //       label: 'Cancel',
  //       variant: 'ghost',
  //       color: 'neutral',
  //       onClick: () => {} // Soft dismisses the toast natively
  //     },
  //     {
  //       label: 'Delete',
  //       color: 'error',
  //       onClick: async () => await useCrudFetch('DELETE', props.resource, id)
  //     }
  //   ]
  // })
}

const { exportToExcel, exportToPDF } = useExport()
const crudConfig = useAppConfig().crud as CrudTableConfig
const isExportEnabled = !!crudConfig?.exports


// Agent Hint: Field visibility is controlled by app.config.ts (crud.globalHide)
const visibleColumns = computed(() => {
  if (!data.value?.length) return []
  const hideList = crudConfig?.globalHide ?? []

  return Object.keys(data.value[0]).filter(key =>
    !hideList.includes(String(key)),
  )
})

const paginatedItems = ref<Record<string, unknown>[]>([])
</script>

<template>
  <UCard
    class="w-full"
    :ui="{
      root: 'divide-y divide-(--ui-border)',
      header: 'px-4 py-5',
      body: 'divide-y divide-(--ui-border)',
      footer: 'p-4',
    }"
  >
    <!-- Filters / Pagination Area -->
    <div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <CommonPagination
        :data="data || []"
        :items-per-page="10"
        @update:paginated="paginatedItems = $event"
      />
      <div class="flex items-center gap-2">
        <UDropdownMenu
          v-if="isExportEnabled && data?.length"
          :items="[
              [
                { 
                  label: 'Excel', 
                  icon: 'i-lucide-file-spreadsheet', 
                  onSelect: () => exportToExcel(data || [], props.resource, visibleColumns) 
                },
                { 
                  label: 'PDF', 
                  icon: 'i-lucide-file-text', 
                  onSelect: () => exportToPDF(data || [], props.resource, visibleColumns) 
                },
              ],
          ]"
        >
          <UButton
            label="Export"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
          />
        </UDropdownMenu>
        <CrudCreateRow
          v-if="schema && hasPermission(user, resource, 'create')"
          :resource="resource"
          :schema="schema"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
        <thead
          v-if="data?.length"
          class="bg-gray-50 dark:bg-gray-800"
        >
          <tr>
            <template
              v-for="col in visibleColumns"
              :key="col"
            >
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
              >
                {{ dbFieldToLabel(String(col)) }}
              </th>
            </template>
            <th
              scope="col"
              class="relative py-3.5 pl-3 pr-4 sm:pr-6"
            >
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody v-else>
          <tr>
            <td
              colspan="100%"
              class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              No records found.
            </td>
          </tr>
        </tbody>

        <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
          <tr
            v-for="row in paginatedItems"
            :key="String(row.id)"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <template
              v-for="col in visibleColumns"
              :key="col"
            >
              <td
                class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400"
              >
                {{ row[col] }}
              </td>
            </template>

            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
              <UPopover
                :content="{ align: 'end', side: 'bottom' }"
              >
                <UButton
                  icon="i-lucide-more-vertical"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />

                <template #content>
                  <div class="p-1 flex flex-col gap-1 min-w-[120px]">
                    <CrudViewRow
                      v-if="schema && hasRowPermission(user, resource, 'read', row)"
                      :row="row"
                      :schema="schema"
                    />
                    <CrudEditRow
                      v-if="schema && hasRowPermission(user, resource, 'update', row)"
                      :resource="resource"
                      :row="row"
                      :schema="schema"
                    />
                    <UButton
                      v-if="hasRowPermission(user, resource, 'delete', row)"
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
