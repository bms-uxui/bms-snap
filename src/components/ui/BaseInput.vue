<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  error: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])

const showPassword = ref(false)
const inputType = computed(() => {
  if (props.type === 'password' && showPassword.value) return 'text'
  return props.type
})
</script>

<template>
  <label
    :class="[
      'input input-bordered w-full flex items-center gap-3 bg-white !rounded-xl !h-12 !px-4 focus-within:!border-[var(--primary-brand)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--primary-brand)] focus-within:outline-offset-2',
      error ? '!border-red-500' : '!border-[var(--border-color)]'
    ]">
    <slot name="icon" />
    <input
      :value="modelValue"
      :type="inputType"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="grow bg-transparent border-none outline-none text-[var(--primary-text)] placeholder:text-[var(--secondary-text)] disabled:cursor-not-allowed read-only:cursor-default"
      :class="{ 'text-[var(--secondary-text)]': readonly || disabled }"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <slot name="suffix" />
    <button
      v-if="type === 'password'"
      type="button"
      class="flex-shrink-0 p-1 text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors"
      @click.prevent="showPassword = !showPassword"
    >
      <!-- Eye open -->
      <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <!-- Eye closed -->
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </button>
  </label>
</template>
