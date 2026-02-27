<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/app'
import { useToast } from '../../composables/useToast'
import { useUtils } from '../../composables/useUtils'
import { useDateTime } from '../../composables/useDateTime'
import ConfirmDialog from '../ui/ConfirmDialog.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  contentHtml: {
    type: String,
    default: ''
  },
  contentPlainText: {
    type: String,
    default: ''
  },
  images: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const store = useAppStore()
const { showToast } = useToast()
const { escapeHtml, copyToClipboard, createConfetti } = useUtils()
const { todayShort } = useDateTime()

const viewMode = ref('formatted') // 'formatted' or 'code'
const showConfirmDialog = ref(false)

const blogContentHtml = computed(() => {
  const day = new Date().getDate()
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear() + 543

  let html = `
<div class="copyable-line" data-copy-text="โครงการ : ${escapeHtml(store.user.projectLabel)}">
    <p><strong>โครงการ :</strong> ${escapeHtml(store.user.projectLabel)}</p>
</div>
<div class="copyable-line" data-copy-text="สถานที่ปฏิบัติงาน : ${escapeHtml(store.user.workplace)}">
    <p><strong>สถานที่ปฏิบัติงาน :</strong> ${escapeHtml(store.user.workplace)}</p>
</div>
<div class="copyable-line" data-copy-text="ผู้ปฏิบัติงาน: ${escapeHtml(store.user.name)}">
    <p><strong>ผู้ปฏิบัติงาน:</strong> ${escapeHtml(store.user.name)}</p>
</div>
<div class="copyable-line" data-copy-text="ตำแหน่ง: ${escapeHtml(store.user.role)}">
    <p><strong>ตำแหน่ง:</strong> ${escapeHtml(store.user.role)}</p>
</div>
<div class="copyable-project-section">
    <p><strong>งานประจำวันที่</strong> ${day}/${month}/${year}</p>
    <div style="margin-top: 8px;">${props.contentHtml}</div>
</div>`

  return html
})

const blogContentPlainText = computed(() => {
  const day = new Date().getDate()
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear() + 543

  return `โครงการ : ${store.user.projectLabel}
สถานที่ปฏิบัติงาน : ${store.user.workplace}
ผู้ปฏิบัติงาน: ${store.user.name}
ตำแหน่ง: ${store.user.role}
งานประจำวันที่ ${day}/${month}/${year}

${props.contentPlainText}`
})

const taigaProjects = computed(() => {
  return store.selectedProjectObjects.filter(p => p.taigaUrl)
})

async function copyBlogContent() {
  const result = await copyToClipboard(blogContentPlainText.value, blogContentHtml.value)
  if (result.success) {
    showToast('คัดลอกแล้ว')
  } else {
    showToast('คัดลอกไม่สำเร็จ')
  }
}

async function copyTaigaUrl(url) {
  await copyToClipboard(url)
  showToast('คัดลอก URL แล้ว')
}

async function copyTaigaTitle(title) {
  await copyToClipboard(title)
  showToast('คัดลอกชื่อแล้ว')
}

