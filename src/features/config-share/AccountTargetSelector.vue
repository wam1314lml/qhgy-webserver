<template>
  <div class="account-target-selector">
    <strong>需要覆盖的游戏账号</strong>
    <div class="account-target-actions">
      <Button size="small" :disabled="unavailable || !options.length" @click="selectAll">全选所有账号</Button>
      <Button size="small" :disabled="unavailable || !pageAccounts.length" @click="selectPage">全选本页</Button>
      <Button size="small" :disabled="unavailable || !value.length" @click="emit('update:value', [])">清空</Button>
    </div>
    <Input v-model:value="search" :disabled="unavailable" allow-clear placeholder="搜索全部账号" aria-label="搜索游戏账号" />
    <div class="account-target-list" role="group" aria-label="需要覆盖的游戏账号" :aria-busy="loading">
      <Checkbox v-for="account in pageAccounts" :key="account.value" :checked="selected.has(account.value)" :disabled="unavailable" @change="toggleAccount(account.value)">{{ account.label }}</Checkbox>
      <p v-if="!pageAccounts.length" class="account-target-empty">{{ loading ? '正在加载账号…' : '没有匹配的游戏账号' }}</p>
    </div>
    <div class="account-target-pagination">
      <Button size="small" :disabled="unavailable || page <= 1" @click="page--">上一页</Button>
      <span>第 {{ page }} / {{ totalPages }} 页</span>
      <Button size="small" :disabled="unavailable || page >= totalPages" @click="page++">下一页</Button>
    </div>
    <p class="account-target-caption">{{ search.trim() ? `匹配 ${filteredAccounts.length} 个账号，` : '' }}每页最多 50 个账号，翻页和搜索保留已选项。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Checkbox, Input } from 'ant-design-vue'
import type { ImportAccount } from './accountImport'

const props = defineProps<{ options: ImportAccount[]; value: number[]; disabled?: boolean; loading?: boolean }>()
const emit = defineEmits<{ 'update:value': [value: number[]] }>()
const pageSize = 50
const page = ref(1)
const search = ref('')
const unavailable = computed(() => props.disabled || props.loading)
const selected = computed(() => new Set(props.value))
const filteredAccounts = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  return keyword ? props.options.filter(account => account.label.toLocaleLowerCase().includes(keyword)) : props.options
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredAccounts.value.length / pageSize)))
const pageAccounts = computed(() => filteredAccounts.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch(search, () => { page.value = 1 }, { flush: 'sync' })
watch(() => props.options, () => {
  search.value = ''
  const selectedIndex = props.options.findIndex(account => selected.value.has(account.value))
  page.value = selectedIndex < 0 ? 1 : Math.floor(selectedIndex / pageSize) + 1
}, { immediate: true })
watch(totalPages, count => { page.value = Math.min(page.value, count) })

function selectAll() {
  if (!unavailable.value) emit('update:value', props.options.map(account => account.value))
}
function selectPage() {
  if (!unavailable.value) emit('update:value', [...new Set([...props.value, ...pageAccounts.value.map(account => account.value)])])
}
function toggleAccount(id: number) {
  if (unavailable.value) return
  emit('update:value', selected.value.has(id) ? props.value.filter(value => value !== id) : [...props.value, id])
}
</script>

<style scoped>
.account-target-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.account-target-list { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto; margin-top: 8px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 6px; }
.account-target-list :deep(.ant-checkbox-wrapper) { display: flex; align-items: flex-start; flex-shrink: 0; margin-inline-start: 0; padding: 6px 0; overflow-wrap: anywhere; }
.account-target-list :deep(.ant-checkbox) { flex-shrink: 0; }
.account-target-list :deep(.ant-checkbox + span) { min-width: 0; }
.account-target-empty { margin: 8px 0; color: #667085; }
.account-target-pagination { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px; margin-top: 10px; }
.account-target-caption { margin: 8px 0 0; color: #667085; font-size: 13px; line-height: 1.6; }
</style>
