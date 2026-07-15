<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAppConfig } from '#app'
import { useNctDynamicZodSchema, resolveHiddenFields, isFieldHidden, NCT_FORM_HIDDEN_FIELDS, NCT_FORM_READ_ONLY_FIELDS, isRelationFieldName, stripRelationSuffix } from '#imports'
import { useChangeCase } from '@vueuse/integrations/useChangeCase'

import type { NctField, NctSchemaDefinition } from '../../../../shared/types/schema'

/**
 * Component properties configuration.
 */
const props = defineProps<{
  /**
   * The comprehensive metadata structural schema configuration tracking input properties and validations.
   */
  schema: NctSchemaDefinition
  /**
   * Optional default record data mapped to populate form states during edit lifecycle states.
   */
  initialState?: Record<string, unknown>
  /**
   * Boolean flag tracking network runtime updates to signal submission progress spinners.
   */
  loading?: boolean
  /**
   * HTTP method used for form submission. Influences whether certain fields
   * (like `password`) are treated as unset or should be preserved.
   *
   * @defaultValue 'POST'
   */
  method?: 'POST' | 'PATCH'
  /**
   * Fields that should be treated as readonly in this form, regardless of their
   * original schema `readonly` flag or whether the form is creating or editing.
   */
  forceReadonlyFields?: string[]
  /**
   * Precomputed display labels for relation fields, keyed by field name —
   * when present for a field, NctCrudNameList's own fetch (options list +
   * related schema, just to resolve a label) is skipped entirely in favor
   * of a plain disabled display. Currently only supplied by
   * ChildTable.vue's "Add New" for its locked parent FK field, where the
   * label is already known from `parentRow`.
   */
  relationLabelOverrides?: Record<string, string>
}>()

/**
 * Component custom events emitter definition.
 */
const emit = defineEmits<{
  /**
   * Emitted upon successful form verification, yielding formatted workspace payloads.
   * @param e - The name of the event being triggered.
   * @param event - The verified, cleaned payload dictionary reflecting structural data updates.
   */
  (e: 'submit', event: Record<string, unknown>): void
  /**
   * Emitted to trigger parent container closing cycles when actions complete.
   * @param e - The name of the event being triggered.
   */
  (e: 'close'): void
}>()

// Filter out system fields — resolved from app.config.ts's crud.formHiddenFields
// (hot-reloadable at runtime), falling back to nct's built-in default when unset.
// Note: there's no more create-vs-edit special-casing here (e.g. the old
// "hide status on create" rule) — if you want a field hidden only in certain
// contexts, use formHiddenFields.resources per-resource, or vary it
// server-side in the _schemas/:resource response itself.
const crudConfig = useAppConfig().crud
const hiddenFields = resolveHiddenFields(crudConfig?.formHiddenFields, props.schema.resource, NCT_FORM_HIDDEN_FIELDS)

const configReadOnlyFields = resolveHiddenFields(crudConfig?.formReadOnlyFields, props.schema.resource, NCT_FORM_READ_ONLY_FIELDS)

/**
 * The array subset of schema elements following runtime visibility filtering loops.
 */
const filteredFields = props.schema.fields.filter(field => !isFieldHidden(field.name, hiddenFields))

/**
 * The dynamically built Zod validation schema block mapped from active input constraints.
 */
const formSchema = useNctDynamicZodSchema(filteredFields, !!props.method && props.method === 'PATCH')

const isEditMode = computed(() => props.method === 'PATCH')
const isLockedCreate = computed(() => props.method !== 'PATCH' && !!props.initialState)
const lockReadonlyFields = computed(() => isEditMode.value || isLockedCreate.value)

/**
 * Whether a field is readonly by *either* source: the backend schema's own
 * `field.readonly` flag, or this resource's entry in `formReadOnlyFields`
 * (app.config.ts). Neither source overrides the other — a field is locked
 * if either says so.
 * @param field - The field being evaluated.
 */
function isEffectivelyReadonly(field: NctField): boolean {
  return !!field.readonly || isFieldHidden(field.name, configReadOnlyFields)
}

/**
 * Resolves whether a given field should render disabled in the form.
 * `forceReadonlyFields` (an nct-internal override, e.g. ChildTable.vue's
 * "Add New" locking its pre-filled parent FK) always wins regardless of
 * `method`/`initialState`. Otherwise, a field flagged readonly by either
 * source in `isEffectivelyReadonly` locks only when `lockReadonlyFields`
 * is true (edit, or a "locked" create like a child-row Add New).
 * @param field - The field being rendered.
 */
