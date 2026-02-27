<script setup>
import { ref, watch } from 'vue'
import { useTaiga } from '../../composables/useTaiga'
import { useAI } from '../../composables/useAI'
import { useToast } from '../../composables/useToast'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  reportHtml: { type: String, default: '' },
  projects: { type: Array, default: () => [] }, // [{ name, taigaUrl }]
  images: { type: Array, default: () => [] }, // [{ id, data }] or [dataUrl strings]
})

const emit = defineEmits(['close', 'posted'])

const {
  isAuthenticated, resolveProject, getMyTasks, getMyUserStories,
  getTaskDetail, postComment,
  getUserStoryDetail, postUserStoryComment,
  uploadAttachment, extractSlugFromUrl,
} = useTaiga()
const { getProxyUrl } = useAI()
const { showToast } = useToast()

const authenticated = ref(false)
const loadingItems = ref(false)
const itemGroups = ref([])
const selectedItem = ref(null) // { id, ref, subject, type: 'task' | 'userstory', ... }
const isPosting = ref(false)
const errorMsg = ref('')

watch(() => props.show, async (visible) => {
  if (!visible) {
    selectedItem.value = null
    errorMsg.value = ''
    return
  }
  authenticated.value = isAuthenticated()
  if (!authenticated.value) return
  await loadItems()
})

async function loadItems() {
  loadingItems.value = true
  itemGroups.value = []
  selectedItem.value = null
  errorMsg.value = ''
  const proxyUrl = getProxyUrl()

  for (const project of props.projects) {
    if (!project.taigaUrl) continue

    const slug = extractSlugFromUrl(project.taigaUrl)
    if (!slug) continue

    try {
      const resolved = await resolveProject(proxyUrl, slug)
      const projectId = resolved.project

      const [tasks, userStories] = await Promise.all([
        getMyTasks(proxyUrl, projectId).catch(() => []),
        getMyUserStories(proxyUrl, projectId).catch(() => []),
      ])

      const items = [
        ...tasks.map(t => ({ ...t, _type: 'task' })),
        ...userStories.map(us => ({ ...us, _type: 'userstory' })),
      ]

      if (items.length > 0) {
        itemGroups.value.push({
          projectName: project.name,
          items,
        })
      }
    } catch (err) {
      console.error(`Failed to load items for ${project.name}:`, err)
      errorMsg.value = `โหลดงานจาก ${project.name} ไม่สำเร็จ: ${err.message}`
    }
  }

  loadingItems.value = false
}

function selectItem(item) {
  selectedItem.value = item
}

function htmlToTaigaMarkdown(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  // Convert inline formatting first (before extracting text)
  tmp.querySelectorAll('strong, b').forEach(el => {
    el.replaceWith(`**${el.textContent}**`)
  })
  tmp.querySelectorAll('em, i').forEach(el => {
    el.replaceWith(`_${el.textContent}_`)
  })

  // Convert lists — process each list separately for correct numbering
  tmp.querySelectorAll('ol, ul').forEach(list => {
    const isOrdered = list.tagName === 'OL'
    const items = list.querySelectorAll(':scope > li')
    let md = '\n'
    items.forEach((li, i) => {
      const prefix = isOrdered ? `${i + 1}. ` : '- '
      md += prefix + li.textContent.trim() + '\n'
    })
    list.replaceWith(md)
  })

  // Convert paragraphs and line breaks
  tmp.querySelectorAll('p').forEach(el => {
    el.replaceWith(el.textContent + '\n\n')
  })
  tmp.querySelectorAll('br').forEach(el => {
    el.replaceWith('\n')
  })

  return tmp.textContent.replace(/\n{3,}/g, '\n\n').trim()
}

