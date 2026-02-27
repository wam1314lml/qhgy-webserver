<template>
  <div style="padding: 24px">
    <h2>提成管理</h2>

    <div v-if="!stats">加载中...</div>

    <template v-else>
      <!-- 统计卡片 -->
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="6">
          <a-card>
            <a-statistic title="邀请人数" :value="stats.total_invites">
              <template #prefix>
                <TeamOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="今日充值金额"
              :value="stats.today_recharge_amount"
              :precision="2"
              suffix="元"
            >
              <template #prefix>
                <DollarOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="可提现金额"
              :value="stats.available_commission"
              :precision="2"
              suffix="元"
            >
              <template #prefix>
                <BankOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="累计提成"
              :value="stats.total_commission"
              :precision="2"
              suffix="元"
            >
              <template #prefix>
                <TrophyOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 提现按钮 -->
      <div style="margin-bottom: 24px">
        <a-button
          type="primary"
          @click="withdrawModalVisible = true"
          :disabled="stats.available_commission <= 0"
        >
          申请提现
        </a-button>
        <span style="margin-left: 16px; color: #666">
          可提现金额：¥{{ stats.available_commission.toFixed(2) }}
        </span>
      </div>

      <!-- 详细数据 -->
      <a-tabs default-active-key="records">
        <a-tab-pane tab="提成记录" key="records">
          <custom-table
            :columns="recordColumns"
            :data-source="records"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          />
        </a-tab-pane>
        <a-tab-pane tab="提现记录" key="withdrawals">
          <custom-table
            :columns="withdrawalColumns"
            :data-source="withdrawals"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          />
        </a-tab-pane>
      </a-tabs>

      <!-- 提现申请弹窗 -->
      <a-modal
        title="申请提现"
        :open="withdrawModalVisible"
        @cancel="withdrawModalVisible = false"
        :footer="null"
      >
        <a-form ref="formRef" @finish="handleWithdraw" layout="vertical">
          <a-form-item
            label="提现金额"
            name="amount"
            :rules="[
              { required: true, message: '请输入提现金额' },
              { type: 'number', min: 0.01, message: '提现金额必须大于0.01元' },
              {
                type: 'number',
                max: stats.available_commission,
                message: `提现金额不能超过可提现金额 ¥${stats.available_commission.toFixed(2)}`,
              },
            ]"
          >
            <a-input-number
              style="width: 100%"
              placeholder="请输入提现金额"
              :min="0.01"
              :max="stats.available_commission"
              :step="0.01"
              :precision="2"
              addon-after="元"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="loading" block>
              提交申请
            </a-button>
          </a-form-item>
        </a-form>
      </a-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h, resolveComponent } from 'vue'
import { message } from 'ant-design-vue'
import { DollarOutlined, TeamOutlined, TrophyOutlined, BankOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'
import axios from '../utils/axios'
import CustomTable from './CustomTable.vue'

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

interface CommissionRecord {
  id: number
  inviter_id: number
  invitee_id: number
  invitee_username: string
  recharge_amount: number
  commission_rate: number
  commission_amount: number
  status: 'pending' | 'available' | 'withdrawn'
  created_at: string
  recharge_time: string
}

interface WithdrawalRecord {
  id: number
  user_id: number
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  admin_id?: number
  admin_username?: string
  admin_note?: string
  created_at: string
  updated_at: string
}

const stats = ref<CommissionStats | null>(null)
const records = ref<CommissionRecord[]>([])
const withdrawals = ref<WithdrawalRecord[]>([])
const loading = ref(false)
const withdrawModalVisible = ref(false)
const formRef = ref<FormInstance>()

// 获取提成统计
const fetchStats = async () => {
  try {
    const response = await axios.get('/api/commission/stats')
    if (response.data.success) {
      stats.value = response.data.data
    }
  } catch (error) {
    console.error('获取提成统计失败:', error)
  }
}

// 获取提成记录
const fetchRecords = async () => {
  try {
    const response = await axios.get('/api/commission/records')
    if (response.data.success) {
      records.value = response.data.data
    }
  } catch (error) {
    console.error('获取提成记录失败:', error)
  }
}

// 获取提现记录
const fetchWithdrawals = async () => {
  try {
    const response = await axios.get('/api/commission/withdrawals')
    if (response.data.success) {
      withdrawals.value = response.data.data
    }
  } catch (error) {
    console.error('获取提现记录失败:', error)
  }
}

// 提交提现申请
const handleWithdraw = async (values: { amount: number }) => {
  try {
    loading.value = true
    const response = await axios.post('/api/commission/withdraw', values)

    if (response.data.success) {
      message.success('提现申请已提交，请等待管理员审核')
      withdrawModalVisible.value = false
      formRef.value?.resetFields()
      fetchStats()
      fetchWithdrawals()
    } else {
      message.error(response.data.message || '提现申请失败')
    }
  } catch (error) {
    message.error('提现申请失败')
    console.error('提现申请失败:', error)
  } finally {
    loading.value = false
  }
}

// 提成记录表格列
const recordColumns = computed(() => [
  {
    title: '被邀请用户',
    dataIndex: 'invitee_username',
    key: 'invitee_username',
  },
  {
    title: '充值金额',
    dataIndex: 'recharge_amount',
    key: 'recharge_amount',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
  },
  {
    title: '提成比例',
    dataIndex: 'commission_rate',
    key: 'commission_rate',
    customRender: ({ text }: { text: number }) => `${(text * 100).toFixed(2)}%`,
  },
  {
    title: '提成金额',
    dataIndex: 'commission_amount',
    key: 'commission_amount',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ text }: { text: string }) => {
      const statusMap = {
        pending: { color: 'orange', text: '待处理' },
        available: { color: 'green', text: '可提现' },
        withdrawn: { color: 'blue', text: '已提现' },
      }
      const statusInfo = statusMap[text as keyof typeof statusMap]
      return h(resolveComponent('a-tag'), { color: statusInfo.color }, statusInfo.text)
    },
  },
  {
    title: '充值时间',
    dataIndex: 'recharge_time',
    key: 'recharge_time',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
])

// 提现记录表格列
const withdrawalColumns = computed(() => [
  {
    title: '提现金额',
    dataIndex: 'amount',
    key: 'amount',
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
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
  },
  {
    title: '处理时间',
    dataIndex: 'updated_at',
    key: 'updated_at',
    customRender: ({ text, record }: { text: string; record: WithdrawalRecord }) =>
      record.status !== 'pending' ? new Date(text).toLocaleString() : '-',
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
  },
])

onMounted(() => {
  fetchStats()
  fetchRecords()
  fetchWithdrawals()
})
</script>
