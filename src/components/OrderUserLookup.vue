<template>
  <div class="order-user-lookup">
    <!-- 搜索框 -->
    <a-card class="search-card">
      <div class="search-row">
        <a-input
          v-model:value="searchOrderId"
          placeholder="输入订单号（支持模糊查询）或订单ID"
          allow-clear
          style="width: 360px"
          @pressEnter="handleSearch"
        />
        <a-button type="primary" :loading="searching" @click="handleSearch">
          <SearchOutlined />
          查询
        </a-button>
      </div>
    </a-card>

    <!-- 多条结果列表 -->
    <a-card v-if="multipleList.length > 0 && !result" title="找到多条订单，请选择要处理的订单" class="info-card">
      <a-table
        :columns="multipleColumns"
        :data-source="multipleList"
        :pagination="false"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'paid' ? 'green' : record.status === 'pending' ? 'orange' : 'red'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-if="column.key === 'actions'">
            <a-button size="small" type="primary" :loading="selectingId === record.id" @click="selectOrder(record)">
              选择此订单
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 单条结果详情 -->
    <template v-if="result">
      <!-- 返回按钮（从多条选中后才显示） -->
      <div v-if="fromMultiple" class="back-row">
        <a-button @click="backToList">
          <LeftOutlined />
          返回订单列表
        </a-button>
      </div>

      <!-- 订单信息 -->
      <a-card title="订单信息" class="info-card">
        <a-descriptions :column="3" bordered size="small">
          <a-descriptions-item label="订单ID">{{ result.order.id }}</a-descriptions-item>
          <a-descriptions-item label="订单号">{{ result.order.order_no }}</a-descriptions-item>
          <a-descriptions-item label="金额">¥{{ result.order.amount }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="result.order.status === 'paid' ? 'green' : result.order.status === 'pending' ? 'orange' : 'red'">
              {{ result.order.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间" :span="2">{{ result.order.created_at }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 用户信息 -->
      <a-card title="用户信息" class="info-card">
        <a-descriptions :column="3" bordered size="small">
          <a-descriptions-item label="用户ID">{{ result.user.id }}</a-descriptions-item>
          <a-descriptions-item label="账号">{{ result.user.username }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ result.user.email || '-' }}</a-descriptions-item>
          <a-descriptions-item label="角色">{{ result.user.role }}</a-descriptions-item>
          <a-descriptions-item label="Points">
            <span class="points-value">{{ result.user.points }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="操作">
            <a-button size="small" type="primary" danger @click="openDeductModal">
              假扣点
            </a-button>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 游戏账号列表 -->
      <a-card title="游戏账号列表" class="info-card">
        <a-empty v-if="result.game_accounts.length === 0" description="该用户暂无游戏账号" />
        <a-table
          v-else
          :columns="gameAccountColumns"
          :data-source="result.game_accounts"
          :pagination="false"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1200 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="record.status === 'active' ? 'green' : record.status === 'inactive' ? 'default' : 'red'">
                {{ record.status }}
              </a-tag>
            </template>
            <template v-if="column.key === 'expire_time'">
              <span :class="isExpired(record.expire_time) ? 'text-expired' : 'text-valid'">
                {{ formatTime(record.expire_time) }}
              </span>
            </template>
            <template v-if="column.key === 'actions'">
              <a-space>
                <a-button size="small" type="default" @click="openExpireModal(record)">
                  <EditOutlined />
                  改到期时间
                </a-button>
                <a-popconfirm
                  title="确定要删除该游戏账号吗？"
                  ok-text="删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="deleteGameAccount(record.id)"
                >
                  <a-button size="small" danger>
                    <DeleteOutlined />
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <!-- 假扣点 Modal -->
    <a-modal
      v-model:open="deductModalOpen"
      title="假扣点操作"
      :confirm-loading="deductLoading"
      @ok="handleDeduct"
      @cancel="resetDeductForm"
    >
      <a-form :model="deductForm" layout="vertical">
        <a-form-item label="用户">
          <span>{{ result?.user.username }} (ID: {{ result?.user.id }})，当前 Points：{{ result?.user.points }}</span>
        </a-form-item>
        <a-form-item label="操作类型" required>
          <a-radio-group v-model:value="deductForm.operation">
            <a-radio value="subtract">扣点</a-radio>
            <a-radio value="add">加点</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="点数" required>
          <a-input-number v-model:value="deductForm.points" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="原因" required>
          <a-input v-model:value="deductForm.reason" placeholder="请输入操作原因" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 修改到期时间 Modal -->
    <a-modal
      v-model:open="expireModalOpen"
      title="修改到期时间"
      :confirm-loading="expireLoading"
      @ok="handleUpdateExpire"
      @cancel="expireModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="游戏账号">
          <span>{{ currentAccount?.username }} (ID: {{ currentAccount?.id }})</span>
        </a-form-item>
        <a-form-item label="新的到期时间" required>
          <a-date-picker
            v-model:value="newExpireTime"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            placeholder="选择新的到期时间"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, EditOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons-vue'
import dayjs, { type Dayjs } from 'dayjs'
import axios from '../utils/axios'

interface OrderInfo {
  id: number
  order_no: string
  amount: number
  status: string
  created_at: string
}

interface UserInfo {
  id: number
  username: string
  email: string
  points: number
  role: string
}

interface GameAccount {
  id: number
  user_id: number
  slot_id: number
  username: string
  server_id: string
  server_name: string
  uid: string
  platform: number
  nickname: string
  script_account_id: string
  script_server_ip: string
  script_server_port: number
  status: string
  level: number
  vip_level: number
  expire_time: string
  created_at: string
  updated_at: string
}

interface LookupResult {
  order: OrderInfo
  user: UserInfo
  game_accounts: GameAccount[]
}

interface MultipleItem {
  id: number
  order_no: string
  amount: number
  status: string
  created_at: string
  user_id: number
  username: string
  email: string
}

const searchOrderId = ref('')
const searching = ref(false)
const result = ref<LookupResult | null>(null)
const multipleList = ref<MultipleItem[]>([])
const fromMultiple = ref(false)
const selectingId = ref<number | null>(null)

// 多条列表列
const multipleColumns = [
  { title: '订单ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 80 },
  { title: '账号', dataIndex: 'username', key: 'username', width: 140 },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

// 游戏账号表格列
const gameAccountColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '槽位', dataIndex: 'slot_id', key: 'slot_id', width: 60 },
  { title: '账号(username)', dataIndex: 'username', key: 'username', width: 160 },
  { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
  { title: 'UID', dataIndex: 'uid', key: 'uid', width: 100 },
  { title: '服务器', dataIndex: 'server_name', key: 'server_name' },
  { title: '平台', dataIndex: 'platform', key: 'platform', width: 60 },
  { title: '等级', dataIndex: 'level', key: 'level', width: 60 },
  { title: 'VIP', dataIndex: 'vip_level', key: 'vip_level', width: 60 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '到期时间', dataIndex: 'expire_time', key: 'expire_time', width: 180 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

// 搜索
async function handleSearch() {
  if (!searchOrderId.value.trim()) {
    message.warning('请输入订单号')
    return
  }
  searching.value = true
  result.value = null
  multipleList.value = []
  fromMultiple.value = false
  try {
    const resp = await axios.get('/api/admin/order-user-lookup', {
      params: { order_id: searchOrderId.value.trim() }
    })
    if (resp.data.success) {
      if (resp.data.multiple) {
        multipleList.value = resp.data.list
        message.info(`找到 ${resp.data.list.length} 条订单，请选择一条进行处理`)
      } else {
        result.value = resp.data.data
      }
    } else {
      message.error(resp.data.message || '查询失败')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '查询失败')
  } finally {
    searching.value = false
  }
}

// 从多条列表中选择一条订单
async function selectOrder(item: MultipleItem) {
  selectingId.value = item.id
  try {
    const resp = await axios.get('/api/admin/order-user-lookup', {
      params: { order_id: searchOrderId.value.trim(), select_id: item.id }
    })
    if (resp.data.success && !resp.data.multiple) {
      result.value = resp.data.data
      fromMultiple.value = true
    } else {
      message.error(resp.data.message || '查询失败')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '查询失败')
  } finally {
    selectingId.value = null
  }
}

// 返回多条列表
function backToList() {
  result.value = null
  fromMultiple.value = false
}

// ---- 扣点 ----
const deductModalOpen = ref(false)
const deductLoading = ref(false)
const deductForm = ref({ operation: 'subtract', points: 1, reason: '' })

function openDeductModal() {
  deductForm.value = { operation: 'subtract', points: 1, reason: '' }
  deductModalOpen.value = true
}

function resetDeductForm() {
  deductModalOpen.value = false
}

async function handleDeduct() {
  if (!result.value) return
  if (!deductForm.value.points || deductForm.value.points < 1) {
    message.warning('请输入有效点数')
    return
  }
  if (!deductForm.value.reason.trim()) {
    message.warning('请输入原因')
    return
  }
  deductLoading.value = true
  try {
    const resp = await axios.post('/api/admin/batch-points', {
      userId: result.value.user.id,
      points: deductForm.value.points,
      operation: deductForm.value.operation,
      reason: deductForm.value.reason,
    })
    if (resp.data.success) {
      message.success(deductForm.value.operation === 'subtract' ? '扣点成功' : '加点成功')
      deductModalOpen.value = false
      result.value.user.points = resp.data.data?.newPoints ?? result.value.user.points
    } else {
      message.error(resp.data.message || '操作失败')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '操作失败')
  } finally {
    deductLoading.value = false
  }
}

// ---- 修改到期时间 ----
const expireModalOpen = ref(false)
const expireLoading = ref(false)
const currentAccount = ref<GameAccount | null>(null)
const newExpireTime = ref<Dayjs | null>(null)

function openExpireModal(account: GameAccount) {
  currentAccount.value = account
  newExpireTime.value = account.expire_time ? dayjs(account.expire_time) : null
  expireModalOpen.value = true
}

async function handleUpdateExpire() {
  if (!currentAccount.value) return
  if (!newExpireTime.value) {
    message.warning('请选择到期时间')
    return
  }
  expireLoading.value = true
  try {
    const resp = await axios.put(`/api/admin/game-accounts/${currentAccount.value.id}/expire-time`, {
      expire_time: newExpireTime.value.format('YYYY-MM-DD HH:mm:ss')
    })
    if (resp.data.success) {
      message.success('到期时间已更新')
      expireModalOpen.value = false
      if (result.value) {
        const acc = result.value.game_accounts.find(a => a.id === currentAccount.value!.id)
        if (acc) acc.expire_time = newExpireTime.value!.format('YYYY-MM-DD HH:mm:ss')
      }
    } else {
      message.error(resp.data.message || '更新失败')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '更新失败')
  } finally {
    expireLoading.value = false
  }
}

// ---- 删除游戏账号 ----
async function deleteGameAccount(accountId: number) {
  try {
    const resp = await axios.delete(`/api/admin/game-accounts/${accountId}`)
    if (resp.data.success) {
      message.success('游戏账号已删除')
      if (result.value) {
        result.value.game_accounts = result.value.game_accounts.filter(a => a.id !== accountId)
      }
    } else {
      message.error(resp.data.message || '删除失败')
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || '删除失败')
  }
}

// ---- 工具函数 ----
function formatTime(t: string) {
  if (!t) return '-'
  return dayjs(t).format('YYYY-MM-DD HH:mm:ss')
}

function isExpired(t: string) {
  if (!t) return false
  return dayjs(t).isBefore(dayjs())
}
</script>

<style scoped>
.order-user-lookup {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.search-card .search-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-card {
  width: 100%;
}

.points-value {
  font-weight: bold;
  color: #1677ff;
  font-size: 16px;
}

.text-expired {
  color: #ff4d4f;
  font-weight: bold;
}

.text-valid {
  color: #52c41a;
}

.back-row {
  display: flex;
  align-items: center;
}
</style>
