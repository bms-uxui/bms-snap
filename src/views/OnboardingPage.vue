<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'
import { useImages } from '../composables/useImages'
import { useTaiga } from '../composables/useTaiga'
import { useAI } from '../composables/useAI'
import BaseHeader from '../components/ui/BaseHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import { IconPerson, IconBadge, IconLocation, IconFolderOpen } from '../components/icons'
import IconInfo from '../components/icons/IconInfo.vue'

const router = useRouter()
const store = useAppStore()
const { showToast } = useToast()
const { handleProfileImage } = useImages()

const currentStep = ref(1)

// Taiga
const { login: taigaLogin, getUserProjects, isAuthenticated: isTaigaAuth, getCredentials } = useTaiga()
const { getProxyUrl, setProxyUrl } = useAI()

const defaultProxyUrl = import.meta.env.VITE_PROXY_URL || getProxyUrl() || ''
const taigaBaseUrl = ref(import.meta.env.VITE_TAIGA_BASE_URL || '')
const taigaUsername = ref('')
const taigaPassword = ref('')
const loginState = ref('idle') // 'idle' | 'loading'
const loginError = ref('')

// Form data (pre-filled from Taiga after login)
const name = ref('')
const role = ref('')
const workplace = ref('')
const projectLabel = ref('')
const profileImage = ref('')

// Projects
const fetchedProjects = ref([])
const selectedProjectIds = ref(new Set())

const tabs = [
  { id: 1, name: 'เข้าสู่ระบบ' },
  { id: 2, name: 'ตั้งค่า' },
  { id: 3, name: 'เสร็จสิ้น' }
]

const attempted = ref(false)
const loggedIn = ref(false)

const canProceedStep2 = computed(() => {
  return workplace.value.trim() && projectLabel.value.trim()
})

// Computed projects from Taiga selection
const projects = computed(() => {
  const creds = getCredentials()
  const baseUrl = creds?.baseUrl || taigaBaseUrl.value.trim().replace(/\/+$/, '')
  return fetchedProjects.value
    .filter(p => selectedProjectIds.value.has(p.id))
    .map((p, index) => ({
      id: index + 1,
      name: p.name,
      taigaUrl: `${baseUrl}/project/${p.slug}/`,
      template: store.DEFAULT_TEMPLATE,
    }))
})

function goToStep(step) {
  if (step > currentStep.value) {
    if (currentStep.value === 1 && !loggedIn.value) {
      showToast('กรุณาเข้าสู่ระบบ Taiga ก่อน')
      return
    }
    if (currentStep.value === 2) {
      attempted.value = true
      if (!canProceedStep2.value) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วน')
        return
      }
    }
  }
  currentStep.value = step
}

function skipToComplete() {
  if (!loggedIn.value) {
    showToast('กรุณาเข้าสู่ระบบ Taiga ก่อน')
    return
  }
  goToStep(3)
}

async function handleTaigaLogin() {
  const proxy = defaultProxyUrl
  const base = taigaBaseUrl.value.trim()
  const user = taigaUsername.value.trim()
  const pass = taigaPassword.value

  if (!proxy) {
    loginError.value = 'ยังไม่ได้ตั้งค่า Proxy URL'
    return
  }
  if (!user || !pass) {
    loginError.value = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
    return
  }

  setProxyUrl(proxy)
  loginState.value = 'loading'
  loginError.value = ''

  const result = await taigaLogin(proxy, base, user, pass)
  if (!result.success) {
    loginState.value = 'idle'
    loginError.value = result.error || 'เชื่อมต่อไม่สำเร็จ'
    return
  }

  // Auto-fill name from Taiga
  name.value = result.fullName || ''

  // Fetch projects
  try {
    const projectsData = await getUserProjects(proxy)
    fetchedProjects.value = projectsData || []
    selectedProjectIds.value = new Set()
  } catch (err) {
    console.error('Failed to fetch projects:', err)
  }

  loggedIn.value = true
  loginState.value = 'idle'
  currentStep.value = 2
}

