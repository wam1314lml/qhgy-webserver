<template>
  <div class="user-management">
    <a-card>
      <div style="margin-bottom: 16px">
        <a-space>
          <a-input-search
            placeholder="搜索用户名、邮箱、邀请码或ID"
            allow-clear
            size="middle"
            style="width: 300px"
            v-model:value="searchText"
            @search="handleSearch"
            @change="handleSearch"
          />
          <a-button @click="handleResetSearch"> 重置 </a-button>
          <span style="color: #666; font-size: 14px">
            {{ searchText ? `搜索 "${searchText}"` : `共 ${pagination.total} 个用户` }}
          </span>
        </a-space>
      </div>

      <custom-table
        :columns="userColumns"
        :data-source="users"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        @change="handleTableChange"
      />
    </a-card>

    <!-- 代理设置 Modal -->
    <a-modal
      :title="`代理设置 - ${agentConfigTarget?.username || ''}`"
      v-model:open="agentConfigModalOpen"
      @ok="handleAgentConfigSubmit"
      @cancel="closeAgentConfigModal"
      :confirm-loading="agentConfigLoading"
      width="480px"
      ok-text="确认"
      cancel-text="取消"
    >
      <a-form :model="agentConfigForm" layout="vertical" style="margin-top:8px">
        <a-form-item label="操作类型">
          <a-radio-group v-model:value="agentConfigForm.action">
            <a-radio value="appoint">任命为三级代理</a-radio>
            <a-radio value="dismiss" :disabled="agentConfigTarget?.role !== 'agent3'">卸任三级代理</a-radio>
          </a-radio-group>
        </a-form-item>

        <template v-if="agentConfigForm.action === 'appoint'">
          <a-form-item label="上级代理（vip1/vip2）">
            <a-select
              v-model:value="agentConfigForm.parent_agent_id"
              placeholder="请选择上级代理"
              style="width:100%"
              :options="vipAgentOptions"
              :loading="vipAgentsLoading"
              show-search
              option-filter-prop="label"
            />
          </a-form-item>
          <a-form-item label="分成比例（%）">
            <a-input-number
              v-model:value="agentConfigForm.commission_rate"
              :min="1"
              :max="selectedParentMaxRate"
              :precision="0"
              style="width:100%"
              :placeholder="`1 ~ ${selectedParentMaxRate}（不超过上级比例）`"
            />
            <div v-if="agentConfigForm.parent_agent_id" style="color:#888;font-size:12px;margin-top:4px">
              上级有效比例：{{ selectedParentMaxRate }}%，三级代理比例必须小于此值
            </div>
          </a-form-item>
        </template>

        <a-alert
          v-if="agentConfigForm.action === 'dismiss'"
          type="warning"
          message="卸任后该用户降为普通用户，待提现分成记录将被作废"
          show-icon
          style="margin-top:8px"
        />
      </a-form>
    </a-modal>

    <!-- 单个用户点数操作Modal -->
    <a-modal
      :title="`${singleOperationType === 'add' ? '加点数' : '扣点数'} - ${selectedUserForPoints?.username || ''}`"
      v-model:open="singlePointsModalOpen"
      @ok="handleSinglePointsSubmit"
      @cancel="
        () => {
          singlePointsModalOpen = false
          singlePointsForm.points = 0
          singlePointsForm.reason = ''
          selectedUserForPoints = null
        }
      "
      :confirm-loading="singlePointsLoading"
      width="500px"
    >
      <div style="margin-bottom: 16px">
        <p>
          用户：<strong>{{ selectedUserForPoints?.username }}</strong>
        </p>
        <p>
          当前点数：<strong>{{ selectedUserForPoints?.points }}</strong>
        </p>
      </div>

      <a-form
        ref="singlePointsFormRef"
        :model="singlePointsForm"
        layout="vertical"
        @finish="executeSinglePointsOperation"
      >
        <a-form-item
          name="points"
          label="点数"
          :rules="[
            { required: true, message: '请输入点数' },
            { type: 'number', min: 1, message: '点数必须大于0' },
          ]"
        >
          <a-input-number
            :min="1"
            style="width: 100%"
            placeholder="请输入点数"
            v-model:value="singlePointsForm.points"
          />
        </a-form-item>

        <a-form-item
          name="reason"
          :label="singleOperationType === 'add' ? '加点原因' : '扣点原因'"
          :rules="[{ required: true, message: '请输入操作原因' }]"
        >
          <a-textarea
            :rows="3"
            :placeholder="
              singleOperationType === 'add'
                ? '请输入加点原因，将记录到用户交易历史中'
                : '请输入扣点原因，将记录到用户交易历史中'
            "
            v-model:value="singlePointsForm.reason"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- 抽奖次数操作Modal -->
    <a-modal
      :title="`${lotteryOperationType === 'add' ? '增加抽奖次数' : '扣除抽奖次数'} - ${selectedUserForLottery?.username || ''}`"
      v-model:open="lotteryModalOpen"
      @ok="handleLotterySubmit"
      @cancel="() => { lotteryModalOpen = false; selectedUserForLottery = null }"
      :confirm-loading="lotteryLoading"
      width="500px"
      ok-text="确认"
      cancel-text="取消"
    >
      <div style="margin-bottom: 16px">
        <p>用户：<strong>{{ selectedUserForLottery?.username }}</strong></p>
        <p>当前抽奖次数：<strong>{{ selectedUserForLottery?.recharge_lottery_count ?? 0 }}</strong></p>
      </div>
      <a-form ref="lotteryFormRef" :model="lotteryForm" layout="vertical">
        <a-form-item
          name="tickets"
          label="次数"
          :rules="[
            { required: true, message: '请输入次数' },
            { type: 'number', min: 1, message: '次数必须大于0' },
          ]"
        >
          <a-input-number
            :min="1"
            style="width: 100%"
            placeholder="请输入次数"
            v-model:value="lotteryForm.tickets"
          />
        </a-form-item>
        <a-form-item
          name="reason"
          :label="lotteryOperationType === 'add' ? '增加原因' : '扣除原因'"
          :rules="[{ required: true, message: '请输入操作原因' }]"
        >
          <a-textarea
            :rows="3"
            :placeholder="lotteryOperationType === 'add' ? '请输入增加原因' : '请输入扣除原因'"
            v-model:value="lotteryForm.reason"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h, resolveComponent } from 'vue'
