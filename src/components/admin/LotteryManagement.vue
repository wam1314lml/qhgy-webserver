<template>
  <a-card>
    <div class="lottery-management">
      <!-- 系统设置 -->
      <a-card title="系统设置" style="margin-bottom: 20px">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="日常福利">
                <a-switch
                  v-model:checked="settings.daily_enabled"
                  @change="handleSaveSettings"
                  checked-children="启用"
                  un-checked-children="禁用"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="充值福利">
                <a-switch
                  v-model:checked="settings.recharge_enabled"
                  @change="handleSaveSettings"
                  checked-children="启用"
                  un-checked-children="禁用"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-card>

      <!-- 奖池管理 -->
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="daily" tab="日常奖池">
          <div class="prize-section">
            <div class="section-header">
              <a-button
                type="primary"
                @click="handleAddPrize('daily')"
                :disabled="dailyPrizes.length >= 12"
              >
                <PlusOutlined />
                添加奖品
              </a-button>
              <span v-if="dailyPrizes.length >= 12" style="color: #ff4d4f; margin-left: 10px">
                最多12个奖品
              </span>
            </div>

            <a-table
              :columns="prizeColumns"
              :data-source="dailyPrizes"
              :loading="loading"
              row-key="id"
              :pagination="false"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'reward'">
                  <span v-if="record.reward_type === 'time'"
                    >时长 {{ record.reward_value }}小时</span
                  >
                  <span v-else-if="record.reward_type === 'points'"
                    >点数 {{ record.reward_value }}</span
                  >
                  <span v-else>{{ record.reward_value }}</span>
                </template>
                <template v-if="column.key === 'is_active'">
                  <a-switch :checked="record.is_active" @change="handleToggleActive(record)" />
                </template>
                <template v-if="column.key === 'action'">
                  <a-space>
                    <a-button type="link" size="small" @click="handleEditPrize(record)">
                      编辑
                    </a-button>
                    <a-popconfirm
                      title="确定删除这个奖品吗？"
                      @confirm="handleDeletePrize(record.id)"
                    >
                      <a-button type="link" danger size="small">删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <a-tab-pane key="recharge" tab="充值奖池">
          <div class="prize-section">
            <div class="section-header">
              <a-button
                type="primary"
                @click="handleAddPrize('recharge')"
                :disabled="rechargePrizes.length >= 12"
              >
                <PlusOutlined />
                添加奖品
              </a-button>
              <span v-if="rechargePrizes.length >= 12" style="color: #ff4d4f; margin-left: 10px">
                最多12个奖品
              </span>
            </div>

            <a-table
              :columns="prizeColumns"
              :data-source="rechargePrizes"
              :loading="loading"
              row-key="id"
              :pagination="false"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'reward'">
                  <span v-if="record.reward_type === 'time'"
                    >时长 {{ record.reward_value }}小时</span
                  >
                  <span v-else-if="record.reward_type === 'points'"
                    >点数 {{ record.reward_value }}</span
                  >
                  <span v-else>{{ record.reward_value }}</span>
                </template>
                <template v-if="column.key === 'is_active'">
                  <a-switch :checked="record.is_active" @change="handleToggleActive(record)" />
                </template>
                <template v-if="column.key === 'action'">
                  <a-space>
                    <a-button type="link" size="small" @click="handleEditPrize(record)">
                      编辑
                    </a-button>
                    <a-popconfirm
                      title="确定删除这个奖品吗？"
                      @confirm="handleDeletePrize(record.id)"
                    >
                      <a-button type="link" danger size="small">删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 福利记录 -->
      <a-card title="福利记录" style="margin-top: 20px">
        <!-- 搜索表单 -->
        <a-form layout="inline" style="margin-bottom: 16px">
          <a-form-item label="用户名">
            <a-input
              v-model:value="searchForm.username"
              placeholder="输入用户名搜索"
              style="width: 180px"
              @pressEnter="handleSearch"
            />
          </a-form-item>

          <a-form-item label="福利类型">
            <a-select
              v-model:value="searchForm.type"
              placeholder="全部"
              style="width: 120px"
              allowClear
            >
              <a-select-option value="daily">日常福利</a-select-option>
              <a-select-option value="recharge">充值福利</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="奖励类型">
            <a-select
              v-model:value="searchForm.rewardType"
              placeholder="全部"
              style="width: 120px"
              allowClear
            >
              <a-select-option value="time">时间</a-select-option>
              <a-select-option value="points">点数</a-select-option>
              <a-select-option value="text">文本</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="日期范围">
            <a-range-picker
              v-model:value="searchForm.dateRange"
              style="width: 240px"
              :show-time="false"
              format="YYYY-MM-DD"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch" :loading="recordsLoading">
                搜索
              </a-button>
              <a-button @click="handleResetSearch"> 重置 </a-button>
            </a-space>
          </a-form-item>
        </a-form>

        <!-- 操作按钮 -->
        <a-space style="margin-bottom: 16px">
          <a-button @click="handleCleanOldRecords" :loading="cleaning" danger>
            清理2个月前的记录
          </a-button>
          <a-button @click="handleRefreshRecords" :loading="recordsLoading"> 刷新 </a-button>
          <a-alert
            message="提示：默认只显示最近的记录，请使用搜索功能查找特定记录"
            type="info"
            show-icon
            closable
          />
        </a-space>

        <a-table
          :columns="recordColumns"
          :data-source="records"
          :loading="recordsLoading"
          row-key="id"
          :pagination="{
            current: recordPage,
            pageSize: recordPageSize,
            total: recordTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['20', '50', '100'],
            onChange: handleRecordPageChange,
            onShowSizeChange: handleRecordPageSizeChange,
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lottery_type'">
              <a-tag :color="record.lottery_type === 'daily' ? 'blue' : 'purple'">
                {{ record.lottery_type === 'daily' ? '日常' : '充值' }}
              </a-tag>
            </template>
            <template v-if="column.key === 'reward'">
              <span v-if="record.reward_type === 'time'">时长 +{{ record.reward_value }}h</span>
              <span v-else-if="record.reward_type === 'points'"
                >点数 +{{ record.reward_value }}</span
              >
              <span v-else>{{ record.reward_value }}</span>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 奖品编辑弹窗 -->
    <a-modal
      v-model:open="prizeModalOpen"
      :title="editingPrize ? '编辑奖品' : '添加奖品'"
      @ok="handleSavePrize"
      @cancel="prizeModalOpen = false"
    >
      <a-form :model="prizeForm" layout="vertical">
        <a-form-item label="奖品名称" required>
          <a-input v-model:value="prizeForm.prize_name" placeholder="例如：48小时游戏时长" />
        </a-form-item>

        <a-form-item label="奖励类型" required>
          <a-select v-model:value="prizeForm.reward_type">
            <a-select-option value="time">时间延长</a-select-option>
            <a-select-option value="points">点数</a-select-option>
            <a-select-option value="text">纯文本</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="奖励值" required>
          <a-input
            v-model:value="prizeForm.reward_value"
            :placeholder="getRewardValuePlaceholder()"
          />
          <div style="color: #999; font-size: 12px; margin-top: 4px">
            {{ getRewardValueHint() }}
          </div>
        </a-form-item>

        <a-form-item label="中奖权重" required>
          <a-input-number
            v-model:value="prizeForm.probability"
            :min="0.01"
            :step="0.1"
            :precision="2"
            style="width: 100%"
            placeholder="数字越大中奖概率越高"
          />
        </a-form-item>

        <a-form-item label="排序">
          <a-input-number
            v-model:value="prizeForm.sort_order"
            :min="0"
            style="width: 100%"
            placeholder="数字越小越靠前"
          />
        </a-form-item>

        <a-form-item label="状态">
          <a-switch v-model:checked="prizeForm.is_active" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import axios from '@/utils/axios'

