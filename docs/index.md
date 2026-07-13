# NCT Technical Documentation

## `crud/` Domain Architecture — Technical Breakdown

### 1. Component Orchestration: `Table.vue` as the Root Controller

`Table.vue` is the single entry point mounted by the host app (`[slug].vue` → `<NctCrudTable :resource="resource" />`). It owns **two parallel fetches** — data and schema — and fans out rendering/mutation responsibility to four sibling components it imports implicitly via Nuxt's auto-registered `crud/` components dir:

| Component | Trigger condition | Responsibility |
|---|---|---|
| `CreateRow.vue` | `schema && nctHasPermission(user, resource, 'create')` | Renders "Add New X" modal + delegates to `Form.vue` |
| `ViewRow.vue` | `nctHasRowPermission(..., 'read', row)` | Read-only `<dl>` dump of a row, no `Form.vue` involvement |
| `EditRow.vue` | `nctHasRowPermission(..., 'update', row)` | Edit modal, pre-hydrates `Form.vue` via `initial-state` |
| *(Delete)* | `nctHasRowPermission(..., 'delete', row)` | Inline `useNctCrudFetch('DELETE', ...)` — no sub-component, just a `UButton` + toast confirmation |

`CreateRow.vue` and `EditRow.vue` are both thin **modal shells**: they own `open`/`loading` state and an `onSubmit` handler that calls `useNctCrudFetch`, but neither renders form fields itself — both project a `schema` (and optionally `initial-state`) into `Form.vue`, which is the actual field-rendering engine (checkbox/select/textarea/date/relation-picker switch based on `field.type`).

`NameList.vue` is a dependant of `Form.vue`, not `Table.vue` directly — it's invoked whenever a field name ends in `_id`/`Id`, turning a raw foreign key into a `USelectMenu` backed by its own `useFetch` against `apiBase/{pluralized relation}`.

### 2. State & Data Handling: Backend-Agnostic Payload Normalization

Since `nct` targets both raw-array backends (Drizzle/Nitro) and Laravel-style wrapped responses, `Table.vue`'s primary `useFetch` uses a defensive `transform`:

```ts
transform: (res) => {
  if (res && typeof res === 'object' && 'data' in res) return res.data
  return res ?? []
}
```

This is the **single normalization point** — everything downstream (`visibleColumns`, `paginatedItems`, child components) assumes a flat `Record<string, unknown>[]`, regardless of backend shape. A second, independent `useFetch` pulls `NctSchemaDefinition` from `apiBase/_schemas/:resource` — this schema object is what's threaded down into `CreateRow`, `EditRow`, and `Form.vue` as a prop, driving both column rendering and Zod validation.

Two more composables enrich the raw records before rendering:
- **`useNctAggregates`** — computes row-level virtual columns and child-array footer rollups (config-driven via `app.config.ts`'s `aggregates` key), producing `augmentedRecords`.
- **`useNctTableFormat`** — supplies `flattenKeys`/`getColumnValue` (dot-path flattening + FK/array detection) and `formatCellValue` (ISO date prettifying) used to derive `visibleColumns` and render each cell.

Pagination is delegated to `NctCommonPagination` (outside `crud/` scope) via an `@update:paginated` event feeding `paginatedItems`, which is what's actually iterated in the `<tbody>`.

### 3. Internal Composable Wiring Within `crud/`

- **`useNctCrudFetch`** — the only path for mutations (`POST`/`PATCH`/`DELETE`). Centralizes endpoint construction, `useNctHeaders()` injection, toast feedback, and `refreshNuxtData()` cache-busting. Called from `Table.vue` (delete), `CreateRow.vue`, and `EditRow.vue` (create/update) — none of these components hit `$fetch` directly.
- **`useNctDynamicZodSchema`** — consumed by `Form.vue` only, translating `NctField[]` into a live Zod object gating `UForm`'s `:schema`.
- **`useNctHeaders`** — thin auth-header accessor, consumed by every fetch call across `Table.vue`, `NameList.vue`, and `useNctCrudFetch`.
- **`nctHasPermission` / `nctHasRowPermission`** (from `abilities.ts` utils) — gate every action-button's visibility in `Table.vue`; `nctIsOwner`-style row checks are what let `EditRow`/`ViewRow`/delete diverge per-row rather than per-resource.
- **`nctDbFieldToLabel`** (formatter util) — used both in `Table.vue` (column headers, child-table headers) and `ViewRow.vue` (field labels), keeping label-casing logic in one place.

**Net flow:** `Table.vue` fetches+normalizes data and schema → augments via aggregates/table-format composables → renders grid + delegates row actions to `CreateRow`/`EditRow`/`ViewRow` → those forward `schema`/`initial-state` into `Form.vue` → `Form.vue` builds Zod validation + reactive state, resolving `_id` fields through `NameList.vue` → submissions funnel back through `useNctCrudFetch`, which triggers a global `refreshNuxtData()` that re-runs `Table.vue`'s `useFetch` and closes the loop.