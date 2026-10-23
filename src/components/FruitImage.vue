<template>
  <span class="fruit-image" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <img v-if="source && failedSource !== source" :key="source" :src="source" alt="" :width="size" :height="size"
      loading="lazy" decoding="async" draggable="false" @error="onError" />
    <span v-else class="fruit-image-fallback">◌</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import artwork from '../data/fruit-artwork.json'

const props = withDefaults(defineProps<{ fruitId: number; size?: number }>(), { size: 36 })
const files: Readonly<Record<string, string>> = artwork
const source = computed(() => Number.isSafeInteger(props.fruitId) && files[String(props.fruitId)]
  ? import.meta.env.BASE_URL + 'fruit-icons/' + files[String(props.fruitId)] : '')
const failedSource = ref('')
function onError(event: Event) {
  const failed = (event.currentTarget as HTMLImageElement).getAttribute('src')
  if (failed === source.value) failedSource.value = failed
}
</script>

<style scoped>
.fruit-image { display: inline-grid; place-items: center; flex: none; vertical-align: middle; overflow: hidden; }
.fruit-image img { display: block; width: 100%; height: 100%; object-fit: contain; }
.fruit-image-fallback { font-size: 26px; line-height: 1; color: #df789e; }
</style>
