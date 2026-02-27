<script setup>
defineProps({
  size: { type: [Number, String], default: 14 },
  color: { type: String, default: 'currentColor' }
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
</template>
