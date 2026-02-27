<script setup>
defineProps({
  size: { type: [Number, String], default: 16 },
  color: { type: String, default: 'currentColor' }
})
</script>

<template>
  <svg class="animate-spin" :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" stroke-width="2">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
  </svg>
</template>
