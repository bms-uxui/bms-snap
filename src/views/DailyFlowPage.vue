<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'
import { useTaiga } from '../composables/useTaiga'
import { useAI } from '../composables/useAI'
import BaseHeader from '../components/ui/BaseHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { IconUser, IconChevronDown, IconFolderOpen } from '../components/icons'
import PhysicsPills from '../components/features/PhysicsPills.vue'
import FloatingPolaroids from '../components/features/FloatingPolaroids.vue'
import FallingLetters from '../components/features/FallingLetters.vue'
import emptyTemplateSvg from '../assets/empty-template.svg'
import polaroidTopSvg from '../assets/polaroid-top.svg'
import polaroidBottomSvg from '../assets/polaroid-bottom.svg'

const router = useRouter()
const store = useAppStore()
const { showToast } = useToast()
const { isAuthenticated: isTaigaAuthenticated, getCredentials: getTaigaCredentials, getUserProjects: fetchTaigaUserProjects } = useTaiga()
const { getProxyUrl } = useAI()

const currentStep = ref(1)
const selectedProjectIds = ref([])
const activeProjectTab = ref('recent')

// Fetch Taiga projects picker
const taigaProjectsList = ref([])
const taigaProjectsLoading = ref(false)
const showTaigaPicker = ref(false)

// Editor
const MAX_EDITOR_CHARS = 1000
const editorContentHtml = ref('')
const editorTextLength = ref(0)
const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'color': [] }],
]

const combinedTemplate = computed(() => {
  if (selectedProjectIds.value.length === 0) return ''

  return selectedProjectIds.value
    .map(id => {
      const project = store.projects.find(p => p.id === id)
      if (!project) return ''
      const template = project.template || store.DEFAULT_TEMPLATE
      return template.replace(/\{project\}/g, project.name)
    })
    .filter(Boolean)
    .join('<hr>')
})

watch(combinedTemplate, (newTemplate) => {
  if (newTemplate) {
    editorContentHtml.value = newTemplate
  } else {
    editorContentHtml.value = ''
  }
})

function toggleProject(id) {
  const idx = selectedProjectIds.value.indexOf(id)
  if (idx === -1) {
    selectedProjectIds.value.push(id)
  } else {
    selectedProjectIds.value.splice(idx, 1)
  }
}

function isSelected(id) {
  return selectedProjectIds.value.includes(id)
}

function findLocalProjectForTaiga(p) {
  const creds = getTaigaCredentials()
  const baseUrl = creds?.baseUrl || ''
  if (!baseUrl || !p.slug) return null
  const expectedUrl = `${baseUrl}/project/${p.slug}/`.replace(/\/+$/, '')
  return store.projects.find(proj => (proj.taigaUrl || '').replace(/\/+$/, '') === expectedUrl) || null
}

async function fetchCurrentTaigaProjects() {
  if (!isTaigaAuthenticated()) {
    showToast('กรุณาเชื่อมต่อ Taiga ก่อนในหน้าตั้งค่า')
    return
  }
  const proxyUrl = getProxyUrl()
  if (!proxyUrl) {
    showToast('กรุณาตั้งค่า AI Proxy URL ก่อน')
    return
  }

  if (showTaigaPicker.value) {
    showTaigaPicker.value = false
    return
  }

  taigaProjectsLoading.value = true
  try {
    const data = await fetchTaigaUserProjects(proxyUrl)
    taigaProjectsList.value = (data || []).sort((a, b) =>
      new Date(b.created_date) - new Date(a.created_date)
    )
    showTaigaPicker.value = true

    console.log('[Taiga] fetched projects:', taigaProjectsList.value.map(p => ({
      name: p.name,
      slug: p.slug,
      logo_big_url: p.logo_big_url,
      logo_small_url: p.logo_small_url,
      total_memberships: p.total_memberships,
      owner: p.owner,
      owner_extra_info: p.owner_extra_info,
    })))
    if (taigaProjectsList.value[0]) {
      console.log('[Taiga] full first project keys:', Object.keys(taigaProjectsList.value[0]))
      console.log('[Taiga] full first project:', taigaProjectsList.value[0])
    }

    const creds = getTaigaCredentials()
    const baseUrl = creds?.baseUrl || ''
    console.log('[Taiga] baseUrl:', baseUrl)
    console.log('[Taiga] local projects:', store.projects.map(p => ({ id: p.id, name: p.name, taigaUrl: p.taigaUrl })))
    for (const p of taigaProjectsList.value) {
      if (!p.slug || !baseUrl) continue
      const url = `${baseUrl}/project/${p.slug}/`
      const existing = store.projects.find(proj =>
        (proj.taigaUrl || '').replace(/\/+$/, '').toLowerCase() === url.replace(/\/+$/, '').toLowerCase()
      )
      if (existing) {
        console.log('[Taiga] matched existing project:', existing.name, '→ saving meta with logo:', p.logo_big_url || p.logo_small_url || '(none)')
        store.setProjectMeta(url, {
          logoUrl: p.logo_big_url || p.logo_small_url || '',
          description: p.description || '',
          slug: p.slug || '',
          ownerName: p.owner_extra_info?.full_name_display
            || p.owner_extra_info?.username
            || p.owner?.full_name_display
            || p.owner?.username
            || '',
          memberCount: p.total_memberships
            ?? p.total_memberships_active
            ?? (Array.isArray(p.members) ? p.members.length : null),
          createdDate: p.created_date || '',
        })
      } else {
        console.log('[Taiga] no local match for:', p.name, '(expected url:', url, ')')
      }
    }

    if (taigaProjectsList.value.length === 0) {
      showToast('ไม่พบโครงการใน Taiga')
    }
  } catch (e) {
    showToast('ดึงโครงการไม่สำเร็จ: ' + e.message)
  } finally {
    taigaProjectsLoading.value = false
  }
}