function isFieldDisabled(field: NctField): boolean {
  if (props.forceReadonlyFields?.includes(field.name)) return true
  return isEffectivelyReadonly(field) && lockReadonlyFields.value
}

/**
 * Reactive data repository reflecting structural input key-value attributes.
 * @remarks
 * Recursively standardizes initialization schemas, relational structures, and foreign key pointers.
 * Relation-field detection/suffix-stripping goes through {@link isRelationFieldName}/
 * {@link stripRelationSuffix} rather than reimplementing the `_id`/`Id` convention locally.
 */
const state = reactive<Record<string, unknown>>(
  filteredFields.reduce(
    (acc, field) => {
      let value = props.initialState?.[field.name]

      if (isRelationFieldName(field.name) && value && typeof value === 'object' && 'id' in value) {
        value = (value as { id: unknown }).id
      }
      else if (isRelationFieldName(field.name) && value === undefined) {
        const relationName = stripRelationSuffix(field.name)
        const relationValue = props.initialState?.[relationName]
        if (relationValue && typeof relationValue === 'object' && 'id' in relationValue) {
          value = (relationValue as { id: unknown }).id
        }
      }

      if (field.type === 'boolean') {
        acc[field.name] = value ?? false
      }
      else if (isRelationFieldName(field.name)) {
        acc[field.name] = value ?? null
      }
      else {
        acc[field.name] = value ?? undefined
      }

      return acc
    },
    {} as Record<string, unknown>,
  ),
)

/**
 * Computed evaluation transforming field metadata attributes into formatted, readable label tags.
 * @remarks
 * Slices trailing relational database symbols and formats names into clean layout representations.
 * @returns A computed list containing enhanced UI schema definitions.
 */
const processedFields = computed(() =>
  filteredFields.map((field) => {
    const label = useChangeCase(stripRelationSuffix(field.name), 'capitalCase').value
    return {
      ...field,
      label,
    }
  }),
)

/**
 * Intercepts form validation success cycles, sanitizing payloads before passing data upward.
 * @param event - The validated Nuxt UI Form submission context object.
 */
function handleSubmit(event: FormSubmitEvent<Record<string, unknown>>) {
  const data = { ...event.data }
  if (props.initialState && 'password' in data) {
    delete data.password
  }
  emit('submit', data)
  emit('close')
}
</script>

<template>
  <div class="max-h-[80vh] overflow-y-auto p-4">
    <UForm
      :schema="formSchema"
      :state="state"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <template
        v-for="field in processedFields"
        :key="field.name"
      >
        <UFormField
          :label="field.label"
          :name="field.name"
        >
          <UCheckbox
            v-if="field.type === 'boolean'"
            :id="field.name"
            v-model="state[field.name] as boolean"
            :disabled="isFieldDisabled(field)"
          />

          <template v-else-if="isRelationFieldName(field.name)">
            <UInput
              v-if="relationLabelOverrides?.[field.name] !== undefined"
              :model-value="relationLabelOverrides[field.name]"
              disabled
            />
            <NctCrudNameList
              v-else
              v-model="state[field.name] as string | number | null"
              :field-name="field.name"
              :table-name="field.references"
              :disabled="isFieldDisabled(field)"
            />
          </template>

          <template v-else-if="field.name === 'password'">
            <NctCommonPassword
              v-if="!props.initialState"
              v-model="state[field.name] as string"
              type="password"
            />
            <span
              v-else
              class="text-gray-500 italic text-sm"
            >
              Password can only be set on creation.
            </span>
          </template>
          <UInput
            v-else-if="field.type === 'date'"
            v-model="state[field.name] as string"
            type="datetime-local"
            :disabled="isFieldDisabled(field)"
          />

          <USelect
            v-else-if="field.type === 'enum'"
            v-model="state[field.name] as string"
            :items="field.selectOptions"
            placeholder="Select "
            class="w-full"
            :disabled="isFieldDisabled(field)"
          />

          <UTextarea
            v-else-if="field.type === 'textarea'"
            v-model="state[field.name] as string"
            :required="field.required"
            :disabled="isFieldDisabled(field)"
            autoresize
          />

          <UInput
            v-else
            v-model="state[field.name] as string"
            :type="field.type"
            :required="field.required"
            :disabled="isFieldDisabled(field)"
          />
        </UFormField>
      </template>

      <UButton
        type="submit"
        :loading="loading"
      >
        Submit
      </UButton>
    </UForm>
  </div>
</template>