import { message, Button, Space } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import axios from '../utils/axios'
import CustomTable from './CustomTable.vue'

interface User {
  id: number
  username: string
  email: string
  role: string
  points: number
  recharge_lottery_count: number
  invite_code: string
  total_invites: number
  invited_by: string | null
  invited_by_username: string | null
  created_at: string
  last_login: string | null
  status: 'active' | 'inactive' | 'banned'
}

interface Props {
  token: string
}

const props = defineProps<Props>()

// 用户数据
const users = ref<User[]>([])
const searchText = ref('')
const availableRoles = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)

// 分页数据
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

// Modal控制状态
const singlePointsModalOpen = ref(false)

// 表单ref
const singlePointsFormRef = ref<FormInstance>()

// 编辑状态
const selectedUserForPoints = ref<User | null>(null)

// 操作类型
const singleOperationType = ref<'add' | 'subtract'>('add')

// loading状态
const singlePointsLoading = ref(false)

// 单个积分操作表单数据
const singlePointsForm = ref({
  points: 0,
  reason: '',
})

// ── 代理设置 ──
interface VipAgent {
  id: number
  username: string
  email: string
  role: string
  effective_rate: number
}

const agentConfigModalOpen = ref(false)
const agentConfigLoading = ref(false)
const agentConfigTarget = ref<User | null>(null)
const vipAgents = ref<VipAgent[]>([])
const vipAgentsLoading = ref(false)

const agentConfigForm = ref({
  action: 'appoint' as 'appoint' | 'dismiss',
  parent_agent_id: undefined as number | undefined,
  commission_rate: undefined as number | undefined,
})

