<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { NctSchemaDefinition } from '../../../../shared/types/schema'
import { nctDbFieldToLabel, useNctTableFormat, useAppConfig } from '#imports'

const props = defineProps<{
  row: Record<string, unknown>
  schema?: NctSchemaDefinition
}>()

const isOpen = ref(false)
const crudConfig = useAppConfig().crud

// Keyed by a namespaced section id ("parent:customer" / "child:orderitems")
// rather than the raw field name, so a parent-relation and a child-array
// sharing the same name can never collide on the same expand/collapse state.
const expandedSections = reactive<Record<string, boolean>>({})

function toggleSection(sectionId: string) {
  expandedSections[sectionId] = !expandedSections[sectionId]
}

const {
  formatCellValue,
  getColumnValue,
  flattenKeys,
  getForeignKeyColumns,
  getParentBackReferenceColumns,
} = useNctTableFormat()

function isImage(key: string, value: unknown) {
  if (typeof value !== 'string') return false
  const k = key.toLowerCase()
  return (k.includes('image') || k.includes('avatar') || k.includes('photo')) && (value.startsWith('http') || value.startsWith('/'))
}

/** Distinguishes a Child Table (Array of objects) */
function isArrayOfObjects(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null
}

/** Distinguishes a Parent Table (Object mapping key/value pairs) */
function isParentObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const hideForeignKeys = computed(() => crudConfig?.hideForeignKeys ?? true)

/** Filters and handles root primitive rows (standard attributes) */
const rootPrimitiveColumns = computed(() => {
  const fkColumns = hideForeignKeys.value ? getForeignKeyColumns(props.row) : []

  return Object.keys(props.row).filter((key) => {
    const value = props.row[key]
    return !fkColumns.includes(key) && !isParentObject(value) && !Array.isArray(value)
  })
})

/** Groups parent object sections */
const parentObjectFields = computed(() =>
  Object.keys(props.row).filter(key => isParentObject(props.row[key])),
)

/** Groups child table sections */
const childTableFields = computed(() =>
  Object.keys(props.row).filter(key => isArrayOfObjects(props.row[key])),
)

/** Formats table labels with Table.vue's formatting conventions */
function getFormattedLabel(col: string): string {
  return nctDbFieldToLabel(col.replace('.', ' '))
}

/**
 * Horizontal column determination for child arrays — memoized per section
 * key (rather than recomputed on every thead cell AND every body row) since
 * the visible-column set only depends on the array's shape, not the
 * individual row being rendered.
 */
const childColumnsCache = computed(() => {
  const cache: Record<string, string[]> = {}
  for (const key of childTableFields.value) {
    const childArray = props.row[key] as Array<Record<string, unknown>>
    const firstChild = childArray[0] ?? {}
    const fkColumns = hideForeignKeys.value ? getForeignKeyColumns(firstChild) : []
    const parentRefColumns = hideForeignKeys.value ? getParentBackReferenceColumns(firstChild, props.row) : []

    cache[key] = flattenKeys(firstChild).filter(
      col => !fkColumns.includes(col) && !parentRefColumns.includes(col),
    )
  }
  return cache
})

function getVisibleChildColumns(key: string): string[] {
  return childColumnsCache.value[key] ?? []
}

/**
 * Flattens a parent relation object into dot-notated { key, value } rows for
 * the sub-table — reuses flattenKeys/getColumnValue rather than
 * JSON.stringify-ing nested values, so a parent relation with its own
 * nested object (e.g. customer.address) still renders as readable rows
 * instead of a raw JSON blob.
 */
