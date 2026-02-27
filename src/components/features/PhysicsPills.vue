<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Matter from 'matter-js'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  extraPills: {
    type: Array,
    default: () => []
  },
  frozen: {
    type: Boolean,
    default: false
  },
  convergeTarget: {
    type: Object,
    default: null
  }
})

const containerRef = ref(null)
const pillStates = reactive([])

let engine = null
let runner = null
let animFrameId = null
let bodies = []
let dragBody = null
let dragConstraint = null
let convergeFrameId = null
const dynamicBodyMap = new Map()

const staticPills = [
  { text: 'งาน', width: 120, height: 52, fontSize: 22, filled: true },
  { text: 'นี่ก็งาน', width: 130, height: 44, fontSize: 16 },
  { text: 'นั่นก็งาน', width: 140, height: 44, fontSize: 16 },
  { text: 'ก็งาน', width: 110, height: 44, fontSize: 16 },
  { text: 'คนไม่ใช่หุ่นยนต์', width: 180, height: 44, fontSize: 16 },
  { text: 'ทำงาน', width: 120, height: 44, fontSize: 16 },
  { text: 'งานหลวง', width: 130, height: 48, fontSize: 16 },
  { text: 'งานราษฎร์', width: 140, height: 48, fontSize: 16 },
  { text: 'รับทราบครับ', width: 150, height: 44, fontSize: 16 },
]

const allPills = computed(() => {
  const statics = staticPills.map((p, i) => ({ ...p, key: 's' + i }))
  const dynamic = (props.extraPills || []).map(p => ({
    key: 'd' + p.id,
    text: p.name,
    width: Math.max(100, p.name.length * 14 + 40),
    height: 44,
    fontSize: 16,
    filled: true
  }))
  return [...statics, ...dynamic]
})

function getMousePos(e) {
  const rect = containerRef.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function onPointerDown(e) {
  if (!engine) return
  const pos = getMousePos(e)
  const found = Matter.Query.point(bodies, pos)
  if (found.length > 0) {
    dragBody = found[0]
    dragConstraint = Matter.Constraint.create({
      pointA: pos,
      bodyB: dragBody,
      pointB: { x: pos.x - dragBody.position.x, y: pos.y - dragBody.position.y },
      stiffness: 0.2,
      length: 0
    })
    Matter.Composite.add(engine.world, dragConstraint)
  }
}

function onPointerMove(e) {
  if (!dragConstraint) return
  e.preventDefault()
  const pos = getMousePos(e)
  dragConstraint.pointA = pos
}

function onPointerUp() {
  if (dragConstraint) {
    Matter.Composite.remove(engine.world, dragConstraint)
    dragConstraint = null
    dragBody = null
  }
}

function syncPositions() {
  bodies.forEach((body, i) => {
    if (pillStates[i]) {
      pillStates[i].x = body.position.x
      pillStates[i].y = body.position.y
      pillStates[i].angle = body.angle
    }
  })
  animFrameId = requestAnimationFrame(syncPositions)
}

function addDynamicBody(pill) {
  if (!engine || !containerRef.value) return null

  const width = containerRef.value.offsetWidth
  const x = 80 + Math.random() * (width - 160)
  const y = -30
  const chamfer = pill.height / 2

  const body = Matter.Bodies.rectangle(x, y, pill.width, pill.height, {
    chamfer: { radius: chamfer },
    restitution: 0.4,
    friction: 0.3,
    density: 0.002
  })
  Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6)

  Matter.Composite.add(engine.world, body)
  bodies.push(body)
  pillStates.push({ x: body.position.x, y: body.position.y, angle: body.angle, scale: 1, opacity: 1 })

  return body
}

function init() {
  if (!containerRef.value) return

  const width = containerRef.value.offsetWidth
  const height = containerRef.value.offsetHeight

  if (width === 0 || height === 0) return

  engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.2 }
  })

  // Walls
  const wallThickness = 60
  const floor = Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width + 100, wallThickness, { isStatic: true })
  const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true })
  const rightWall = Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true })
  const ceiling = Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width + 100, wallThickness, { isStatic: true })

  Matter.Composite.add(engine.world, [floor, leftWall, rightWall, ceiling])

  // Create static pill bodies
  bodies = staticPills.map((pill, i) => {
    const fromLeft = i % 2 === 0
    const x = fromLeft
      ? 40 + Math.random() * 120
      : width - 40 - Math.random() * 120
    const y = 20 + Math.random() * 40 + i * 15
    const chamfer = pill.height / 2
    const body = Matter.Bodies.rectangle(x, y, pill.width, pill.height, {
      chamfer: { radius: chamfer },
      restitution: 0.4,
      friction: 0.3,
      density: 0.002,
    })
    Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6)
    return body
  })

  Matter.Composite.add(engine.world, bodies)

  // Init reactive state for static pills
  pillStates.length = 0
  bodies.forEach((body) => {
    pillStates.push({ x: body.position.x, y: body.position.y, angle: body.angle, scale: 1, opacity: 1 })
  })

  // Add existing dynamic pills
  dynamicBodyMap.clear()
  props.extraPills.forEach(p => {
    const shape = {
      width: Math.max(100, p.name.length * 14 + 40),
      height: 44
    }
    const body = addDynamicBody(shape)
    if (body) dynamicBodyMap.set(p.id, body)
  })

  // Start physics
  runner = Matter.Runner.create()
  Matter.Runner.run(runner, engine)

  // Start position sync loop
  animFrameId = requestAnimationFrame(syncPositions)
}

