<template>
  <div class="recharge-statistics p-6 bg-gray-50 min-h-full">
    <!-- 统计概览卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <a-card class="overview-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm mb-1">今日充值</p>
            <h3 class="text-2xl font-bold text-blue-600 mb-1">
              ¥{{ formatNumber(overview.today.amount + overview.today.cardkey.amount) }}
            </h3>
            <p class="text-gray-500 text-xs mb-2">{{ overview.today.count + overview.today.cardkey.count }} 笔（含卡密 {{ overview.today.cardkey.count }} 张）</p>
            <div class="flex flex-wrap gap-2">
              <a-tag color="green" style="margin:0">
                微信 ¥{{ formatNumber(overview.today.channels.wechat.amount) }}（{{ overview.today.channels.wechat.count }}笔）
              </a-tag>
              <a-tag color="blue" style="margin:0">
                支付宝 ¥{{ formatNumber(overview.today.channels.alipay.amount) }}（{{ overview.today.channels.alipay.count }}笔）
              </a-tag>
              <a-tag color="orange" style="margin:0">
                盛付通 ¥{{ formatNumber(overview.today.channels.shengpay.amount) }}（{{ overview.today.channels.shengpay.count }}笔）
              </a-tag>
              <a-tag color="purple" style="margin:0">
                拉卡拉 ¥{{ formatNumber(overview.today.channels.lakalapay.amount) }}（{{ overview.today.channels.lakalapay.count }}笔）
              </a-tag>
              <a-tag color="cyan" style="margin:0" v-if="overview.today.cardkey.count > 0">
                卡密 ¥{{ formatNumber(overview.today.cardkey.amount) }}（{{ overview.today.cardkey.count }}张）
              </a-tag>
            </div>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <CalendarOutlined class="text-2xl text-blue-600" />
          </div>
        </div>
      </a-card>

      <a-card class="overview-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm mb-1">本月充值</p>
            <h3 class="text-2xl font-bold text-green-600 mb-1">
              ¥{{ formatNumber(overview.month.amount + overview.month.cardkey.amount) }}
            </h3>
            <p class="text-gray-500 text-xs">{{ overview.month.count + overview.month.cardkey.count }} 笔（含卡密 {{ overview.month.cardkey.count }} 张）</p>
            <a-tag v-if="overview.month.cardkey.count > 0" color="cyan" style="margin-top:4px;margin:4px 0 0">
              卡密 ¥{{ formatNumber(overview.month.cardkey.amount) }}（{{ overview.month.cardkey.count }}张）
            </a-tag>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <FileTextOutlined class="text-2xl text-green-600" />
          </div>
        </div>
      </a-card>

      <a-card class="overview-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm mb-1">历史总计</p>
            <h3 class="text-2xl font-bold text-purple-600 mb-1">
              ¥{{ formatNumber(overview.total.amount + overview.total.cardkey.amount) }}
            </h3>
            <p class="text-gray-500 text-xs">{{ overview.total.count + overview.total.cardkey.count }} 笔（含卡密 {{ overview.total.cardkey.count }} 张）</p>
            <a-tag v-if="overview.total.cardkey.count > 0" color="cyan" style="margin-top:4px;margin:4px 0 0">
              卡密 ¥{{ formatNumber(overview.total.cardkey.amount) }}（{{ overview.total.cardkey.count }}张）
            </a-tag>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <DollarCircleOutlined class="text-2xl text-purple-600" />
          </div>
        </div>
      </a-card>
    </div>

    <!-- 月度统计表格 -->
    <a-card title="月度充值统计" class="shadow-sm">
      <template #extra>
        <a-button @click="refreshMonthlyData" :loading="monthlyLoading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </template>

      <custom-table
        :dataSource="monthlyStatistics"
        :columns="monthlyColumns"
        :pagination="monthlyPagination"
        :loading="monthlyLoading"
        @change="handleMonthlyTableChange"
        row-key="month_name"
        size="middle"
        class="mt-4"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'month_name'">
            <a-button
              type="link"
              @click="showMonthDetails(record.year, record.month)"
              class="p-0 h-auto font-medium text-blue-600"
            >
              {{ record.month_name }}
            </a-button>
          </template>

          <template v-if="column.key === 'total_amount'">
            <span class="font-medium text-green-600">
              ¥{{ formatNumber(record.total_amount) }}
            </span>
          </template>

          <template v-if="column.key === 'total_count'">
            <a-tag color="blue">{{ record.total_count }} 笔</a-tag>
          </template>

          <template v-if="column.key === 'unique_users'">
            <a-tag color="green">{{ record.unique_users }} 人</a-tag>
          </template>

          <template v-if="column.key === 'avg_amount'">
            <span class="text-gray-600">¥{{ formatNumber(record.avg_amount) }}</span>
          </template>

          <template v-if="column.key === 'range'">
            <span class="text-xs text-gray-500">
              ¥{{ formatNumber(record.min_amount) }} - ¥{{ formatNumber(record.max_amount) }}
            </span>
          </template>

          <template v-if="column.key === 'action'">
            <a-button
              type="primary"
              size="small"
              @click="showMonthDetails(record.year, record.month)"
              class="text-xs"
            >
              详情
            </a-button>
          </template>
        </template>
      </custom-table>
    </a-card>

    <!-- 月度详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      :title="`${detailYear}年${detailMonth}月充值详情`"
      width="90%"
      :max-width="1200"
      :footer="null"
      centered
      :body-style="{ height: '80vh', padding: '16px' }"
    >
      <custom-table
        :dataSource="monthlyDetails"
        :columns="detailColumns"
        :pagination="detailPagination"
        :loading="detailLoading"
        @change="handleDetailTableChange"
        row-key="id"
        size="small"
        :scroll="{ x: 800, y: 'calc(80vh - 120px)' }"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'amount'">
            <span class="font-medium text-green-600"> ¥{{ formatNumber(record.amount) }} </span>
          </template>

          <template v-if="column.key === 'points'">
            <a-tag color="gold">{{ record.points }} 点</a-tag>
          </template>

          <template v-if="column.key === 'payment_method'">
            <a-tag :color="getPaymentMethodColor(record.payment_method)">
              {{ getPaymentMethodText(record.payment_method) }}
            </a-tag>
          </template>

          <template v-if="column.key === 'status'">
            <a-tag color="success">已完成</a-tag>
          </template>

          <template v-if="column.key === 'created_at'">
            <span class="text-gray-600">
              {{ formatDate(record.created_at) }}
            </span>
          </template>
        </template>
      </custom-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  CalendarOutlined,
  FileTextOutlined,
  DollarCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import axios from '../utils/axios'