interface Props {
  token: string
}

const props = defineProps<Props>()

const activeTab = ref('daily')
const loading = ref(false)
const cleaning = ref(false)
const recordsLoading = ref(false)

// 系统设置
const settings = ref({
  daily_enabled: false,
  recharge_enabled: false,
})

// 奖品列表
const dailyPrizes = ref<any[]>([])
const rechargePrizes = ref<any[]>([])

// 奖品编辑
const prizeModalOpen = ref(false)
const editingPrize = ref<any>(null)
const prizeForm = ref({
  type: 'daily',
  prize_name: '',
  reward_type: 'time',
  reward_value: '',
  probability: 10,
  sort_order: 0,
  is_active: true,
})

// 福利记录
const records = ref<any[]>([])
const recordPage = ref(1)
const recordPageSize = ref(20)
const recordTotal = ref(0)

// 搜索表单
const searchForm = ref({
  username: '',
  type: undefined,
  rewardType: undefined,
  dateRange: undefined as any,
})

const prizeColumns = [
  { title: '奖品名称', dataIndex: 'prize_name', key: 'prize_name' },
  { title: '奖励', key: 'reward' },
  { title: '权重', dataIndex: 'probability', key: 'probability' },
  { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
  { title: '状态', key: 'is_active', width: 100 },
  { title: '操作', key: 'action', width: 150 },
]

const recordColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '用户', dataIndex: 'username', key: 'username' },
  { title: '类型', key: 'lottery_type', width: 100 },
  { title: '奖品', dataIndex: 'prize_name', key: 'prize_name' },
  { title: '奖励', key: 'reward' },
  { title: '游戏账号', dataIndex: 'account_nickname', key: 'account_nickname' },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
]

// 加载系统设置
const loadSettings = async () => {
  try {
    const response = await axios.get('/api/lottery/admin/settings')
    settings.value = response.data
  } catch (error) {
    console.error('加载系统设置失败:', error)
  }
}

// 保存系统设置
const handleSaveSettings = async () => {
  try {
    await axios.put('/api/lottery/admin/settings', settings.value)
    message.success('设置已保存')
  } catch (error: any) {
    message.error(error.response?.data?.message || '保存失败')
  }
}

// 加载奖品列表
const loadPrizes = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/lottery/admin/prizes')
    const prizes = response.data.prizes || []
    dailyPrizes.value = prizes.filter((p: any) => p.type === 'daily')
    rechargePrizes.value = prizes.filter((p: any) => p.type === 'recharge')
  } catch (error) {
    message.error('加载奖品列表失败')
  } finally {
    loading.value = false
  }
}

