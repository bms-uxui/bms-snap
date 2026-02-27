<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 24
  },
  color: {
    type: String,
    default: 'currentColor'
  }
})
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" :height="size" viewBox="0 -960 960 960" :width="size" :fill="color">
    <path d="M240-160q-33 0-56.5-23.5T160-240v-80q0-17 11.5-28.5T200-360q17 0 28.5 11.5T240-320v80h480v-80q0-17 11.5-28.5T760-360q17 0 28.5 11.5T800-320v80q0 33-23.5 56.5T720-160H240Zm240-206L355-491q-12-12-11.5-28t12.5-28q12-11 28-11.5t28 11.5l75 75v-286q0-17 11.5-28.5T528-800q17 0 28.5 11.5T568-760v286l75-75q12-12 28.5-11.5T700-548q11 12 11.5 28T700-492L556-348q-6 6-13 8.5T528-337q-8 0-15-2.5t-13-8.5Z"/>
  </svg>
</template>
