<template>
  <div class="transfer-modes" role="tablist" aria-label="分享或导入方式">
    <Button :type="value === 'share' ? 'primary' : 'default'" :disabled="disabled" role="tab" :aria-selected="value === 'share'" @click="$emit('change', 'share')">不同网页账号分享/导入</Button>
    <Button :type="value === 'same' ? 'primary' : 'default'" :disabled="disabled" role="tab" :aria-selected="value === 'same'" @click="$emit('change', 'same')">同网页账号导入</Button>
  </div>
</template>
<script setup lang="ts">
import { Button } from 'ant-design-vue'
defineProps<{ value: 'share' | 'same'; disabled?: boolean }>()
defineEmits<{ change: [mode: 'share' | 'same'] }>()
</script>
<style scoped>
.transfer-modes { display: flex; gap: 8px; margin-bottom: 16px; }
.transfer-modes > button { flex: 1; min-width: 0; height: auto; min-height: 36px; padding: 6px 8px; white-space: normal; line-height: 1.5; }
@media (max-width: 380px) { .transfer-modes { gap: 4px; } .transfer-modes > button { font-size: 12px; padding-inline: 4px; } }
</style>