// Auto-login if already authenticated
watch(currentStep, (step) => {
  if (step === 1 && isTaigaAuth() && !loggedIn.value) {
    const creds = getCredentials()
    if (creds) {
      name.value = creds.fullName || ''
      taigaBaseUrl.value = creds.baseUrl
      loggedIn.value = true

      const proxy = defaultProxyUrl || getProxyUrl()
      if (proxy) {
        loginState.value = 'loading'
        getUserProjects(proxy).then(data => {
          fetchedProjects.value = data || []
          loginState.value = 'idle'
          currentStep.value = 2
        }).catch(() => {
          loginState.value = 'idle'
          currentStep.value = 2
        })
      } else {
        currentStep.value = 2
      }
    }
  }
}, { immediate: true })

async function onProfileImageChange(event) {
  const file = event.target.files[0]
  if (!file) return
  const result = await handleProfileImage(file)
  if (result.success) {
    profileImage.value = result.data
  } else {
    showToast(result.message)
  }
}

function toggleProject(taigaId) {
  const s = new Set(selectedProjectIds.value)
  if (s.has(taigaId)) {
    s.delete(taigaId)
  } else {
    s.add(taigaId)
  }
  selectedProjectIds.value = s
}

function selectAllProjects() {
  selectedProjectIds.value = new Set(fetchedProjects.value.map(p => p.id))
}

function deselectAllProjects() {
  selectedProjectIds.value = new Set()
}

