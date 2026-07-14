# nuxt-crud-table (nct) — Technical Documentation

## 1. Purpose

`nct` is a Nuxt 4 module that renders CRUD tables and forms dynamically from an API's
schema definition, rather than from hand-written table/form components per resource.
It is backend-agnostic: the reference implementation targets Laravel and Drizzle ORM,
but any backend that satisfies the contract in §6 works.

Two concerns are deliberately kept separate:

- **Reading/displaying data** — Table.vue, ViewRow.vue, useNctTableFormat, useNctAggregates.
- **Writing data** — CreateRow.vue, EditRow.vue, Form.vue, useNctDynamicZodSchema, useNctCrudFetch, NameList.vue.

This split matters for the NameList question in §8 — the two paths have different data
requirements and one does not obsolete the other.

---

## 2. Module Bootstrap (`module.ts`)

`defineNuxtModule<ModuleOptions>()`:

| Option | Type | Notes |
|---|---|---|
| `apiBase` | `string` | Backend controller root, default `/api/_nac` |
| `auth` | `false \| { authentication: 'nuxt-auth-utils' \| 'sanctum' }` | Toggles auth layer |
| `headers` | `() => Record<string,string>` | Must be self-contained (serialized at build time) |

Setup responsibilities:

1. Writes `apiBase`/`auth` (not `headers`, intentionally excluded — see the `PublicRuntimeConfig`
   augmentation comment) into `runtimeConfig.public.crudTable`.
2. `addComponentsDir('runtime/app/components')` — auto-registers `Nct*` components.
3. `addImportsDir` for composables and utils — auto-imports `useNct*`/`nct*` functions.
4. Hooks `prepare:types` to inject shared type files (`auth`, `config`, `schema`,
   `validation-rules`) into `.nuxt/tsconfig.json` references.
5. Adds a Vite plugin forcing client-side pre-bundling of heavy deps
   (`zod`, `xlsx`, `jspdf`, `jspdf-autotable`, `pluralize`, `useChangeCase`).

Config lives in two places, at two different lifecycles:

| Layer | File | Reload | Content |
|---|---|---|---|
| Module options | `nuxt.config.ts` | Requires rebuild | `apiBase`, `auth`, `headers` |
| App config | `app.config.ts` (`crud` key) | Hot-reloadable | `tableHiddenFields`, `formHiddenFields`, `hideForeignKeys`, `exports`, `aggregates` |

---

## 3. Read Path

```
Table.vue
 ├─ useFetch(`${apiBase}/${resource}`)              → records
 ├─ useFetch(`${apiBase}/_schemas/${resource}`)     → schema
 ├─ useNctTableFormat()
 │    ├─ flattenKeys()            dot-path column discovery, skips arrays
 │    ├─ getColumnValue()         dot-path resolution
 │    ├─ formatCellValue()        ISO-date → locale string, guards Invalid Date
 │    ├─ getForeignKeyColumns()   suffix + sibling-relation-object match
 │    └─ getParentBackReferenceColumns()  child FK that points back at the open parent row
 ├─ useNctAggregates(records, crudConfig.aggregates)
 │    ├─ withVirtualColumns()     per-row computed columns (multiply/add/subtract/divide)
 │    ├─ footerValues()           per-array reductions (sum/count/avg/min/max)
 │    └─ withParentFooterColumns()  rolls a child array's footer total up as a parent column
 ├─ resolveHiddenFields() + isFieldHidden()   tableHiddenFields filtering
 └─ NctCommonPagination            client-side search + slice
```

`ViewRow.vue` reuses `useNctTableFormat` (flattenKeys/getColumnValue/formatCellValue/
getForeignKeyColumns/getParentBackReferenceColumns) against a **single already-fetched
row**, and buckets its keys into three groups:

- root primitives (rendered as a definition list)
- parent objects (one-to-one side-loaded relation, e.g. `order.customer`) → collapsible sub-table
- child arrays (one-to-many side-loaded relation, e.g. `order.orderitems`) → collapsible sub-table

It does **not** use `useNctAggregates` — footer totals only appear in `Table.vue`'s expanded
rows, not in the `ViewRow` modal. (Candidate refactor — see §9.)

Row/column visibility is entirely dependent on the API embedding relation data in the
`GET` response (`row.customer`, `row.orderitems`, etc.) — this is what `relations.ts` /
`nacTableQueryConfig` produce on the Drizzle side, or an eager-loaded Eloquent relation
on the Laravel side.

---

## 4. Write Path

