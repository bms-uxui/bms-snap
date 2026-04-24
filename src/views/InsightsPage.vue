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
    return `${start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
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
          class="flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 bg-white/60 border border-[#e8dfce] rounded-full font-medium text-sm text-[#2d2418] cursor-pointer transition-all hover:bg-white"
          @click="goBack">
          <div class="w-8 h-8 rounded-full bg-[#f0e6d0] flex items-center justify-center overflow-hidden flex-shrink-0">
            <img v-if="store.user.profileImage" :src="store.user.profileImage" alt="Profile" class="w-full h-full object-cover rounded-full">
            <IconUser v-else />
          </div>
          <span class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{{ store.user.name?.split(' ')[0] || 'ผู้ใช้' }}</span>
          <IconChevronDown class="text-[#6b5d4f] flex-shrink-0" />
        </button>
      </template>
    </BaseHeader>

    <!-- Decorative grain + paper texture -->
    <div class="insights-grain" aria-hidden="true"></div>

    <main class="insights-shell">
      <!-- Masthead -->
      <header class="masthead reveal" style="--delay: 0ms">
        <div class="masthead-meta">
          <span class="masthead-rule"></span>
          <span class="masthead-eyebrow">Field Report · {{ periodOrdinal }}</span>
        </div>

        <h1 class="masthead-title">
          <span class="masthead-title-line">พฤติกรรม</span>
          <span class="masthead-title-accent">การทุ่มเท</span>
        </h1>
        <p class="masthead-deck">{{ periodLabel }}</p>

        <div class="masthead-toggle" role="tablist">
          <button
            :class="['period-btn', { 'is-active': period === 'week' }]"
            role="tab"
            :aria-selected="period === 'week'"
            @click="period = 'week'"
          >
            <span class="period-btn-num">01</span>
            รายสัปดาห์
          </button>
          <button
            :class="['period-btn', { 'is-active': period === 'month' }]"
            role="tab"
            :aria-selected="period === 'month'"
            @click="period = 'month'"
          >
            <span class="period-btn-num">02</span>
            รายเดือน
          </button>
        </div>
      </header>

      <!-- Hero stat: oversized + supporting stats asymmetric -->
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
          — ยังไม่มีโครงการในช่วงนี้ · เริ่มบันทึกรายงานเพื่อเห็นภาพ —
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
              <IconFolderOpen v-else size="16" color="#6b5d4f" />
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

      <footer class="colophon reveal" style="--delay: 480ms">
        <span class="colophon-mark">◆</span>
        <span>สรุปจากบันทึกของคุณเอง · เก็บไว้เป็นแรงใจ</span>
        <span class="colophon-mark">◆</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap');

.insights-page {
  --bg: #f4eedc;
  --bg-deep: #ece4cf;
  --ink: #1c1610;
  --ink-soft: #4a3d2f;
  --mute: #8b7c68;
  --paper: #fbf7ec;
  --rule: #1c1610;
  --accent: #b24a2a;
  --accent-deep: #7e2f17;
  --accent-soft: #f2d6c3;
  --positive: #3f5a3a;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Manrope', 'Google Sans', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Grain / paper texture — subtle noise via inline SVG */
.insights-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.35;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

.insights-shell {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 48px 80px;
}

@media (max-width: 720px) {
  .insights-shell { padding: 16px 20px 64px; }
}

/* ---------- Entrance reveal ---------- */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(.22,.61,.36,1) var(--delay, 0ms),
              transform 0.7s cubic-bezier(.22,.61,.36,1) var(--delay, 0ms);
}

.is-mounted .reveal {
  opacity: 1;
  transform: none;
}

/* ---------- Masthead ---------- */
.masthead {
  padding: 24px 0 32px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 48px;
}

.masthead-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.masthead-rule {
  display: inline-block;
  width: 56px;
  height: 2px;
  background: var(--ink);
}

.masthead-eyebrow {
  font-family: 'Manrope', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: var(--ink);
  text-transform: uppercase;
}

.masthead-title {
  font-family: 'Fraunces', serif;
  font-variation-settings: 'opsz' 144, 'SOFT' 50;
  font-weight: 800;
  font-size: clamp(3rem, 10vw, 7.5rem);
  line-height: 0.92;
  margin: 0;
  letter-spacing: -0.03em;
  color: var(--ink);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15em 0.3em;
}

.masthead-title-accent {
  font-style: italic;
  color: var(--accent);
  font-weight: 600;
}

.masthead-deck {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 1.1rem;
  color: var(--ink-soft);
  margin: 16px 0 28px;
}

.masthead-toggle {
  display: inline-flex;
  gap: 0;
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 4px;
  background: var(--paper);
  box-shadow: 2px 2px 0 var(--rule);
}

.period-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-family: 'Manrope', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.period-btn:hover:not(.is-active) {
  color: var(--ink);
}

.period-btn.is-active {
  background: var(--ink);
  color: var(--paper);
}

.period-btn-num {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.75;
}

/* ---------- Hero stat (asymmetric two-column) ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 56px;
  align-items: stretch;
  margin-bottom: 64px;
  padding-bottom: 48px;
  border-bottom: 1px solid var(--rule);
}

@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; gap: 32px; }
}

.hero-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 24px;
}

.hero-figure {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 0.85;
}

.hero-figure-num {
  font-family: 'Fraunces', serif;
  font-variation-settings: 'opsz' 144;
  font-weight: 800;
  font-size: clamp(8rem, 22vw, 18rem);
  letter-spacing: -0.06em;
  color: var(--ink);
  font-feature-settings: 'lnum';
}

.hero-figure-sup {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 400;
  font-size: 1.6rem;
  color: var(--accent);
  padding-top: 24px;
}

.hero-underline {
  width: 72%;
  height: 8px;
  background: var(--accent);
  margin-top: 16px;
  position: relative;
  transform-origin: left;
  animation: lineGrow 0.9s 0.4s cubic-bezier(.22,.61,.36,1) both;
}

.hero-underline::after {
  content: '';
  position: absolute;
  left: 0; top: 14px;
  width: 40%;
  height: 2px;
  background: var(--ink);
}

@keyframes lineGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.hero-caption {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 1.05rem;
  color: var(--ink-soft);
  margin: 22px 0 0;
}

.hero-caption strong {
  font-style: normal;
  font-weight: 700;
  color: var(--ink);
  background: linear-gradient(transparent 65%, var(--accent-soft) 65%);
  padding: 0 4px;
}

/* Side column */
.hero-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: flex-end;
  padding-left: 32px;
  border-left: 1px solid var(--rule);
}

@media (max-width: 860px) {
  .hero-side { padding-left: 0; border-left: none; padding-top: 24px; border-top: 1px solid var(--rule); }
}

.hero-stat {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--rule);
}

.hero-stat:last-of-type { border-bottom: none; padding-bottom: 0; }

.hero-stat-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--mute);
}

.hero-stat-value {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 2.6rem;
  letter-spacing: -0.02em;
  line-height: 1;
}

.hero-stat-denom {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 400;
  font-size: 1.1rem;
  color: var(--mute);
  margin-left: 6px;
}

.hero-stat-feature {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 18px 20px;
  background: var(--accent);
  color: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  box-shadow: 4px 4px 0 var(--rule);
}

.hero-stat-feature .hero-stat-label {
  color: rgba(251, 247, 236, 0.7);
}

.hero-stat-feature-name {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 1.4rem;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.hero-stat-feature-meta {
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  opacity: 0.9;
}

/* ---------- Section heads ---------- */
.section-head {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 28px;
}

.section-mark {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 500;
  font-size: 1rem;
  color: var(--accent);
  padding-top: 6px;
}

.section-title {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: clamp(1.75rem, 4vw, 2.6rem);
  letter-spacing: -0.02em;
  line-height: 1;
  margin: 0;
}

.section-sub {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 0.95rem;
  color: var(--ink-soft);
  margin: 6px 0 0;
}

.empty {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 1rem;
  color: var(--mute);
  padding: 32px 0;
  text-align: center;
  letter-spacing: 0.04em;
}

/* ---------- Chart ---------- */
.chart-section {
  margin-bottom: 72px;
  padding-bottom: 48px;
  border-bottom: 1px solid var(--rule);
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
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 0.78rem;
  color: var(--mute);
  padding: 4px 6px 36px 0;
  border-right: 1px solid var(--rule);
}

.chart-bars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: clamp(4px, 1vw, 14px);
  align-items: flex-end;
  padding-bottom: 36px;
  position: relative;
  border-bottom: 1px solid var(--rule);
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
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 0.78rem;
  color: var(--ink-soft);
  min-height: 1em;
}

.bar-stack {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: clamp(18px, 4vw, 38px);
  min-height: 4px;
  background: var(--ink);
  border-radius: 2px 2px 0 0;
  transition: height 0.9s cubic-bezier(.22,.61,.36,1);
  transition-delay: calc(var(--delay, 0ms) + 200ms);
  position: relative;
}

.bar-col.is-today .bar {
  background: var(--accent);
  box-shadow: 3px 3px 0 var(--accent-deep);
}

.bar-col.is-empty .bar {
  background: transparent;
  border: 1px dashed var(--rule);
}

.bar-col.is-future .bar {
  background: repeating-linear-gradient(45deg, var(--bg-deep), var(--bg-deep) 3px, transparent 3px, transparent 6px);
  border: 1px solid var(--rule);
}

.bar-label {
  position: absolute;
  bottom: -32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-family: 'Manrope', sans-serif;
}

.bar-weekday {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mute);
}

.bar-day {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--ink);
}

.bar-col.is-today .bar-day {
  color: var(--accent);
}

/* ---------- Ranking ---------- */
.ranking-section {
  margin-bottom: 64px;
}

.ranking {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-row {
  display: grid;
  grid-template-columns: 48px 42px 1fr;
  align-items: center;
  gap: 16px;
  padding: 18px 4px;
  border-top: 1px solid var(--rule);
  transition: background 0.2s;
}

.rank-row:last-child { border-bottom: 1px solid var(--rule); }

.rank-row:hover {
  background: var(--paper);
}

.rank-index {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 400;
  font-size: 1.6rem;
  color: var(--accent);
  line-height: 1;
  text-align: center;
}

.rank-logo {
  width: 42px;
  height: 42px;
  border-radius: 3px;
  background: var(--paper);
  border: 1px solid var(--rule);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-logo img { width: 100%; height: 100%; object-fit: cover; }

.rank-body { min-width: 0; }

.rank-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 6px;
}

.rank-name {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--ink);
  letter-spacing: -0.01em;
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
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: var(--accent);
  line-height: 1;
}

.rank-count-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mute);
}

.rank-bar {
  height: 6px;
  background: var(--bg-deep);
  position: relative;
  overflow: hidden;
}

.rank-bar-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 0;
  background: linear-gradient(90deg, var(--accent-deep), var(--accent));
  animation: fillBar 1.1s cubic-bezier(.22,.61,.36,1) forwards;
  animation-delay: var(--reveal-delay, 0ms);
}

@keyframes fillBar {
  from { width: 0; }
  to { width: var(--bar-width, 0); }
}

/* ---------- Colophon ---------- */
.colophon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding-top: 32px;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 0.92rem;
  color: var(--mute);
  letter-spacing: 0.02em;
}

.colophon-mark {
  color: var(--accent);
  font-style: normal;
  font-size: 0.8rem;
}
</style>