async function selectTaigaProject(p) {
  const creds = getTaigaCredentials()
  const baseUrl = creds?.baseUrl || ''
  const taigaUrl = baseUrl && p.slug ? `${baseUrl}/project/${p.slug}/` : ''
  const meta = {
    logoUrl: p.logo_big_url || p.logo_small_url || '',
    description: p.description || '',
    slug: p.slug || '',
    ownerName: p.owner?.full_name_display || p.owner?.username || '',
    memberCount: p.total_memberships ?? (Array.isArray(p.members) ? p.members.length : null),
    createdDate: p.created_date || '',
  }

  const existing = findLocalProjectForTaiga(p)
  if (existing) {
    if (taigaUrl) store.setProjectMeta(taigaUrl, meta)
    toggleProject(existing.id)
    return
  }
  const projectId = await store.addProject({
    name: p.name,
    taigaUrl,
    template: store.DEFAULT_TEMPLATE,
    ...meta,
  })
  showToast(`เพิ่มโครงการ "${p.name}" แล้ว`)
  if (projectId != null) selectedProjectIds.value.push(projectId)
}

// Search
const searchQuery = ref('')
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

function findProjectById(id) {
  return store.projects.find(p => String(p.id) === String(id)) || null
}

function getProjectSlug(project) {
  if (!project?.taigaUrl) return ''
  const match = project.taigaUrl.match(/\/project\/([^/?#]+)/)
  return match ? match[1] : ''
}

function getProjectMetaFor(project) {
  if (!project?.taigaUrl) return null
  return store.getProjectMeta(project.taigaUrl)
}

function selectProjectCard(id) {
  toggleProject(id)
}

function formatThaiDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// Recently used — unique projects pulled from the 5 most recent reports
const recentProjectIds = computed(() => {
  const sorted = [...store.reports].sort((a, b) => new Date(b.date) - new Date(a.date))
  const seen = new Set()
  const ordered = []
  for (const r of sorted.slice(0, 5)) {
    for (const id of (r.projects || [])) {
      const proj = findProjectById(id)
      if (proj && !seen.has(String(proj.id))) {
        seen.add(String(proj.id))
        ordered.push(proj.id)
      }
    }
  }
  return ordered.slice(0, 5)
})

// Most contributed — top 5 most-selected in last 30 days, excluding "recent" section
const frequentProjectIds = computed(() => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const counts = {}
  for (const r of store.reports) {
    if (new Date(r.date) < thirtyDaysAgo) continue
    for (const id of (r.projects || [])) {
      counts[String(id)] = (counts[String(id)] || 0) + 1
    }
  }
  const recentSet = new Set(recentProjectIds.value.map(String))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => findProjectById(id)?.id)
    .filter(id => id != null && !recentSet.has(String(id)))
    .slice(0, 5)
})

const searchResults = computed(() => {
  if (!normalizedQuery.value) return []
  return store.projects.filter(p => p.name.toLowerCase().includes(normalizedQuery.value))
})

const otherProjects = computed(() => {
  const exclude = new Set([
    ...recentProjectIds.value.map(String),
    ...frequentProjectIds.value.map(String),
  ])
  return store.projects.filter(p => !exclude.has(String(p.id)))
})

const projectTabs = computed(() => [
  { key: 'recent', label: 'ใช้ล่าสุด', count: recentProjectIds.value.length },
  { key: 'frequent', label: 'ใช้บ่อย 30 วัน', count: frequentProjectIds.value.length },
  { key: 'all', label: 'ทั้งหมด', count: otherProjects.value.length },
])

watch(projectTabs, (tabs) => {
  const current = tabs.find(t => t.key === activeProjectTab.value)
  if (!current || current.count === 0) {
    const firstNonEmpty = tabs.find(t => t.count > 0)
    if (firstNonEmpty) activeProjectTab.value = firstNonEmpty.key
  }
}, { immediate: true })

const selectedProjectPills = computed(() => {
  return selectedProjectIds.value.map(id => {
    const project = store.projects.find(p => p.id === id)
    return project ? { id: project.id, name: project.name } : null
  }).filter(Boolean)
})

function handleBack() {
  if (currentStep.value === 1) {
    router.push('/app')
  } else {
    currentStep.value--
  }
}

async function handleNext() {
  if (currentStep.value === 2) {
    showSaveConfirm.value = true
    return
  } else if (currentStep.value < 2) {
    currentStep.value++
  }
}

async function confirmSave() {
  showSaveConfirm.value = false
  if (isSaving.value || reportSaved.value) return
  isSaving.value = true
    try {
      const selectedNames = selectedProjectIds.value
        .map(id => store.projects.find(p => p.id === id)?.name)
        .filter(Boolean)
      store.addReport({
        projects: [...selectedProjectIds.value],
        projectNames: selectedNames,
        contentHtml: editorContentHtml.value,
        images: pastedImages.value.map(img => img.data),
      })
      reportSaved.value = true
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก')
      isSaving.value = false
      return
    }
    isSaving.value = false

    // Play convergence animation then redirect
    isConverging.value = true
    await nextTick()
    const body = document.querySelector('.daily-flow-body')
    if (body) {
      convergeTarget.value = { x: body.offsetWidth / 2, y: body.offsetHeight * 0.4 }
    }
    generatingVisible.value = true
    await new Promise(r => setTimeout(r, 600))
    isConverging.value = false
    convergeTarget.value = null
    await new Promise(r => setTimeout(r, 1500))
    router.push('/app?saved=1')
}

// Auto-focus editor when entering step 2
watch(currentStep, async (step) => {
  if (step === 2) {
    await nextTick()
    setTimeout(() => {
      const editor = document.querySelector('#dailyEditorContainer .ql-editor')
      if (editor) {
        editor.focus()
        const sel = window.getSelection()
        if (sel) {
          sel.selectAllChildren(editor)
          sel.collapseToEnd()
        }
      }
    }, 350)
  }

})

// Falling letters
const droppedLetters = ref([])
const MAX_DROPPED_LETTERS = 1000
let keydownRemoveCount = 0

function handleKeyDown(e) {
  if (currentStep.value !== 2) return
  if (e.ctrlKey || e.metaKey || e.altKey) return

  if ((e.key === 'Backspace' || e.key === 'Delete') && droppedLetters.value.length > 0) {
    droppedLetters.value.pop()
    keydownRemoveCount++
    return
  }

  if (e.key.length === 1 && editorTextLength.value < MAX_EDITOR_CHARS && droppedLetters.value.length < MAX_DROPPED_LETTERS) {
    droppedLetters.value.push({ id: Date.now() + Math.random(), char: e.key })
  }
}

// Sync bulk deletions (select-all + delete, cut, etc.)
let lastEditorTextLength = 0

watch(editorContentHtml, (newHtml) => {
  const div = document.createElement('div')
  div.innerHTML = newHtml
  const currentLength = (div.textContent || '').length
  editorTextLength.value = currentLength

  // Enforce character limit — trim excess from Quill
  if (currentLength > MAX_EDITOR_CHARS) {
    nextTick(() => {
      const editor = document.querySelector('#dailyEditorContainer .ql-editor')
      if (editor && editor.__quill) {
        editor.__quill.deleteText(MAX_EDITOR_CHARS, currentLength - MAX_EDITOR_CHARS)
      }
    })
  }

  if (currentStep.value === 2 && currentLength < lastEditorTextLength && droppedLetters.value.length > 0) {
    const charsDeleted = lastEditorTextLength - currentLength
    // Subtract chars already handled by keydown to avoid double-removal
    const extra = Math.max(0, charsDeleted - keydownRemoveCount)
    keydownRemoveCount = Math.max(0, keydownRemoveCount - charsDeleted)
    if (extra > 0) {
      const toRemove = Math.min(extra, droppedLetters.value.length)
      droppedLetters.value.splice(droppedLetters.value.length - toRemove, toRemove)
    }
  } else {
    keydownRemoveCount = 0
  }

  lastEditorTextLength = Math.min(currentLength, MAX_EDITOR_CHARS)
})

// Paste screenshots
const pastedImages = ref([])

function compressImage(dataUrl, maxWidth = 600, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      // Check if image has transparency (PNG) — preserve alpha
      const isPng = dataUrl.startsWith('data:image/png')
      if (!isPng) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

function handleImagePaste(e) {
  if (currentStep.value !== 2) return
  const items = e.clipboardData?.items
  if (!items) return

  let hasImage = false
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      hasImage = true
      const file = item.getAsFile()
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target.result)
        pastedImages.value.push({ id: Date.now() + Math.random(), data: compressed })
        showToast('เพิ่มภาพหน้าจอแล้ว')
      }
      reader.readAsDataURL(file)
    }
  }

  if (hasImage) {
    e.preventDefault()
    e.stopPropagation()
  } else {
    // Text paste — create falling letters for each character (respect char limit)
    const text = e.clipboardData?.getData('text/plain')
    if (text) {
      const remaining = MAX_EDITOR_CHARS - editorTextLength.value
      const allowed = text.slice(0, Math.max(0, remaining))
      for (const char of allowed) {
        if (droppedLetters.value.length >= MAX_DROPPED_LETTERS) break
        if (char.trim()) {
          droppedLetters.value.push({ id: Date.now() + Math.random(), char })
        }
      }
    }
  }
}

