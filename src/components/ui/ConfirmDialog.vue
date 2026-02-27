<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'ยืนยัน'
  },
  cancelText: {
    type: String,
    default: 'ยกเลิก'
  },
  danger: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'cancel'])

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-overlay active"
      @click="handleOverlayClick"
    >
      <div class="confirm-dialog">
        <div class="confirm-icon">
          <svg
            v-if="danger"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c00"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg
            v-else
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF9800"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="emit('cancel')">
            {{ cancelText }}
          </button>
          <button
            class="btn-primary"
            :style="danger ? { background: '#c00' } : {}"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
