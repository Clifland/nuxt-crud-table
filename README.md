# nuxt-crud-table (nct - beta)

A Nuxt module that **dynamically renders CRUD tables and forms** from API data and schema specifications. 
Highly useful for building admin panels and internal tools quickly.

---

## What It Solves

Building admin panels typically requires duplicate layout, form, and validation boilerplate for every single resource. `nuxt-crud-table` eliminates this.

* **Zero Boilerplate:** Renders listings, lookups, forms, and permission states natively via a single `:resource` parameter.
* **Data-Agnostic Processing:** Works natively with standard raw data arrays (Nuxt/Nitro) or data-wrapped response objects (Laravel structures).

---

## Installation

### 1. Install the Dependencies

Add `nuxt-crud-table` along with `@nuxt/ui` to your project dependencies:

```bash
bun add nuxt-crud-table @nuxt/ui
```

### 2. Register the Modules
Add both modules to the `modules` array inside your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', 'nuxt-crud-table']
})
```

### 3. Start Developing
Run your local development environment to start using the module:

```bash
bun dev
```

## How to Implement & Use

### 1. Backend Contract Requirements

To get started with `nct`, you'll need a backend application that serves APIs matching our expected contract. Your backend must expose standard RESTful endpoints for resources along with a dedicated metadata schema route:

#### Data API Endpoints

| Method | Endpoint | Action |
| --- | --- | --- |
| **GET** | `apiBaseUrl/:model` | List records |
| **POST** | `apiBaseUrl/:model` | Create a record |
| **GET** | `apiBaseUrl/:model/:id` | Fetch a single record |
| **PATCH** | `apiBaseUrl/:model/:id` | Partially update a record |
| **DELETE** | `apiBaseUrl/:model/:id` | Delete a record |

#### Schema Specification Endpoint

Your API must provide a metadata schema to populate, and validate your forms. The data structure within your API payload must match this schema signature:

```ts
export interface NctField {
  name: string
  type: string
  required?: boolean
  selectOptions?: string[]
  references?: string
  readonly?: boolean
}

export interface NctSchemaDefinition {
  resource: string
  labelField: string
  fields: NctField[]
}

```

* **Route Pattern:** `GET apiBaseUrl/_schemas/:resource`
* **Payload Example (`GET http://localhost:8000/api/_schemas/products`):**

```json
{
  "resource": "products",
  "labelField": "name",
  "fields": [
    { "name": "id", "type": "number", "required": true, "readonly": true },
    { "name": "name", "type": "string", "required": true, "readonly": false },
    { "name": "sku", "type": "string", "required": true, "readonly": false },
    { "name": "price", "type": "number", "required": true, "readonly": false },
    { "name": "stock", "type": "number", "required": true, "readonly": false }
  ]
}

```

> [!IMPORTANT]
> Your API should never serialize security-sensitive fields (passwords, tokens, third-party OAuth ids, password-reset tokens, etc.) in the first place — `nct` is a rendering layer and has no way to un-leak a field that's already crossed the network. Hiding such a field client-side via `formHiddenFields` provides no protection; that's strictly the backend's responsibility (e.g. Laravel's `$hidden`/`$guarded`, or simply not selecting the column).

---

### 2. Frontend Application Setup

#### Step A: Configure Environment Base URL

Define your target backend API root url string inside your host `.env` configuration file:

```env
NUXT_PUBLIC_CRUD_TABLE_API_BASE=http://localhost:8000/api

```

#### Step B: Define Global Request Headers (Optional)

If your app uses authentication, you can supply a `headers` function in your module config to attach auth tokens (or any other metadata) to internal engine fetch requests.

> [!NOTE]
> This step is **optional**. If you don't set `headers`, requests are sent without any extra headers by default — no dummy function or extra file required.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  crudTable: {
    headers: () => ({
      Authorization: `Bearer ${useCookie('token').value || ''}`
    })
  }
})
```

> [!IMPORTANT]
> The `headers` function must be self-contained — it can't reference variables from outside its own body (e.g. imported constants or module-level variables), since it's serialized at build time. You can safely use Nuxt auto-imports like `useCookie` or `useRuntimeConfig` inside it, since those resolve globally.

#### Step C: Mount the Unified Table Layout Workspace

Mount the component to a dynamic route view layer to instantly capture parameter changes:

```vue
<!-- app/pages/resource/[slug].vue -->
<script setup lang="ts">
const route = useRoute()
const resource = route.params.slug as string
</script>

<template>
  <div v-if="resource">
    <NctCrudTable :resource="resource" />
  </div>
  <div v-else class="p-4">
    Loading Data Table...
  </div>
</template>

```

#### Step D: Optional Customization Rules (`app.config.ts`)

Override field visibility, structural presentation rules, or data extraction exclusions via your `app.config.ts`'s `crud` key. Unlike `nuxt.config.ts`'s `crudTable` module options (which require a rebuild to change), everything here is hot-reloadable at runtime.

```ts
// app.config.ts
export default defineAppConfig({
  crud: {
    // Fields hidden from the main data table/list view.
    // Either a bare array (applied to every resource), or an object with an
    // optional `default` (replaces nct's built-in default entirely, if given)
    // plus per-resource `resources` additions.
    tableHiddenFields: {
      default: ['updated_at', 'deleted_at', 'created_by', 'updated_by'],
    },

    // Fields hidden from create/edit forms. Same shape as tableHiddenFields.
    // Field-name matching is case-convention-agnostic — listing `created_at`
    // also matches a `createdAt` field arriving from a camelCase API, so
    // there's no need to list both variants.
    formHiddenFields: {
      resources: {
        users: ['password_confirmation'], // an extra on top of nct's built-in default
      },
    },

    // Export layout targeting metrics
    exports: {
      pdf: {
        globalExclude: ['avatar'],
        resourceExclude: {
          users: ['password', 'googleId', 'githubId']
        }
      },
      excel: {
        globalExclude: [],
        resourceExclude: {
          users: ['password']
        }
      }
    }
  }
})

