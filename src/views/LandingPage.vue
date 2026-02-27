<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseHeader from '../components/ui/BaseHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import ImportModal from '../components/ImportModal.vue'

const router = useRouter()
const showImportModal = ref(false)

function navigateToOnboarding() {
  router.push('/onboarding')
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <BaseHeader :show-border="false">
      <template #actions>
        <BaseButton size="sm" @click="navigateToOnboarding">
          เริ่มต้นใช้งาน
        </BaseButton>
      </template>
    </BaseHeader>

    <!-- Hero Section -->
    <main class="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 px-8 md:px-16 lg:px-24 py-16 lg:py-24 max-w-7xl mx-auto">
      <!-- Left - Illustration -->
      <div class="w-full max-w-md lg:max-w-lg flex-shrink-0">
        <img src="../assets/landing-hero.svg" alt="Landing Illustration" class="w-full h-auto">
      </div>

      <!-- Right - Content -->
      <div class="flex-1 max-w-lg text-center lg:text-left pb-24">
        <h1 class="text-4xl lg:text-5xl font-bold text-[#194987] leading-tight mb-6">
          รายงานประจำวัน<br>ง่ายๆ แค่ไม่กี่คลิก
        </h1>
        <p class="text-base lg:text-lg text-gray-500 leading-relaxed mb-8">
          สร้างรายงานการทำงานประจำวันได้อย่างรวดเร็ว เลือกโครงการ เพิ่มรายละเอียด แล้วคัดลอกไปโพสต์ในบล็อกได้ทันที
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <BaseButton size="lg" @click="navigateToOnboarding">
            เริ่มต้นใช้งาน
          </BaseButton>
          <BaseButton variant="outline" size="lg" @click="showImportModal = true">
            มีบัญชีอยู่แล้ว
          </BaseButton>
        </div>
      </div>
    </main>

    <!-- Import Modal -->
    <ImportModal :show="showImportModal" @close="showImportModal = false" />
  </div>
</template>
