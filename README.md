# nuxt-crud-table

An API-driven dynamic CRUD table and form engine for Nuxt.js. Automatically reflects backend resource schemas at runtime to build instant, functional administration data grids and forms.

Designed for rapid deployment of internal admin portals where standard grids handle baseline operations, while preserving layout freedom for custom feature views.

## Features

- **Runtime Reflection:** Automatically queries your backend for configuration schemas to build interfaces dynamically.
- **Headless Client Architecture:** Completely detached from any single backend ecosystem; compatible with NAC, Laravel, Supabase, or custom REST specifications.
- **Zero Local Schema Setup:** No local code generation or static schemas required within the client bundle.
- **Admin Workspace Focus:** Drops into resource views instantly while leaving standard custom page development uninhibited.

## Installation

```bash
bun add nuxt-crud-table

```

## Configuration

Register the module in your Nuxt configuration file. Define your global fallback endpoints or authentication tokens here.

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-crud-table'],
  crudTable: {
    baseUrl: process.env.API_BASE_URL || '/api/_nac',
    headers: () => ({
      Authorization: `Bearer ${useCookie('token').value}`
    })
  }
})

```

## Usage

Drop the interface engine directly into any administrative page route. It will query the endpoint, process the metadata context, and render the workspace.

```vue
<!-- pages/admin/orders.vue -->
<template>
  <NuxtCrudTable :actions="['create', 'read', 'update', 'delete']" resource="orders"/>
</template>

```

## Architecture Integration Model

This module functions as a dynamic interface client within a decoupled system layout:

1. **Interface Layer:** `nuxt-crud-table` handles rendering data layouts and parsing schema responses.
2. **Abstract Framework:** Your central template coordinates endpoint routing protocols.
3. **Concrete Database/Instance:** Individual backend installations process actual queries and return resource definitions.

## Development

```bash
# Install dependencies
bun install

# Prepare local playground environment
bun run dev:prepare

# Start playground development server
bun run dev

```

## License

MIT

```
