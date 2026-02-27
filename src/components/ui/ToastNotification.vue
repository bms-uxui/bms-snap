<script setup>
import { useToast } from '../../composables/useToast'

const { message, isVisible } = useToast()
</script>

<template>
  <div
    class="fixed top-[100px] right-6 z-[10000] w-fit h-auto max-w-[400px] py-3 px-6 bg-gray-900 text-white rounded-lg text-sm shadow-lg transition-all duration-300 ease-in-out"
    :class="isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[calc(100%+24px)]'"
  >
    {{ message }}
  </div>
</template>