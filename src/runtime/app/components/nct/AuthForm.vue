<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useNctAuth } from '#imports'

const items = [
  {
    slot: 'login',
    label: 'Sign In',
    icon: 'i-heroicons-lock-closed',
  },
  {
    slot: 'register',
    label: 'Create Account',
    icon: 'i-heroicons-user-plus',
  },
]

const { login, register } = useNctAuth()

// --- Login State & Logic ---
const loginLoading = ref(false)
const loginError = ref('')
const loginState = reactive({
  email: '',
  password: '',
})

async function onLoginSubmit() {
  loginLoading.value = true
  loginError.value = ''

  const result = await login(loginState)
  loginLoading.value = false

  if (!result?.success) {
    loginError.value = result?.error || 'Invalid credentials'
  }
}

// --- Register State & Logic ---
const registerLoading = ref(false)
const registerError = ref('')
const registerState = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

async function onRegisterSubmit() {
  registerLoading.value = true
  registerError.value = ''

  const result = await register(registerState)
  registerLoading.value = false

  if (!result?.success) {
    registerError.value = result?.error || 'Registration failed. Please check your inputs.'
  }
}
</script>

<template>
  <UCard class="max-w-md mx-auto my-12 shadow-md">
    <template #header>
      <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">
        Admin Portal Access
      </h3>
      <p class="mt-1 text-sm text-neutral-500">
        Sign in to your admin panel, or create a new account if you haven't registered yet.
      </p>
    </template>

    <UTabs
      :items="items"
      class="w-full"
    >
      <template #login>
        <UForm
          :state="loginState"
          class="space-y-4 pt-4"
          @submit="onLoginSubmit"
        >
          <UFormField
            label="Email"
            name="email"
            required
          >
            <UInput
              v-model="loginState.email"
              type="email"
              placeholder="cliford@clifland.com"
              icon="i-heroicons-envelope"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            required
          >
            <UInput
              v-model="loginState.password"
              type="password"
              icon="i-heroicons-lock-closed"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="loginError"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="loginError"
          />

          <UButton
            type="submit"
            block
            :loading="loginLoading"
            color="primary"
          >
            Sign In
          </UButton>
        </UForm>
      </template>

      <template #register>
        <UForm
          :state="registerState"
          class="space-y-4 pt-4"
          @submit="onRegisterSubmit"
        >
          <UFormField
            label="Full Name"
            name="name"
            required
          >
            <UInput
              v-model="registerState.name"
              type="text"
              placeholder="Cliford Pereira"
              icon="i-heroicons-user"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Email Address"
            name="email"
            required
          >
            <UInput
              v-model="registerState.email"
              type="email"
              placeholder="cliford@clifland.com"
              icon="i-heroicons-envelope"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            required
          >
            <UInput
              v-model="registerState.password"
              type="password"
              icon="i-heroicons-lock-closed"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Confirm Password"
            name="password_confirmation"
            required
          >
            <UInput
              v-model="registerState.password_confirmation"
              type="password"
              icon="i-heroicons-shield-check"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="registerError"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="registerError"
          />

          <UButton
            type="submit"
            block
            :loading="registerLoading"
            color="primary"
          >
            Create Account
          </UButton>
        </UForm>
      </template>
    </UTabs>
  </UCard>
</template>
