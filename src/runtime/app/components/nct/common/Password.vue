<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * Two-way binding macro handling the user's password string value.
 */
const modelValue = defineModel<string>()

/**
 * Local flag toggling visibility profile of the raw password input text masks.
 */
const show = ref(false)

/**
 * Checks a string sequence against standard complexity criteria matrices.
 * * @param str - The raw password string sequence under validation checks.
 * @returns An array containing evaluation flags paired with descriptive string rules.
 */
function checkStrength(str: string) {
  const requirements = [
    { regex: /.{8,}/, text: 'At least 8 characters' },
    { regex: /\d/, text: 'At least 1 number' },
    { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
    { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  ]

  return requirements.map(req => ({
    met: req.regex.test(str),
    text: req.text,
  }))
}

/**
 * Computed validation array mapping which rule parameters have been satisfied.
 * * @returns An array list of dynamic checklist status objects.
 */
const strength = computed(() => checkStrength(modelValue.value || ''))

/**
 * Computed aggregate integer ranking complexity from `0` to `4`.
 * * @returns The final summation tally indicating passed requirement rules.
 */
const score = computed(() => strength.value.filter(req => req.met).length)

/**
 * Computed theme color profile mappings mapped directly into Nuxt UI component frameworks.
 * * @returns A string semantic matching `neutral`, `error`, `warning`, or `success`.
 */
const color = computed(() => {
  if (score.value === 0) return 'neutral'
  if (score.value <= 1) return 'error'
  if (score.value <= 2) return 'warning'
  if (score.value === 3) return 'warning'
  return 'success'
})

/**
 * Computed evaluation assigning localized warning string tags based upon scoring metrics.
 * * @returns The visual feedback evaluation string.
 */
const text = computed(() => {
  if (score.value === 0) return 'Enter a password'
  if (score.value <= 2) return 'Weak password'
  if (score.value === 3) return 'Medium password'
  return 'Strong password'
})
</script>

<template>
  <div class="space-y-2">
    <div>
      <UInput
        v-model="modelValue"
        placeholder="Password"
        :color="color"
        :type="show ? 'text' : 'password'"
        :aria-invalid="score < 4"
        aria-describedby="password-strength"
        :ui="{ trailing: 'pe-1' }"
      >
        <template #trailing>
          <UButton
            color="neutral"
            variant="link"
            size="sm"
            :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="show ? 'Hide password' : 'Show password'"
            :aria-pressed="show"
            aria-controls="password"
            @click="show = !show"
          />
        </template>
      </UInput>
    </div>

    <UProgress
      :color="color"
      :indicator="text"
      :model-value="score"
      :max="4"
      size="sm"
    />

    <p
      id="password-strength"
      class="text-sm font-medium"
    >
      {{ text }}. Must contain:
    </p>

    <ul
      class="space-y-1"
      aria-label="Password requirements"
    >
      <li
        v-for="(req, index) in strength"
        :key="index"
        class="flex items-center gap-0.5"
        :class="req.met ? 'text-success' : 'text-muted'"
      >
        <UIcon
          :name="req.met ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
          class="size-4 shrink-0"
        />

        <span class="text-xs font-light">
          {{ req.text }}
          <span class="sr-only">
            {{ req.met ? " - Requirement met" : " - Requirement not met" }}
          </span>
        </span>
      </li>
    </ul>
  </div>
</template>