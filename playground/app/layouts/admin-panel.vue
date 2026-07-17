<script setup lang="ts">
const { loggedIn, logout } = useNctAuth()
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Unauthenticated state: Intercept interface with login wall -->
    <div v-if="!loggedIn" class="min-h-[50vh] flex items-center justify-center">
      <NctAuthForm />
    </div>

    <!-- Authenticated layout application shell -->
    <div v-else class="space-y-4">
      <div class="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Secure NCT Dashboard</h1>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-arrow-left-on-rectangle" @click="logout">
          Logout
        </UButton>
      </div>

      <main>
        <slot />
      </main>
    </div>
  </div>
</template>