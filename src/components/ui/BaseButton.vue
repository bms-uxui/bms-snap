<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})

defineEmits(['click'])
</script>

<template>
  <button
    :class="[
      'btn !rounded-full shadow-none !transition-all !duration-300 !ease-in-out hover:scale-105',
      variant === 'primary'
        ? 'btn-primary hover:shadow-[4px_4px_0px_rgba(43,127,255,0.2)]'
        : variant === 'secondary'
        ? 'btn-secondary-custom'
        : variant === 'ghost'
        ? 'btn-ghost-custom'
        : variant === 'danger'
        ? 'btn-danger-custom'
        : 'btn-outline !text-[#194987] !border-[#194987] hover:!bg-blue-50 hover:shadow-[4px_4px_0px_rgba(25,73,135,0.2)]',
      size === 'sm' ? 'btn-sm' : size === 'lg' ? '!text-base !px-16 !py-8' : '!text-base !px-8 !py-4'
    ]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style>
/* Override DaisyUI ghost button styles */
.btn-ghost-custom {
  background-color: transparent;
  border-color: transparent;
  color: var(--primary-text) !important;
}

.btn-ghost-custom:hover {
  background-color: rgb(243 244 246) !important;
  border-color: transparent !important;
  color: var(--primary-text) !important;
}

/* Secondary button styles */
.btn-secondary-custom {
  background-color: var(--surface) !important;
  border-color: transparent !important;
  color: var(--secondary-text) !important;
}

.btn-secondary-custom:hover {
  background-color: rgb(229 231 235) !important;
  border-color: transparent !important;
  color: var(--primary-text) !important;
}

/* Primary button styles */
.btn-primary {
  background-color: var(--primary-brand) !important;
  border-color: var(--primary-brand) !important;
  color: #ffffff !important;
}

.btn-primary:hover {
  background-color: #004a91 !important;
  border-color: #004a91 !important;
}

/* Danger button styles */
.btn-danger-custom {
  background-color: #fef2f2 !important;
  border-color: transparent !important;
  color: #ef4444 !important;
}

.btn-danger-custom:hover {
  background-color: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
}
</style>