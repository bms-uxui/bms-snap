<script setup>
import { onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'default' // 'default', 'large', 'summary'
  }
})

const emit = defineEmits(['close'])

const modalSizeClasses = computed(() => {
  switch (props.size) {
    case 'large':
      return 'max-w-4xl'
    case 'summary':
      return 'w-[calc(100%-480px)] max-w-[1600px] max-h-[90vh] p-0 rounded-t-3xl m-0'
    default:
      return 'max-w-[700px]'
  }
})

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

function handleEscape(e) {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 z-[1000] flex justify-center items-center"
      :class="{ 'items-end': size === 'summary' }"
      @click="handleOverlayClick"
    >
      <div
        class="bg-white rounded-2xl p-8 w-[90%] max-h-[90vh] overflow-y-auto"
        :class="modalSizeClasses"
      >
        <div v-if="title" class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold">{{ title }}</h3>
          <button
            class="w-8 h-8 flex items-center justify-center bg-gray-100 border-none rounded-lg text-lg cursor-pointer hover:bg-gray-200"
            @click="emit('close')"
          >
            &times;
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>