<script setup>
defineProps({
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
  }
})

defineEmits(['update:modelValue'])
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
      :type="type"
      :placeholder="placeholder"
      class="grow bg-transparent border-none outline-none text-[var(--primary-text)] placeholder:text-[var(--secondary-text)]"
      @input="$emit('update:modelValue', $event.target.value)"
    >
  </label>
</template>