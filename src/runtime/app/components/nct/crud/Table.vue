<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNuxtApp, useRuntimeConfig, useAppConfig, useFetch } from '#app'
import { useNctHeaders, nctDbFieldToLabel, nctHasRowPermission, nctHasPermission, useNctExport, useNctCrudFetch, useNctTableFormat, useToast } from '#imports'

import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import type { NctCrudTableConfig } from '../../../../shared/types/config'
import type { NctUser } from '../../../../shared/types/auth'

const { $nctAuth } = useNuxtApp()
const user = computed(() => $nctAuth.getNctUser() as NctUser | null)

const props = defineProps<{
  resource: string
}>()

const { apiBase } = useRuntimeConfig().public.crudTable

const { data: records } = await useFetch(`${apiBase}/${props.resource}`, {
  headers: useNctHeaders(),
  transform: (res: unknown) => {
    if (res && typeof res === 'object' && 'data' in res) {
      return (res as Record<string, unknown>).data as Record<string, unknown>[]
    }
    return (res ?? []) as Record<string, unknown>[]
  },
})

const { data: schema } = await useFetch<NctSchemaDefinition>(`${apiBase}/_schemas/${props.resource}`, {
  headers: useNctHeaders(),
})

const toast = useToast()

async function onDelete(id: number) {
  toast.add({
    title: 'Delete Record',
    description: 'Are you sure you want to permanently delete this row?',
    color: 'warning',
    duration: 0, // Keeps the toast visible until an action is clicked
    actions: [
      {
        label: 'Cancel',
        variant: 'ghost',
        color: 'neutral',
        onClick: () => {}, // Soft dismisses the toast natively
      },
      {
        label: 'Delete',
        color: 'error',
        onClick: async () => await useNctCrudFetch('DELETE', props.resource, id),
      },
    ],
  })
}

const { exportToExcel, exportToPDF } = useNctExport()
const crudConfig = useAppConfig().crud as NctCrudTableConfig
const isExportEnabled = !!crudConfig?.exports

const { formatCellValue, getColumnValue, flattenKeys, getArrayColumns, getForeignKeyColumns, getParentBackReferenceColumns } = useNctTableFormat()
const expandedRows = ref<Set<number>>(new Set())

function toggleExpand(id: number) {
  expandedRows.value.has(id) ? expandedRows.value.delete(id) : expandedRows.value.add(id)
}

const visibleColumns = computed(() => {
  if (!records.value?.length) return []
  const hideList = crudConfig?.globalHide ?? []
  const hideForeignKeys = crudConfig?.hideForeignKeys ?? true
  const firstRow = records.value[0] as Record<string, unknown>

  const fkColumns = hideForeignKeys ? getForeignKeyColumns(firstRow) : []

  return flattenKeys(firstRow).filter(key => !hideList.includes(key) && !fkColumns.includes(key))
})

function getChildColumns(row: Record<string, unknown>, arrCol: string): string[] {
  const arr = row[arrCol] as Record<string, unknown>[]
  const firstChild = arr[0] ?? {}
  const hideForeignKeys = crudConfig?.hideForeignKeys ?? true

  const fkColumns = hideForeignKeys ? getForeignKeyColumns(firstChild) : []
  const parentRefColumns = hideForeignKeys ? getParentBackReferenceColumns(firstChild, row) : []

  return flattenKeys(firstChild).filter(key =>
    !fkColumns.includes(key) && !parentRefColumns.includes(key),
  )
}

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
      <NctCommonPagination
        :data="records || []"
        :items-per-page="10"
        @update:paginated="paginatedItems = $event"
      />
      <div class="flex items-center gap-2">
        <UDropdownMenu
          v-if="isExportEnabled && records?.length"
          :items="[
            [
              {
                label: 'Excel',
                icon: 'i-lucide-file-spreadsheet',
                onSelect: () => exportToExcel(records || [], props.resource, visibleColumns),
              },
              {
                label: 'PDF',
                icon: 'i-lucide-file-text',
                onSelect: () => exportToPDF(records || [], props.resource, visibleColumns),
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
        <NctCrudCreateRow
          v-if="schema && nctHasPermission(user, resource, 'create')"
          :resource="resource"
          :schema="schema"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
        <thead
          v-if="records?.length"
          class="bg-gray-50 dark:bg-gray-800"
        >
          <tr>
            <!-- Expand toggle column -->
            <th
              scope="col"
              class="w-8 px-2 py-3.5"
            />
            <template
              v-for="col in visibleColumns"
              :key="col"
            >
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
              >
                {{ nctDbFieldToLabel(col.replace('.', ' ')) }}
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
          <template
            v-for="row in paginatedItems"
            :key="String(row.id)"
          >
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <!-- Expand toggle cell -->
              <td class="whitespace-nowrap px-2 py-4">
                <UButton
                  v-if="getArrayColumns(row).length"
                  :icon="expandedRows.has(row.id as number) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="toggleExpand(row.id as number)"
                />
              </td>

              <template
                v-for="col in visibleColumns"
                :key="col"
              >
                <td
                  class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ formatCellValue(getColumnValue(row, col)) }}
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
              </td>
            </tr>

            <!-- Expanded child-table row -->
            <tr v-if="expandedRows.has(row.id as number)">
              <td
                :colspan="visibleColumns.length + 2"
                class="bg-gray-50 dark:bg-gray-800 p-4"
              >
                <div
                  v-for="arrCol in getArrayColumns(row)"
                  :key="arrCol"
                  class="mb-4 last:mb-0"
                >
                  <p class="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                    {{ nctDbFieldToLabel(arrCol) }}
                  </p>
                  <table class="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th
                          v-for="childCol in getChildColumns(row, arrCol)"
                          :key="childCol"
                          class="px-3 py-2 text-left font-semibold text-gray-900 dark:text-white"
                        >
                          {{ nctDbFieldToLabel(childCol.replace('.', ' ')) }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr
                        v-for="child in (row[arrCol] as Record<string, unknown>[])"
                        :key="String(child.id)"
                      >
                        <td
                          v-for="childCol in getChildColumns(row, arrCol)"
                          :key="childCol"
                          class="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400"
                        >
                          {{ formatCellValue(getColumnValue(child, childCol)) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </UCard>
</template>