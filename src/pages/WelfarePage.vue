<template>
  <div class="welfare-page">
    <div class="welfare-container">
      <div v-if="activeTab === 'daily'" class="mini-program-notice" role="alert">
        <img src="/icons/wechat.svg" alt="" class="mini-program-notice__icon" />
        <div class="mini-program-notice__content">
          <div class="mini-program-notice__title">日常福利已移到微信小程序</div>
          <div>请前往微信 → 发现 → 小程序，搜索“花园龟龟”</div>
        </div>
      </div>

      <!-- 标签切换 -->
      <a-tabs v-model:activeKey="activeTab" centered>
        <a-tab-pane key="daily" tab="日常福利" v-if="lotteryInfo.dailyEnabled">
          <div class="tab-content">
            <!-- 日常福利次数显示 -->
            <a-alert
              :message="`剩余次数: ${lotteryInfo.canDailyDraw ? 1 : 0} 次`"
              :type="lotteryInfo.canDailyDraw ? 'success' : 'info'"
              show-icon
              style="margin-bottom: 20px"
            >
              <template #description v-if="!lotteryInfo.canDailyDraw">
                今天已经转盘过了，明天再来吧！
              </template>
            </a-alert>

            <!-- 选择游戏账号 -->
            <div v-if="lotteryInfo.canDailyDraw" class="account-selector">
              <a-form layout="vertical">
                <a-form-item label="选择未过期的游戏账号（奖励将发放到此账号）">
                  <a-select
                    v-model:value="selectedAccountId"
                    placeholder="请选择游戏账号"
                    size="large"
                    :options="accountOptions"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-form>
            </div>

            <!-- 转盘 -->
            <LotteryWheel
              ref="dailyWheelRef"
              :prizes="dailyPrizes"
              :can-draw="lotteryInfo.canDailyDraw && !!selectedAccountId"
              redirect-to-mini-program
              mini-program-name="花园龟龟"
              button-text="开始"
              @draw="handleDailyDraw"
              @confirm="handlePrizeConfirm"
            />

            <div class="tab-mini-program-entry" aria-label="微信小程序福利">
              <div class="tab-mini-program-entry__badge">
                <img src="/icons/wechat.svg" alt="微信小程序" />
                <span>3/3</span>
              </div>
              <div>
                <div class="tab-mini-program-entry__title">看视频请前往“花园龟龟”</div>
                <div class="tab-mini-program-entry__text">微信 → 发现 → 小程序，搜索“花园龟龟”</div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="recharge" tab="充值福利（限时）" v-if="lotteryInfo.rechargeEnabled">
          <div class="tab-content">
            <!-- 抽奖次数显示 -->
            <a-alert
              :message="`剩余次数: ${lotteryInfo.rechargeLotteryCount} 次`"
              :type="lotteryInfo.rechargeLotteryCount > 0 ? 'success' : 'warning'"
              show-icon
              style="margin-bottom: 20px"
            >
              <template #description>
                <div v-if="lotteryInfo.rechargeLotteryCount <= 0">
                  充值套餐可获得抽奖次数，快去充值吧！
                </div>
              </template>
            </a-alert>

            <!-- 选择游戏账号（必选） -->
            <div v-if="lotteryInfo.rechargeLotteryCount > 0" class="account-selector">
              <a-form layout="vertical">
                <a-form-item label="选择游戏账号（奖励将发放到此账号）">
                  <a-select
                    v-model:value="selectedRechargeAccountId"
                    placeholder="请选择游戏账号"
                    size="large"
                    :options="accountOptions"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-form>
            </div>

            <!-- 转盘 -->
            <LotteryWheel
              ref="rechargeWheelRef"
              :prizes="rechargePrizes"
              :can-draw="lotteryInfo.rechargeLotteryCount > 0 && !!selectedRechargeAccountId"
              redirect-to-mini-program
              mini-program-name="花园龟龟"
              button-text="开始"
              @draw="handleRechargeDraw"
              @confirm="handlePrizeConfirm"
            />

            <div class="tab-mini-program-entry" aria-label="微信小程序福利">
              <div class="tab-mini-program-entry__badge">
                <img src="/icons/wechat.svg" alt="微信小程序" />
                <span>3/3</span>
              </div>
              <div>
                <div class="tab-mini-program-entry__title">看视频请前往“花园龟龟”</div>
                <div class="tab-mini-program-entry__text">网页版本暂未开放，请在小程序中获取</div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 抽奖记录 -->
      <div class="lottery-records">
        <h3>我的记录</h3>
        <a-table
          :columns="recordColumns"
          :data-source="records"
          :loading="recordsLoading"
          :pagination="{
            current: recordPage,
            pageSize: 10,
            total: recordTotal,
            showSizeChanger: false,
            onChange: handleRecordPageChange,
          }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lottery_type'">
              <a-tag :color="record.lottery_type === 'daily' ? 'blue' : 'purple'">
                {{ record.lottery_type === 'daily' ? '日常' : '充值' }}
              </a-tag>
            </template>
            <template v-if="column.key === 'detail'">
              <span v-if="record.reward_type === 'time'">
                {{ record.lottery_type === 'daily' ? '【日常福利】' : '【充值福利】' }}获得{{
                  record.prize_name
                }}， 给【{{ record.account_server || '未知大区' }}】的【{{
                  record.account_nickname
                }}】增加了{{ record.reward_value }}小时游戏时长
                <span v-if="record.original_expire_time && record.new_expire_time">
                  （原到期时间：{{ record.original_expire_time }}，延长后到期时间：{{
                    record.new_expire_time
                  }}）
                </span>
              </span>
              <span v-else-if="record.reward_type === 'points'">
                {{ record.lottery_type === 'daily' ? '【日常福利】' : '【充值福利】' }}获得{{
                  record.prize_name
                }}， 获得{{ record.reward_value }}点数
                <span v-if="record.original_points !== null && record.new_points !== null">
                  （原点数：{{ record.original_points }}，新点数：{{ record.new_points }}）
                </span>
              </span>
              <span v-else>
                {{ record.lottery_type === 'daily' ? '【日常福利】' : '【充值福利】' }}获得{{
                  record.prize_name
                }}：{{ record.reward_value }}
              </span>
            </template>
            <template v-if="column.key === 'created_at'">
              {{ formatTime(record.created_at) }}
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import axios from '@/utils/axios'
import LotteryWheel from '@/components/LotteryWheel.vue'
import { updateUserBalance } from '@/utils/userUtils'

