<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'
import BaseButton from './ui/BaseButton.vue'
import { IconUpload } from './icons'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const router = useRouter()
const store = useAppStore()
const { showToast } = useToast()

const isDragOver = ref(false)
const fileInput = ref(null)


function handleClose() {
  emit('close')
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleImportFile(event) {
  const file = event.target.files[0]
  if (file) {
    processImportFile(file)
  }
  event.target.value = ''
}

function handleDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.name.endsWith('.json')) {
    processImportFile(file)
  } else {
    showToast('กรุณาเลือกไฟล์ .json เท่านั้น')
  }
}

function processImportFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result)

      if (!importedData.data || !importedData.data.user) {
        showToast('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์สำรองจาก HurryUp')
        return
      }

      const result = store.importData(importedData.data)
      handleClose()
      showToast(result.message)

      if (result.success) {
        setTimeout(() => {
          router.push('/app')
        }, 500)
      }
    } catch (error) {
      console.error('Import error:', error)
      showToast('เกิดข้อผิดพลาดในการนำเข้าข้อมูล')
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="handleClose">
      <div class="absolute inset-0 bg-black/50 transition-opacity"></div>
      <div
        class="relative w-[90vw] max-w-[420px] flex flex-col items-center p-10 bg-white rounded-2xl transition-all duration-200 animate-modal-pop"
        :class="{ '!border-2 !border-dashed !border-[#194987] !bg-blue-50': isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop="handleDrop"
      >
        <button
          class="btn btn-ghost btn-sm btn-circle absolute top-4 right-4"
          @click="handleClose"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="mb-5">
          <IconUpload :size="48" />
        </div>

        <h3 class="text-[22px] font-semibold text-gray-900 mb-3">นำเข้าข้อมูล</h3>
        <p class="text-sm text-gray-500 leading-relaxed mb-7 text-center">
          เลือกไฟล์ JSON ที่เคยส่งออกไว้จาก HurryUp เพื่อกู้คืนข้อมูลของคุณ
        </p>

        <BaseButton class="!rounded-xl gap-2.5" @click="triggerFileInput">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          เลือกไฟล์ .json
        </BaseButton>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImportFile"
        >

        <p class="text-[13px] text-gray-400 mt-4">หรือลากไฟล์มาวางที่นี่</p>
      </div>

    </div>
  </Transition>
</template>

<style>
/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Modal pop animation */
@keyframes modalPop {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-modal-pop {
  animation: modalPop 0.2s ease-out;
}
</style>