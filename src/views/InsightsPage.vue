<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import BaseHeader from '../components/ui/BaseHeader.vue'
import { IconUser, IconChevronDown, IconFolderOpen } from '../components/icons'

const router = useRouter()
const store = useAppStore()

const period = ref('week') // 'week' | 'month'

function goBack() {
  router.push({ name: 'app' })
}

function findProjectById(id) {
  return store.projects.find(p => String(p.id) === String(id)) || null
}

function getProjectMeta(project) {
  if (!project?.taigaUrl) return null
  return store.getProjectMeta(project.taigaUrl)
}

const periodStart = computed(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (period.value === 'week') {
    const day = d.getDay() // 0 = Sun
    const diff = day === 0 ? 6 : day - 1 // week starts Monday
    d.setDate(d.getDate() - diff)
  } else {
    d.setDate(1)
  }
  return d
})

const periodLabel = computed(() => {
  const now = new Date()
  if (period.value === 'week') {
    const start = periodStart.value
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
  }
  return now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
})

const periodReports = computed(() => {
  const start = periodStart.value.getTime()
  return store.reports.filter(r => new Date(r.date).getTime() >= start)
})

const totalReports = computed(() => periodReports.value.length)

const uniqueProjectCount = computed(() => {
  const set = new Set()
  for (const r of periodReports.value) {
    for (const id of (r.projects || [])) set.add(String(id))
  }
  return set.size
})

const daysInPeriod = computed(() => {
  if (period.value === 'week') return 7
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
})

const activeDays = computed(() => {
  const days = new Set()
  for (const r of periodReports.value) {
    days.add(new Date(r.date).toDateString())
  }
  return days.size
})