function cleanup() {
  if (convergeFrameId) { cancelAnimationFrame(convergeFrameId); convergeFrameId = null }
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (runner) Matter.Runner.stop(runner)
  if (engine) Matter.Engine.clear(engine)
  animFrameId = null
  runner = null
  engine = null
  bodies = []
  dragBody = null
  dragConstraint = null
  dynamicBodyMap.clear()
  pillStates.length = 0
}

function startConverge(target) {
  if (convergeFrameId) { cancelAnimationFrame(convergeFrameId); convergeFrameId = null }
  let frame = 0
  function tick() {
    frame++
    let allDone = true
    pillStates.forEach((s, i) => {
      if (frame < i * 3) { allDone = false; return }
      s.x += (target.x - s.x) * 0.07
      s.y += (target.y - s.y) * 0.07
      s.angle *= 0.92
      s.scale = Math.max(0, s.scale - 0.018)
      s.opacity = Math.max(0, s.opacity - 0.016)
      if (s.scale > 0.01 || s.opacity > 0.01) allDone = false
    })
    if (!allDone) {
      convergeFrameId = requestAnimationFrame(tick)
    }
  }
  convergeFrameId = requestAnimationFrame(tick)
}

watch(() => props.convergeTarget, (target) => {
  if (target && props.frozen) {
    startConverge(target)
  } else {
    if (convergeFrameId) { cancelAnimationFrame(convergeFrameId); convergeFrameId = null }
  }
})

function scheduleInit() {
  setTimeout(() => {
    cleanup()
    init()
  }, 50)
}

// Watch for dynamic pill changes (add/remove)
watch(() => props.extraPills, (newList, oldList) => {
  if (!engine) return

  const oldIds = new Set((oldList || []).map(p => p.id))
  const newIds = new Set(newList.map(p => p.id))

  // Remove deselected pills
  for (const id of oldIds) {
    if (!newIds.has(id)) {
      const body = dynamicBodyMap.get(id)
      if (body) {
        const bodyIdx = bodies.indexOf(body)
        if (bodyIdx !== -1) {
          Matter.Composite.remove(engine.world, body)
          bodies.splice(bodyIdx, 1)
          pillStates.splice(bodyIdx, 1)
        }
        dynamicBodyMap.delete(id)
      }
    }
  }

  // Add newly selected pills
  for (const pill of newList) {
    if (!oldIds.has(pill.id)) {
      const shape = {
        width: Math.max(100, pill.name.length * 14 + 40),
        height: 44
      }
      const body = addDynamicBody(shape)
      if (body) dynamicBodyMap.set(pill.id, body)
    }
  }
}, { deep: true })

watch(() => props.frozen, (val) => {
  if (val) {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null }
    if (runner) Matter.Runner.stop(runner)
  } else if (props.active && engine) {
    runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    animFrameId = requestAnimationFrame(syncPositions)
  }
})

watch(() => props.active, async (val) => {
  if (val) {
    await nextTick()
    scheduleInit()
  } else {
    cleanup()
  }
})

onMounted(() => {
  if (props.active) {
    scheduleInit()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div
    ref="containerRef"
    class="physics-container"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @touchstart="onPointerDown"
    @touchmove="onPointerMove"
    @touchend="onPointerUp"
  >
    <div
      v-for="(pill, i) in allPills"
      :key="pill.key"
      :class="['physics-pill', { 'physics-pill-filled': pill.filled }]"
      :style="{
        width: pill.width + 'px',
        height: pill.height + 'px',
        fontSize: pill.fontSize + 'px',
        transform: pillStates[i]
          ? `translate(${pillStates[i].x - pill.width / 2}px, ${pillStates[i].y - pill.height / 2}px) rotate(${pillStates[i].angle}rad) scale(${pillStates[i].scale})`
          : 'translate(-200px, -200px)',
        opacity: pillStates[i] ? pillStates[i].opacity : 1,
      }"
    >
      {{ pill.text }}
    </div>
  </div>
</template>

<style scoped>
.physics-container {
  width: 100%;
  flex: 1;
  position: relative;
  overflow: hidden;
  touch-action: none;
}

.physics-pill {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid #005FB8;
  border-radius: 9999px;
  color: #005FB8;
  font-weight: 700;
  white-space: nowrap;
  cursor: grab;
  user-select: none;
  pointer-events: none;
}

.physics-pill-filled {
  background: var(--primary-brand);
  border-color: var(--primary-brand);
  color: #ffffff;
}
</style>
