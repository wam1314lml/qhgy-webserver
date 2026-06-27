<template>
  <div class="free-style-page">
    <main class="free-style-card">
      <h2 class="free-style-title">🌲 种花设置</h2>

      <div class="free-style-plan-row">
        <CustomSelect
          v-model:value="config.plant.flower.freeStyleTemplate"
          :options="freeStyleTemplateOptions"
          class="plan-select"
        />
        <Input
          :value="activeFreeStylePlan?.name"
          class="plan-name-input"
          placeholder="方案名称"
          @update:value="renameFreeStyleTemplate"
        />
      </div>

      <CustomSelect
        v-model:value="selectedFlowerId"
        show-search
        placeholder="输入花名搜索..."
        :options="selectedFlowerOptions"
        class="flower-search"
      />

      <div class="action-row">
        <button class="save-btn" type="button" :disabled="loading" @click="saveConfig">
          保存
        </button>
        <button class="clear-btn" type="button" :disabled="loading" @click="clearCurrentPlan">
          清空
        </button>
      </div>

      <div class="lands-layout">
        <div class="land-panel">
          <button
            v-for="land in leftLandViews"
            :key="land.id"
            type="button"
            class="land-cell"
            :class="{ active: land.flowerId }"
            @click="setLandFlower(land.id)"
          >
            <span v-if="land.flowerName" class="land-flower">{{ land.flowerName }}</span>
            <span v-else class="land-index">{{ land.displayIndex }}</span>
          </button>
        </div>

        <div class="land-panel">
          <button
            v-for="land in rightLandViews"
            :key="land.id"
            type="button"
            class="land-cell"
            :class="{ active: land.flowerId }"
            @click="setLandFlower(land.id)"
          >
            <span v-if="land.flowerName" class="land-flower">{{ land.flowerName }}</span>
            <span v-else class="land-index">{{ land.displayIndex }}</span>
          </button>
        </div>
      </div>

      <button class="home-btn" type="button" @click="goBack">
        ← 返回主页
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input, message } from 'ant-design-vue'
import axios from '../utils/axios'
import CustomSelect from '../components/CustomSelect.vue'
import { createDefaultGameConfig } from './game-config/defaultConfig'
import { getFlowerPickerOptions } from './game-config/options'
import { deepMerge } from './game-config/utils'
import { normalizeGameConfigSelects } from './game-config/normalizeConfigSelects'
import type { GameConfig } from './game-config/types'

const route = useRoute()
const router = useRouter()
const accountId = computed(() => Number(route.params.accountId))
const config = ref<GameConfig>(createDefaultGameConfig())
const loading = ref(false)
const selectedFlowerId = ref<string | number>('23001')

type FreeStylePlan = GameConfig['plant']['flower']['freeStyleList'][number]
type LandView = {
  id: string
  displayIndex: string
  flowerId?: string | number
  flowerName: string
}

const selectedFlowerOptions = computed(() =>
  getFlowerPickerOptions(selectedFlowerId.value ? [selectedFlowerId.value] : []),
)

const flowerNameMap = computed(() => {
  const map = new Map<string, string>()
  getFlowerPickerOptions().forEach((item) => {
    map.set(String(item.value), item.label)
  })
  return map
})

const freeStyleTemplateOptions = computed(() =>
  config.value.plant.flower.freeStyleList.map((item) => ({
    value: item.name,
    label: item.name,
  })),
)

const activeFreeStylePlan = computed<FreeStylePlan | undefined>(() => {
  const flower = config.value.plant.flower
  return flower.freeStyleList.find((item) => item.name === flower.freeStyleTemplate)
})

const makeLandIds = (start: number, end: number) => {
  const rows: string[] = []
  for (let rowStart = end - 3; rowStart >= start; rowStart -= 4) {
    for (let offset = 0; offset < 4; offset++) {
      rows.push(String(1000 + rowStart + offset))
    }
  }
  return rows
}

// 视觉顺序按图：左边显示 33-64，右边显示 01-32；每组从上到下按 4 个一行倒序。
const leftLandIds = makeLandIds(33, 64)
const rightLandIds = makeLandIds(1, 32)

function buildLandViews(ids: string[]): LandView[] {
  const lands = activeFreeStylePlan.value?.lands ?? {}
  const nameMap = flowerNameMap.value
  return ids.map((id) => {
    const displayNumber = Number(id) - 1000
    const flowerId = lands[id]
    return {
      id,
      displayIndex: String(displayNumber).padStart(2, '0'),
      flowerId,
      flowerName: flowerId ? nameMap.get(String(flowerId)) || String(flowerId) : '',
    }
  })
}

