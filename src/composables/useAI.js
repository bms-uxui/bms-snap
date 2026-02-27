import { ref } from 'vue'

const AI_PROXY_URL_KEY = 'hurryup_ai_proxy_url'
const DEFAULT_PROXY_URL = ''

export function useAI() {
  const isGenerating = ref(false)
  const aiError = ref('')

  function getProxyUrl() {
    return localStorage.getItem(AI_PROXY_URL_KEY) || DEFAULT_PROXY_URL
  }

  function setProxyUrl(url) {
    localStorage.setItem(AI_PROXY_URL_KEY, url)
  }

  async function generateReport({ bulletPoints, projectName, userName, userRole }) {
    if (!bulletPoints || !bulletPoints.trim()) {
      return { success: false, error: 'กรุณาพิมพ์เนื้อหาก่อนสร้างรายงาน' }
    }

    const proxyUrl = getProxyUrl()
    if (!proxyUrl) {
      return { success: false, error: 'กรุณาตั้งค่า AI Proxy URL ในหน้าตั้งค่าก่อน' }
    }

    isGenerating.value = true
    aiError.value = ''

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulletPoints,
          projectName,
          userName,
          userRole,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.html) {
        throw new Error('ไม่ได้รับเนื้อหาจาก AI')
      }

      return { success: true, html: data.html }
    } catch (err) {
      const errorMsg = err.message === 'Failed to fetch'
        ? 'ไม่สามารถเชื่อมต่อ AI ได้ กรุณาตรวจสอบการเชื่อมต่อ'
        : `เกิดข้อผิดพลาด: ${err.message}`
      aiError.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    aiError,
    generateReport,
    getProxyUrl,
    setProxyUrl,
  }
}
