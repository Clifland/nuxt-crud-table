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

Override field visibility parameters, structural presentation rules, or data extraction exclusions directly using your root runtime configurations layout:

```ts
// app.config.ts
export default defineAppConfig({
  crud: {
    // Columns globally filtered from UI layouts
    globalHide: ['updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'resetToken'],

    // Export layout targeting metrics
    exports: {
      pdf: {
        globalExclude: ['avatar', 'resetToken', 'resetExpires'],
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

## Limitations

* Global search querying, filtering, and pagination states are executed client-side via JavaScript.

---

## Reference Implementations

* 🔹 **FullStack:** [nct-nac-fullstack](https://github.com/Clifland/nct-nac-fullstack)
* 🔹 **Frontend:** [nct-laravel-frontend](https://github.com/Clifland/nct-laravel-frontend)
* 🔸 **Backend:** [nct-laravel-backend](https://github.com/Clifland/nct-laravel-backend)