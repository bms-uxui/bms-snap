<script setup>
defineProps({
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: 'currentColor' }
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" stroke-width="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
</template>
