<template>
  <div style="padding: 24px">
    <h2>提现管理</h2>

    <!-- 总体统计 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="4">
        <a-card>
          <a-statistic title="总邀请人数" :value="totalStats.totalInvites" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="总充值金额"
            :value="totalStats.totalRecharge"
            :precision="2"
            suffix="元"
          />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic title="待审核提现" :value="pendingAmount" :precision="2" suffix="元" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="可提现金额"
            :value="totalStats.totalAvailable"
            :precision="2"
            suffix="元"
          />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="已提现金额"
            :value="totalStats.totalWithdrawn"
            :precision="2"
            suffix="元"
          />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="累计提成"
            :value="totalStats.totalCommission"
            :precision="2"
            suffix="元"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选器 -->
    <div style="margin-bottom: 16px">
      <a-space>
        <span>状态筛选：</span>
        <a-select
          style="width: 120px"
          placeholder="全部状态"
          allow-clear
          v-model:value="statusFilter"
          @change="handleStatusChange"
        >
          <a-select-option value="pending">待审核</a-select-option>
          <a-select-option value="processing">处理中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
          <a-select-option value="failed">已拒绝</a-select-option>
        </a-select>
      </a-space>
    </div>

    <!-- 提现申请表格 -->
    <div style="margin-bottom: 32px">
      <h3>提现申请</h3>
      <custom-table
        :columns="withdrawalColumns"
        :data-source="withdrawals"
        row-key="id"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
      />
    </div>

    <!-- 用户提成统计表格 -->
    <div>
      <h3>用户提成统计</h3>
      <custom-table
        :columns="statsColumns"
        :data-source="allStats"
        row-key="user_id"
        :pagination="{ pageSize: 10 }"
      />
    </div>

    <!-- 处理提现申请弹窗 -->
    <a-modal
      title="处理提现申请"
      :open="processModalVisible"
      @cancel="closeProcessModal"
      :footer="null"
      :width="600"
    >
      <div v-if="selectedWithdrawal">
        <div
          style="margin-bottom: 16px; padding: 16px; background-color: #f5f5f5; border-radius: 4px"
        >
          <p><strong>用户：</strong>{{ selectedWithdrawal.username }}</p>
          <p><strong>提现金额：</strong>¥{{ selectedWithdrawal.amount.toFixed(2) }}</p>
          <p>
            <strong>申请时间：</strong
            >{{ new Date(selectedWithdrawal.created_at).toLocaleString() }}
          </p>
        </div>

        <a-form ref="formRef" :model="processFormData" @finish="handleProcess" layout="vertical">
          <a-form-item
            label="处理结果"
            name="status"
            :rules="[{ required: true, message: '请选择处理结果' }]"
          >
            <a-select v-model:value="processFormData.status" placeholder="请选择处理结果">
              <a-select-option value="completed">通过提现</a-select-option>
              <a-select-option value="failed">拒绝提现</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="备注" name="admin_note">
            <a-textarea
              v-model:value="processFormData.admin_note"
              :rows="4"
              placeholder="请输入处理备注（可选）"
              :maxlength="500"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="loading">
                <template #icon>
                  <CheckOutlined />
                </template>
                确认处理
              </a-button>
              <a-button @click="closeProcessModal">
                <template #icon>
                  <CloseOutlined />
                </template>
                取消
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, h, resolveComponent } from 'vue'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import axios from '../utils/axios'
import CustomTable from './CustomTable.vue'

interface WithdrawalRecord {
  id: number
  user_id: number
  username: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  admin_id?: number
  admin_username?: string
  admin_note?: string
  created_at: string
  updated_at: string
}

interface CommissionStats {
  user_id: number
  username: string
  role: string
  total_invites: number
  today_recharge_amount: number
  total_recharge_amount: number
  available_commission: number
  withdrawn_commission: number
  total_commission: number
}

const withdrawals = ref<WithdrawalRecord[]>([])
const allStats = ref<CommissionStats[]>([])
const loading = ref(false)
const processModalVisible = ref(false)
const selectedWithdrawal = ref<WithdrawalRecord | null>(null)
const statusFilter = ref<string>('')
const formRef = ref<FormInstance>()

// 表单数据
const processFormData = ref({
  status: '',
  admin_note: '',
})

// 获取所有提现申请
const fetchWithdrawals = async (status?: string) => {
  try {
    loading.value = true
    const url = status
      ? `/api/commission/admin/withdrawals?status=${status}`
      : '/api/commission/admin/withdrawals'
    const response = await axios.get(url)
    if (response.data.success) {
      withdrawals.value = response.data.data
    } else {
      message.error(response.data.message || '获取提现申请失败')
    }
  } finally {
    loading.value = false
  }
}

// 获取所有用户提成统计
const fetchAllStats = async () => {
  try {
    const response = await axios.get('/api/commission/admin/stats')
    if (response.data.success) {
      allStats.value = response.data.data
    }
  } catch (error) {
    console.error('获取提成统计失败:', error)
  }
}

// 处理提现申请
const handleProcess = async (values: { status: 'completed' | 'failed'; admin_note?: string }) => {
  if (!selectedWithdrawal.value) return

  try {
    // 先执行表单校验
    await formRef.value?.validateFields()

    loading.value = true
    const response = await axios.post(
      `/api/commission/admin/withdrawals/${selectedWithdrawal.value.id}/process`,
      values,
    )

    if (response.data.success) {
      message.success(response.data.message)
      closeProcessModal()
      fetchWithdrawals(statusFilter.value)
      fetchAllStats()
    } else {
      message.error(response.data.message || '处理失败')
    }
  } finally {
    loading.value = false
  }
}