function getParentSubRows(parentKey: string): { path: string, label: string }[] {
  const value = props.row[parentKey]
  if (!value || typeof value !== 'object') return []
  return flattenKeys(value as Record<string, unknown>).map(path => ({
    path,
    label: getFormattedLabel(path),
  }))
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <UButton
      icon="i-heroicons-eye"
      color="neutral"
      variant="ghost"
      size="xs"
      label="View"
      @click="isOpen = true"
    />

    <template #content>
      <UCard
        :ui="{
          root: 'divide-y divide-gray-100 dark:divide-gray-800 flex flex-col max-h-[85vh]',
          body: 'overflow-y-auto flex-1 p-0',
        }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Record Details
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <dl
            v-if="rootPrimitiveColumns.length"
            class="divide-y divide-gray-100 dark:divide-gray-800"
          >
            <div
              v-for="col in rootPrimitiveColumns"
              :key="col"
              class="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 items-start"
            >
              <dt class="text-sm font-semibold leading-6 text-gray-900 dark:text-white pt-1">
                {{ getFormattedLabel(col) }}
              </dt>
              <dd class="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-400 sm:col-span-2 sm:mt-0 break-words">
                <img
                  v-if="isImage(col, props.row[col])"
                  :src="String(props.row[col])"
                  class="h-10 w-10 rounded object-cover"
                  alt="Preview"
                >
                <span v-else>
                  {{ formatCellValue(props.row[col]) }}
                </span>
              </dd>
            </div>
          </dl>

          <div
            v-if="parentObjectFields.length"
            class="divide-y divide-gray-100 dark:divide-gray-800"
          >
            <div
              v-for="parentKey in parentObjectFields"
              :key="parentKey"
              class="px-6 py-4 flex flex-col gap-3 bg-gray-50/30 dark:bg-gray-800/5"
            >
              <button
                class="flex items-center justify-between w-full text-left font-bold text-sm text-gray-900 dark:text-white focus:outline-none"
                @click="toggleSection(`parent:${parentKey}`)"
              >
                <span>{{ getFormattedLabel(parentKey) }}</span>
                <UIcon
                  :name="expandedSections[`parent:${parentKey}`] ? 'i-heroicons-chevron-down-20-solid' : 'i-heroicons-chevron-right-20-solid'"
                  class="w-5 h-5 text-gray-500"
                />
              </button>

              <div
                v-show="expandedSections[`parent:${parentKey}`]"
                class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm max-w-full"
              >
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    <tr
                      v-for="sub in getParentSubRows(parentKey)"
                      :key="sub.path"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td class="px-3 py-2 font-mono text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/10 w-1/3">
                        {{ sub.label }}
                      </td>
                      <td class="px-3 py-2 text-gray-900 dark:text-gray-300 font-sans break-words">
                        <img
                          v-if="isImage(sub.path, getColumnValue(row, `${parentKey}.${sub.path}`))"
                          :src="String(getColumnValue(row, `${parentKey}.${sub.path}`))"
                          class="h-8 w-8 rounded object-cover"
                          alt="Preview"
                        >
                        <span v-else>
                          {{ formatCellValue(getColumnValue(row, `${parentKey}.${sub.path}`)) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            v-if="childTableFields.length"
            class="divide-y divide-gray-100 dark:divide-gray-800"
          >
            <div
              v-for="key in childTableFields"
              :key="key"
              class="px-6 py-4 flex flex-col gap-2"
            >
              <button
                class="flex items-center justify-between w-full text-left font-semibold text-sm leading-6 text-gray-900 dark:text-white border-b border-transparent pb-1 focus:outline-none"
                @click="toggleSection(`child:${key}`)"
              >
                <span>{{ getFormattedLabel(key) }}</span>
                <UIcon
                  :name="expandedSections[`child:${key}`] ? 'i-heroicons-chevron-down-20-solid' : 'i-heroicons-chevron-right-20-solid'"
                  class="w-5 h-5 text-gray-500"
                />
              </button>

              <div
                v-show="expandedSections[`child:${key}`]"
                class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm max-w-full"
              >
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  <thead class="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th
                        v-for="colName in getVisibleChildColumns(key)"
                        :key="colName"
                        scope="col"
                        class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
                      >
                        {{ getFormattedLabel(colName) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    <tr
                      v-for="(childRow, idx) in (props.row[key] as Array<Record<string, unknown>>)"
                      :key="String(childRow.id ?? idx)"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td
                        v-for="colName in getVisibleChildColumns(key)"
                        :key="colName"
                        class="px-3 py-2 text-gray-900 dark:text-gray-300 font-sans whitespace-nowrap"
                      >
                        {{ formatCellValue(getColumnValue(childRow, colName)) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>