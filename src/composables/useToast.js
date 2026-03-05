import { ref } from 'vue'

const message = ref('')
const isVisible = ref(false)
const toastType = ref('default') // 'default' | 'success' | 'error'
let timeout = null

export function useToast() {
  function showToast(msg, duration = 3000, type = 'default') {
    if (timeout) {
      clearTimeout(timeout)
    }
    message.value = msg
    toastType.value = type
    isVisible.value = true
    timeout = setTimeout(() => {
      isVisible.value = false
    }, duration)
  }

  return {
    message,
    isVisible,
    toastType,
    showToast
  }
}
