<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import BaseHeader from '../components/ui/BaseHeader.vue'
import { IconUser, IconChevronDown, IconFolderOpen } from '../components/icons'

const router = useRouter()
const store = useAppStore()

const period = ref('week')
const mounted = ref(false)

onMounted(() => { requestAnimationFrame(() => { mounted.value = true }) })

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
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
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
    return `${start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
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
      return { id: project.id, name: project.name, count, meta: getProjectMeta(project) }
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
    out.push({
      date: d,
      key: d.toDateString(),
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('th-TH', { weekday: 'narrow' }),
      count: countsByDay[d.toDateString()] || 0,
      isFuture: d > today,
      isToday: d.toDateString() === today.toDateString(),
    })
  }
  return out
})

const maxDayCount = computed(() => Math.max(1, ...dayGrid.value.map(d => d.count)))

function barHeight(count) {
  if (count === 0) return 4
  return Math.max(8, Math.round((count / maxDayCount.value) * 100))
}

const avgReportsPerActiveDay = computed(() => {
  if (activeDays.value === 0) return 0
  return (totalReports.value / activeDays.value).toFixed(1)
})
</script>

<template>
  <div class="bg-[#fafafa] min-h-screen" :class="{ 'is-mounted': mounted }">
    <BaseHeader :show-border="false">
      <template #actions>
        <button
          class="flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 bg-gray-50 border border-gray-200 rounded-full font-medium text-sm text-gray-700 cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300"
          @click="goBack">
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img v-if="store.user.profileImage" :src="store.user.profileImage" alt="Profile" class="w-full h-full object-cover rounded-full">
            <IconUser v-else />
          </div>
          <span class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{{ store.user.name?.split(' ')[0] || 'ผู้ใช้' }}</span>
          <IconChevronDown class="text-gray-500 flex-shrink-0" />
        </button>
      </template>
    </BaseHeader>

    <div>
      <!-- Hero Section -->
      <section class="relative bg-(--secondary-brand) pt-16 pb-32 px-8 md:px-16 lg:px-[240px] overflow-visible rounded-b-[40px]">
        <div class="insights-hero-decor hidden lg:block"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p class="text-sm text-gray-500 mb-1">{{ periodLabel }}</p>
            <h1 class="text-[32px] font-bold text-(--primary-brand) mb-1 leading-tight">พฤติกรรมการทุ่มเท</h1>
            <p class="text-base text-gray-600">ภาพรวมโครงการของคุณในช่วงนี้</p>
          </div>

          <div class="insights-toggle" role="tablist">
            <button
              :class="['period-btn', { 'is-active': period === 'week' }]"
              role="tab"
              :aria-selected="period === 'week'"
              @click="period = 'week'"
            >รายสัปดาห์</button>
            <button
              :class="['period-btn', { 'is-active': period === 'month' }]"
              role="tab"
              :aria-selected="period === 'month'"
              @click="period = 'month'"
            >รายเดือน</button>
          </div>
        </div>
      </section>

      <div class="max-w-full mx-auto px-8 md:px-16 lg:px-[240px]">
        <!-- Stats Grid — overlaps hero just like MainApp -->
        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 -mt-20 relative z-10">
          <div class="stat-card stat-card-purple">
            <p class="stat-label">รายงานที่บันทึก</p>
            <p class="stat-value">{{ totalReports }}</p>
            <p class="stat-unit">ครั้ง · เฉลี่ย {{ avgReportsPerActiveDay }}/วัน</p>
            <svg class="stat-decor" viewBox="0 0 120 120" fill="none">
              <circle cx="90" cy="30" r="14" fill="rgba(255,255,255,0.18)"/>
              <circle cx="110" cy="60" r="8" fill="rgba(255,255,255,0.12)"/>
              <circle cx="85" cy="95" r="20" fill="rgba(255,255,255,0.1)"/>
            </svg>
          </div>
          <div class="stat-card stat-card-green">
            <p class="stat-label">โครงการที่ทำ</p>
            <p class="stat-value">{{ uniqueProjectCount }}</p>
            <p class="stat-unit">โครงการ</p>
            <svg class="stat-decor" viewBox="0 0 120 120" fill="none">
              <rect x="76" y="22" width="36" height="26" rx="6" fill="rgba(255,255,255,0.18)"/>
              <rect x="84" y="56" width="28" height="26" rx="6" fill="rgba(255,255,255,0.14)"/>
              <rect x="70" y="90" width="40" height="20" rx="6" fill="rgba(255,255,255,0.1)"/>
            </svg>
          </div>
          <div class="stat-card stat-card-blue">
            <p class="stat-label">วันทำงาน</p>
            <p class="stat-value">{{ activeDays }}<span class="stat-value-sub">/{{ dayGrid.length }}</span></p>
            <p class="stat-unit">วัน</p>
            <svg class="stat-decor" viewBox="0 0 120 120" fill="none">
              <rect x="74" y="28" width="38" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>
              <rect x="74" y="44" width="30" height="8" rx="4" fill="rgba(255,255,255,0.16)"/>
              <rect x="74" y="60" width="34" height="8" rx="4" fill="rgba(255,255,255,0.13)"/>
              <rect x="74" y="76" width="22" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
              <rect x="74" y="92" width="32" height="8" rx="4" fill="rgba(255,255,255,0.08)"/>
            </svg>
          </div>
          <div class="stat-card stat-card-orange">
            <p class="stat-label">โครงการเด่น</p>
            <p class="stat-value-name">{{ topProject?.name || '—' }}</p>
            <p class="stat-unit">{{ topProject ? `บันทึก ${topProject.count} ครั้ง` : 'รอรายงานแรก' }}</p>
            <svg class="stat-decor" viewBox="0 0 120 120" fill="none">
              <polygon points="88,14 96,42 124,42 101,60 110,88 88,70 66,88 75,60 52,42 80,42" fill="rgba(255,255,255,0.16)"/>
            </svg>
          </div>
        </section>

        <!-- Lower two-column: chart + ranking -->
        <div class="insights-lower mb-10">
          <section class="panel chart-panel">
            <header class="panel-head">
              <div>
                <h2 class="panel-title">จังหวะการทำงาน</h2>
                <p class="panel-sub">จำนวนโครงการที่ทำในแต่ละวัน</p>
              </div>
            </header>

            <div v-if="dayGrid.length === 0" class="panel-empty">— ยังไม่มีข้อมูลในช่วงนี้ —</div>
            <div v-else class="chart">
              <div class="chart-axis">
                <span>{{ maxDayCount }}</span>
                <span>{{ Math.round(maxDayCount / 2) }}</span>
                <span>0</span>
              </div>
              <div class="chart-bars">
                <div
                  v-for="d in dayGrid"
                  :key="d.key"
                  class="bar-col"
                  :class="{ 'is-future': d.isFuture, 'is-today': d.isToday, 'is-empty': d.count === 0 }"
                >
                  <div class="bar-value">{{ d.count > 0 ? d.count : '' }}</div>
                  <div class="bar-stack">
                    <div
                      class="bar"
                      :style="{ height: mounted ? `${barHeight(d.count)}%` : '4%' }"
                    ></div>
                  </div>
                  <div class="bar-label">
                    <span class="bar-weekday">{{ d.weekday }}</span>
                    <span class="bar-day">{{ d.dayNum }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="panel ranking-panel">
            <header class="panel-head">
              <div>
                <h2 class="panel-title">การจัดอันดับโครงการ</h2>
                <p class="panel-sub">เรียงจากที่บันทึกบ่อยที่สุด</p>
              </div>
            </header>

            <div v-if="projectBreakdown.length === 0" class="panel-empty">
              ยังไม่มีโครงการในช่วงนี้ · เริ่มบันทึกรายงานเพื่อเห็นภาพ
            </div>
            <ol v-else class="ranking">
              <li
                v-for="(p, i) in projectBreakdown"
                :key="p.id"
                class="rank-row"
                :style="{ '--bar-width': p.percent + '%', '--reveal-delay': (i * 60) + 'ms' }"
              >
                <span class="rank-index">{{ String(i + 1).padStart(2, '0') }}</span>
                <div class="rank-logo">
                  <img v-if="p.meta?.logoUrl" :src="p.meta.logoUrl" :alt="p.name" />
                  <IconFolderOpen v-else size="18" color="var(--secondary-text)" />
                </div>
                <div class="rank-body">
                  <div class="rank-head">
                    <span class="rank-name">{{ p.name }}</span>
                    <span class="rank-count">
                      <strong>{{ p.count }}</strong>
                      <span class="rank-count-label">ครั้ง</span>
                    </span>
                  </div>
                  <div class="rank-bar">
                    <div class="rank-bar-fill"></div>
                  </div>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Decorative accent in hero, right edge — solid rounded blocks */
.insights-hero-decor {
  position: absolute;
  right: 240px;
  bottom: 24px;
  width: 200px;
  height: 150px;
  pointer-events: none;
}

.insights-hero-decor::before,
.insights-hero-decor::after {
  content: '';
  position: absolute;
  border-radius: 20px;
}

.insights-hero-decor::before {
  width: 120px;
  height: 120px;
  bottom: 0;
  right: 60px;
  background: rgba(0, 95, 184, 0.14);
}

.insights-hero-decor::after {
  width: 72px;
  height: 72px;
  top: 0;
  right: 0;
  background: rgba(244, 116, 81, 0.2);
}

/* ---------- Period toggle ---------- */
.insights-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 999px;
  align-self: flex-start;
}

.period-btn {
  padding: 10px 22px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--secondary-text, #5f6368);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.period-btn:hover:not(.is-active) {
  color: var(--primary-brand, #005FB8);
}

.period-btn.is-active {
  background: var(--primary-brand, #005FB8);
  color: white;
  box-shadow: 0 2px 6px rgba(0, 95, 184, 0.25);
}

/* ---------- Stat Cards (match MainApp pattern) ---------- */
.stat-card {
  position: relative;
  border-radius: 24px;
  padding: 24px;
  overflow: hidden;
  min-height: 170px;
  color: white;
  transition: transform 0.25s ease;
}

.is-mounted .stat-card {
  animation: statRise 0.6s cubic-bezier(.22,.61,.36,1) both;
}

.stat-card:nth-child(1) { animation-delay: 0ms; }
.stat-card:nth-child(2) { animation-delay: 80ms; }
.stat-card:nth-child(3) { animation-delay: 160ms; }
.stat-card:nth-child(4) { animation-delay: 240ms; }

@keyframes statRise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card-purple { background: #8b6bae; }
.stat-card-green  { background: #5bab7b; }
.stat-card-blue   { background: var(--accent-3, #3467d5); }
.stat-card-orange { background: #f47451; }

.stat-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-family: 'Google Sans', sans-serif;
  font-size: 2.6rem;
  font-weight: 700;
  margin-top: 10px;
  line-height: 1;
  font-feature-settings: 'lnum', 'tnum';
}

.stat-value-sub {
  font-size: 1.1rem;
  font-weight: 500;
  opacity: 0.8;
  margin-left: 2px;
}

.stat-value-name {
  font-family: 'Google Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 16px;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.stat-unit {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 6px;
}

.stat-decor {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 120px;
  height: 120px;
  pointer-events: none;
}

/* ---------- Lower grid ---------- */
.insights-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

@media (max-width: 1024px) {
  .insights-lower { grid-template-columns: 1fr; }
}

.panel {
  background: white;
  border-radius: 24px;
  padding: 28px 32px;
  border: 1.5px solid #eef1f6;
  min-width: 0;
}

@media (max-width: 720px) {
  .panel { padding: 22px; }
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 22px;
}

.panel-title {
  font-family: 'Google Sans', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: #194987;
  margin: 0;
  letter-spacing: -0.01em;
}

.panel-sub {
  font-size: 0.88rem;
  color: var(--secondary-text, #5f6368);
  margin: 4px 0 0;
}

.panel-empty {
  text-align: center;
  padding: 36px 0;
  font-size: 0.95rem;
  color: var(--secondary-text, #5f6368);
}

/* ---------- Chart ---------- */
.chart {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  min-height: 220px;
}

.chart-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--secondary-text, #5f6368);
  padding: 4px 8px 40px 0;
  border-right: 1px dashed #e5e7eb;
  font-feature-settings: 'lnum';
}

.chart-bars {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: clamp(4px, 1vw, 12px);
  align-items: flex-end;
  padding-bottom: 40px;
  position: relative;
  border-bottom: 1.5px solid #eef1f6;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  position: relative;
  height: 220px;
}

.bar-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--secondary-text, #5f6368);
  min-height: 1em;
  font-feature-settings: 'lnum';
}

.bar-stack {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: clamp(16px, 3.5vw, 32px);
  min-height: 4px;
  background: var(--primary-brand, #005FB8);
  border-radius: 8px 8px 0 0;
  transition: height 0.9s cubic-bezier(.22,.61,.36,1) 0.2s;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 95, 184, 0.15);
}

.bar-col.is-today .bar {
  background: var(--accent-4, #f47451);
  box-shadow: 0 2px 8px rgba(244, 116, 81, 0.35);
}

.bar-col.is-empty .bar {
  background: transparent;
  border: 1.5px dashed #e5e7eb;
  box-shadow: none;
}

.bar-col.is-future .bar {
  background: #f5f5f5;
  border: 1px dashed #e5e7eb;
  box-shadow: none;
  opacity: 0.6;
}

.bar-label {
  position: absolute;
  bottom: -36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.bar-weekday {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--secondary-text, #5f6368);
}

.bar-day {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--primary-text, #1e1e1e);
  font-feature-settings: 'lnum', 'tnum';
}

.bar-col.is-today .bar-day { color: var(--accent-4, #f47451); }

/* ---------- Ranking ---------- */
.ranking {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rank-row {
  display: grid;
  grid-template-columns: 36px 44px 1fr;
  align-items: center;
  gap: 14px;
  padding: 14px 6px;
  border-top: 1px solid #f1f3f7;
  transition: background 0.15s;
}

.rank-row:first-child { border-top: none; }

.rank-row:hover { background: #f9fbfe; border-radius: 10px; }

.rank-index {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--primary-brand, #005FB8);
  line-height: 1;
  text-align: center;
  font-feature-settings: 'lnum', 'tnum';
}

.rank-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--surface, #f5f5f5);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eef1f6;
}

.rank-logo img { width: 100%; height: 100%; object-fit: cover; }

.rank-body { min-width: 0; }

.rank-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}

.rank-name {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--primary-text, #1e1e1e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
}

.rank-count strong {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--primary-brand, #005FB8);
  line-height: 1;
  font-feature-settings: 'lnum', 'tnum';
}

.rank-count-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--secondary-text, #5f6368);
}

.rank-bar {
  height: 6px;
  background: #eef1f6;
  position: relative;
  overflow: hidden;
  border-radius: 999px;
}

.rank-bar-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 0;
  background: var(--primary-brand, #005FB8);
  border-radius: 999px;
  animation: fillBar 1.1s cubic-bezier(.22,.61,.36,1) forwards;
  animation-delay: var(--reveal-delay, 0ms);
}

@keyframes fillBar {
  from { width: 0; }
  to { width: var(--bar-width, 0); }
}
</style>
