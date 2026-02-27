import { ref } from 'vue'

const TAIGA_AUTH_KEY = 'hurryup_taiga_auth'

export function useTaiga() {
  const isLoading = ref(false)
  const taigaError = ref('')

  function getCredentials() {
    try {
      const stored = localStorage.getItem(TAIGA_AUTH_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  function saveCredentials(data) {
    localStorage.setItem(TAIGA_AUTH_KEY, JSON.stringify(data))
  }

  function isAuthenticated() {
    const creds = getCredentials()
    return !!(creds && creds.authToken)
  }

  function logout() {
    localStorage.removeItem(TAIGA_AUTH_KEY)
  }

  function extractSlugFromUrl(projectUrl) {
    // Parse: https://taiga.example.com/project/my-slug/ → my-slug
    try {
      const match = projectUrl.match(/\/project\/([^/?#]+)/)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  function extractBaseUrl(projectUrl) {
    // Parse: https://taiga.example.com/project/my-slug/ → https://taiga.example.com
    try {
      const url = new URL(projectUrl)
      return url.origin
    } catch {
      return null
    }
  }

  async function taigaFetch(proxyUrl, method, path, body = null, extraHeaders = null) {
    const creds = getCredentials()
    if (!creds) throw new Error('ยังไม่ได้เชื่อมต่อ Taiga')

    const payload = {
      taigaBaseUrl: creds.baseUrl,
      method,
      path,
      authToken: creds.authToken,
      body,
    }
    if (extraHeaders) payload.extraHeaders = extraHeaders

    const response = await fetch(proxyUrl.replace(/\/+$/, '') + '/taiga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok || data._error_message) {
      if (response.status === 401) {
        throw new Error('Token หมดอายุ กรุณาเชื่อมต่อใหม่ในหน้าตั้งค่า')
      }
      throw new Error(data._error_message || data.error || `HTTP ${response.status}`)
    }

    return data
  }

  async function login(proxyUrl, baseUrl, username, password) {
    isLoading.value = true
    taigaError.value = ''

    try {
      const response = await fetch(proxyUrl.replace(/\/+$/, '') + '/taiga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taigaBaseUrl: baseUrl.replace(/\/+$/, ''),
          method: 'POST',
          path: '/api/v1/auth',
          body: { type: 'normal', username, password },
        }),
      })

      const data = await response.json()

      if (!response.ok || data._error_message) {
        throw new Error(data._error_message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      }

      if (!data.auth_token) {
        throw new Error('ไม่ได้รับ token จาก Taiga')
      }

      saveCredentials({
        baseUrl: baseUrl.replace(/\/+$/, ''),
        authToken: data.auth_token,
        userId: data.id,
        username: data.username,
        fullName: data.full_name_display || data.username,
        roles: data.roles || [],
        photo: data.photo || data.big_photo || '',
      })

      return {
        success: true,
        fullName: data.full_name_display || data.username,
        roles: data.roles || [],
        photo: data.photo || data.big_photo || '',
      }
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'ไม่สามารถเชื่อมต่อ Proxy ได้ กรุณาตรวจสอบ URL'
        : err.message
      taigaError.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  async function resolveProject(proxyUrl, slug) {
    return await taigaFetch(proxyUrl, 'GET', `/api/v1/resolver?project=${encodeURIComponent(slug)}`)
  }

  async function getMyTasks(proxyUrl, projectId) {
    const creds = getCredentials()
    if (!creds) return []
    return await taigaFetch(
      proxyUrl,
      'GET',
      `/api/v1/tasks?project=${projectId}&assigned_to=${creds.userId}&status__is_closed=false`
    )
  }

  async function getUserProjects(proxyUrl) {
    const creds = getCredentials()
    if (!creds || !creds.userId) throw new Error('ยังไม่ได้เชื่อมต่อ Taiga')
    return await taigaFetch(
      proxyUrl,
      'GET',
      `/api/v1/projects?member=${creds.userId}`,
      null,
      { 'x-disable-pagination': 'True' }
    )
  }

  async function getTaskDetail(proxyUrl, taskId) {
    return await taigaFetch(proxyUrl, 'GET', `/api/v1/tasks/${taskId}`)
  }

  async function postComment(proxyUrl, { taskId, comment, version }) {
    return await taigaFetch(proxyUrl, 'PATCH', `/api/v1/tasks/${taskId}`, {
      comment,
      version,
    })
  }

  async function getMyUserStories(proxyUrl, projectId) {
    const creds = getCredentials()
    if (!creds) return []
    return await taigaFetch(
      proxyUrl,
      'GET',
      `/api/v1/userstories?project=${projectId}&assigned_to=${creds.userId}&status__is_closed=false`
    )
  }

  async function getUserStoryDetail(proxyUrl, usId) {
    return await taigaFetch(proxyUrl, 'GET', `/api/v1/userstories/${usId}`)
  }

  async function postUserStoryComment(proxyUrl, { usId, comment, version }) {
    return await taigaFetch(proxyUrl, 'PATCH', `/api/v1/userstories/${usId}`, {
      comment,
      version,
    })
  }

  async function uploadAttachment(proxyUrl, { projectId, objectId, imageBase64, filename, objectType }) {
    const creds = getCredentials()
    if (!creds) throw new Error('ยังไม่ได้เชื่อมต่อ Taiga')

    const response = await fetch(proxyUrl.replace(/\/+$/, '') + '/taiga/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taigaBaseUrl: creds.baseUrl,
        authToken: creds.authToken,
        projectId,
        objectId,
        imageBase64,
        filename,
        objectType: objectType || 'task',
      }),
    })

    const data = await response.json()

    if (!response.ok || data._error_message) {
      throw new Error(data._error_message || data.error || `Upload failed: HTTP ${response.status}`)
    }

    return data
  }

  return {
    isLoading,
    taigaError,
    getCredentials,
    isAuthenticated,
    login,
    logout,
    extractSlugFromUrl,
    extractBaseUrl,
    resolveProject,
    getMyTasks,
    getMyUserStories,
    getUserProjects,
    getTaskDetail,
    postComment,
    getUserStoryDetail,
    postUserStoryComment,
    uploadAttachment,
  }
}