async function postToItem() {
  if (!selectedItem.value) return
  isPosting.value = true
  errorMsg.value = ''
  const proxyUrl = getProxyUrl()
  const item = selectedItem.value
  const isUS = item._type === 'userstory'

  try {
    const detail = isUS
      ? await getUserStoryDetail(proxyUrl, item.id)
      : await getTaskDetail(proxyUrl, item.id)
    const version = detail.version
    let commentText = htmlToTaigaMarkdown(props.reportHtml)

    // Upload images first, then embed their URLs in the comment
    const imageList = props.images || []
    const imageUrls = []
    for (let i = 0; i < imageList.length; i++) {
      const img = imageList[i]
      const dataUrl = typeof img === 'string' ? img : img.data
      if (!dataUrl) continue
      try {
        const result = await uploadAttachment(proxyUrl, {
          projectId: detail.project,
          objectId: item.id,
          imageBase64: dataUrl,
          filename: `report-screenshot-${i + 1}.png`,
          objectType: isUS ? 'userstory' : 'task',
        })
        if (result && result.url) {
          imageUrls.push(result.url)
        }
      } catch (err) {
        console.error(`Failed to upload image ${i + 1}:`, err)
      }
    }

    // Append image references to comment
    if (imageUrls.length > 0) {
      commentText += '\n\n'
      imageUrls.forEach((url, i) => {
        commentText += `![screenshot-${i + 1}](${url})\n`
      })
    }

    if (isUS) {
      await postUserStoryComment(proxyUrl, {
        usId: item.id,
        comment: commentText,
        version,
      })
    } else {
      await postComment(proxyUrl, {
        taskId: item.id,
        comment: commentText,
        version,
      })
    }

    const typeLabel = isUS ? 'US' : 'Task'
    const imgMsg = imageUrls.length > 0 ? ` (+ ${imageUrls.length} รูปภาพ)` : ''
    showToast(`โพสต์ไปยัง ${typeLabel} #${item.ref} สำเร็จ${imgMsg}`)
    emit('posted')
    emit('close')
  } catch (err) {
    errorMsg.value = `โพสต์ไม่สำเร็จ: ${err.message}`
    showToast('โพสต์ไม่สำเร็จ')
  } finally {
    isPosting.value = false
  }
}
</script>

<template>
  <BaseModal :show="show" title="โพสต์ไปยัง Taiga" @close="emit('close')">
    <!-- Not authenticated -->
    <div v-if="!authenticated" class="taiga-picker-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <p>กรุณาเชื่อมต่อ Taiga ก่อนในหน้าตั้งค่า</p>
      <BaseButton variant="outline" @click="emit('close')">ปิด</BaseButton>
    </div>

    <!-- Loading -->
    <div v-else-if="loadingItems" class="taiga-picker-empty">
      <div class="taiga-spinner"></div>
      <p>กำลังโหลดงาน...</p>
    </div>

    <!-- Item list -->
    <div v-else>
      <p v-if="errorMsg" class="taiga-picker-error">{{ errorMsg }}</p>

      <div class="taiga-task-groups">
        <div v-for="group in itemGroups" :key="group.projectName" class="taiga-task-group">
          <h4 class="taiga-group-title">{{ group.projectName }}</h4>
          <div
            v-for="item in group.items"
            :key="item._type + '-' + item.id"
            class="taiga-task-item"
            :class="{ selected: selectedItem?._type === item._type && selectedItem?.id === item.id }"
            @click="selectItem(item)"
          >
            <div class="taiga-task-ref">
              <span class="taiga-type-badge" :class="item._type">
                {{ item._type === 'userstory' ? 'US' : 'Task' }}
              </span>
              #{{ item.ref }}
            </div>
            <div class="taiga-task-info">
              <div class="taiga-task-subject">{{ item.subject }}</div>
              <div class="taiga-task-status">{{ item.status_extra_info?.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="itemGroups.length === 0 && !loadingItems && !errorMsg" class="taiga-picker-empty-text">
        ไม่พบงานที่มอบหมายให้คุณ
      </p>

      <!-- Footer -->
      <div class="taiga-picker-footer">
        <BaseButton variant="outline" @click="emit('close')">ยกเลิก</BaseButton>
        <BaseButton
          variant="primary"
          :disabled="!selectedItem || isPosting"
          @click="postToItem"
        >
          {{ isPosting ? 'กำลังโพสต์...' : 'โพสต์ Comment' }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.taiga-picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: #999;
}

.taiga-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #194987;
  border-radius: 50%;
  animation: taiga-spin 0.8s linear infinite;
}

@keyframes taiga-spin {
  to { transform: rotate(360deg); }
}

.taiga-picker-error {
  color: #c00;
  font-size: 13px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff0f0;
  border-radius: 8px;
}

.taiga-task-groups {
  max-height: 400px;
  overflow-y: auto;
}

.taiga-task-group {
  margin-bottom: 16px;
}

.taiga-group-title {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.taiga-task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1.5px solid #e5e5e5;
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.taiga-task-item:hover {
  border-color: #b3d1ff;
  background: #f5f9ff;
}

.taiga-task-item.selected {
  border-color: #194987;
  background: #eef4fb;
}

.taiga-task-ref {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #194987;
  background: #e5edf5;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
  margin-top: 2px;
}

.taiga-type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
}

.taiga-type-badge.task {
  background: #e0f0e0;
  color: #2a7a2a;
}

.taiga-type-badge.userstory {
  background: #e0e8f5;
  color: #3a5a9a;
}

.taiga-task-info {
  flex: 1;
  min-width: 0;
}

.taiga-task-subject {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.taiga-task-status {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.taiga-picker-empty-text {
  text-align: center;
  color: #999;
  padding: 32px 0;
}

.taiga-picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
  margin-top: 16px;
}
</style>
