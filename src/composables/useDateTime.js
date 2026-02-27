import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useDateTime() {
  const now = ref(new Date())
  let interval = null

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const formattedDateTime = computed(() => {
    const day = now.value.getDate()
    const month = thaiMonths[now.value.getMonth()]
    const year = now.value.getFullYear() + 543
    const hours = now.value.getHours().toString().padStart(2, '0')
    const minutes = now.value.getMinutes().toString().padStart(2, '0')
    const seconds = now.value.getSeconds().toString().padStart(2, '0')
    return `${day} ${month} ${year} - ${hours}:${minutes}:${seconds} น.`
  })

  const greeting = computed(() => {
    const hour = now.value.getHours()
    if (hour < 12) return 'สวัสดีตอนเช้า'
    if (hour < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  })

  const workdayProgress = computed(() => {
    const currentMinutes = now.value.getHours() * 60 + now.value.getMinutes()
    const startMinutes = 8 * 60 + 30  // 8:30
    const endMinutes = 17 * 60 + 30   // 17:30
    const totalWorkMinutes = endMinutes - startMinutes

    let percent = 0
    let message = ''

    if (currentMinutes < startMinutes) {
      percent = 0
      message = 'เตรียมตัว! 💪'
    } else if (currentMinutes >= endMinutes) {
      percent = 100
      message = 'เลิกงานแล้ว! 🎉'
    } else {
      const elapsedMinutes = currentMinutes - startMinutes
      percent = Math.round((elapsedMinutes / totalWorkMinutes) * 100)

      if (percent < 25) message = 'เริ่มต้นวันใหม่! ☀️'
      else if (percent < 50) message = 'สู้ๆ นะ! 💪'
      else if (percent < 75) message = 'ผ่านครึ่งทางแล้ว! 🌟'
      else if (percent < 90) message = 'ใกล้ถึงแล้ว! 🚀'
      else message = 'อีกนิดเดียว! 🏁'
    }

    return { percent, message }
  })

  const todayFormatted = computed(() => {
    return now.value.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  })

  const todayShort = computed(() => {
    const day = now.value.getDate()
    const month = now.value.getMonth() + 1
    const year = now.value.getFullYear() + 543
    return `${day}/${month}/${year}`
  })

  function formatThaiDate(date) {
    const d = new Date(date)
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`
  }

  function formatThaiDateShort(date) {
    const d = new Date(date)
    return `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`
  }

  onMounted(() => {
    interval = setInterval(() => {
      now.value = new Date()
    }, 1000)
  })

  onUnmounted(() => {
    if (interval) {
      clearInterval(interval)
    }
  })

  return {
    now,
    formattedDateTime,
    greeting,
    workdayProgress,
    todayFormatted,
    todayShort,
    thaiMonths,
    thaiMonthsShort,
    formatThaiDate,
    formatThaiDateShort
  }
}
