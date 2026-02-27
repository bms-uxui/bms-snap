<script setup>
defineProps({
  showBorder: {
    type: Boolean,
    default: true
  },
  sticky: {
    type: Boolean,
    default: false
  },
  isScrolled: {
    type: Boolean,
    default: false
  },
  bgColor: {
    type: String,
    default: 'bg-white'
  }
})
</script>

<template>
  <div
    v-if="sticky"
    class="sticky top-0 z-[100] border-b border-transparent transition-all duration-200 w-full"
    :class="[bgColor, { 'border-border-color shadow-sm': isScrolled }]"
  >
    <header class="flex items-center justify-between py-4 px-6 md:px-16 lg:px-60 w-full h-20 relative bg-white">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <img src="../../assets/favicon.svg" alt="BMS Snap Logo" class="w-10 h-10 rounded-lg object-contain">
        <span class="text-xl font-google-sans">
          <span class="font-bold text-[var(--primary-brand)]">BMS</span><span class="font-normal text-primary-text"> Snap</span>
        </span>
      </div>

      <!-- Right Side Slot -->
      <slot name="actions" />
    </header>
  </div>
  <header
    v-else
    class="flex items-center justify-between py-4 px-6 md:px-16 lg:px-60 w-full h-20 relative bg-white"
    :class="[bgColor, { 'border-b border-border-color': showBorder }]"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3">
      <img src="../../assets/favicon.svg" alt="BMS Snap Logo" class="w-10 h-10 rounded-lg object-contain">
      <span class="text-xl font-google-sans">
        <span class="font-bold text-[var(--primary-brand)]">BMS</span><span class="font-normal text-primary-text"> Snap</span>
      </span>
    </div>

    <!-- Right Side Slot -->
    <slot name="actions" />
  </header>
</template>
