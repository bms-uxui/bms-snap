<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Matter from 'matter-js'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  active: {
    type: Boolean,
    default: false
  },
  excludeCenterWidth: {
    type: Number,
    default: 0
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

const emit = defineEmits(['remove'])

const containerRef = ref(null)
const polaroidStates = reactive([])

const POLAROID_W = 160
const POLAROID_H = 200

let engine = null
let runner = null
let animFrameId = null
let bodies = []
let walls = []
let dragBody = null
let dragConstraint = null
let resizeObserver = null
let convergeFrameId = null

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

function onDblClick(e) {
  if (!engine) return
  const pos = getMousePos(e)
  const found = Matter.Query.point(bodies, pos)
  if (found.length > 0) {
    const idx = bodies.indexOf(found[0])
    if (idx !== -1 && props.images[idx]) {
      emit('remove', props.images[idx].id)
    }
  }
}

function syncPositions() {
  bodies.forEach((body, i) => {
    if (polaroidStates[i]) {
      polaroidStates[i].x = body.position.x
      polaroidStates[i].y = body.position.y
      polaroidStates[i].angle = body.angle
    }
  })
  animFrameId = requestAnimationFrame(syncPositions)
}

function initEngine() {
  if (!containerRef.value) return false

  const width = containerRef.value.offsetWidth
  const height = containerRef.value.offsetHeight
  if (width === 0 || height === 0) return false

  engine = Matter.Engine.create({
    gravity: { x: 0, y: 0 }
  })

  const t = 60
  walls = [
    Matter.Bodies.rectangle(width / 2, height + t / 2, width + 100, t, { isStatic: true }),
    Matter.Bodies.rectangle(-t / 2, height / 2, t, height * 2, { isStatic: true }),
    Matter.Bodies.rectangle(width + t / 2, height / 2, t, height * 2, { isStatic: true }),
    Matter.Bodies.rectangle(width / 2, -t / 2, width + 100, t, { isStatic: true })
  ]

  // Add invisible walls around the center content zone
  if (props.excludeCenterWidth > 0) {
    const cx = width / 2
    const halfExclude = props.excludeCenterWidth / 2
    const wallT = 20
    // Left wall of center zone
    walls.push(Matter.Bodies.rectangle(cx - halfExclude - wallT / 2, height / 2, wallT, height * 2, { isStatic: true }))
    // Right wall of center zone
    walls.push(Matter.Bodies.rectangle(cx + halfExclude + wallT / 2, height / 2, wallT, height * 2, { isStatic: true }))
  }

  Matter.Composite.add(engine.world, walls)

  runner = Matter.Runner.create()
  Matter.Runner.run(runner, engine)
  animFrameId = requestAnimationFrame(syncPositions)

  return true
}

function addBody() {
  if (!engine || !containerRef.value) return null

  const width = containerRef.value.offsetWidth
  const height = containerRef.value.offsetHeight
  let x
  if (props.excludeCenterWidth > 0) {
    // Spawn in left or right side region, avoiding the center
    const cx = width / 2
    const halfExclude = props.excludeCenterWidth / 2
    const margin = POLAROID_W / 2 + 20
    if (Math.random() < 0.5) {
      x = margin + Math.random() * Math.max(0, cx - halfExclude - margin * 2)
    } else {
      x = cx + halfExclude + margin + Math.random() * Math.max(0, cx - halfExclude - margin * 2)
    }
  } else {
    x = 80 + Math.random() * (width - 160)
  }
  const y = 80 + Math.random() * (height - 200)

  const body = Matter.Bodies.rectangle(x, y, POLAROID_W, POLAROID_H, {
    chamfer: { radius: 8 },
    restitution: 0.8,
    friction: 0.05,
    frictionAir: 0.005,
    density: 0.001,
    inertia: 1000000
  })
  Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.15)
  Matter.Body.setVelocity(body, {
    x: (Math.random() - 0.5) * 4,
    y: (Math.random() - 0.5) * 4
  })

  Matter.Composite.add(engine.world, body)
  bodies.push(body)
  polaroidStates.push({ x: body.position.x, y: body.position.y, angle: body.angle, scale: 1, opacity: 1 })

  return body
}

