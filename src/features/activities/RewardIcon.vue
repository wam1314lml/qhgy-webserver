<template>
  <svg class="reward-icon" :data-reward-type="type" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <template v-if="type === 'points'">
      <ellipse cx="29" cy="35" rx="15" ry="7" fill="#BD7925" />
      <ellipse cx="29" cy="31" rx="15" ry="7" fill="#F3C865" stroke="#BD7925" stroke-width="2" />
      <circle cx="20" cy="20" r="16" fill="#F8D77B" stroke="#B77A26" stroke-width="2" />
      <circle cx="20" cy="20" r="12" fill="#FFEAA9" stroke="#D6A346" stroke-width="1.5" />
      <path d="m14 13 6 7 6-7M20 20v10M14 21h12M14 25h12" stroke="#A56B1F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else-if="type === 'time'">
      <path d="M18 5h12M24 5v5M36 12l4-4" stroke="#3C7177" stroke-width="4" stroke-linecap="round" />
      <circle cx="24" cy="28" r="18" fill="#D9F0E8" stroke="#3C7177" stroke-width="2" />
      <circle cx="24" cy="28" r="13" fill="#F6FFFA" stroke="#9DCBBD" />
      <path d="M24 18v10l7 4" stroke="#3C7177" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="24" cy="28" r="2" fill="#D4A954" />
    </template>
    <template v-else>
      <path d="M7 7h30v33H7z" fill="#B6BDDC" stroke="#65769C" stroke-width="2" transform="rotate(-10 22 24)" />
      <path d="M9 13h34v10a4 4 0 0 0 0 8v10H9V31a4 4 0 0 0 0-8z" fill="#E9ECFA" stroke="#65769C" stroke-width="2" />
      <path d="M33 16v3m0 5v3m0 5v5" stroke="#9AA8C8" stroke-width="2" stroke-linecap="round" />
      <path d="m22 19 2.5 5.1 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="#C69F54" />
    </template>
  </svg>
</template>
<script setup lang="ts">
import type { RewardType } from './types'
defineProps<{ type: RewardType }>()
</script>
<style scoped>
.reward-icon { display: inline-block; width: 32px; height: 32px; flex-shrink: 0; vertical-align: middle; }
</style>
