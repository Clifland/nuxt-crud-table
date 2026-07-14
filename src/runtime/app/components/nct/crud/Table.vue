<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRuntimeConfig, useAppConfig, useFetch, useNuxtApp } from '#app'
import { useNctAggregates, useNctHeaders, nctDbFieldToLabel, nctHasRowPermission, nctHasPermission, useNctExport, useNctCrudFetch, useNctTableFormat, useToast, resolveHiddenFields, isFieldHidden, NCT_TABLE_HIDDEN_FIELDS } from '#imports'

import type { NctSchemaDefinition } from '../../../../shared/types/schema'

const { $nctUser } = useNuxtApp()
const user = $nctUser ?? null

/**
 * Component properties configuration.
 */
const props = defineProps<{
  /**
   * The explicit database resource table or route endpoint handle identifier.
   */
  resource: string
}>()

const { apiBase } = useRuntimeConfig().public.crudTable

/**
 * Asynchronous data retrieval hook bringing in the primary array records dictionary.
 */
const { data: records } = await useFetch(`${apiBase}/${props.resource}`, {
  headers: useNctHeaders(),
  transform: (res: unknown) => {
    if (res && typeof res === 'object' && 'data' in res) {
      return (res as Record<string, unknown>).data as Record<string, unknown>[]
    }
    return (res ?? []) as Record<string, unknown>[]
  },
})

/**
 * Asynchronous data retrieval hook capturing database schema structural metadata layout fields.
 */
const { data: schema } = await useFetch<NctSchemaDefinition>(`${apiBase}/_schemas/${props.resource}`, {
  headers: useNctHeaders(),
})

const toast = useToast()

/**
 * Launches an interactive UI confirmation alert layer prior to triggering table deletion executions.
 * @param id - The distinct row record numeric tracking key.
 */
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
const crudConfig = useAppConfig().crud
const isExportEnabled = !!crudConfig?.exports

const { formatCellValue, getColumnValue, flattenKeys, getArrayColumns, getForeignKeyColumns, getParentBackReferenceColumns } = useNctTableFormat()

/**
 * A reactive tracker storing numbers representing expanded master-detail layout rows.
 */
const expandedRows = ref<Set<number>>(new Set())

/**
 * Toggles whether a specific nested layout container is opened or closed by tracking its identifier.
 * @param id - The distinct numeric row identifier context block.
 */
function toggleExpand(id: number) {
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id)
  }
  else {
    expandedRows.value.add(id)
  }
}

const aggregatesConfig = crudConfig?.aggregates ?? {}

const { withParentFooterColumns } = useNctAggregates(records, aggregatesConfig)

/**
 * The array repository combining raw dataset values alongside dynamic child summary column rows.
 */
const augmentedRecords = withParentFooterColumns() // records + any rolled-up child footer columns

/**
 * Child resource schemas, fetched once so `NctCrudChildTable`'s action popover
 * (view/edit/delete) can render inside expanded rows. Keyed by the child
 * array's field name, which nct already treats elsewhere (aggregatesConfig,
 * relations.ts) as equivalent to the child's plural API resource name.
 * @remarks
 * Derived from the union of array columns across *all* loaded rows, not just
 * the first — `getArrayColumns` only counts a field as present when its array
 * is non-empty, so keying off row 0 alone would silently skip a child
 * resource whenever that particular row happened to have zero related items,
 * starving every other row's action popover for a schema that was never
 * fetched. Fetched eagerly at setup time alongside the table's own data/schema,
 * rather than lazily on first expand — simpler, at the cost of one schema
 * request per distinct child resource type present, even if a user never
 * actually expands one.
 */
const childSchemas = reactive<Record<string, NctSchemaDefinition | undefined>>({})

const allChildArrayColumns = (() => {
  const cols = new Set<string>()
  for (const row of augmentedRecords.value ?? []) {
    for (const col of getArrayColumns(row as Record<string, unknown>)) {
      cols.add(col)
    }
  }
  return [...cols]
})()

if (allChildArrayColumns.length) {
  await Promise.all(allChildArrayColumns.map(async (arrCol) => {
    const { data } = await useFetch<NctSchemaDefinition>(`${apiBase}/_schemas/${arrCol}`, {
      key: `crud-schema-${arrCol}`,
      headers: useNctHeaders(),
    })
    childSchemas[arrCol] = data.value ?? undefined
  }))
}

/**
 * Formats a localized header label configuration string for rolled-up database layout headers.
 * @param col - The targeted array field layout identity string tag.
 * @returns A computed label presentation text representation.
 */
function getColumnLabel(col: string): string {
  for (const childConfig of Object.values(aggregatesConfig)) {
    const def = childConfig.footer?.find(f => f.name === col)
    if (def) return def.label ?? def.fn
  }
  return nctDbFieldToLabel(col.replace('.', ' '))
}

/**
 * Evaluates the active visible column layout strings by matching visible variables and hiding system definitions.
 * @returns An array of visible layout column key string entries.
 */
