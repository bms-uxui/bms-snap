<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/app'
import { useToast } from '../../composables/useToast'
import { useDateTime } from '../../composables/useDateTime'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const store = useAppStore()
const { showToast } = useToast()
const { todayFormatted } = useDateTime()

const templateText = ref('')
const textareaRef = ref(null)

const DEFAULT_TEMPLATE = '{name}\nงานประจำวันที่ {date}\n- '

watch(() => props.show, (newVal) => {
  if (newVal) {
    templateText.value = store.morningTemplate || DEFAULT_TEMPLATE
  }
})

const previewText = computed(() => {
  const name = store.user.name || 'สมชาย ใจดี'
  const role = store.user.role || 'เจ้าหน้าที่พัฒนาโปรแกรม'
  const workplace = store.user.workplace || 'ศูนย์เทคโนโลยีสารสนเทศ'

  return templateText.value
    .replace(/\{name\}/g, name)
    .replace(/\{date\}/g, todayFormatted.value)
    .replace(/\{role\}/g, role)
    .replace(/\{workplace\}/g, workplace)
})

function insertVariable(variable) {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = templateText.value
  const variableText = `{${variable}}`

  templateText.value = text.substring(0, start) + variableText + text.substring(end)

  // Focus and set cursor position
  setTimeout(() => {
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + variableText.length
  }, 0)
}

function saveTemplate() {
  store.setMorningTemplate(templateText.value)
  emit('close')
  showToast('บันทึกเทมเพลตรายงานตอนเช้าแล้ว')
}

function resetTemplate() {
  templateText.value = DEFAULT_TEMPLATE
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close')
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
      <div class="app-modal">
        <div class="modal-header">
          <h3 class="modal-title">แก้ไขเทมเพลตรายงานตอนเช้า</h3>
          <button class="modal-close" @click="emit('close')">&times;</button>
        </div>

        <div class="form-group">
          <label class="form-label">รูปแบบเทมเพลต</label>
          <textarea
            ref="textareaRef"
            v-model="templateText"
            class="form-textarea"
            rows="6"
            placeholder="{name}
งานประจำวันที่ {date}
- "
          />
          <p class="form-hint">ตัวแปรที่ใช้ได้:</p>
          <div class="template-variables">
            <span class="variable-tag" @click="insertVariable('name')">{name}</span>
            <span class="variable-hint">ชื่อ-นามสกุล</span>
            <span class="variable-tag" @click="insertVariable('date')">{date}</span>
            <span class="variable-hint">วันที่ปัจจุบัน</span>
            <span class="variable-tag" @click="insertVariable('role')">{role}</span>
            <span class="variable-hint">ตำแหน่ง</span>
            <span class="variable-tag" @click="insertVariable('workplace')">{workplace}</span>
            <span class="variable-hint">สถานที่ปฏิบัติงาน</span>
          </div>
        </div>

        <div class="template-preview-section">
          <label class="form-label">ตัวอย่างผลลัพธ์</label>
          <div class="template-preview-box">{{ previewText }}</div>
        </div>

        <div class="btn-group">
          <button class="btn-secondary" @click="resetTemplate">รีเซ็ตเป็นค่าเริ่มต้น</button>
          <button class="btn-primary" @click="saveTemplate">บันทึก</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.template-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.variable-tag {
  background: #e5edf5;
  color: #194987;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.variable-tag:hover {
  background: #d0e1f0;
}

.variable-hint {
  color: #999;
  font-size: 12px;
  margin-right: 8px;
}

.template-preview-section {
  margin-top: 20px;
}

.template-preview-box {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  white-space: pre-wrap;
  font-size: 14px;
  color: #333;
  min-height: 100px;
}
</style>