interface Prize {
  id: number
  prize_name: string
  reward_type: string
  reward_value: string
  probability: string
  type: string
}

interface Account {
  id: number
  nickname: string
  server_name: string
  expire_time: string
}

interface LotteryRecord {
  id: number
  lottery_type: string
  prize_name: string
  reward_type: string
  reward_value: string
  created_at: string
  account_nickname: string | null
  account_server: string | null
  original_expire_time: string | null
  new_expire_time: string | null
  original_points: number | null
  new_points: number | null
}

const activeTab = ref('daily')
const dailyWheelRef = ref()
const rechargeWheelRef = ref()

// 抽奖信息
const lotteryInfo = ref({
  dailyEnabled: false,
  rechargeEnabled: false,
  canDailyDraw: false,
  rechargeLotteryCount: 0,
  lastDailyTime: null,
})

// 奖品列表
const dailyPrizes = ref<Prize[]>([])
const rechargePrizes = ref<Prize[]>([])

// 游戏账号
const accounts = ref<Account[]>([])
const selectedAccountId = ref<number>()
const selectedRechargeAccountId = ref<number>()

const accountOptions = computed(() =>
  accounts.value.map((acc) => ({
    label: `${acc.server_name || '未知大区'} - ${acc.nickname} (${acc.expire_time})`,
    value: acc.id,
  }))
)

// 抽奖记录
const records = ref<LotteryRecord[]>([])
const recordsLoading = ref(false)
const recordPage = ref(1)
const recordTotal = ref(0)

const recordColumns = [
  { title: '类型', dataIndex: 'lottery_type', key: 'lottery_type', width: 80 },
  { title: '奖品', dataIndex: 'prize_name', key: 'prize_name', width: 100 },
  { title: '详情', key: 'detail', width: 300 },
  { title: '时间', key: 'created_at', width: 180 },
]

// 加载抽奖信息
const loadLotteryInfo = async () => {
  try {
    const response = await axios.get('/api/lottery/info')
    lotteryInfo.value = response.data
  } catch (error: any) {
    console.error('加载抽奖信息失败:', error)
    if (error.response?.status === 403) {
      message.error('您没有权限访问福利功能')
    }
  }
}

// 加载奖品列表
const loadPrizes = async () => {
  try {
    const response = await axios.get('/api/lottery/admin/prizes')
    const allPrizes = response.data.prizes || []
    dailyPrizes.value = allPrizes.filter((p: Prize) => p.type === 'daily' && p.is_active)
    rechargePrizes.value = allPrizes.filter((p: Prize) => p.type === 'recharge' && p.is_active)
  } catch (error) {
    console.error('加载奖品列表失败:', error)
  }
}

// 加载游戏账号
const loadAccounts = async () => {
  try {
    const response = await axios.get('/api/lottery/accounts')
    accounts.value = response.data.accounts || []
  } catch (error) {
    console.error('加载游戏账号失败:', error)
  }
}

