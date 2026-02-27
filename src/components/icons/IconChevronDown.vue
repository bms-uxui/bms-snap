<script setup>
defineProps({
  size: { type: [Number, String], default: 16 },
  color: { type: String, default: 'currentColor' }
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" stroke-width="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
</template>
