<script setup>
import { RouterView } from 'vue-router'
import ToastNotification from './components/ui/ToastNotification.vue'
</script>

<template>
  <RouterView />
  <ToastNotification />
</template>

<style>
/* Global styles are in assets/style.css */
</style>