const visibleColumns = computed(() => {
  if (!augmentedRecords.value?.length) return []
  const hideList = resolveHiddenFields(crudConfig?.tableHiddenFields, props.resource, NCT_TABLE_HIDDEN_FIELDS)
  const hideForeignKeys = crudConfig?.hideForeignKeys ?? true
  const firstRow = augmentedRecords.value[0] as Record<string, unknown>

  const fkColumns = hideForeignKeys ? getForeignKeyColumns(firstRow) : []

  return flattenKeys(firstRow).filter(key => !isFieldHidden(key, hideList) && !fkColumns.includes(key))
})

/**
 * Extracts nested collection elements from an expanded row while filtering out relational keys.
 * @param row - The active base table record row instance object.
 * @param arrCol - The nested table relationship lookup key identifier string.
 * @returns Filtered data elements for mapping nested grids.
 */
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

/**
 * Resolves a readable textual label representation tag for sub-grid collection columns.
 * @param arrCol - The target nested key string representation.
 * @param col - The attribute text identifier key.
 * @returns A computed name presentation string.
 */
function getChildColumnLabel(arrCol: string, col: string): string {
  const def = aggregatesConfig[arrCol]?.columns?.find(c => c.name === col)
  return def?.label ?? nctDbFieldToLabel(col.replace('.', ' '))
}

/**
 * Aggregates a full sequence of nested sub-grid tracking properties including virtual calculation arrays.
 * @param row - The active primary data entry tracking item.
 * @param arrCol - The nested target identifier string array indicator key.
 * @returns A list combining database fields alongside computed layout elements.
 */
function getChildColumnNames(row: Record<string, unknown>, arrCol: string): string[] {
  const baseCols = getChildColumns(row, arrCol)
  const virtualNames = aggregatesConfig[arrCol]?.columns?.map(c => c.name) ?? []
  return [...baseCols, ...virtualNames]
}

/**
 * Combines a child array's visible column keys with their resolved display labels, in the
 * `{ key, label }[]` shape the shared `NctCrudChildTable` renderer expects.
 * @param row - The active primary data entry tracking item.
 * @param arrCol - The nested target identifier string array indicator key.
 * @returns Column definitions ready to hand to the shared child-table renderer.
 */
function getChildColumnDefs(row: Record<string, unknown>, arrCol: string): { key: string, label: string }[] {
  return getChildColumnNames(row, arrCol).map(col => ({
    key: col,
    label: getChildColumnLabel(arrCol, col),
  }))
}

/**
 * Resolves sub-grid record array sequences updated to contain calculated virtual parameter items.
 * @param row - The reference base dataset record container block.
 * @param arrCol - The target database array key string identifier tag.
 * @returns An array reference mapping individual calculated data lines.
 */
function getChildRowsWithVirtualColumns(row: Record<string, unknown>, arrCol: string) {
  const { withVirtualColumns } = useNctAggregates(row[arrCol] as Record<string, unknown>[], aggregatesConfig)
  return withVirtualColumns(arrCol).value
}

/**
 * Maps computed summary value structures out onto the grid components they target directly.
 * @param row - The active main dataset reference data tracking line.
 * @param arrCol - The targeted structural relationship database field tag.
 * @returns A computed structural dictionary map associating keys to calculations.
 */
function getFooterCellsByColumn(row: Record<string, unknown>, arrCol: string) {
  const { footerValues } = useNctAggregates(row[arrCol] as Record<string, unknown>[], aggregatesConfig)
  const map = new Map<string, { label: string, value: number }[]>()
  for (const entry of footerValues(arrCol)) {
    for (const col of entry.args) {
      if (!map.has(col)) map.set(col, [])
      map.get(col)!.push({ label: entry.label, value: entry.value })
    }
  }
  return map
}

/**
 * Validates whether a specific child data table holds matching footer configuration instructions.
 * @param arrCol - The sub-grid database reference identifier tag.
 * @returns A boolean evaluation indicating if a footer track exists.
 */
function hasFooter(arrCol: string): boolean {
  return !!aggregatesConfig[arrCol]?.footer?.length
}

/**
 * Reactive data repository reflecting the currently sliced dataset collection for pagination.
 */
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
    <div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <NctCommonPagination
        :data="augmentedRecords || []"
        :items-per-page="10"
        @update:paginated="paginatedItems = $event"
      />
      <div class="flex items-center gap-2">
        <UDropdownMenu
          v-if="isExportEnabled && augmentedRecords?.length"
          :items="[
            [
              {
                label: 'Excel',
                icon: 'i-lucide-file-spreadsheet',
                onSelect: () => exportToExcel(augmentedRecords || [], props.resource, visibleColumns),
              },
              {
                label: 'PDF',
                icon: 'i-lucide-file-text',
                onSelect: () => exportToPDF(augmentedRecords || [], props.resource, visibleColumns),
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

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
        <thead
          v-if="augmentedRecords?.length"
          class="bg-gray-50 dark:bg-gray-800"
        >
          <tr>
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
                {{ getColumnLabel(col) }}
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
                  <NctCrudChildTable
                    :columns="getChildColumnDefs(row, arrCol)"
                    :rows="getChildRowsWithVirtualColumns(row, arrCol)"
                    :footer="hasFooter(arrCol) ? getFooterCellsByColumn(row, arrCol) : undefined"
                    :resource="arrCol"
                    :schema="childSchemas[arrCol]"
                  />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </UCard>
</template>