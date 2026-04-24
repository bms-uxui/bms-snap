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

const periodOrdinal = computed(() => {
  if (period.value === 'month') {
    return new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  }
  const start = periodStart.value
  const firstJan = new Date(start.getFullYear(), 0, 1)
  const week = Math.ceil((((start - firstJan) / 86400000) + firstJan.getDay() + 1) / 7)
  return `WEEK ${String(week).padStart(2, '0')}`
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
  <div class="insights-page" :class="{ 'is-mounted': mounted }">
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

    <div class="insights-bg-blob blob-1" aria-hidden="true"></div>
    <div class="insights-bg-blob blob-2" aria-hidden="true"></div>

    <main class="insights-shell">
      <!-- Masthead -->
      <header class="insights-head reveal" style="--delay: 0ms">
        <div class="insights-head-text">
          <div class="insights-eyebrow">
            <span class="insights-eyebrow-dot"></span>
            <span>Field Report · {{ periodOrdinal }}</span>
          </div>

          <h1 class="insights-title">
            พฤติกรรม<br />
            <span class="insights-title-accent">การทุ่มเท</span>
          </h1>
          <p class="insights-deck">{{ periodLabel }}</p>
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
      </header>

      <!-- Hero stat -->
      <section class="hero reveal" style="--delay: 120ms">
        <div class="hero-main">
          <div class="hero-label">§ 01 — รายงานประจำ{{ period === 'week' ? 'สัปดาห์' : 'เดือน' }}</div>
          <div class="hero-figure">
            <span class="hero-figure-num">{{ String(totalReports).padStart(2, '0') }}</span>
            <span class="hero-figure-sup">ครั้ง</span>
          </div>
          <div class="hero-underline"></div>
          <p class="hero-caption">
            ค่าเฉลี่ย <strong>{{ avgReportsPerActiveDay }}</strong> รายงาน/วันที่ทำงาน
          </p>
        </div>

        <aside class="hero-side">
          <div class="hero-stat">
            <div class="hero-stat-label">โครงการที่ทำ</div>
            <div class="hero-stat-value">{{ String(uniqueProjectCount).padStart(2, '0') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-label">วันทำงาน</div>
            <div class="hero-stat-value">
              {{ String(activeDays).padStart(2, '0') }}<span class="hero-stat-denom">/ {{ dayGrid.length }}</span>
            </div>
          </div>
          <div class="hero-stat hero-stat-feature">
            <div class="hero-stat-label">โครงการเด่น</div>
            <div class="hero-stat-feature-name">{{ topProject?.name || '—' }}</div>
            <div class="hero-stat-feature-meta">
              {{ topProject ? `บันทึกไป ${topProject.count} ครั้ง` : 'รอรายงานแรกของช่วงนี้' }}
            </div>
          </div>
        </aside>
      </section>

      <!-- Chart + Ranking side by side on desktop -->
      <div class="insights-lower">
      <!-- Daily activity chart -->
      <section class="chart-section reveal" style="--delay: 240ms">
        <div class="section-head">
          <span class="section-mark">§ 02</span>
          <div>
            <h2 class="section-title">จังหวะการทำงาน</h2>
            <p class="section-sub">จำนวนโครงการที่ทำในแต่ละวัน</p>
          </div>
        </div>

        <div v-if="dayGrid.length === 0" class="empty">— ยังไม่มีข้อมูลในช่วงนี้ —</div>
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

      <!-- Project ranking -->
      <section class="ranking-section reveal" style="--delay: 360ms">
        <div class="section-head">
          <span class="section-mark">§ 03</span>
          <div>
            <h2 class="section-title">การจัดอันดับโครงการ</h2>
            <p class="section-sub">เรียงจากที่บันทึกบ่อยที่สุด</p>
          </div>
        </div>

        <div v-if="projectBreakdown.length === 0" class="empty">
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
                  <span class="rank-count-label">× ทำงาน</span>
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
    </main>
  </div>
</template>

<style scoped>
.insights-page {
  min-height: 100vh;
  background: #fafafa;
  color: var(--primary-text, #1e1e1e);
  font-family: 'Noto Sans Thai UI', 'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Soft ambient blobs — match home page's friendly feel */
.insights-bg-blob {
  position: fixed;
  pointer-events: none;
  z-index: 0;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.55;
}

.insights-bg-blob.blob-1 {
  width: 520px; height: 520px;
  top: -160px; right: -120px;
  background: radial-gradient(circle, rgba(196, 226, 255, 0.9) 0%, rgba(196, 226, 255, 0) 70%);
}

.insights-bg-blob.blob-2 {
  width: 420px; height: 420px;
  bottom: -160px; left: -120px;
  background: radial-gradient(circle, rgba(244, 116, 81, 0.22) 0%, rgba(244, 116, 81, 0) 70%);
}

.insights-shell {
  position: relative;
  z-index: 1;
  max-width: 1360px;
  margin: 0 auto;
  padding: 16px 48px 80px;
}

@media (max-width: 1100px) {
  .insights-shell { padding: 16px 32px 72px; }
}

@media (max-width: 720px) {
  .insights-shell { padding: 8px 20px 64px; }
}

/* ---------- Entrance reveal ---------- */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.65s cubic-bezier(.22,.61,.36,1) var(--delay, 0ms),
              transform 0.65s cubic-bezier(.22,.61,.36,1) var(--delay, 0ms);
}

.is-mounted .reveal {
  opacity: 1;
  transform: none;
}

/* ---------- Masthead ---------- */
.insights-head {
  padding-top: 32px;
  margin-bottom: 56px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 32px;
}

.insights-head-text { min-width: 0; }

@media (max-width: 860px) {
  .insights-head {
    grid-template-columns: 1fr;
    align-items: flex-start;
    gap: 20px;
  }
}

.insights-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--secondary-brand, #c4e2ff);
  color: var(--primary-brand, #005FB8);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.insights-eyebrow-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--primary-brand, #005FB8);
  box-shadow: 0 0 0 4px rgba(0, 95, 184, 0.2);
  animation: dotPulse 2.4s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
}

.insights-title {
  font-family: 'Google Sans', 'Noto Sans Thai UI', sans-serif;
  font-size: clamp(2.6rem, 7vw, 5rem);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.02em;
  color: #194987;
  margin: 0;
}

.insights-title-accent {
  color: var(--primary-brand, #005FB8);
  position: relative;
  display: inline-block;
}

.insights-title-accent::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 0.1em;
  height: 0.18em;
  background: var(--secondary-brand, #c4e2ff);
  z-index: -1;
  border-radius: 4px;
}

.insights-deck {
  font-size: 1.05rem;
  color: var(--secondary-text, #5f6368);
  margin: 14px 0 28px;
}

.insights-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 999px;
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

/* ---------- Hero ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 56px;
  align-items: stretch;
  margin-bottom: 32px;
  padding: 48px 56px;
  background: white;
  border-radius: 28px;
  box-shadow: 10px 10px 0 rgba(0, 95, 184, 0.08);
  border: 1.5px solid #eef1f6;
}

@media (max-width: 1100px) {
  .hero { padding: 36px 32px; gap: 40px; }
}

@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; gap: 24px; padding: 24px; margin-bottom: 24px; }
}

/* ---------- Lower grid (chart + ranking side by side) ---------- */
.insights-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

@media (max-width: 1024px) {
  .insights-lower { grid-template-columns: 1fr; gap: 24px; }
}

.hero-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--secondary-text, #5f6368);
  margin-bottom: 20px;
}

.hero-figure {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 0.9;
}

.hero-figure-num {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: clamp(6.5rem, 18vw, 13rem);
  letter-spacing: -0.06em;
  color: #194987;
  font-feature-settings: 'lnum', 'tnum';
}

.hero-figure-sup {
  font-weight: 500;
  font-size: 1.3rem;
  color: var(--primary-brand, #005FB8);
  padding-top: 24px;
}

.hero-underline {
  width: 64%;
  height: 10px;
  background: linear-gradient(90deg, var(--primary-brand, #005FB8), var(--accent-5, #87CCD4));
  margin-top: 14px;
  border-radius: 999px;
  transform-origin: left;
  animation: lineGrow 0.9s 0.4s cubic-bezier(.22,.61,.36,1) both;
}

@keyframes lineGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.hero-caption {
  font-size: 1rem;
  color: var(--secondary-text, #5f6368);
  margin: 20px 0 0;
}

.hero-caption strong {
  font-weight: 700;
  color: var(--primary-text, #1e1e1e);
  padding: 2px 8px;
  background: var(--secondary-brand, #c4e2ff);
  border-radius: 6px;
  margin: 0 2px;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: flex-end;
  padding-left: 32px;
  border-left: 1.5px dashed #eef1f6;
}

@media (max-width: 860px) {
  .hero-side { padding-left: 0; border-left: none; padding-top: 20px; border-top: 1.5px dashed #eef1f6; }
}

.hero-stat {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f3f7;
}

.hero-stat:not(.hero-stat-feature):last-of-type { border-bottom: none; padding-bottom: 0; }

.hero-stat-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--secondary-text, #5f6368);
}

.hero-stat-value {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: 2.4rem;
  letter-spacing: -0.02em;
  line-height: 1;
  color: #194987;
  font-feature-settings: 'lnum', 'tnum';
}

.hero-stat-denom {
  font-weight: 500;
  font-size: 1rem;
  color: var(--secondary-text, #5f6368);
  margin-left: 4px;
}

.hero-stat-feature {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px 18px;
  background: linear-gradient(135deg, var(--primary-brand, #005FB8), #194987);
  color: white;
  border-radius: 16px;
  border: none;
  box-shadow: 6px 6px 0 rgba(0, 95, 184, 0.14);
  margin-top: 8px;
}

.hero-stat-feature .hero-stat-label {
  color: rgba(255, 255, 255, 0.8);
}

.hero-stat-feature-name {
  font-weight: 700;
  font-size: 1.2rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.hero-stat-feature-meta {
  font-size: 0.78rem;
  font-weight: 500;
  opacity: 0.88;
}

/* ---------- Section heads ---------- */
.section-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 22px;
}

.section-mark {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary-brand, #005FB8);
  letter-spacing: 0.08em;
  padding-top: 4px;
  font-feature-settings: 'lnum';
}

.section-title {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: clamp(1.5rem, 3.2vw, 2rem);
  letter-spacing: -0.015em;
  line-height: 1.1;
  color: #194987;
  margin: 0;
}

.section-sub {
  font-size: 0.9rem;
  color: var(--secondary-text, #5f6368);
  margin: 4px 0 0;
}

.empty {
  font-size: 0.95rem;
  color: var(--secondary-text, #5f6368);
  padding: 32px 0;
  text-align: center;
}

/* ---------- Chart ---------- */
.chart-section {
  padding: 28px 32px;
  background: white;
  border-radius: 24px;
  border: 1.5px solid #eef1f6;
  box-shadow: 8px 8px 0 rgba(0, 95, 184, 0.06);
  min-width: 0;
}

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
  width: clamp(16px, 3.8vw, 34px);
  min-height: 4px;
  background: linear-gradient(180deg, var(--primary-brand, #005FB8), #194987);
  border-radius: 8px 8px 0 0;
  transition: height 0.9s cubic-bezier(.22,.61,.36,1);
  transition-delay: calc(var(--delay, 0ms) + 200ms);
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 95, 184, 0.15);
}

.bar-col.is-today .bar {
  background: linear-gradient(180deg, var(--accent-4, #f47451), #d85a38);
  box-shadow: 0 2px 8px rgba(244, 116, 81, 0.35);
}

.bar-col.is-empty .bar {
  background: transparent;
  border: 1.5px dashed #e5e7eb;
  box-shadow: none;
}

.bar-col.is-future .bar {
  background: repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 3px, transparent 3px, transparent 6px);
  border: 1px solid #e5e7eb;
  box-shadow: none;
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

.bar-col.is-today .bar-day {
  color: var(--accent-4, #f47451);
}

/* ---------- Ranking ---------- */
.ranking-section {
  padding: 28px 32px;
  background: white;
  border-radius: 24px;
  border: 1.5px solid #eef1f6;
  box-shadow: 8px 8px 0 rgba(0, 95, 184, 0.06);
  min-width: 0;
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .ranking-section { position: static; max-height: none; }
}

.ranking {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.rank-row {
  display: grid;
  grid-template-columns: 40px 44px 1fr;
  align-items: center;
  gap: 16px;
  padding: 16px 12px;
  border-radius: 14px;
  transition: background 0.2s;
}

.rank-row + .rank-row {
  border-top: 1px solid #f1f3f7;
}

.rank-row:hover {
  background: #f9fbfe;
}

.rank-index {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
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
  gap: 16px;
  margin-bottom: 8px;
}

.rank-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--primary-text, #1e1e1e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex-shrink: 0;
}

.rank-count strong {
  font-family: 'Google Sans', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--primary-brand, #005FB8);
  line-height: 1;
  font-feature-settings: 'lnum', 'tnum';
}

.rank-count-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
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
  background: linear-gradient(90deg, var(--primary-brand, #005FB8), var(--accent-5, #87CCD4));
  border-radius: 999px;
  animation: fillBar 1.1s cubic-bezier(.22,.61,.36,1) forwards;
  animation-delay: var(--reveal-delay, 0ms);
}

@keyframes fillBar {
  from { width: 0; }
  to { width: var(--bar-width, 0); }
}
</style>