const fileInputRef = ref(null)

function triggerUpload() {
  fileInputRef.value?.click()
}

function handleFileUpload(e) {
  const files = e.target.files
  if (!files) return
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result)
      pastedImages.value.push({ id: Date.now() + Math.random(), data: compressed })
      showToast('เพิ่มภาพหน้าจอแล้ว')
    }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

function removeImage(id) {
  pastedImages.value = pastedImages.value.filter(img => img.id !== id)
}

// Step 3 state
const isConverging = ref(false)
const convergeTarget = ref(null)
const generatingVisible = ref(false)
const isSaving = ref(false)
const reportSaved = ref(false)
const showSaveConfirm = ref(false)

function onClickOutsideConfirm(e) {
  if (showSaveConfirm.value && !e.target.closest('.daily-flow-nav-next-wrapper')) {
    showSaveConfirm.value = false
  }
}

onMounted(() => {
  document.addEventListener('paste', handleImagePaste, true)
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', onClickOutsideConfirm, true)
})

onUnmounted(() => {
  document.removeEventListener('paste', handleImagePaste, true)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', onClickOutsideConfirm, true)
})
</script>

<template>
  <div class="daily-flow-wrapper" :class="{ 'step3-bg': generatingVisible }">
    <BaseHeader :show-border="false">
      <template #actions>
        <button
          class="flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 bg-gray-50 border border-gray-200 rounded-full font-medium text-sm text-gray-700 cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300"
          @click="router.push('/app')"
        >
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img v-if="store.user.profileImage" :src="store.user.profileImage" alt="Profile" class="w-full h-full object-cover rounded-full">
            <IconUser v-else />
          </div>
          <span class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{{ store.user.name?.split(' ')[0] || 'ผู้ใช้' }}</span>
          <IconChevronDown class="text-gray-500 flex-shrink-0" />
        </button>
      </template>
    </BaseHeader>

    <div class="daily-flow-body">
      <!-- Physics pills background layer -->
      <div class="daily-flow-pills-bg">
        <PhysicsPills :active="true" :frozen="isConverging" :converge-target="convergeTarget" :extra-pills="selectedProjectPills" />
      </div>

      <!-- Falling letters layer -->
      <div v-show="currentStep <= 2 || isConverging" class="daily-flow-letters-bg">
        <FallingLetters
          :letters="droppedLetters"
          :active="(currentStep <= 2 || isConverging) "
          :frozen="isConverging"
          :converge-target="convergeTarget"
        />
      </div>

      <!-- Floating polaroids layer (physics-driven, step 2) -->
      <div v-show="(currentStep === 2 || isConverging) " class="daily-flow-polaroids-bg">
        <FloatingPolaroids
          :images="pastedImages"
          :active="(currentStep === 2 || isConverging) "
          :frozen="isConverging"
          :converge-target="convergeTarget"
          :exclude-center-width="580"
          @remove="removeImage"
        />
      </div>

      <!-- Centered content -->
      <div class="daily-flow-center" :class="{ 'step3-center': generatingVisible, 'converging-fade': isConverging && !generatingVisible, 'step1-wide': currentStep === 1 && !generatingVisible }">
        <!-- Steps indicator (hide during generating animation) -->
        <ul v-show="!generatingVisible" class="steps steps-horizontal mb-6">
          <li class="step" :class="currentStep >= 1 ? 'step-primary' : ''">
            <span class="step-icon">1</span>
          </li>
          <li class="step" :class="currentStep >= 2 ? 'step-primary' : ''">
            <span class="step-icon">2</span>
          </li>
        </ul>

        <!-- Steps 1 & 2 content -->
        <Transition v-if="!generatingVisible" name="step-fade" mode="out-in">
          <div :key="currentStep" class="daily-flow-step-inner">
            <h2 class="daily-flow-title">{{ currentStep === 2 ? 'รายละเอียดงานที่คุณทำวันนี้' : 'เลือกโครงการที่คุณทำวันนี้' }}</h2>

            <!-- Step 1: Select Projects (2-column layout) -->
            <div v-if="currentStep === 1" class="daily-flow-step1">
              <div class="daily-flow-step1-main daily-flow-content-scroll">
              <p class="daily-flow-subtitle">เลือกได้มากกว่า 1 รายการ</p>

              <!-- Search -->
              <div class="daily-flow-search">
                <svg class="daily-flow-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="ค้นหาโครงการ..."
                  class="daily-flow-search-input"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="daily-flow-search-clear"
                  aria-label="ล้างคำค้น"
                  @click="searchQuery = ''"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div class="daily-flow-taiga-trigger">
                <button
                  type="button"
                  class="daily-flow-chip daily-flow-chip-add"
                  :disabled="taigaProjectsLoading"
                  @click="fetchCurrentTaigaProjects"
                >
                  {{ taigaProjectsLoading ? 'กำลังดึง...' : (showTaigaPicker ? 'ซ่อนรายการจาก Taiga' : '+ ดึงโครงการจาก Taiga') }}
                </button>
              </div>

              <div v-if="showTaigaPicker && taigaProjectsList.length > 0" class="taiga-picker daily-flow-taiga-picker">
                <div class="taiga-picker-header">
                  <span>เลือกเพื่อเพิ่มและติ๊กโครงการ</span>
                  <button class="taiga-picker-close-top" @click="showTaigaPicker = false" aria-label="ปิด">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div class="taiga-picker-list">
                  <button
                    v-for="p in taigaProjectsList"
                    :key="'tp-top-' + p.id"
                    type="button"
                    class="taiga-picker-item"
                    @click="selectTaigaProject(p)"
                  >
                    <div class="taiga-picker-logo">
                      <img v-if="p.logo_big_url || p.logo_small_url" :src="p.logo_big_url || p.logo_small_url" :alt="p.name">
                      <IconFolderOpen v-else size="14" color="var(--secondary-text)" />
                    </div>
                    <div class="taiga-picker-info">
                      <div class="taiga-picker-name">{{ p.name }}</div>
                      <div class="taiga-picker-slug">{{ p.slug }}</div>
                    </div>
                    <span
                      v-if="findLocalProjectForTaiga(p) && isSelected(findLocalProjectForTaiga(p).id)"
                      class="taiga-picker-added"
                    >เลือกแล้ว</span>
                    <span
                      v-else-if="findLocalProjectForTaiga(p)"
                      class="taiga-picker-added"
                      style="background: #e5edf5; color: #194987;"
                    >มีในลิสต์</span>
                  </button>
                </div>
              </div>

              <!-- Search mode -->
              <div v-if="normalizedQuery" class="daily-flow-section">
                <p class="daily-flow-section-label">
                  ผลการค้นหา ({{ searchResults.length }})
                </p>
                <div v-if="searchResults.length === 0" class="daily-flow-empty">
                  ไม่พบโครงการที่ตรงกับ "{{ searchQuery }}"
                </div>
                <div v-else class="daily-flow-cards">
                  <button
                    v-for="project in searchResults"
                    :key="'search-' + project.id"
                    type="button"
                    class="daily-flow-card"
                    :class="{ 'is-selected': isSelected(project.id) }"
                    :title="project.name"
                    @click="selectProjectCard(project.id)"
                  >
                    <div class="daily-flow-card-icon">
                      <img
                        v-if="getProjectMetaFor(project)?.logoUrl"
                        :src="getProjectMetaFor(project).logoUrl"
                        :alt="project.name"
                        class="daily-flow-card-logo"
                      />
                      <IconFolderOpen v-else size="16" color="var(--secondary-text)" />
                    </div>
                    <div class="daily-flow-card-text">
                      <div class="daily-flow-card-name">{{ project.name }}</div>
                      <div v-if="getProjectSlug(project)" class="daily-flow-card-sub">{{ getProjectSlug(project) }}</div>
                    </div>
                    <span class="daily-flow-card-check" :class="{ 'is-selected': isSelected(project.id) }" aria-hidden="true">
                      <svg v-if="isSelected(project.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              <!-- Normal mode: tabs -->
              <template v-else>
                <div class="daily-flow-tabs">
                  <button
                    v-for="tab in projectTabs"
                    :key="tab.key"
                    type="button"
                    class="daily-flow-tab"
                    :class="{ 'is-active': activeProjectTab === tab.key, 'is-empty': tab.count === 0 }"
                    :disabled="tab.count === 0"
                    @click="activeProjectTab = tab.key"
                  >
                    {{ tab.label }}
                    <span class="daily-flow-tab-badge">{{ tab.count }}</span>
                  </button>
                </div>

                <div v-if="activeProjectTab === 'recent' && recentProjectIds.length > 0" class="daily-flow-section">
                  <div class="daily-flow-cards">
                    <button
                      v-for="id in recentProjectIds"
                      :key="'recent-' + id"
                      type="button"
                      class="daily-flow-card daily-flow-card-recent"
                      :class="{ 'is-selected': isSelected(id) }"
                      :title="findProjectById(id)?.name"
                      @click="selectProjectCard(id)"
                    >
                      <div class="daily-flow-card-icon">
                        <img
                          v-if="getProjectMetaFor(findProjectById(id))?.logoUrl"
                          :src="getProjectMetaFor(findProjectById(id)).logoUrl"
                          :alt="findProjectById(id)?.name"
                          class="daily-flow-card-logo"
                        />
                        <IconFolderOpen v-else size="16" color="var(--secondary-text)" />
                      </div>
                      <div class="daily-flow-card-text">
                        <div class="daily-flow-card-name">{{ findProjectById(id)?.name }}</div>
                        <div v-if="getProjectSlug(findProjectById(id))" class="daily-flow-card-sub">{{ getProjectSlug(findProjectById(id)) }}</div>
                      </div>
                      <span class="daily-flow-card-check" :class="{ 'is-selected': isSelected(id) }" aria-hidden="true">
                        <svg v-if="isSelected(id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>

                <div v-if="activeProjectTab === 'frequent' && frequentProjectIds.length > 0" class="daily-flow-section">
                  <div class="daily-flow-cards">
                    <button
                      v-for="id in frequentProjectIds"
                      :key="'freq-' + id"
                      type="button"
                      class="daily-flow-card"
                      :class="{ 'is-selected': isSelected(id) }"
                      :title="findProjectById(id)?.name"
                      @click="selectProjectCard(id)"
                    >
                      <div class="daily-flow-card-icon">
                        <img
                          v-if="getProjectMetaFor(findProjectById(id))?.logoUrl"
                          :src="getProjectMetaFor(findProjectById(id)).logoUrl"
                          :alt="findProjectById(id)?.name"
                          class="daily-flow-card-logo"
                        />
                        <IconFolderOpen v-else size="16" color="var(--secondary-text)" />
                      </div>
                      <div class="daily-flow-card-text">
                        <div class="daily-flow-card-name">{{ findProjectById(id)?.name }}</div>
                        <div v-if="getProjectSlug(findProjectById(id))" class="daily-flow-card-sub">{{ getProjectSlug(findProjectById(id)) }}</div>
                      </div>
                      <span class="daily-flow-card-check" :class="{ 'is-selected': isSelected(id) }" aria-hidden="true">
                        <svg v-if="isSelected(id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>

                <div v-if="activeProjectTab === 'all' && otherProjects.length > 0" class="daily-flow-section">
                  <div class="daily-flow-cards">
                    <button
                      v-for="project in otherProjects"
                      :key="project.id"
                      type="button"
                      class="daily-flow-card"
                      :class="{ 'is-selected': isSelected(project.id) }"
                      :title="project.name"
                      @click="selectProjectCard(project.id)"
                    >
                      <div class="daily-flow-card-icon">
                        <img
                          v-if="getProjectMetaFor(project)?.logoUrl"
                          :src="getProjectMetaFor(project).logoUrl"
                          :alt="project.name"
                          class="daily-flow-card-logo"
                        />
                        <IconFolderOpen v-else size="16" color="var(--secondary-text)" />
                      </div>
                      <div class="daily-flow-card-text">
                        <div class="daily-flow-card-name">{{ project.name }}</div>
                        <div v-if="getProjectSlug(project)" class="daily-flow-card-sub">{{ getProjectSlug(project) }}</div>
                      </div>
                      <span class="daily-flow-card-check" :class="{ 'is-selected': isSelected(project.id) }" aria-hidden="true">
                        <svg v-if="isSelected(project.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </template>
              </div>

              <!-- Right-side detail panel: all selected projects -->
              <div class="daily-flow-step1-side">
                <div class="daily-flow-detail-header">
                  <span class="daily-flow-detail-header-title">โครงการที่เลือก</span>
                  <span class="daily-flow-detail-header-count">{{ selectedProjectIds.length }}</span>
                </div>

                <div v-if="selectedProjectIds.length === 0" class="daily-flow-detail-empty">
                  <IconFolderOpen size="32" color="#cbd5e1" />
                  <p>ยังไม่ได้เลือกโครงการ</p>
                </div>

                <div v-else class="daily-flow-detail-list">
                  <TransitionGroup name="detail-pop">
                    <div
                      v-for="id in selectedProjectIds"
                      :key="'sel-' + id"
                      class="daily-flow-detail"
                    >
                      <button class="daily-flow-detail-close" @click="toggleProject(id)" aria-label="เอาออก">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                      <div class="daily-flow-detail-head">
                        <div class="daily-flow-detail-logo">
                          <img
                            v-if="getProjectMetaFor(findProjectById(id))?.logoUrl"
                            :src="getProjectMetaFor(findProjectById(id)).logoUrl"
                            :alt="findProjectById(id)?.name"
                          />
                          <IconFolderOpen v-else size="18" color="var(--secondary-text)" />
                        </div>
                        <div class="daily-flow-detail-title">
                          <div class="daily-flow-detail-name">{{ findProjectById(id)?.name }}</div>
                          <div v-if="getProjectMetaFor(findProjectById(id))?.createdDate" class="daily-flow-detail-sub">
                            สร้างเมื่อ {{ formatThaiDate(getProjectMetaFor(findProjectById(id)).createdDate) }}
                          </div>
                          <div v-else-if="getProjectSlug(findProjectById(id))" class="daily-flow-detail-sub">
                            {{ getProjectSlug(findProjectById(id)) }}
                          </div>
                        </div>
                      </div>
                      <p
                        v-if="getProjectMetaFor(findProjectById(id))?.description"
                        class="daily-flow-detail-desc"
                      >
                        {{ getProjectMetaFor(findProjectById(id)).description }}
                      </p>
                      <div
                        v-if="getProjectMetaFor(findProjectById(id))?.memberCount != null || getProjectMetaFor(findProjectById(id))?.ownerName"
                        class="daily-flow-detail-stats"
                      >
                        <div v-if="getProjectMetaFor(findProjectById(id))?.memberCount != null" class="daily-flow-detail-stat">
                          <div class="daily-flow-detail-stat-label">สมาชิก</div>
                          <div class="daily-flow-detail-stat-value">{{ getProjectMetaFor(findProjectById(id)).memberCount }}</div>
                          <div class="daily-flow-detail-stat-unit">คน</div>
                        </div>
                        <div v-if="getProjectMetaFor(findProjectById(id))?.ownerName" class="daily-flow-detail-stat">
                          <div class="daily-flow-detail-stat-label">เจ้าของ</div>
                          <div class="daily-flow-detail-stat-value daily-flow-detail-stat-name">{{ getProjectMetaFor(findProjectById(id)).ownerName }}</div>
                          <div class="daily-flow-detail-stat-unit">Owner</div>
                        </div>
                      </div>
                    </div>
                  </TransitionGroup>
                </div>
              </div>
            </div>

            <!-- Step 2: Editor -->
            <div v-else-if="currentStep === 2" class="daily-flow-content">
              <p class="daily-flow-subtitle">เพิ่มรายละเอียดในเทมเพลต · วางภาพหน้าจอ (Ctrl+V)</p>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileUpload"
              />
              <div id="dailyEditorContainer" class="w-full">
                <QuillEditor
                  v-model:content="editorContentHtml"
                  content-type="html"
                  :toolbar="toolbarOptions"
                  placeholder="เทมเพลตจะปรากฏเมื่อเลือกโครงการ..."
                  theme="snow"
                />
                <button class="editor-upload-btn" @click="triggerUpload" title="อัปโหลดรูปภาพ">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                  <span>อัปโหลดรูป</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Generating Template Interstitial -->
        <Transition name="generating-reveal">
          <div v-if="generatingVisible" class="generating-wrapper">
            <h2 class="generating-title">กำลังสร้างเทมเพลต...</h2>
            <p class="generating-subtitle">รวบรวมข้อมูลของคุณ</p>

            <div class="generating-scene">
              <img :src="polaroidTopSvg" alt="" class="generating-polaroid generating-polaroid-1" />
              <img :src="polaroidBottomSvg" alt="" class="generating-polaroid generating-polaroid-2" />

              <div class="generating-template-img">
                <img :src="emptyTemplateSvg" alt="" />
                <div class="generating-shimmer"></div>
              </div>
            </div>

            <div class="generating-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </Transition>

        <!-- Navigation -->
        <div v-show="!generatingVisible" class="daily-flow-nav">
          <BaseButton variant="outline" size="lg" class="bg-white!" @click="handleBack">
            {{ currentStep === 1 ? 'กลับสู่หน้าหลัก' : 'ย้อนกลับ' }}
          </BaseButton>
          <div class="daily-flow-nav-next-wrapper">
            <Transition name="confirm-pop">
              <div v-if="showSaveConfirm" class="save-confirm-popover">
                <p class="save-confirm-text">คอนเฟิร์มแล้วใช่มั้ย บันทึกแล้วแก้ไม่ได้นะ</p>
                <div class="save-confirm-actions">
                  <BaseButton variant="outline" size="sm" @click="showSaveConfirm = false">ขอดูอีกทีก่อนนะ</BaseButton>
                  <BaseButton variant="primary" size="sm" class="!bg-[#16A34A] !border-[#16A34A] hover:!bg-[#15803D] hover:!shadow-[4px_4px_0px_rgba(22,163,74,0.3)]" @click="confirmSave">บันทึกเลย</BaseButton>
                </div>
              </div>
            </Transition>
            <BaseButton
              variant="primary"
              size="lg"
              :disabled="currentStep === 1 && selectedProjectIds.length === 0"
              @click="handleNext"
            >
              ไปกันต่อ ({{ currentStep }}/2)
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
.daily-flow-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #fafafa;
  transition: background 0.6s ease;
}