function completeOnboarding() {
  store.completeOnboarding(
    {
      name: name.value.trim(),
      role: role.value.trim(),
      workplace: workplace.value.trim(),
      projectLabel: projectLabel.value.trim(),
      profileImage: profileImage.value
    },
    projects.value
  )
  router.push('/app')
  showToast('ยินดีต้อนรับสู่ HurryUp! 🎉')
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Header -->
    <BaseHeader :show-border="false">
      <template #actions>
        <BaseButton size="sm" @click="skipToComplete">
          เริ่มต้นใช้งาน
        </BaseButton>
      </template>
    </BaseHeader>

    <!-- Content -->
    <div class="flex-1 flex justify-center items-start px-8 pt-6 pb-12">
      <div class="w-full max-w-[640px] animate-[slideIn_0.5s_ease-out_0.1s_forwards] opacity-0 translate-y-[30px]">
        <!-- Tabs -->
        <div role="tablist" class="tabs tabs-lift">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            role="tab"
            :class="['tab', currentStep === tab.id ? 'tab-active' : '']"
            @click="goToStep(tab.id)"
          >
            {{ tab.name }}
          </button>
        </div>

        <!-- Tab Content -->
        <div class="bg-white rounded-b-[20px] rounded-tr-[20px] border border-[var(--border-color)] -mt-px flex flex-col h-[70vh] relative overflow-clip">

          <!-- Step 1: Taiga Login -->
          <div v-show="currentStep === 1" class="flex flex-col flex-1 min-h-0">
            <div class="flex-1 overflow-y-auto p-10 pb-24 space-y-6">
              <div>
                <h2 class="text-2xl font-bold text-[var(--primary-text)]">เข้าสู่ระบบ Taiga</h2>
                <p class="text-[var(--secondary-text)]">ใช้บัญชี Taiga เพื่อดึงข้อมูลอัตโนมัติ</p>
              </div>

              <!-- Already logged in -->
              <div v-if="loggedIn" class="space-y-4">
                <div class="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span class="text-sm text-green-800">เชื่อมต่อสำเร็จ — {{ name }}</span>
                </div>
              </div>

              <!-- Login form -->
              <div v-else class="space-y-4">
                <div class="p-6 rounded-2xl border border-[var(--border-color)] bg-white space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-[var(--primary-text)] mb-2">ชื่อผู้ใช้</label>
                    <BaseInput v-model="taigaUsername" placeholder="username" :disabled="loginState === 'loading'">
                      <template #icon><IconPerson :size="16" color="var(--secondary-text)" /></template>
                    </BaseInput>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-[var(--primary-text)] mb-2">รหัสผ่าน</label>
                    <BaseInput v-model="taigaPassword" type="password" placeholder="password" :disabled="loginState === 'loading'" @keydown.enter="handleTaigaLogin">
                      <template #icon><IconBadge :size="16" color="var(--secondary-text)" /></template>
                    </BaseInput>
                  </div>
                  <p v-if="loginError" class="text-red-500 text-sm">{{ loginError }}</p>
                  <BaseButton variant="primary" :disabled="loginState === 'loading'" @click="handleTaigaLogin">
                    {{ loginState === 'loading' ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบ' }}
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Setup (Personal Info + Projects) -->
          <div v-show="currentStep === 2" class="flex flex-col flex-1 min-h-0">
            <div class="flex-1 overflow-y-auto p-10 pb-24 space-y-6">
              <div>
                <h2 class="text-2xl font-bold text-[var(--primary-text)]">ตั้งค่าโปรไฟล์</h2>
                <p class="text-[var(--secondary-text)]">ตรวจสอบข้อมูลและเลือกโครงการ</p>
              </div>

              <!-- Profile Image -->
              <div class="flex justify-center">
                <label class="relative cursor-pointer group">
                  <div class="w-20 h-20 rounded-full bg-[var(--surface)] flex items-center justify-center overflow-hidden transition-colors">
                    <img v-if="profileImage" :src="profileImage" alt="Profile" class="w-full h-full object-cover">
                    <IconPerson v-else :size="24" color="var(--secondary-text)" />
                  </div>
                  <div class="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--primary-brand)] flex items-center justify-center border-3 border-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <input type="file" accept="image/*" class="hidden" @change="onProfileImageChange">
                </label>
              </div>

              <!-- Personal Info -->
              <div class="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label class="block text-sm font-medium text-[var(--primary-text)] mb-2">ชื่อ-นามสกุล</label>
                  <BaseInput v-model="name" placeholder="ชื่อ-นามสกุล">
                    <template #icon><IconPerson :size="16" color="var(--secondary-text)" /></template>
                  </BaseInput>
                </div>
                <div>
                  <label class="block text-sm font-medium text-[var(--primary-text)] mb-2">ตำแหน่ง</label>
                  <BaseInput v-model="role" placeholder="เช่น เจ้าหน้าที่พัฒนา">
                    <template #icon><IconBadge :size="16" color="var(--secondary-text)" /></template>
                  </BaseInput>
                </div>
                <div>
                  <label class="block text-sm font-medium text-[var(--primary-text)] mb-2">สถานที่ปฏิบัติงาน</label>
                  <BaseInput v-model="workplace" placeholder="เช่น โรงพยาบาล" :error="attempted && !workplace.trim()">
                    <template #icon><IconLocation :size="16" color="var(--secondary-text)" /></template>
                  </BaseInput>
                </div>
                <div>
                  <label class="flex items-center gap-1 text-sm font-medium text-[var(--primary-text)] mb-2">
                    ชื่อโครงการในเทมเพลต
                    <IconInfo size="16" color="var(--primary-text)" />
                  </label>
                  <BaseInput v-model="projectLabel" placeholder="ชื่อโครงการ" :error="attempted && !projectLabel.trim()">
                    <template #icon><IconFolderOpen :size="16" color="var(--secondary-text)" /></template>
                  </BaseInput>
                </div>
              </div>

              <!-- Divider -->
              <div class="border-t border-[var(--border-color)]"></div>

              <!-- Project Selection -->
              <div>
                <h3 class="text-lg font-bold text-[var(--primary-text)] mb-1">เลือกโครงการ</h3>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm text-[var(--secondary-text)]">
                    เลือกแล้ว {{ selectedProjectIds.size }} / {{ fetchedProjects.length }} โครงการ
                  </span>
                  <div class="flex gap-2">
                    <button class="text-sm text-[var(--primary-brand)] hover:underline" @click="selectAllProjects">เลือกทั้งหมด</button>
                    <button class="text-sm text-[var(--secondary-text)] hover:underline" @click="deselectAllProjects">ล้างทั้งหมด</button>
                  </div>
                </div>

                <div v-if="fetchedProjects.length > 0" class="space-y-2 max-h-[30vh] overflow-y-auto">
                  <label
                    v-for="p in fetchedProjects"
                    :key="p.id"
                    class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
                    :class="selectedProjectIds.has(p.id)
                      ? 'border-[var(--primary-brand)] bg-blue-50'
                      : 'border-[var(--border-color)] bg-white hover:bg-gray-50'"
                  >
                    <input
                      type="checkbox"
                      class="checkbox checkbox-primary checkbox-sm"
                      :checked="selectedProjectIds.has(p.id)"
                      @change="toggleProject(p.id)"
                    >
                    <div class="min-w-0 flex-1">
                      <div class="font-bold text-[var(--primary-text)]">{{ p.name }}</div>
                      <div class="text-sm text-[var(--secondary-text)] truncate">{{ p.description || p.slug }}</div>
                    </div>
                  </label>
                </div>

                <div v-else class="p-6 bg-[var(--surface)] rounded-xl text-center text-[var(--secondary-text)]">
                  ไม่พบโครงการที่คุณเป็นสมาชิก
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Complete -->
          <div v-show="currentStep === 3" class="flex-1 overflow-y-auto p-10 pb-24">
            <div class="text-center py-4">
              <div class="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#194987" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">พร้อมใช้งานแล้ว!</h2>
              <p class="text-gray-500 mb-6">ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว</p>

              <div class="bg-gray-50 rounded-xl p-4">
                <div class="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img v-if="profileImage" :src="profileImage" alt="Profile" class="w-full h-full object-cover">
                    <IconPerson v-else :size="28" />
                  </div>
                  <div class="text-left">
                    <div class="font-semibold text-gray-900">{{ name || '-' }}</div>
                    <div class="text-sm text-gray-500">{{ role || '-' }}</div>
                  </div>
                </div>
                <div class="pt-4 flex justify-center">
                  <div class="text-center">
                    <span class="block text-2xl font-bold text-[#194987]">{{ projects.length }}</span>
                    <span class="text-sm text-gray-500">โครงการ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Shared Footer -->
          <div class="absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/50 backdrop-blur-xl border-t border-[var(--border-color)] rounded-b-[20px] z-20">
            <div class="flex justify-between items-center">
              <BaseButton
                :variant="currentStep === 1 ? 'secondary' : 'ghost'"
                @click="currentStep === 1 ? goBack() : goToStep(currentStep - 1)"
              >
                ย้อนกลับ
              </BaseButton>

              <BaseButton
                v-if="currentStep > 1"
                variant="primary"
                @click="currentStep < 3 ? goToStep(currentStep + 1) : completeOnboarding()"
              >
                {{ currentStep < 3 ? 'ถัดไป' : 'เริ่มใช้งาน' }}
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes slideIn {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Override DaisyUI input focus styles */
.input:focus,
.input:focus-within {
  border-color: var(--primary-brand) !important;
  outline: 2px solid var(--primary-brand) !important;
  outline-offset: 2px !important;
}

/* Custom tabs-lift styles */
.tabs-lift {
  --tab-border-color: var(--border-color);
  --tab-bg: var(--surface);
  --tab-radius: 0.5rem;
  border-bottom: none !important;
  box-shadow: none !important;
}

.tabs-lift .tab {
  --tab-border-color: var(--border-color);
  border-color: var(--border-color) var(--border-color) transparent var(--border-color) !important;
  background-color: white;
  color: var(--secondary-text);
  font-weight: 500;
}

.tabs-lift .tab-active {
  background-color: white !important;
  color: var(--primary-brand) !important;
  border-color: var(--border-color) var(--border-color) transparent var(--border-color) !important;
}

.tabs-lift .tab::before,
.tabs-lift .tab::after {
  display: none !important;
}

.tabs-lift .tab:hover:not(.tab-active) {
  background-color: white;
  color: var(--primary-text);
}
</style>