```
CreateRow.vue / EditRow.vue
 └─ UModal
      └─ Form.vue
           ├─ resolveHiddenFields(crud.formHiddenFields, resource, NCT_FORM_HIDDEN_FIELDS)
           ├─ useNctDynamicZodSchema(filteredFields, isEdit)
           │     → per-field zod validator via nctValidationRules[field.type]
           │     → optional()/nullable() when !required || isEdit
           ├─ state: reactive record seeded from initialState
           │     → unwraps relation objects on *_id/Id fields (`{id: 1, ...}` → `1`)
           ├─ per-field control resolution:
           │     boolean     → UCheckbox
           │     *_id / *Id  → NctCrudNameList   (relation picker)
           │     password    → NctCommonPassword (create only)
           │     date        → UInput type=datetime-local
           │     enum        → USelect
           │     textarea    → UTextarea
           │     default     → UInput
           └─ emits 'submit' → useNctCrudFetch('POST'|'PATCH', resource, id, data)
                  → $fetch with useNctHeaders()
                  → toast (success/error)
                  → refreshNuxtData() on success
                  → returns Promise<boolean>, used by Create/EditRow to gate `open.value = false`
```

`NameList.vue` is the relation **picker** used inside `Form.vue` for any `*_id`/`*Id`
field. It independently fetches `GET ${apiBase}/${pluralizedRelationName}` to populate a
`USelectMenu` with every selectable row (label = `name || title || num || '#id'`).

---

## 5. Auth & Permissions

```
useNctAuth()          token/user state (useState, cookie-synced), login/register/logout/fetchUser
abilities.ts
 ├─ nctIsAuthEnabled()          reads runtimeConfig.public.crudTable.auth
 ├─ nctIsAdmin(user)            role === 'admin'
 ├─ nctIsOwner(user, record, ownerKey='createdBy')   Number() coercion both sides
 ├─ nctHasPermission(user, model, action)            admin/auth-disabled short-circuit
 ├─ nctHasRowPermission(user, model, action, record) falls back to `${action}_own` + nctIsOwner
 └─ nctIsAllowedToSeeResourceMenu(user, model)        list | list_all | list_own
```

`Table.vue` gates the create button and each row's view/edit/delete actions through
`nctHasPermission`/`nctHasRowPermission` against `$nctUser` (injected via a host-provided
Nuxt plugin, typed in `types.d.ts`).

---

## 6. Backend Contract

```
GET    apiBase/:resource                 → array | { data: array }
GET    apiBase/:resource/:id             → single record
POST   apiBase/:resource                 → create
PATCH  apiBase/:resource/:id             → partial update
DELETE apiBase/:resource/:id             → delete
GET    apiBase/_schemas/:resource        → NctSchemaDefinition
```

```ts
interface NctField {
  name: string
  type: string           // string | number | email | password | boolean | date | enum | textarea | ...
  required?: boolean
  selectOptions?: string[]
  references?: string
  readonly?: boolean
}

interface NctSchemaDefinition {
  resource: string
  labelField: string
  fields: NctField[]
}
```

Security-sensitive fields (`password`, `secret`, `token`, `github_id`, `google_id`, ...)
must never be serialized by the backend in the first place — `nct` has no way to
un-leak a field that already crossed the wire. `formHiddenFields`/`tableHiddenFields`
are UX conveniences, not a security boundary (documented directly in `constants.ts`).

---

## 7. Config Reference (`app.config.ts` → `crud`)

| Key | Shape | Default | Notes |
|---|---|---|---|
| `tableHiddenFields` | `NctFieldVisibility` | `NCT_TABLE_HIDDEN_FIELDS` | list view only |
| `formHiddenFields` | `NctFieldVisibility` | `NCT_FORM_HIDDEN_FIELDS` | create/edit forms only |
| `hideForeignKeys` | `boolean` | `true` (per Table.vue usage) | drops `*_id`/`*Id` columns that have a matching side-loaded relation object |
| `exports.excel/pdf` | `{ globalExclude, resourceExclude }` | — | client-side XLSX/PDF export column exclusion |
| `aggregates` | `Record<resource, { columns?, footer?, footerInParent? }>` | — | virtual + footer aggregate defs, see `useNctAggregates` |

`NctFieldVisibility` = bare `string[]` **or** `{ default?, resources? }`. An object's
`default` *replaces* the built-in default entirely; `resources[resource]` always
*appends* to whichever default applies. Matching is case-convention-agnostic
(`isFieldHidden` normalizes both sides to snake_case).

---

## 8. Quick File Map

```
src/runtime/
  app/components/nct/
    common/  Pagination.vue  Password.vue  SearchButton.vue
    crud/    CreateRow.vue  EditRow.vue  Form.vue  NameList.vue  Table.vue  ViewRow.vue
    AuthForm.vue
  app/utils/  abilities.ts  constants.ts  field-visibility.ts  formatter.ts
  composables/
    useNctAggregates.ts  useNctAuth.ts  useNctCrudFetch.ts  useNctDynamicZodSchema.ts
    useNctExport.ts  useNctFormState.ts  useNctHeaders.ts  useNctTableFormat.ts
  server/
  shared/types/  auth.ts  config.ts  schema.ts  validation-rules.ts
  types.d.ts
module.ts
```