const vipAgentOptions = computed(() =>
  vipAgents.value.map((v) => ({
    value: v.id,
    label: `${v.username}（${v.role}，${(v.effective_rate * 100).toFixed(0)}%）`,
  }))
)

const selectedParentMaxRate = computed(() => {
  if (!agentConfigForm.value.parent_agent_id) return 25
  const found = vipAgents.value.find((v) => v.id === agentConfigForm.value.parent_agent_id)
  return found ? Math.max(1, Math.floor(found.effective_rate * 100) - 1) : 25
})

// 用户表格列
const userColumns = computed(() => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    customRender: ({ text, record }: { text: string; record: User }) => {
      return h(resolveComponent('a-select'), {
        value: text,
        style: { width: '120px' },
        options: availableRoles.value,
        onChange: (newRole: string) => updateUserRole(record.id, newRole),
      })
    },
  },
  {
    title: '点数',
    dataIndex: 'points',
    key: 'points',
    customRender: ({ text }: { text: number }) => `${text} 点`,
  },
  {
    title: '邀请码',
    dataIndex: 'invite_code',
    key: 'invite_code',
  },
  {
    title: '邀请人数',
    dataIndex: 'total_invites',
    key: 'total_invites',
    customRender: ({ text }: { text: number }) => `${text} 人`,
  },
  {
    title: '被邀请人',
    dataIndex: 'invited_by_username',
    key: 'invited_by_username',
    customRender: ({ text }: { text: string | null }) => text || '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ text }: { text: string }) => {
      const colorMap: Record<string, string> = {
        active: 'green',
        inactive: 'orange',
        banned: 'red',
      }
      const textMap: Record<string, string> = {
        active: '正常',
        inactive: '未激活',
        banned: '已封禁',
      }
      return h(resolveComponent('a-tag'), { color: colorMap[text] }, textMap[text] || text)
    },
  },
  {
    title: '注册时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }: { record: User }) => {
      return h(Space, {}, [
        h(
          Button,
          {
            size: 'small',
            type: record.status === 'active' ? 'default' : 'primary',
            onClick: () =>
              updateUserStatus(record.id, record.status === 'active' ? 'banned' : 'active'),
          },
          record.status === 'active' ? '封禁' : '解封',
        ),
        h(
          Button,
          {
            size: 'small',
            type: 'primary',
            onClick: () => handleSingleUserAddPoints(record),
          },
          '加点',
        ),
        h(
          Button,
          {
            size: 'small',
            danger: true,
            onClick: () => handleSingleUserSubtractPoints(record),
          },
          '扣点',
        ),
        h(
          Button,
          {
            size: 'small',
            style: { background: '#059669', color: '#fff', borderColor: '#059669' },
            onClick: () => handleSingleUserAddLottery(record),
          },
          '加次数',
        ),
        h(
          Button,
          {
            size: 'small',
            style: { background: '#dc2626', color: '#fff', borderColor: '#dc2626' },
            onClick: () => handleSingleUserSubtractLottery(record),
          },
          '扣次数',
        ),
        h(
          Button,
          {
            size: 'small',
            style: { background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' },
            onClick: () => openAgentConfigModal(record),
          },
          '代理设置',
        ),
      ])
    },
  },
])

