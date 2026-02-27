import { ref } from 'vue'

const message = ref('')
const isVisible = ref(false)
let timeout = null

export function useToast() {
  function showToast(msg, duration = 3000) {
    if (timeout) {
      clearTimeout(timeout)
    }
    message.value = msg
    isVisible.value = true
    timeout = setTimeout(() => {
      isVisible.value = false
    }, duration)
  }

  return {
    message,
    isVisible,
    showToast
  }
}
