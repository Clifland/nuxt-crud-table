<script setup lang="ts">
/**
 * Two-way data binding macro representing the search query string value.
 * Controlled by the input state and reset dynamically when the clear button is clicked.
 */
const value = defineModel<string>()
</script>

<template>
  <UInput
    v-model="value"
    placeholder="Search ..."
    :ui="{ trailing: 'pe-1' }"
  >
    <template
      v-if="value?.length"
      #trailing
    >
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-circle-x"
        aria-label="Clear input"
        @click="value = ''"
      />
    </template>
  </UInput>
</template>