.daily-flow-wrapper.step3-bg {
  background: var(--accent-5);
}

.daily-flow-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

/* Pills fill the entire background */
.daily-flow-pills-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.daily-flow-pills-bg :deep(.physics-container) {
  width: 100%;
  height: 100%;
}

/* Falling letters layer */
.daily-flow-letters-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  isolation: isolate;
}

/* Polaroids float above pills but below content */
.daily-flow-polaroids-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: auto;
}

/* Centered content card on top */
.daily-flow-center {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 0 0;
  height: 100%;
  pointer-events: none;
  transition: opacity 0.8s ease, transform 0.8s ease, max-width 0.4s ease;
}

.daily-flow-center.step1-wide {
  max-width: 1040px;
  padding-left: 32px;
  padding-right: 32px;
}

.daily-flow-center.converging-fade {
  opacity: 0;
  transform: scale(0.95);
  pointer-events: none;
}

.daily-flow-center::before {
  content: '';
  position: absolute;
  inset: -60px -120px;
  background: radial-gradient(ellipse at center, #fafafa 20%, transparent 70%);
  pointer-events: none;
  z-index: -1;
}

.daily-flow-center > * {
  pointer-events: auto;
}

.daily-flow-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #194987;
  text-align: center;
  margin-bottom: 8px;
}