```

---

## 3. Custom Print Templates (Optional)

Every child-array section (an order's line items, for example) gets a **Print** 
button automatically. By default it prints the plain data table — but you can 
swap in a fully custom layout (e.g. a formatted invoice) per resource, without 
forking any of nct's own components.

### How it works

`NctCrudTable` exposes a `print-template` slot. When present, nct renders 
*your* template inside the print area instead of its own default table — 
mapped per child resource, so different resources (e.g. `orderitems` vs. 
`shipments`) can each get their own layout.

```vue
<!-- app/pages/resource/[slug].vue -->
<script setup lang="ts">
import type { Component } from 'vue'
import InvoiceTemplate from '~/components/InvoiceTemplate.vue'
// import ShippingLabel from '~/components/ShippingLabel.vue'

const route = useRoute()
const resource = route.params.slug as string

// Maps a child resource name to the template that should render it.
// Resources with no entry here fall back to nct's default plain table.
const templateMap: Record<string, Component> = {
  orderitems: InvoiceTemplate,
  // shipments: ShippingLabel,
}
</script>

<template>
  <div v-if="resource">
    <NctCrudTable :resource="resource">
      <template #print-template="slotProps">
        <component
          :is="templateMap[slotProps.resource!]"
          v-bind="slotProps"
        />
      </template>
    </NctCrudTable>
  </div>
</template>
```

> [!NOTE]
> If `templateMap` has no entry for a given child resource, nct silently falls 
> back to its own default table — you only need to write a template for the 
> resources you actually want to customize.

### The `NctPrintTemplateProps` contract

Your template component receives a fixed set of props, exported from the 
module so you get full typing:

```ts
import type { NctPrintTemplateProps } from 'nuxt-crud-table'

const props = defineProps<NctPrintTemplateProps>()
```

| Prop             | Type                                                | Description                                                                                   |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `resource`       | `string`                                             | The child resource's plural API name (e.g. `'orderitems'`).                                    |
| `schema`         | `NctSchemaDefinition \| undefined`                   | The child resource's own schema.                                                                |
| `columns`        | `{ key: string, label: string, align?: 'left' \| 'right' }[]` | Visible columns, already resolved — dot-paths and all.                              |
| `rows`           | `Record<string, unknown>[]`                          | The child rows, including any virtual/aggregate columns from `crud.aggregates`.                |
| `footer`         | `Map<string, { label: string, value: number }[]> \| undefined` | Footer aggregate cells, keyed by column key. `undefined` if no footer is configured. |
| `parentResource` | `string \| undefined`                                | The parent resource's plural API name (e.g. `'orders'`).                                       |
| `parentRow`      | `Record<string, unknown> \| undefined`               | The full parent row — use this for parent-level context like a customer name or order number.  |

> [!IMPORTANT]
> `columns` may contain dot-notated keys for side-loaded relation data (e.g. 
> `product.name`). Always resolve cell values with `useNctTableFormat()`'s 
> `getColumnValue`/`formatCellValue` rather than a plain `row[col.key]` index 
> — a flat index silently resolves to `undefined` for anything beyond 
> top-level fields.

### Example: a custom invoice

```vue
<!-- app/components/InvoiceTemplate.vue -->
<script setup lang="ts">
import type { NctPrintTemplateProps } from 'nuxt-crud-table'

const props = defineProps<NctPrintTemplateProps>()
const { formatCellValue, getColumnValue } = useNctTableFormat()

const order = props.parentRow as {
  num?: string
  customer?: { name?: string, email?: string }
} | undefined
</script>

<template>
  <div class="print-invoice">
    <header class="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
      <h1 class="text-2xl font-bold">
        Invoice — Order #{{ order?.num }}
      </h1>
      <p>{{ order?.customer?.name }}</p>
    </header>

    <table class="w-full text-sm">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="String(row.id)">
          <td v-for="col in columns" :key="col.key">
            {{ formatCellValue(getColumnValue(row, col.key)) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

> [!NOTE]
> If you're writing more than one print template, consider factoring the 
> `<table>` body out into your own shared component — it's plain markup driven 
> entirely by `columns`/`rows`/`footer`, so it's reusable across templates 
> with no nct-specific coupling beyond `useNctTableFormat()`.

### Print styling

nct injects a small print-isolation stylesheet automatically — your template 
just needs a `.print-invoice` (or similar) wrapper class; you don't need to 
register your own `@media print` rules or worry about the rest of the page 
bleeding into the printed output.

---

## Limitations

* Global search querying, filtering, and pagination states are executed client-side via JavaScript.

---

## Reference Implementations

* 🔹 **FullStack:** [nct-nac-fullstack](https://github.com/Clifland/nct-nac-fullstack)
* 🔹 **Frontend:** [nct-laravel-frontend](https://github.com/Clifland/nct-laravel-frontend)
* 🔸 **Backend:** [nct-laravel-backend](https://github.com/Clifland/nct-laravel-backend)

---

## Troubleshooting

### "event.req.text is not a function" Error

If you encounter the error `event.req.text is not a function`, it usually indicates an issue with cached or mismatched dependency versions. 

To resolve this, completely reinstall your dependencies by running:

```bash
# Remove existing node_modules
rm -rf node_modules

# Reinstall dependencies
bun install
# or
npm install

```