// 获取用户列表
const fetchUsers = async (page?: number, pageSize?: number, search?: string) => {
  loading.value = true
  try {
    const params = {
      page: page || pagination.value.current,
      pageSize: pageSize || pagination.value.pageSize,
      search: search || searchText.value || undefined,
    }

    const response = await axios.get('/api/admin/users', { params })

    // 处理后端返回的分页数据
    if (response.data && typeof response.data === 'object') {
      const { users: userList, total, page: currentPage, pageSize: currentPageSize } = response.data

      users.value = Array.isArray(userList) ? userList : []
      pagination.value.total = total || 0
      pagination.value.current = currentPage || 1
      pagination.value.pageSize = currentPageSize || 10
    } else {
      users.value = []
      pagination.value.total = 0
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    users.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

// 获取可用角色
const fetchAvailableRoles = async () => {
  try {
    const response = await axios.get('/api/admin/available-roles')
    const data = response.data
    console.log('获取到的角色数据:', data) // 调试日志

    if (data.success && data.data && Array.isArray(data.data)) {
      // 将后端返回的角色数据转换为前端需要的格式
      const formattedRoles = data.data.map((role: any) => ({
        value: role.name,
        label: role.description || role.name,
      }))
      console.log('转换后的角色数据:', formattedRoles) // 调试日志
      availableRoles.value = formattedRoles
    } else {
      console.log('角色数据格式不正确，使用默认角色') // 调试日志
      // 如果获取失败，使用默认角色
      availableRoles.value = [
        { value: 'user', label: '普通用户' },
        { value: 'vip', label: 'VIP用户' },
        { value: 'admin', label: '管理员' },
      ]
    }
  } catch (error) {
    console.error('获取可用角色失败:', error)
    // 如果获取失败，使用默认角色
    availableRoles.value = [
      { value: 'user', label: '普通用户' },
      { value: 'vip', label: 'VIP用户' },
      { value: 'admin', label: '管理员' },
    ]
  }
}

// 搜索用户
const handleSearch = () => {
  pagination.value.current = 1 // 搜索时重置到第一页
  fetchUsers(1, pagination.value.pageSize, searchText.value)
}

// 重置搜索
const handleResetSearch = () => {
  searchText.value = ''
  pagination.value.current = 1
  fetchUsers(1, pagination.value.pageSize, '')
}

// 处理表格变化（分页、排序、筛选）
const handleTableChange = (pag: any) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchUsers(pag.current, pag.pageSize, searchText.value)
}

// 更新用户状态
const updateUserStatus = async (userId: number, status: string) => {
  await axios.put(`/api/admin/users/${userId}/status`, { status })
  message.success('用户状态更新成功')
  fetchUsers()
}

// 更新用户角色
const updateUserRole = async (userId: number, role: string) => {
  await axios.put(`/api/admin/users/${userId}/role`, { role })
  message.success('用户角色更新成功')
  fetchUsers()
}

// 打开代理设置弹窗
const openAgentConfigModal = async (user: User) => {
  agentConfigTarget.value = user
  agentConfigForm.value = {
    action: user.role === 'agent3' ? 'dismiss' : 'appoint',
    parent_agent_id: undefined,
    commission_rate: undefined,
  }
  agentConfigModalOpen.value = true
  // 加载 vip 代理列表
  vipAgentsLoading.value = true
  try {
    const res = await axios.get('/api/admin/users/vip-agents')
    if (res.data.success) vipAgents.value = res.data.data
  } catch {
    message.error('获取代理列表失败')
  } finally {
    vipAgentsLoading.value = false
  }
}

const closeAgentConfigModal = () => {
  agentConfigModalOpen.value = false
  agentConfigTarget.value = null
  vipAgents.value = []
}

const handleAgentConfigSubmit = async () => {
  if (!agentConfigTarget.value) return
  const { action, parent_agent_id, commission_rate } = agentConfigForm.value

  if (action === 'appoint') {
    if (!parent_agent_id) { message.warning('请选择上级代理'); return }
    if (!commission_rate || commission_rate < 1) { message.warning('请填写有效的分成比例'); return }
    if (commission_rate >= selectedParentMaxRate.value + 1) {
      message.warning(`分成比例必须小于上级有效比例`); return
    }
  }

  agentConfigLoading.value = true
  try {
    const res = await axios.put(`/api/admin/users/${agentConfigTarget.value.id}/agent-config`, {
      action,
      parent_agent_id,
      commission_rate,
    })
    if (res.data.success) {
      message.success(res.data.message || '操作成功')
      closeAgentConfigModal()
      fetchUsers()
    } else {
      message.error(res.data.message || '操作失败')
    }
  } catch (err: any) {
    message.error(err?.response?.data?.message || '操作失败')
  } finally {
    agentConfigLoading.value = false
  }
}

// 单个用户加点
const handleSingleUserAddPoints = (user: User) => {
  selectedUserForPoints.value = user
  singleOperationType.value = 'add'
  singlePointsModalOpen.value = true
}

// 单个用户扣点
const handleSingleUserSubtractPoints = (user: User) => {
  selectedUserForPoints.value = user
  singleOperationType.value = 'subtract'
  singlePointsModalOpen.value = true
}

// ── 抽奖次数操作 ──
const lotteryModalOpen = ref(false)
const lotteryOperationType = ref<'add' | 'subtract'>('add')
const selectedUserForLottery = ref<User | null>(null)
const lotteryLoading = ref(false)
const lotteryFormRef = ref<FormInstance>()
const lotteryForm = ref({ tickets: 1, reason: '' })

const handleSingleUserAddLottery = (user: User) => {
  selectedUserForLottery.value = user
  lotteryOperationType.value = 'add'
  lotteryForm.value = { tickets: 1, reason: '' }
  lotteryModalOpen.value = true
}

const handleSingleUserSubtractLottery = (user: User) => {
  selectedUserForLottery.value = user
  lotteryOperationType.value = 'subtract'
  lotteryForm.value = { tickets: 1, reason: '' }
  lotteryModalOpen.value = true
}

const handleLotterySubmit = async () => {
  try {
    await lotteryFormRef.value?.validate()
  } catch {
    return
  }
  if (!selectedUserForLottery.value) return
  lotteryLoading.value = true
  try {
    const response = await axios.post('/api/admin/user-lottery-tickets', {
      userId: selectedUserForLottery.value.id,
      tickets: lotteryForm.value.tickets,
      operation: lotteryOperationType.value,
      reason: lotteryForm.value.reason,
    })
    if (response.data.success) {
      message.success(`${lotteryOperationType.value === 'add' ? '增加' : '扣除'}抽奖次数成功`)
      lotteryModalOpen.value = false
      selectedUserForLottery.value = null
      fetchUsers()
    } else {
      message.error(response.data.message || '操作失败')
    }
  } catch (err: any) {
    message.error(err?.response?.data?.message || '操作失败')
  } finally {
    lotteryLoading.value = false
  }
}

// 执行单个用户点数操作
const executeSinglePointsOperation = async () => {
  if (!selectedUserForPoints.value) {
    message.error('未选择用户')
    return
  }

  singlePointsLoading.value = true
  try {
    const operation = singleOperationType.value === 'add' ? 'add' : 'subtract'

    const response = await fetch('/api/admin/user-points', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: selectedUserForPoints.value.id,
        points: singlePointsForm.value.points,
        operation: operation,
        reason: singlePointsForm.value.reason,
      }),
    })

    const result = await response.json()

    if (result.success) {
      message.success(`${operation === 'add' ? '加点' : '扣点'}操作成功`)
      fetchUsers() // 刷新用户列表
      singlePointsModalOpen.value = false
      // 重置表单
      singlePointsForm.value.points = 0
      singlePointsForm.value.reason = ''
      selectedUserForPoints.value = null
    } else {
      message.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('点数操作失败:', error)
    message.error('点数操作失败')
  } finally {
    singlePointsLoading.value = false
  }
}

// 处理单点数提交，包含表单校验
const handleSinglePointsSubmit = async () => {
  try {
    await singlePointsFormRef.value?.validate()
    executeSinglePointsOperation()
  } catch (error) {
    console.log('表单校验失败:', error)
  }
}

// 暴露刷新用户列表的方法
const refreshUsers = () => {
  fetchUsers()
}

// 暴露给父组件的方法
defineExpose({
  refreshUsers,
})

onMounted(() => {
  fetchUsers()
  fetchAvailableRoles()
})
</script>

<style scoped>
@import './UserManagement.css';
</style>
