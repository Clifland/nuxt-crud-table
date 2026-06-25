<script setup lang="ts">
const { login } = useNctAuth()
const loading = ref(false)
const errorMessage = ref('')

const state = reactive({
  email: '',
  password: ''
})

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''
  
  const result = await login(state)
  loading.value = false
  
  if (!result.success) {
    errorMessage.value = result.error || 'Invalid credentials'
  }
}
</script>

<template>
  <UCard class="max-w-md mx-auto my-12">
    <template #header>
      <h3 class="text-base font-semibold text-neutral-900 dark:text-white">
        NctAuth Gateway
      </h3>
      <p class="mt-1 text-sm text-neutral-500">
        Authenticate directly with the Laravel Sanctum instance.
      </p>
    </template>

    <!-- Nuxt UI v4 implementation -->
    <UForm :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" placeholder="cliford@clifland.com" icon="i-heroicons-envelope" class="w-full" />
      </UFormField>

      <UFormField label="Password" name="password" required>
        <UInput v-model="state.password" type="password" icon="i-heroicons-lock-closed" class="w-full" />
      </UFormField>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        :title="errorMessage"
      />

      <UButton type="submit" block :loading="loading" color="primary">
        Sign In
      </UButton>
    </UForm>
  </UCard>
</template>