const leftLandViews = computed(() => buildLandViews(leftLandIds))
const rightLandViews = computed(() => buildLandViews(rightLandIds))

function renameFreeStyleTemplate(value: string) {
  const plan = activeFreeStylePlan.value
  if (!plan) return

  const nextName = value.trim()
  if (!nextName) return

  const duplicate = config.value.plant.flower.freeStyleList.some(
    (item) => item !== plan && item.name === nextName,
  )
  if (duplicate) {
    message.warning('方案名称不能重复')
    return
  }

  plan.name = nextName
  config.value.plant.flower.freeStyleTemplate = nextName
}

function setLandFlower(landId: string) {
  const plan = activeFreeStylePlan.value
  if (!plan || !selectedFlowerId.value) return

  const flowerId = Number(selectedFlowerId.value)
  plan.lands[landId] = Number.isFinite(flowerId) ? flowerId : selectedFlowerId.value
}

function clearCurrentPlan() {
  const plan = activeFreeStylePlan.value
  if (!plan) return
  plan.lands = {}
}

async function fetchConfig() {
  if (!accountId.value) return

  loading.value = true
  try {
    const response = await axios.get(`/api/game-accounts/${accountId.value}/setting`)
    if (response.status === 200 && response.data && !response.data['未找到账号']) {
      const mergedConfig = deepMerge(createDefaultGameConfig(), response.data.data)
      normalizeGameConfigSelects(mergedConfig)
      config.value = mergedConfig
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    message.error('获取配置失败')
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  if (!accountId.value) return

  loading.value = true
  try {
    config.value.plant.flower.plantingMode = 'freeStyle'
    normalizeGameConfigSelects(config.value)
    const response = await axios.put(`/api/game-accounts/${accountId.value}/setting`, config.value)
    if (response.data?.success) {
      message.success('保存成功')
    } else {
      message.error(response.data?.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    message.error('保存失败')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push(`/game-config/${accountId.value}`)
}

onMounted(fetchConfig)
</script>

<style lang="scss" scoped>
.free-style-page {
  min-height: 100vh;
  padding: 22px 16px;
  background:
    radial-gradient(circle, rgba(120, 170, 140, 0.08) 4px, transparent 5px) 0 0 / 28px 28px,
    linear-gradient(180deg, #f8fffb 0%, #f5fbf8 100%);
}

.free-style-card {
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 22px 24px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(31, 41, 55, 0.08);
}

.free-style-title {
  margin: 0 0 18px;
  color: #5f8a74;
  font-size: 18px;
  font-weight: 700;
}

.free-style-plan-row {
  display: grid;
  grid-template-columns: 160px minmax(150px, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.plan-select,
.plan-name-input,
.flower-search {
  width: 100%;
}

.flower-search {
  margin-bottom: 14px;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 24px;
}

.save-btn,
.clear-btn,
.home-btn {
  height: 38px;
  border: none;
  border-radius: 20px;
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
}

.save-btn {
  background: #6f967f;
}

.clear-btn {
  background: #f43f46;
}

.save-btn:disabled,
.clear-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lands-layout {
  display: flex;
  justify-content: center;
  gap: 26px;
  margin: 0 auto 28px;
}

.land-panel {
  display: grid;
  grid-template-columns: repeat(4, 44px);
  gap: 5px;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.1);
}

.land-cell {
  width: 44px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #f9fafb;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.15s;
}

.land-cell:hover {
  border-color: #6f967f;
}

.land-cell.active {
  border-color: transparent;
  background: #a8d463;
  color: #17375e;
}

.land-index,
.land-flower {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-btn {
  display: block;
  min-width: 132px;
  margin: 0 auto;
  padding: 0 22px;
  background: #e5e7eb;
  color: #1f2937;
}

@media (max-width: 640px) {
  .free-style-card {
    padding: 18px 16px;
  }

  .free-style-plan-row {
    grid-template-columns: 1fr 1fr;
  }

  .lands-layout {
    align-items: center;
    flex-direction: column;
    gap: 18px;
  }

  .land-panel {
    grid-template-columns: repeat(4, 1fr);
    width: min(100%, 220px);
  }

  .land-cell {
    width: 100%;
    height: 46px;
  }
}
</style>
