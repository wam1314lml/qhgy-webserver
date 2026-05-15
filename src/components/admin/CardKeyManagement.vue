<template>
  <div class="card-key-management p-6 bg-gray-50 min-h-full">
    <!-- 统计概览 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <a-card size="small" class="text-center">
        <div class="text-2xl font-bold text-blue-600">{{ stats.total }}</div>
        <div class="text-gray-500 text-sm mt-1">总卡密数</div>
      </a-card>
      <a-card size="small" class="text-center">
        <div class="text-2xl font-bold text-green-600">{{ stats.unused_count }}</div>
        <div class="text-gray-500 text-sm mt-1">未使用</div>
      </a-card>
      <a-card size="small" class="text-center">
        <div class="text-2xl font-bold text-orange-500">{{ stats.used_count }}</div>
        <div class="text-gray-500 text-sm mt-1">已兑换</div>
      </a-card>
      <a-card size="small" class="text-center">
        <div class="text-2xl font-bold text-purple-600">¥{{ formatNum(stats.used_face_value) }}</div>
        <div class="text-gray-500 text-sm mt-1">已兑换面值</div>
      </a-card>
    </div>

    <!-- 操作栏 -->
    <a-card class="mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <a-select v-model:value="filterStatus" placeholder="状态筛选" style="width:120px" allowClear @change="loadList(1)">
          <a-select-option value="unused">未使用</a-select-option>
          <a-select-option value="used">已使用</a-select-option>
          <a-select-option value="destroyed">已销毁</a-select-option>
        </a-select>
        <a-select v-model:value="filterType" placeholder="类型筛选" style="width:120px" allowClear @change="loadList(1)">
          <a-select-option value="admin">管理员卡</a-select-option>
          <a-select-option value="welfare">福利卡</a-select-option>
        </a-select>
        <a-button type="primary" @click="showGenModal = true">
          <PlusOutlined /> 生成卡密
        </a-button>
        <a-button @click="loadList(currentPage)">
          <ReloadOutlined /> 刷新
        </a-button>
      </div>
    </a-card>

    <!-- 卡密列表 -->
    <a-card>
      <a-table
        :dataSource="list"
        :columns="columns"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: false,
          onChange: loadList
        }"
        rowKey="id"
        size="small"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <span class="font-mono font-bold">{{ record.code }}</span>
          </template>
          <template v-if="column.key === 'type'">
            <a-tag :color="record.type === 'admin' ? 'blue' : 'green'">
              {{ record.type === 'admin' ? '管理员卡' : '福利卡' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
          </template>
          <template v-if="column.key === 'face_value'">
            <span v-if="record.type === 'admin'">¥{{ formatNum(record.face_value) }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template v-if="column.key === 'use_policy'">
            <span>{{ policyText(record.use_policy) }}</span>
            <span v-if="record.use_policy === 4 && record.transfer_fee > 0" class="text-orange-500 text-xs ml-1">(-{{ record.transfer_fee }}点)</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-popconfirm
              v-if="record.status === 'unused'"
              title="确定销毁该卡密？销毁后将从充值统计中移除且不可恢复。"
              ok-text="确定销毁"
              cancel-text="取消"
              ok-type="danger"
              @confirm="destroyCard(record.id)"
            >
              <a-button size="small" danger>销毁</a-button>
            </a-popconfirm>
            <span v-else class="text-gray-400 text-xs">-</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 生成卡密弹窗 -->
    <a-modal
      v-model:open="showGenModal"
      title="生成卡密"
      @ok="handleGenerate"
      :confirm-loading="generating"
      ok-text="生成"
    >
      <a-form :model="genForm" layout="vertical">
        <a-form-item label="卡密类型名称（如：月卡、周卡）" required>
          <a-input v-model:value="genForm.label" placeholder="请输入类型名称" />
        </a-form-item>
        <a-form-item label="点数" required>
          <a-input-number v-model:value="genForm.points" :min="1" style="width:100%" placeholder="此卡密兑换后获得的点数" />
        </a-form-item>
        <a-form-item label="卡面值（元，用于充值统计）" required>
          <a-input-number v-model:value="genForm.face_value" :min="0" :precision="2" style="width:100%" placeholder="0.00" />
        </a-form-item>
        <a-form-item label="生成数量">
          <a-input-number v-model:value="genForm.count" :min="1" :max="500" style="width:100%" />
        </a-form-item>
      </a-form>

      <!-- 生成结果预览 -->
      <div v-if="generatedCodes.length > 0" class="mt-4">
        <a-divider>生成结果（{{ generatedCodes.length }} 张）</a-divider>
        <div class="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
          <div
            v-for="code in generatedCodes"
            :key="code"
            class="font-mono text-sm py-0.5 border-b border-gray-100 last:border-0"
          >{{ code }}</div>
        </div>
        <a-button size="small" class="mt-2" @click="copyAllCodes">复制全部</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'

const props = defineProps<{ token: string }>()

// ─── 状态 ───
const loading = ref(false)
const generating = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const showGenModal = ref(false)
const generatedCodes = ref<string[]>([])

const stats = reactive({
  total: 0, unused_count: 0, used_count: 0, destroyed_count: 0,
  total_face_value: 0, used_face_value: 0
})

const genForm = reactive({ label: '', points: 100, face_value: 0, count: 1 })

// ─── 表格列 ───
const columns = [
  { title: '卡密', key: 'code', dataIndex: 'code', width: 200 },
  { title: '类型', key: 'type', dataIndex: 'type', width: 100 },
  { title: '卡密名称', key: 'label', dataIndex: 'label', width: 120 },
  { title: '点数', key: 'points', dataIndex: 'points', width: 80 },
  { title: '卡面值', key: 'face_value', dataIndex: 'face_value', width: 100 },
  { title: '使用策略', key: 'use_policy', dataIndex: 'use_policy', width: 160 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90 },
  { title: '兑换用户', key: 'used_by_username', dataIndex: 'used_by_username', width: 100 },
  { title: '兑换时间', key: 'used_at', dataIndex: 'used_at', width: 160 },
  { title: '生成人', key: 'created_by_username', dataIndex: 'created_by_username', width: 100 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

// ─── 工具 ───
function formatNum(v: number) { return Number(v || 0).toFixed(2) }
function statusText(s: string) { return { unused: '未使用', used: '已使用', destroyed: '已销毁' }[s] || s }
function statusColor(s: string) { return { unused: 'green', used: 'blue', destroyed: 'red' }[s] || 'default' }
function policyText(p: number) {
  return { 1: '无绑定', 2: '仅限本人', 3: '仅限他人', 4: '本人扣费/他人免费' }[p] || '无绑定'
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${props.token}`, 'Content-Type': 'application/json' },
    ...opts
  })
  return res.json()
}

// ─── 数据加载 ───
async function loadStats() {
  const data = await apiFetch('/api/card-key/admin/statistics')
  if (data.success) Object.assign(stats, data.data)
}

async function loadList(page = 1) {
  loading.value = true
  currentPage.value = page
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize.value),
      ...(filterStatus.value ? { status: filterStatus.value } : {}),
      ...(filterType.value ? { type: filterType.value } : {}),
    })
    const data = await apiFetch(`/api/card-key/admin/list?${params}`)
    if (data.success) {
      list.value = data.data.list
      total.value = data.data.total
    }
  } finally {
    loading.value = false
  }
}

// ─── 生成卡密 ───
async function handleGenerate() {
  if (!genForm.label.trim()) { message.warning('请填写卡密类型名称'); return }
  if (!genForm.points || genForm.points <= 0) { message.warning('点数必须大于0'); return }
  if (genForm.face_value < 0) { message.warning('卡面值不能为负'); return }

  generating.value = true
  try {
    const data = await apiFetch('/api/card-key/admin/generate', {
      method: 'POST',
      body: JSON.stringify(genForm)
    })
    if (data.success) {
      generatedCodes.value = data.data.codes
      message.success(data.message)
      await loadStats()
      await loadList(1)
    } else {
      message.error(data.message || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

async function destroyCard(id: number) {
  const data = await apiFetch(`/api/card-key/admin/destroy/${id}`, { method: 'POST' })
  if (data.success) {
    message.success('卡密已销毁')
    await loadStats()
    await loadList(currentPage.value)
  } else {
    message.error(data.message || '操作失败')
  }
}

function copyAllCodes() {
  navigator.clipboard.writeText(generatedCodes.value.join('\n'))
  message.success('已复制到剪贴板')
}

// ─── 弹窗关闭时重置 ───
function onModalClose() {
  generatedCodes.value = []
  Object.assign(genForm, { label: '', points: 100, face_value: 0, count: 1 })
}

onMounted(() => {
  loadStats()
  loadList(1)
})
</script>