// 添加奖品
const handleAddPrize = (type: string) => {
  editingPrize.value = null
  prizeForm.value = {
    type,
    prize_name: '',
    reward_type: 'time',
    reward_value: '',
    probability: 10,
    sort_order: 0,
    is_active: true,
  }
  prizeModalOpen.value = true
}

// 编辑奖品
const handleEditPrize = (prize: any) => {
  editingPrize.value = prize
  prizeForm.value = {
    type: prize.type,
    prize_name: prize.prize_name,
    reward_type: prize.reward_type,
    reward_value: prize.reward_value,
    probability: parseFloat(prize.probability),
    sort_order: prize.sort_order,
    is_active: prize.is_active,
  }
  prizeModalOpen.value = true
}

// 保存奖品
const handleSavePrize = async () => {
  if (
    !prizeForm.value.prize_name ||
    !prizeForm.value.reward_value ||
    !prizeForm.value.probability
  ) {
    message.warning('请填写完整信息')
    return
  }

  try {
    if (editingPrize.value) {
      await axios.put(`/api/lottery/admin/prizes/${editingPrize.value.id}`, prizeForm.value)
      message.success('更新成功')
    } else {
      await axios.post('/api/lottery/admin/prizes', prizeForm.value)
      message.success('添加成功')
    }

    prizeModalOpen.value = false
    await loadPrizes()
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
  }
}

// 删除奖品
const handleDeletePrize = async (id: number) => {
  try {
    await axios.delete(`/api/lottery/admin/prizes/${id}`)
    message.success('删除成功')
    await loadPrizes()
  } catch (error: any) {
    message.error(error.response?.data?.message || '删除失败')
  }
}

// 切换启用状态
const handleToggleActive = async (prize: any) => {
  try {
    const newStatus = !prize.is_active
    await axios.put(`/api/lottery/admin/prizes/${prize.id}`, {
      is_active: newStatus,
    })
    message.success(newStatus ? '已启用' : '已禁用')
    await loadPrizes()
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
    // 重新加载数据以恢复状态
    await loadPrizes()
  }
}

// 加载福利记录
const loadRecords = async (page = 1) => {
  try {
    recordsLoading.value = true

    // 构建查询参数
    const params: any = {
      page,
      pageSize: recordPageSize.value,
    }

    // 添加搜索条件
    if (searchForm.value.username) {
      params.username = searchForm.value.username
    }
    if (searchForm.value.type) {
      params.type = searchForm.value.type
    }
    if (searchForm.value.rewardType) {
      params.rewardType = searchForm.value.rewardType
    }
    if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
      params.startDate = searchForm.value.dateRange[0].format('YYYY-MM-DD 00:00:00')
      params.endDate = searchForm.value.dateRange[1].format('YYYY-MM-DD 23:59:59')
    }

    const response = await axios.get('/api/lottery/admin/records', { params })
    records.value = response.data.records || []
    recordTotal.value = response.data.total || 0
    recordPage.value = page
  } catch (error) {
    message.error('加载福利记录失败')
  } finally {
    recordsLoading.value = false
  }
}

// 搜索
const handleSearch = () => {
  recordPage.value = 1
  loadRecords(1)
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.value = {
    username: '',
    type: undefined,
    rewardType: undefined,
    dateRange: undefined,
  }
  recordPage.value = 1
  loadRecords(1)
}

// 刷新当前页
const handleRefreshRecords = () => {
  loadRecords(recordPage.value)
}

// 清理旧记录
const handleCleanOldRecords = async () => {
  try {
    cleaning.value = true
    const response = await axios.post('/api/lottery/admin/clean-old')
    message.success(`已清理 ${response.data.deletedCount} 条记录`)
    // 清理后重置到第1页
    recordPage.value = 1
    await loadRecords(1)
  } catch (error: any) {
    message.error(error.response?.data?.message || '清理失败')
  } finally {
    cleaning.value = false
  }
}

// 分页切换
const handleRecordPageChange = (page: number) => {
  loadRecords(page)
}

// 分页大小切换
const handleRecordPageSizeChange = (current: number, size: number) => {
  recordPageSize.value = size
  recordPage.value = 1
  loadRecords(1)
}

// 获取奖励值占位符
const getRewardValuePlaceholder = () => {
  switch (prizeForm.value.reward_type) {
    case 'time':
      return '例如：48'
    case 'points':
      return '例如：100'
    case 'text':
      return '例如：谢谢参与'
    default:
      return ''
  }
}

// 获取奖励值提示
const getRewardValueHint = () => {
  switch (prizeForm.value.reward_type) {
    case 'time':
      return '单位：小时'
    case 'points':
      return '单位：点数'
    case 'text':
      return '纯文本，不发放实际奖励'
    default:
      return ''
  }
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadPrizes(), loadRecords()])
})
</script>

<style scoped>
.lottery-management {
  padding: 20px 0;
}

.section-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prize-section {
  padding: 20px 0;
}
</style>
