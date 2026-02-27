<script setup>
defineProps({
  currentStep: {
    type: Number,
    required: true
  },
  steps: {
    type: Array,
    required: true
    // Each step: { name: string, icon: string }
  }
})

const icons = {
  user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`,
  folder: `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>`,
  check: `<polyline points="20 6 9 17 4 12"></polyline>`
}
</script>

<template>
  <div class="flex items-center justify-between mb-8 pb-6">
    <template v-for="(step, index) in steps" :key="index">
      <div
        class="flex flex-col items-center gap-2"
        :data-step="index + 1"
      >
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
          :class="{
            'bg-[#194987] text-white': currentStep === index + 1,
            'bg-green-500 text-white': currentStep > index + 1,
            'bg-(--surface,#f1f5f9) text-gray-400': currentStep < index + 1
          }"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            v-html="icons[step.icon] || icons.check"
          />
        </div>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-0.5 mx-2 transition-colors duration-200"
        :class="currentStep > index + 1 ? 'bg-green-500' : 'bg-(--surface,#f1f5f9)'"
      />
    </template>
  </div>
</template>