// 加载抽奖记录
const loadRecords = async (page = 1) => {
  try {
    recordsLoading.value = true
    const response = await axios.get('/api/lottery/records', {
      params: { page, pageSize: 10 },
    })
    records.value = response.data.records || []
    recordTotal.value = response.data.total || 0
    recordPage.value = page
  } catch (error) {
    console.error('加载抽奖记录失败:', error)
  } finally {
    recordsLoading.value = false
  }
}

// 处理日常福利
const handleDailyDraw = async () => {
  if (!selectedAccountId.value) {
    message.warning('请先选择游戏账号')
    return
  }

  try {
    const response = await axios.post('/api/lottery/daily', {
      accountId: selectedAccountId.value,
    })

    const prize = response.data.prize

    if (prize.type === 'points') {
      setTimeout(() => {
        updateUserBalance()
      }, 3000)
    }

    // 找到中奖奖品的索引
    const prizeIndex = dailyPrizes.value.findIndex((p) => p.prize_name === prize.name)

    // 开始转盘动画
    dailyWheelRef.value?.startSpin(prizeIndex, prize)

    // 刷新信息
    await loadLotteryInfo()
    await loadRecords()
  } catch (error: any) {
    message.error(error.response?.data?.message || '抽奖失败')
  }
}

// 处理充值福利
const handleRechargeDraw = async () => {
  if (!selectedRechargeAccountId.value) {
    message.warning('请先选择游戏账号')
    return
  }

  try {
    const response = await axios.post('/api/lottery/recharge', {
      accountId: selectedRechargeAccountId.value,
    })

    const prize = response.data.prize

    if (prize.type === 'points') {
      setTimeout(() => {
        updateUserBalance()
      }, 3000)
    }

    // 找到中奖奖品的索引
    const prizeIndex = rechargePrizes.value.findIndex((p) => p.prize_name === prize.name)

    // 开始转盘动画
    rechargeWheelRef.value?.startSpin(prizeIndex, prize)

    // 更新剩余次数
    lotteryInfo.value.rechargeLotteryCount = response.data.remainingCount

    // 刷新记录
    await loadRecords()
  } catch (error: any) {
    message.error(error.response?.data?.message || '抽奖失败')
  }
}

// 分页切换
const handleRecordPageChange = (page: number) => {
  loadRecords(page)
}

// 处理奖品确认（刷新点数）
const handlePrizeConfirm = async (prize: any) => {
  if (prize && prize.type === 'points') {
    try {
      await updateUserBalance()
      message.success('点数已刷新')
    } catch (error) {
      console.error('刷新点数失败:', error)
    }
  }
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(async () => {
  await Promise.all([loadLotteryInfo(), loadPrizes(), loadAccounts(), loadRecords()])

  // 根据启用状态自动选择活动标签
  if (!lotteryInfo.value.dailyEnabled && lotteryInfo.value.rechargeEnabled) {
    activeTab.value = 'recharge'
  } else if (lotteryInfo.value.dailyEnabled) {
    activeTab.value = 'daily'
  }

  // 默认选中第一个账号（如果有）
  if (accounts.value.length > 0) {
    selectedAccountId.value = accounts.value[0].id
    selectedRechargeAccountId.value = accounts.value[0].id // 充值福利也默认选中
  }
})
</script>

<style scoped>
.welfare-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.welfare-container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.tab-content {
  position: relative;
  padding: 20px 0;
}

.mini-program-notice {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding: 18px 20px;
  border: 2px solid #ff4d4f;
  border-radius: 10px;
  background: #fff1f0;
  color: #cf1322;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.7;
}

.mini-program-notice__icon {
  flex: none;
  width: 46px;
  height: 46px;
}

.mini-program-notice__title {
  font-size: 18px;
  font-weight: 800;
}

.tab-mini-program-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  max-width: 100%;
  margin-top: 20px;
  padding: 10px 14px;
  border: 1px solid #ffccc7;
  border-radius: 10px;
  background: #fff7f6;
  color: #cf1322;
}

.tab-mini-program-entry__badge {
  position: relative;
  flex: none;
  width: 54px;
  height: 54px;
}

.tab-mini-program-entry__badge img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.tab-mini-program-entry__badge span {
  position: absolute;
  right: -4px;
  bottom: -4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
}

.tab-mini-program-entry__title {
  font-size: 14px;
  font-weight: 800;
}

.tab-mini-program-entry__text {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.account-selector {
  max-width: 500px;
  margin: 0 auto 30px;
}

.lottery-records {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 2px solid #f0f0f0;
}

.lottery-records h3 {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .welfare-page {
    padding: 10px;
  }

  .welfare-container {
    padding: 20px 15px;
  }

  .mini-program-notice {
    align-items: flex-start;
    padding: 15px;
    font-size: 14px;
  }

  .mini-program-notice__icon {
    width: 40px;
    height: 40px;
  }

  .mini-program-notice__title {
    font-size: 16px;
  }

  .tab-mini-program-entry {
    align-items: flex-start;
  }
}
</style>
