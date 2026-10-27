<template>
  <div v-if="source && !failed" class="activity-artwork" :class="{ 'full-rally': isDefault && type === 'guild_rally', 'custom-artwork': !isDefault }">
    <img :src="source" :alt="type === 'guild_rally' ? '公会集结活动背景' : '每日签到活动背景'" :class="{ 'theme-pair': isDefault }" decoding="async" @error="failed = true" />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ActivityType } from './types'
const props = defineProps<{ type: ActivityType; backgroundUrl?: string | null }>()
const isDefault = computed(() => props.backgroundUrl == null)
const source = computed(() => props.backgroundUrl ?? '')
const failed = ref(false)
watch(source, () => { failed.value = false })
</script>
<style scoped>
.activity-artwork { position: relative; overflow: hidden; aspect-ratio: 2.4; background: #e6ece7; }
.activity-artwork img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; }
/* 集结完整展示左半幅寻道海报；签到仅用顶部宣传区，实际奖励由日历展示。 */
.activity-artwork.full-rally { aspect-ratio: 1; }
.activity-artwork img.theme-pair { position: absolute; left: 0; top: 0; width: 200%; max-width: none; height: auto; }
.activity-artwork.custom-artwork { aspect-ratio: auto; }
.activity-artwork.custom-artwork img { height: auto; }
</style>