function openTaigaUrl(url) {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function handleSave() {
  if (store.hasReportedToday) {
    showConfirmDialog.value = true
  } else {
    doSave(false)
  }
}

function doSave(isUpdate = false) {
  emit('save', { isUpdate })
  createConfetti()
  showConfirmDialog.value = false
  showToast(isUpdate ? 'อัปเดตสำเร็จ! ✓' : 'บันทึกสำเร็จ! อัปบล็อกแล้ววันนี้ ✓')
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

async function copyImageToClipboard(image, index) {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = image.data
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png')
    })

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])

    showToast('คัดลอกรูปภาพแล้ว ✓')
  } catch (err) {
    console.error('Copy image failed:', err)
    showToast('ไม่สามารถคัดลอกรูปภาพได้')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 z-[1000] flex justify-center items-end"
      @click="handleOverlayClick"
    >
      <div class="bg-white w-[calc(100%-480px)] max-w-[1600px] max-h-[90vh] rounded-t-3xl overflow-hidden flex flex-col">
        <!-- Modal Body - Two Column Layout -->
        <div class="flex flex-1 overflow-hidden">
          <!-- Left Column - Blog Preview -->
          <div class="flex-1 p-8 overflow-y-auto">
            <!-- Blog Preview Card -->
            <div class="bg-gray-50 rounded-xl p-6 mb-6">
              <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-[#194987] rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h4 class="font-semibold text-gray-900">เทมเพลตของคุณ</h4>
                    <p class="text-sm text-gray-500">คัดลอกผลลัพธ์เพื่อรายงานการทำงานประจำวัน</p>
                  </div>
                </div>
                <button class="flex items-center gap-2 px-4 py-2 bg-[#194987] text-white rounded-lg text-sm font-medium hover:bg-[#0f3260] transition-colors" title="คัดลอกทั้งหมด" @click="copyBlogContent">
                  <span>คัดลอกทั้งหมด</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>

              <!-- View Toggle -->
              <div class="flex gap-1 p-1 bg-gray-200 rounded-lg w-fit mb-4">
                <button
                  class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  :class="viewMode === 'formatted' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
                  @click="viewMode = 'formatted'"
                >
                  Formatted
                </button>
                <button
                  class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  :class="viewMode === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
                  @click="viewMode = 'code'"
                >
                  Code
                </button>
              </div>

              <!-- Formatted View -->
              <div v-show="viewMode === 'formatted'" class="blog-content-modal prose prose-sm max-w-none" v-html="blogContentHtml" />

              <!-- Code View -->
              <div v-show="viewMode === 'code'" class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 whitespace-pre-wrap font-mono"><code>{{ blogContentPlainText }}</code></pre>
              </div>
            </div>

            <!-- Taiga URLs Section -->
            <div v-if="taigaProjects.length > 0">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">โครงการ Taiga</h4>
              <div class="space-y-2">
                <div v-for="project in taigaProjects" :key="project.id" class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                  <div class="flex-1 min-w-0 mr-4">
                    <div class="font-medium text-gray-900">{{ project.name }}</div>
                    <span class="text-sm text-gray-500 truncate block">{{ project.taigaUrl }}</span>
                  </div>
                  <div class="flex gap-2">
                    <button class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors" @click="copyTaigaTitle(project.name)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <span>ชื่อ</span>
                    </button>
                    <button class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors" @click="copyTaigaUrl(project.taigaUrl)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      <span>URL</span>
                    </button>
                    <button class="flex items-center gap-1.5 px-3 py-1.5 bg-[#194987] text-white rounded-lg text-sm hover:bg-[#0f3260] transition-colors" @click="openTaigaUrl(project.taigaUrl)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      <span>เปิด</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column - Image Gallery -->
          <div class="w-[400px] bg-gray-100 p-6 border-l border-gray-200 overflow-y-auto">
            <h4 class="text-sm font-semibold text-gray-700 mb-4">รูปภาพที่แนบ</h4>
            <div class="grid grid-cols-2 gap-3">
              <template v-if="images.length > 0">
                <div
                  v-for="(image, index) in images"
                  :key="image.id"
                  class="relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-200 group cursor-pointer"
                  @click="copyImageToClipboard(image, index)"
                >
                  <img :src="image.data" :alt="`Image ${index + 1}`" class="w-full h-full object-cover">
                  <div class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span class="text-white text-xs">คลิกเพื่อคัดลอกรูป</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div v-for="i in 6" :key="i" class="aspect-square rounded-xl bg-gray-200 border-2 border-dashed border-gray-300" />
              </template>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200 bg-white">
          <button class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors" @click="emit('close')">ย้อนกลับ</button>
          <button class="px-6 py-2.5 bg-[#194987] text-white rounded-xl font-medium text-sm hover:bg-[#0f3260] transition-colors" @click="handleSave">บันทึกผล</button>
        </div>
      </div>
    </div>
  </Teleport>

  <ConfirmDialog
    :show="showConfirmDialog"
    title="คุณอัปบล็อกของวันนี้ไปแล้ว"
    message="ต้องการยืนยันใหม่อีกครั้งหรือไม่? (จำนวนรายงานจะไม่ถูกเพิ่ม แต่จะอัปเดตเนื้อหา)"
    @confirm="doSave(true)"
    @cancel="showConfirmDialog = false"
  />
</template>