import type { TableColumnType } from 'ant-design-vue'
import CustomTable from './CustomTable.vue'

// 数据接口定义
interface ChannelData { amount: number; count: number }
interface OverviewData {
  today: { amount: number; count: number; channels: { wechat: ChannelData; alipay: ChannelData; shengpay: ChannelData; lakalapay: ChannelData }; cardkey: ChannelData }
  month: { amount: number; count: number; cardkey: ChannelData }
  total: { amount: number; count: number; cardkey: ChannelData }
}

interface MonthlyStatistic {
  year: number
  month: number
  month_name: string
  total_amount: number
  total_count: number
  unique_users: number
  avg_amount: number
  min_amount: number
  max_amount: number
}

interface RechargeRecord {
  id: number
  user_id: number
  username: string
  email: string
  amount: number
  points: number
  payment_method: string
  status: string
  created_at: string
}

// 响应式数据
const overview = reactive<OverviewData>({
  today: { amount: 0, count: 0, channels: { wechat: { amount: 0, count: 0 }, alipay: { amount: 0, count: 0 }, shengpay: { amount: 0, count: 0 }, lakalapay: { amount: 0, count: 0 } }, cardkey: { amount: 0, count: 0 } },
  month: { amount: 0, count: 0, cardkey: { amount: 0, count: 0 } },
  total: { amount: 0, count: 0, cardkey: { amount: 0, count: 0 } },
})