.daily-flow-step-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.daily-flow-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.daily-flow-content-scroll {
  position: relative;
  mask-image: linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent);
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Step transition — fade in from bottom */
.step-fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.step-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.daily-flow-subtitle {
  font-size: 1rem;
  color: #666;
  margin-bottom: 24px;
}

.daily-flow-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.daily-flow-chip {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 0.95rem;
  font-weight: 500;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  border: 2px solid #d1d5db;
  background: white;
  color: #374151;
  transition: all 0.15s ease;
}

.daily-flow-chip:hover {
  border-color: #194987;
  color: #194987;
}

.daily-flow-chip:active {
  transform: scale(0.95);
}

.daily-flow-search {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.daily-flow-search-input {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 38px;
  border: 1.5px solid #e5e7eb;
  border-radius: 9999px;
  background: white;
  font-size: 0.9rem;
  color: #374151;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.daily-flow-search-input::placeholder {
  color: #9ca3af;
}

.daily-flow-search-input:focus {
  border-color: var(--primary-brand, #194987);
  box-shadow: 0 0 0 3px rgba(25, 73, 135, 0.12);
}

.daily-flow-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.daily-flow-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #e5e7eb;
  color: #4b5563;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.daily-flow-search-clear:hover {
  background: #d1d5db;
}

.daily-flow-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.daily-flow-tabs {
  display: flex;
  gap: 4px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 10px;
}

.daily-flow-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: var(--secondary-text, #6b7280);
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.daily-flow-tab:hover:not(:disabled):not(.is-active) {
  color: var(--primary-text, #1a1a1a);
  background: rgba(255, 255, 255, 0.5);
}

.daily-flow-tab.is-active {
  background: white;
  color: var(--primary-brand, #194987);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.daily-flow-tab.is-empty {
  opacity: 0.5;
  cursor: not-allowed;
}

.daily-flow-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 0.7rem;
  font-weight: 600;
}

.daily-flow-tab.is-active .daily-flow-tab-badge {
  background: var(--primary-brand, #194987);
  color: white;
}

.daily-flow-section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.daily-flow-empty {
  font-size: 0.875rem;
  color: #9ca3af;
  padding: 16px 20px;
  text-align: center;
}

.daily-flow-chip-recent {
  border-color: #194987;
  color: #194987;
  background: #f0f7ff;
}

.daily-flow-chip-frequent {
  border-style: dashed;
}

/* Card-style project buttons (match onboarding step 2) */
.daily-flow-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.daily-flow-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid var(--border-color, #e5e7eb);
  background: white;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}

.daily-flow-card:hover {
  background: #f9fafb;
  border-color: #cbd5e1;
}

.daily-flow-card:active {
  transform: scale(0.995);
}

.daily-flow-card.is-selected {
  border-color: var(--primary-brand, #194987);
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(25, 73, 135, 0.08);
}

.daily-flow-card-recent {
  border-style: dashed;
}

.daily-flow-card-recent.is-selected {
  border-style: solid;
}

.daily-flow-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--surface, #f5f5f5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.daily-flow-card-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Step 1 two-column layout */
.daily-flow-step1 {
  display: flex;
  gap: 32px;
  width: 100%;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.daily-flow-step1-main {
  flex: 1 1 0;
  min-width: 0;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 4px;
}

.daily-flow-step1-side {
  width: 380px;
  flex-shrink: 0;
  padding: 8px 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.daily-flow-detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 10px;
  flex-shrink: 0;
}

.daily-flow-detail-header-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--secondary-text, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.daily-flow-detail-header-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 8px;
  border-radius: 9999px;
  background: var(--primary-brand, #194987);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}

.daily-flow-detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 2px 4px 8px;
  flex: 1;
  min-height: 0;
}

@media (max-width: 900px) {
  .daily-flow-step1 { flex-direction: column; align-items: center; }
  .daily-flow-step1-main { max-width: 560px; width: 100%; }
  .daily-flow-step1-side { width: 100%; max-width: 520px; }
}

.daily-flow-detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 20px;
  border-radius: 14px;
  border: 1.5px dashed var(--border-color, #e5e7eb);
  background: white;
  color: var(--secondary-text, #6b7280);
  font-size: 0.85rem;
  text-align: center;
}

.daily-flow-detail-stat-unit {
  font-size: 0.65rem;
  color: var(--secondary-text, #6b7280);
  margin-top: 2px;
}

/* Focused project detail card */
.daily-flow-detail {
  position: relative;
  width: 100%;
  padding: 18px;
  border-radius: 14px;
  border: 1.5px solid var(--primary-brand, #194987);
  background: white;
  box-shadow: 0 6px 20px rgba(25, 73, 135, 0.1);
}

.daily-flow-detail-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.daily-flow-detail-close:hover {
  background: white;
}

.daily-flow-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding-right: 28px;
}

.daily-flow-detail-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(25, 73, 135, 0.12);
}

.daily-flow-detail-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.daily-flow-detail-title {
  min-width: 0;
  flex: 1;
}

.daily-flow-detail-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-text, #1a1a1a);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daily-flow-detail-sub {
  font-size: 0.72rem;
  color: var(--secondary-text, #6b7280);
  margin-top: 2px;
}

.daily-flow-detail-desc {
  font-size: 0.8rem;
  color: #374151;
  line-height: 1.5;
  margin: 0 0 10px;
}

.daily-flow-detail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.daily-flow-detail-stat {
  background: white;
  border: 1px solid rgba(25, 73, 135, 0.08);
  border-radius: 10px;
  padding: 8px 12px;
}

.daily-flow-detail-stat-label {
  font-size: 0.65rem;
  color: var(--secondary-text, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.daily-flow-detail-stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary-brand, #194987);
  margin-top: 2px;
}

.daily-flow-detail-stat-name {
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daily-flow-detail-hint {
  font-size: 0.75rem;
  color: var(--secondary-text, #6b7280);
  font-style: italic;
  margin-top: 4px;
}

.detail-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.detail-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.detail-pop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.detail-pop-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.daily-flow-card-text {
  flex: 1;
  min-width: 0;
}

.daily-flow-card-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-text, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.daily-flow-card-sub {
  font-size: 0.75rem;
  color: var(--secondary-text, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.daily-flow-card-check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid #d1d5db;
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.daily-flow-card-check.is-selected {
  background: var(--primary-brand, #194987);
  border-color: var(--primary-brand, #194987);
}

.daily-flow-chip.is-selected {
  background: var(--primary-brand, #194987);
  border-color: var(--primary-brand, #194987);
  color: #fff;
}

.daily-flow-taiga-trigger {
  display: flex;
  justify-content: center;
  width: 100%;
}

.daily-flow-chip-add {
  border-style: dashed;
  border-color: var(--primary-brand, #194987);
  color: var(--primary-brand, #194987);
  background: white;
}

.daily-flow-chip-add:hover:not(:disabled) {
  background: #f0f7ff;
}

.daily-flow-chip-add:disabled {
  opacity: 0.6;
  cursor: wait;
}

.daily-flow-taiga-picker {
  margin-top: 12px;
  width: 100%;
  max-width: 480px;
  align-self: center;
}

/* Steps overrides — need :deep for daisyUI internals */
:deep(.steps .step) {
  --step-bg: var(--secondary-brand, #e0ecf7);
  --step-fg: var(--primary-brand, #005FB8);
  font-size: 0.85rem;
  font-weight: 500;
}

:deep(.steps .step::before) {
  border: none !important;
}

:deep(.steps .step.step-primary) {
  --step-bg: var(--primary-brand, #005FB8);
  --step-fg: #fff;
}

:deep(.steps .step .step-icon) {
  border: none !important;
  font-weight: 600;
}

:deep(.steps .step.step-primary .step-icon) {
  background-color: var(--primary-brand, #005FB8) !important;
  color: #fff !important;
}

:deep(.steps .step.step-primary + .step.step-primary::before) {
  background-color: var(--primary-brand, #005FB8) !important;
  color: var(--primary-brand, #005FB8) !important;
}

:deep(.steps .step.step-primary + .step:not(.step-primary)::before) {
  --step-bg: var(--secondary-brand, #e0ecf7);
}

/* Quill editor styles */
#dailyEditorContainer {
  position: relative;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  transition: border-color 0.2s ease;
}

#dailyEditorContainer:focus-within {
  border-color: var(--primary-brand, #005FB8);
}

#dailyEditorContainer :deep(.ql-toolbar) {
  border: none;
  border-bottom: 1px solid #e5e5e5;
  background: #fafafa;
  padding-right: 120px;
}

.editor-upload-btn {
  position: absolute;
  top: 0;
  right: 0;
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: none;
  background: none;
  color: #444;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.editor-upload-btn:hover {
  background: rgba(0, 95, 184, 0.08);
  color: var(--primary-brand, #005FB8);
}

.editor-upload-btn svg {
  width: 18px;
  height: 18px;
}

#dailyEditorContainer :deep(.ql-container) {
  border: none;
  font-family: 'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  min-height: 200px;
}

#dailyEditorContainer :deep(.ql-editor) {
  min-height: 200px;
  line-height: 1.8;
}

#dailyEditorContainer :deep(.ql-editor.ql-blank::before) {
  color: #999;
  font-style: normal;
}

.daily-flow-nav {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 40px;
  flex-shrink: 0;
  width: 100%;
}

.daily-flow-nav :deep(button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* ===== Generating Template Interstitial ===== */
.generating-reveal-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.generating-reveal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.generating-reveal-enter-from {
  opacity: 0;
  transform: scale(0.85);
}

.generating-reveal-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.generating-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
}

.generating-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #194987;
  margin-bottom: 4px;
}

.generating-subtitle {
  font-size: 0.95rem;
  color: #5f6368;
  margin-bottom: 8px;
}

.generating-scene {
  position: relative;
  width: 340px;
  height: 460px;
  margin: 16px 0 24px;
}

.generating-template-img {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  animation: gentle-pulse 2s ease-in-out infinite;
}

.generating-template-img img {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.1));
}

.generating-shimmer {
  position: absolute;
  inset: 10px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.6) 50%, transparent 60%);
  background-size: 200% 100%;
  animation: shimmer-sweep 1.5s ease-in-out infinite;
}

@keyframes shimmer-sweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes gentle-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.03); }
}

.generating-polaroid {
  position: absolute;
  pointer-events: none;
}

.generating-polaroid-1 {
  width: 150px;
  top: 10px;
  left: -60px;
  animation: orbit-1 4s ease-in-out infinite;
}

.generating-polaroid-2 {
  width: 140px;
  bottom: 10px;
  right: -50px;
  animation: orbit-2 4s ease-in-out infinite 0.5s;
}

@keyframes orbit-1 {
  0%, 100% { transform: translate(0, 0) rotate(-12deg); }
  25% { transform: translate(30px, -35px) rotate(-5deg); }
  50% { transform: translate(55px, 0) rotate(3deg); }
  75% { transform: translate(30px, 35px) rotate(-8deg); }
}

@keyframes orbit-2 {
  0%, 100% { transform: translate(0, 0) rotate(12deg); }
  25% { transform: translate(-30px, 35px) rotate(5deg); }
  50% { transform: translate(-55px, 0) rotate(-3deg); }
  75% { transform: translate(-30px, -35px) rotate(8deg); }
}

.generating-dots {
  display: flex;
  gap: 8px;
}

.generating-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #194987;
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.generating-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.generating-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-8px); opacity: 1; }
}

/* ===== Step 3 layout ===== */
.daily-flow-center.step3-center {
  max-width: 100%;
  padding-top: 0;
}

.daily-flow-center.step3-center::before {
  background: none;
}

/* Save Confirmation Popover */
.daily-flow-nav-next-wrapper {
  position: relative;
}

.save-confirm-popover {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 14px 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  text-align: center;
  z-index: 10;
}

.save-confirm-popover::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: white;
}

.save-confirm-popover::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-top-color: #e5e5e5;
}

.save-confirm-text {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 10px;
}

.save-confirm-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.confirm-pop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.confirm-pop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.confirm-pop-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

.confirm-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

</style>