// 打开处理弹窗
const openProcessModal = (record: WithdrawalRecord) => {
  selectedWithdrawal.value = record

  // 初始化表单数据
  processFormData.value = {
    status: '',
    admin_note: '',
  }

  // 清除表单验证状态
  setTimeout(() => {
    formRef.value?.clearValidate()
  }, 0)

  processModalVisible.value = true
}

// 关闭处理弹窗
const closeProcessModal = () => {
  processModalVisible.value = false
  formRef.value?.resetFields()

  // 重置表单数据
  processFormData.value = {
    status: '',
    admin_note: '',
  }

  selectedWithdrawal.value = null
}

// 状态筛选变化处理
const handleStatusChange = (value: string) => {
  statusFilter.value = value || ''
}

// 提现申请表格列
const withdrawalColumns = computed(() => [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '提现金额',
    dataIndex: 'amount',
    key: 'amount',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
    sorter: (a: WithdrawalRecord, b: WithdrawalRecord) => a.amount - b.amount,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ text }: { text: string }) => {
      const statusMap = {
        pending: { color: 'orange', text: '待审核' },
        processing: { color: 'blue', text: '处理中' },
        completed: { color: 'green', text: '已完成' },
        failed: { color: 'red', text: '已拒绝' },
      }
      const statusInfo = statusMap[text as keyof typeof statusMap]
      return h(resolveComponent('a-tag'), { color: statusInfo.color }, statusInfo.text)
    },
  },
  {
    title: '申请时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
    sorter: (a: WithdrawalRecord, b: WithdrawalRecord) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  },
  {
    title: '处理人',
    dataIndex: 'admin_username',
    key: 'admin_username',
    customRender: ({ text }: { text: string }) => text || '-',
  },
  {
    title: '备注',
    dataIndex: 'admin_note',
    key: 'admin_note',
    customRender: ({ text }: { text: string }) => text || '-',
    ellipsis: true,
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }: { record: WithdrawalRecord }) => {
      if (record.status === 'pending') {
        return h(
          resolveComponent('a-button'),
          {
            type: 'primary',
            size: 'small',
            onClick: () => openProcessModal(record),
          },
          {
            icon: () => h(EyeOutlined),
            default: () => '处理',
          },
        )
      }
      return null
    },
  },
])

// 提成统计表格列
const statsColumns = computed(() => [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    customRender: ({ text }: { text: string }) => {
      const roleMap = {
        admin: { color: 'red', text: '管理员' },
        vip: { color: 'gold', text: 'VIP' },
        user: { color: 'blue', text: '普通用户' },
      }
      const roleInfo = roleMap[text as keyof typeof roleMap]
      return h(resolveComponent('a-tag'), { color: roleInfo.color }, roleInfo.text)
    },
  },
  {
    title: '邀请人数',
    dataIndex: 'total_invites',
    key: 'total_invites',
    sorter: (a: CommissionStats, b: CommissionStats) => a.total_invites - b.total_invites,
  },
  {
    title: '今日充值',
    dataIndex: 'today_recharge_amount',
    key: 'today_recharge_amount',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
    sorter: (a: CommissionStats, b: CommissionStats) =>
      a.today_recharge_amount - b.today_recharge_amount,
  },
  {
    title: '总充值',
    dataIndex: 'total_recharge_amount',
    key: 'total_recharge_amount',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
    sorter: (a: CommissionStats, b: CommissionStats) =>
      a.total_recharge_amount - b.total_recharge_amount,
  },
  {
    title: '可提现',
    dataIndex: 'available_commission',
    key: 'available_commission',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
    sorter: (a: CommissionStats, b: CommissionStats) =>
      a.available_commission - b.available_commission,
  },
  {
    title: '已提现',
    dataIndex: 'withdrawn_commission',
    key: 'withdrawn_commission',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
    sorter: (a: CommissionStats, b: CommissionStats) =>
      a.withdrawn_commission - b.withdrawn_commission,
  },
  {
    title: '累计提成',
    dataIndex: 'total_commission',
    key: 'total_commission',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
    sorter: (a: CommissionStats, b: CommissionStats) => a.total_commission - b.total_commission,
  },
])

// 计算总体统计
const totalStats = computed(() => {
  return allStats.value.reduce(
    (acc, stat) => ({
      totalInvites: acc.totalInvites + stat.total_invites,
      totalRecharge: acc.totalRecharge + stat.total_recharge_amount,
      totalAvailable: acc.totalAvailable + stat.available_commission,
      totalWithdrawn: acc.totalWithdrawn + stat.withdrawn_commission,
      totalCommission: acc.totalCommission + stat.total_commission,
    }),
    {
      totalInvites: 0,
      totalRecharge: 0,
      totalAvailable: 0,
      totalWithdrawn: 0,
      totalCommission: 0,
    },
  )
})

const pendingAmount = computed(() => {
  const pendingWithdrawals = withdrawals.value.filter((w) => w.status === 'pending')
  return pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0)
})

// 监听状态筛选变化
watch(statusFilter, (newValue) => {
  fetchWithdrawals(newValue)
})

onMounted(() => {
  fetchWithdrawals(statusFilter.value)
  fetchAllStats()
})
</script>