const monthlyStatistics = ref<MonthlyStatistic[]>([])
const monthlyLoading = ref(false)
const monthlyPagination = reactive({
  current: 1,
  pageSize: 12,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

const monthlyDetails = ref<RechargeRecord[]>([])
const detailModalVisible = ref(false)
const detailLoading = ref(false)
const detailYear = ref<number>(0)
const detailMonth = ref<number>(0)

const detailPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

// 表格列定义
const monthlyColumns: TableColumnType[] = [
  {
    title: '月份',
    dataIndex: 'month_name',
    key: 'month_name',
    width: 120,
  },
  {
    title: '充值金额',
    dataIndex: 'total_amount',
    key: 'total_amount',
    width: 120,
    sorter: true,
    align: 'right',
  },
  {
    title: '充值笔数',
    dataIndex: 'total_count',
    key: 'total_count',
    width: 100,
    sorter: true,
    align: 'center',
  },
  {
    title: '充值用户',
    dataIndex: 'unique_users',
    key: 'unique_users',
    width: 100,
    align: 'center',
  },
  {
    title: '平均金额',
    dataIndex: 'avg_amount',
    key: 'avg_amount',
    width: 120,
    align: 'right',
  },
  {
    title: '金额范围',
    key: 'range',
    width: 140,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    align: 'center',
  },
]

const detailColumns: TableColumnType[] = [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 120,
    fixed: 'left',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: 200,
    ellipsis: true,
  },
  {
    title: '充值金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right',
  },
  {
    title: '获得点数',
    dataIndex: 'points',
    key: 'points',
    width: 120,
    align: 'center',
  },
  {
    title: '支付方式',
    dataIndex: 'payment_method',
    key: 'payment_method',
    width: 120,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: '充值时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    align: 'center',
  },
]

// API 调用函数
const fetchOverview = async () => {
  const { data } = await axios.get('/api/admin/recharge-statistics')
  Object.assign(overview, data.data)
}

const fetchMonthlyStatistics = async () => {
  monthlyLoading.value = true
  const { data } = await axios.get('/api/admin/monthly-recharge-statistics', {
    params: {
      page: monthlyPagination.current,
      pageSize: monthlyPagination.pageSize,
    },
  })

  monthlyStatistics.value = data.data.statistics
  monthlyPagination.total = data.data.total
  monthlyLoading.value = false
}

const fetchMonthlyDetails = async (year: number, month: number) => {
  detailLoading.value = true
  const { data } = await axios.get(`/api/admin/monthly-recharge-details/${year}/${month}`, {
    params: {
      page: detailPagination.current,
      pageSize: detailPagination.pageSize,
    },
  })

  monthlyDetails.value = data.data.records
  detailPagination.total = data.data.total
  detailLoading.value = false
}

// 事件处理函数
const handleMonthlyTableChange = (pagination: any) => {
  monthlyPagination.current = pagination.current
  monthlyPagination.pageSize = pagination.pageSize
  fetchMonthlyStatistics()
}

const handleDetailTableChange = (pagination: any) => {
  detailPagination.current = pagination.current
  detailPagination.pageSize = pagination.pageSize
  fetchMonthlyDetails(detailYear.value, detailMonth.value)
}

const showMonthDetails = async (year: number, month: number) => {
  detailYear.value = year
  detailMonth.value = month
  detailModalVisible.value = true
  detailPagination.current = 1
  await fetchMonthlyDetails(year, month)
}

const refreshMonthlyData = async () => {
  await Promise.all([fetchOverview(), fetchMonthlyStatistics()])
}

// 工具函数
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getPaymentMethodColor = (method: string): string => {
  const colorMap: Record<string, string> = {
    wechat: 'green',
    alipay: 'blue',
    shengpay: 'orange',
    lakalapay: 'purple',
    bank: 'orange',
    cardkey: 'cyan',
  }
  return colorMap[method] || 'default'
}

const getPaymentMethodText = (method: string): string => {
  const textMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    shengpay: '盛付通',
    lakalapay: '拉卡拉',
    bank: '银行转账',
    cardkey: '卡密兑换',
  }
  return textMap[method] || method
}

// 初始化
onMounted(async () => {
  await Promise.all([fetchOverview(), fetchMonthlyStatistics()])
})
</script>