const projectBreakdown = computed(() => {
  const counts = {}
  for (const r of periodReports.value) {
    for (const id of (r.projects || [])) {
      counts[String(id)] = (counts[String(id)] || 0) + 1
    }
  }
  const entries = Object.entries(counts)
    .map(([id, count]) => {
      const project = findProjectById(id)
      if (!project) return null
      return {
        id: project.id,
        name: project.name,
        count,
        meta: getProjectMeta(project),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
  const max = entries[0]?.count || 1
  return entries.map(e => ({ ...e, percent: Math.round((e.count / max) * 100) }))
})

const topProject = computed(() => projectBreakdown.value[0] || null)

const dayGrid = computed(() => {
  const start = new Date(periodStart.value)
  const out = []
  const countsByDay = {}
  for (const r of periodReports.value) {
    const key = new Date(r.date).toDateString()
    countsByDay[key] = (countsByDay[key] || 0) + (r.projects?.length || 1)
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < daysInPeriod.value; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    if (d > today) break
    out.push({
      date: d,
      key: d.toDateString(),
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      count: countsByDay[d.toDateString()] || 0,
      isToday: d.toDateString() === today.toDateString(),
    })
  }
  return out
})

const maxDayCount = computed(() => Math.max(1, ...dayGrid.value.map(d => d.count)))

function intensity(count) {
  if (count === 0) return 0
  const ratio = count / maxDayCount.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}
</script>

<template>
  <div class="insights-wrapper">
    <BaseHeader :show-border="false">
      <template #actions>
        <button
          class="flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 bg-gray-50 border border-gray-200 rounded-full font-medium text-sm text-gray-700 cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300"
          @click="goBack">
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img v-if="store.user.profileImage" :src="store.user.profileImage" alt="Profile"
              class="w-full h-full object-cover rounded-full">
            <IconUser v-else />
          </div>
          <span class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{{ store.user.name?.split(' ')[0] || 'ผู้ใช้' }}</span>
          <IconChevronDown class="text-gray-500 flex-shrink-0" />
        </button>
      </template>
    </BaseHeader>

    <div class="insights-body">
      <div class="insights-container">
        <!-- Header -->
        <div class="insights-header">
          <div>
            <h1 class="insights-title">พฤติกรรมการทำงาน</h1>
            <p class="insights-subtitle">{{ periodLabel }}</p>
          </div>
          <div class="insights-period-tabs">
            <button
              :class="['insights-period-tab', { 'is-active': period === 'week' }]"
              @click="period = 'week'"
            >รายสัปดาห์</button>
            <button
              :class="['insights-period-tab', { 'is-active': period === 'month' }]"
              @click="period = 'month'"
            >รายเดือน</button>
          </div>
        </div>

        <!-- Summary cards -->
        <div class="insights-summary-grid">
          <div class="insights-summary-card">
            <div class="insights-summary-label">รายงานที่บันทึก</div>
            <div class="insights-summary-value">{{ totalReports }}</div>
            <div class="insights-summary-unit">ครั้ง</div>
          </div>
          <div class="insights-summary-card">
            <div class="insights-summary-label">โครงการที่ทำ</div>
            <div class="insights-summary-value">{{ uniqueProjectCount }}</div>
            <div class="insights-summary-unit">โครงการ</div>
          </div>
          <div class="insights-summary-card">
            <div class="insights-summary-label">วันที่ทำงาน</div>
            <div class="insights-summary-value">{{ activeDays }}<span class="insights-summary-sub">/{{ dayGrid.length }}</span></div>
            <div class="insights-summary-unit">วัน</div>
          </div>
          <div class="insights-summary-card insights-summary-card-highlight">
            <div class="insights-summary-label">โครงการเด่น</div>
            <div class="insights-summary-value-name">{{ topProject?.name || '–' }}</div>
            <div class="insights-summary-unit">{{ topProject ? `${topProject.count} ครั้ง` : 'ยังไม่มีข้อมูล' }}</div>
          </div>
        </div>

        <!-- Day activity grid -->
        <div class="insights-section">
          <div class="insights-section-head">
            <h2 class="insights-section-title">กิจกรรมรายวัน</h2>
            <span class="insights-section-hint">ความเข้มของสีแสดงจำนวนโครงการที่ทำในวันนั้น</span>
          </div>
          <div v-if="dayGrid.length === 0" class="insights-empty">
            ยังไม่มีข้อมูลในช่วงนี้
          </div>
          <div v-else class="insights-day-grid">
            <div
              v-for="d in dayGrid"
              :key="d.key"
              class="insights-day-cell"
              :class="[`intensity-${intensity(d.count)}`, { 'is-today': d.isToday }]"
              :title="`${d.weekday} ${d.dayNum} · ${d.count} โครงการ`"
            >
              <div class="insights-day-weekday">{{ d.weekday }}</div>
              <div class="insights-day-num">{{ d.dayNum }}</div>
              <div v-if="d.count > 0" class="insights-day-count">{{ d.count }}</div>
            </div>
          </div>
        </div>

        <!-- Project breakdown -->
        <div class="insights-section">
          <div class="insights-section-head">
            <h2 class="insights-section-title">โครงการที่ทุ่มเท</h2>
            <span class="insights-section-hint">เรียงจากทำบ่อยที่สุด</span>
          </div>
          <div v-if="projectBreakdown.length === 0" class="insights-empty">
            ยังไม่มีข้อมูลในช่วงนี้ เริ่มบันทึกรายงานเพื่อดูสถิติ
          </div>
          <div v-else class="insights-project-list">
            <div
              v-for="p in projectBreakdown"
              :key="p.id"
              class="insights-project-row"
            >
              <div class="insights-project-logo">
                <img v-if="p.meta?.logoUrl" :src="p.meta.logoUrl" :alt="p.name" />
                <IconFolderOpen v-else size="18" color="var(--secondary-text)" />
              </div>
              <div class="insights-project-main">
                <div class="insights-project-head">
                  <span class="insights-project-name">{{ p.name }}</span>
                  <span class="insights-project-count">{{ p.count }} ครั้ง</span>
                </div>
                <div class="insights-project-bar">
                  <div class="insights-project-bar-fill" :style="{ width: p.percent + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insights-wrapper {
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.insights-body {
  flex: 1;
  padding: 24px 24px 64px;
  animation: slideIn 0.5s ease-out 0.1s forwards;
  opacity: 0;
  transform: translateY(30px);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.insights-container {
  max-width: 1040px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.insights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.insights-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #194987;
  margin: 0;
}

.insights-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 4px 0 0;
}

.insights-period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 10px;
}

.insights-period-tab {
  height: 36px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.insights-period-tab:hover:not(.is-active) {
  color: #194987;
}

.insights-period-tab.is-active {
  background: white;
  color: #194987;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.insights-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .insights-summary-grid { grid-template-columns: repeat(2, 1fr); }
}

.insights-summary-card {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.insights-summary-card-highlight {
  background: linear-gradient(135deg, #194987 0%, #2a6bc4 100%);
  border-color: transparent;
  color: white;
}

.insights-summary-label {
  font-size: 0.72rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.insights-summary-card-highlight .insights-summary-label {
  color: rgba(255,255,255,0.8);
}

.insights-summary-value {
  font-size: 2rem;
  font-weight: 700;
  color: #194987;
  line-height: 1.1;
}

.insights-summary-card-highlight .insights-summary-value {
  color: white;
}

.insights-summary-value-name {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 6px;
}

.insights-summary-sub {
  font-size: 1rem;
  font-weight: 500;
  color: #9ca3af;
}

.insights-summary-unit {
  font-size: 0.75rem;
  color: #6b7280;
}

.insights-summary-card-highlight .insights-summary-unit {
  color: rgba(255,255,255,0.85);
}

.insights-section {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  padding: 20px;
}

.insights-section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 4px;
}

.insights-section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.insights-section-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.insights-empty {
  text-align: center;
  padding: 24px;
  font-size: 0.875rem;
  color: #9ca3af;
  font-style: italic;
}

.insights-day-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 6px;
}

.insights-day-cell {
  aspect-ratio: 1;
  border-radius: 8px;
  background: #f3f4f6;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  position: relative;
  transition: transform 0.12s;
  cursor: default;
}

.insights-day-cell:hover {
  transform: scale(1.05);
}

.insights-day-cell.is-today {
  outline: 2px solid #194987;
  outline-offset: 1px;
}

.insights-day-cell.intensity-0 { background: #f3f4f6; }
.insights-day-cell.intensity-1 { background: #dbeafe; }
.insights-day-cell.intensity-2 { background: #93c5fd; }
.insights-day-cell.intensity-3 { background: #3b82f6; color: white; }
.insights-day-cell.intensity-4 { background: #1e40af; color: white; }

.insights-day-weekday {
  font-size: 0.65rem;
  opacity: 0.75;
  font-weight: 500;
}

.insights-day-num {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
}

.insights-day-count {
  font-size: 0.6rem;
  opacity: 0.8;
}

.insights-project-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insights-project-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 10px;
  transition: background 0.12s;
}

.insights-project-row:hover {
  background: #f9fafb;
}

.insights-project-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f5f5f5;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insights-project-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.insights-project-main {
  flex: 1;
  min-width: 0;
}

.insights-project-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}

.insights-project-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.insights-project-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: #194987;
  flex-shrink: 0;
}

.insights-project-bar {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.insights-project-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #194987, #3b82f6);
  border-radius: 4px;
  transition: width 0.4s ease;
}
</style>
