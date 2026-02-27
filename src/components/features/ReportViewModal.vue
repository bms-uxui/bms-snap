<script setup>
import { computed } from 'vue'
import { useAppStore } from '../../stores/app'
import { useDateTime } from '../../composables/useDateTime'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: null
  }
})

const emit = defineEmits(['close'])

const store = useAppStore()
const { formatThaiDate } = useDateTime()

const report = computed(() => {
  if (!props.date) return null
  return store.getReportByDate(props.date)
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  return formatThaiDate(props.date)
})

const projectNames = computed(() => {
  if (!report.value || !report.value.projects) return []
  return report.value.projects.map(pid => {
    const project = store.projects.find(p => p.id === pid)
    return project ? project.name : 'โครงการที่ถูกลบ'
  })
})

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && report"
      class="modal-overlay active"
      @click="handleOverlayClick"
    >
      <div class="app-modal report-view-modal">
        <div class="modal-header">
          <h3 class="modal-title">รายงานวันที่ {{ formattedDate }}</h3>
          <button class="modal-close" @click="emit('close')">&times;</button>
        </div>
        <div class="report-view-content">
          <p v-if="projectNames.length > 0" class="report-projects">
            <strong>โครงการ:</strong> {{ projectNames.join(', ') }}
          </p>
          <div class="report-text-content">
            <div v-if="report.contentHtml" v-html="report.contentHtml" />
            <p v-else class="no-content">ไม่มีเนื้อหารายงาน</p>
          </div>
          <div v-if="report.images && report.images.length > 0" class="report-images-section">
            <p class="report-images-label">รูปภาพแนบ ({{ report.images.length }} รูป)</p>
            <div class="report-images-gallery">
              <div v-for="(img, index) in report.images" :key="index" class="report-image-item">
                <img :src="img" :alt="`Image ${index + 1}`">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.report-view-modal {
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
}

.report-view-content {
  padding: 20px;
}

.report-projects {
  margin-bottom: 16px;
  color: #666;
}

.report-text-content {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.no-content {
  color: #999;
  text-align: center;
}

.report-images-section {
  margin-top: 20px;
}

.report-images-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.report-images-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.report-image-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}

.report-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
