<template>
  <span class="welfare-nav-label" :aria-label="active ? '福利，有进行中的活动' : '福利'">
    福利<span v-if="active" class="welfare-new" aria-hidden="true">new</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<style scoped>
.welfare-nav-label { position: relative; display: inline-block; line-height: 20px; vertical-align: middle; }
.welfare-new {
  position: absolute;
  right: -7px;
  bottom: -10px;
  padding: 0 4px;
  border-radius: 4px;
  background: #e84242;
  color: #fff;
  font: italic 700 10px/13px Arial, sans-serif;
  white-space: nowrap;
  pointer-events: none;
  animation: welfare-new-bounce 1.8s cubic-bezier(.45, 0, .55, 1) infinite;
}
@keyframes welfare-new-bounce {
  0%, 30%, 60%, 100% { transform: translateY(0); }
  15% { transform: translateY(-3px); }
  45% { transform: translateY(-1.5px); }
}
@media (prefers-reduced-motion: reduce) {
  .welfare-new { animation: none; }
}
</style>