function removeBody(imageId) {
  const idx = props.images.findIndex(img => img.id === imageId)
  if (idx === -1 || !bodies[idx]) return

  Matter.Composite.remove(engine.world, bodies[idx])
  bodies.splice(idx, 1)
  polaroidStates.splice(idx, 1)
}

function cleanup() {
  if (convergeFrameId) { cancelAnimationFrame(convergeFrameId); convergeFrameId = null }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (runner) Matter.Runner.stop(runner)
  if (engine) Matter.Engine.clear(engine)
  animFrameId = null
  runner = null
  engine = null
  bodies = []
  walls = []
  dragBody = null
  dragConstraint = null
  polaroidStates.length = 0
}

function startConverge(target) {
  if (convergeFrameId) { cancelAnimationFrame(convergeFrameId); convergeFrameId = null }
  let frame = 0
  function tick() {
    frame++
    let allDone = true
    polaroidStates.forEach((s, i) => {
      if (frame < i * 5) { allDone = false; return }
      s.x += (target.x - s.x) * 0.05
      s.y += (target.y - s.y) * 0.05
      s.angle *= 0.9
      s.scale = Math.max(0, s.scale - 0.015)
      s.opacity = Math.max(0, s.opacity - 0.014)
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

function startEngine() {
  if (!containerRef.value) return

  if (initEngine()) {
    props.images.forEach(() => addBody())
    return
  }

  // Container may have 0 dimensions (v-show just toggled) — wait for layout
  resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    if (width > 0 && height > 0) {
      resizeObserver.disconnect()
      resizeObserver = null
      if (initEngine()) {
        props.images.forEach(() => addBody())
      }
    }
  })
  resizeObserver.observe(containerRef.value)
}

// Watch for new images added
watch(() => props.images.length, (newLen, oldLen) => {
  if (!props.active) return
  if (newLen > oldLen) {
    if (!engine) {
      if (!initEngine()) return
      props.images.forEach(() => addBody())
      return
    }
    for (let i = oldLen; i < newLen; i++) {
      addBody()
    }
  }
})

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
    cleanup()
    startEngine()
  } else {
    cleanup()
  }
})

onMounted(() => {
  if (props.active) {
    nextTick(() => startEngine())
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div
    ref="containerRef"
    class="polaroid-container"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @touchstart="onPointerDown"
    @touchmove="onPointerMove"
    @touchend="onPointerUp"
    @dblclick="onDblClick"
  >
    <div
      v-for="(image, i) in images"
      :key="image.id"
      class="floating-polaroid"
      :style="{
        width: POLAROID_W + 'px',
        height: POLAROID_H + 'px',
        transform: polaroidStates[i]
          ? `translate(${polaroidStates[i].x - POLAROID_W / 2}px, ${polaroidStates[i].y - POLAROID_H / 2}px) rotate(${polaroidStates[i].angle}rad) scale(${polaroidStates[i].scale})`
          : `translate(${100 + i * 30}px, ${150 + i * 30}px) rotate(${i * 3 - 3}deg)`,
        opacity: polaroidStates[i] ? polaroidStates[i].opacity : 1,
      }"
    >
      <img :src="image.data" alt="Screenshot" class="polaroid-img" />
      <button class="polaroid-close" @click.stop="emit('remove', image.id)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-424 364-308q-11 11-28 11t-28-11q-11-11-11-28t11-28l116-116-116-115q-11-11-11-28t11-28q11-11 28-11t28 11l116 116 115-116q11-11 28-11t28 11q12 12 12 28.5T651-595L535-480l116 116q11 11 11 28t-11 28q-12 12-28.5 12T595-308L480-424Z"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.polaroid-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  touch-action: none;
}

.floating-polaroid {
  position: absolute;
  top: 0;
  left: 0;
  background: white;
  padding: 10px 10px 28px;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08);
  cursor: grab;
  user-select: none;
  will-change: transform;
  display: flex;
  align-items: flex-start;
}

.polaroid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
  pointer-events: none;
}

.polaroid-close {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.polaroid-close svg {
  width: 18px;
  height: 18px;
}

.floating-polaroid:hover .polaroid-close {
  opacity: 1;
}
</style>
