<template>
  <div v-if="user" class="profile-wrapper">
    <!-- 顶部导航栏 -->
    <a-affix :offset-top="0">
      <TopNavBar title="个人中心" :showBackButton="true" @back="handleBackToDashboard" @personal-center="() => { }" />
    </a-affix>

    <!-- 个人中心内容 -->
    <div class="profile-container">
      <div class="profile-content">
        <!-- 用户信息卡片 - 所有用户都显示 -->
        <div class="user-info-card">
          <!-- 用户基本信息区域 -->
          <div class="user-info-content">
            <!-- 左侧头像 -->
            <UserAvatar :username="user?.username" size="large" />

            <!-- 右侧用户信息 -->
            <div class="user-details">
              <div class="user-details-row">
                <span class="username-display">{{ user?.username }}</span>
              </div>
              <!-- 邀请码显示 - 仅有邀请权限的用户显示 -->
              <div class="user-details-row">
                <span class="invite-code-display">{{ inviteInfo?.invite_code || 'N/A' }}</span>
                <a-button type="text" size="small" class="help-button" @click="showHelpMessage">
                  <template #icon>
                    <QuestionCircleOutlined />
                  </template>
                </a-button>
                <a-button type="text" size="small" class="copy-link-button" @click="copyInviteLink">
                  <template #icon>
                    <CopyOutlined />
                  </template>
                </a-button>
              </div>
            </div>
          </div>

          <!-- 统计信息区域 -->
          <div class="stats-section">
            <!-- 推广人数 - 仅有邀请权限的用户显示 -->
            <div class="stat-item">
              <span class="stat-value">{{ inviteInfo?.total_invites || 0 }}</span>
              <span class="stat-label">推广人数</span>
            </div>
            <!-- 我的点数 - 所有用户都显示 -->
            <div class="stat-item">
              <span class="stat-value">{{ formatAmount(currentPoints) }}</span>
              <span class="stat-label">我的点数</span>
            </div>
          </div>

          <!-- 邀请相关功能 - 仅有邀请权限的用户显示 -->
          <div v-if="inviteInfo" class="invite-features">
            <div class="invite-link-section">
              <label>邀请链接：</label>
              <div class="invite-link-container">
                <a-input-group compact>
                  <a-input type="text" :value="`${baseUrl}/login?invite=${inviteInfo.invite_code}`" readonly
                    class="invite-link-input" style="width: calc(100% - 64px)" />
                  <a-button class="copy-button" type="primary" @click="copyInviteLink">
                    复制
                  </a-button>
                </a-input-group>
              </div>
            </div>

            <div v-if="inviteInfo.invited_users?.length > 0" class="invited-users">
              <h4>邀请的用户</h4>
              <div class="invited-list">
                <div v-for="invitedUser in inviteInfo.invited_users.slice(0, 5)" :key="invitedUser.id"
                  class="invited-user">
                  <span class="invited-username">{{ invitedUser.username }}</span>
                  <span class="invited-date">
                    {{ formatDate(invitedUser.created_at) }}
                  </span>
                </div>
                <div v-if="inviteInfo.invited_users.length > 5" class="more-invites">
                  还有 {{ inviteInfo.invited_users.length - 5 }} 人...
                </div>
              </div>
            </div>
          </div>
          <div v-else class="loading h-[80px] flex items-center justify-center">
            加载邀请信息中...
          </div>
        </div>

        <!-- 服务中心 -->
        <div class="service-card">
          <div class="service-content">
            <div class="service-grid">
              <div class="service-item" @click="showCustomerService">
                <div class="service-icon">
                  <WechatOutlined />
                </div>
                <div class="service-text">售后群</div>
              </div>
              <div class="service-item" @click="showChangePasswordModal">
                <div class="service-icon">
                  <LockFilled />
                </div>
                <div class="service-text">修改密码</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 卡密兑换 -->
        <div class="transactions-card">
          <div class="transactions-header">
            <h3>卡密兑换</h3>
          </div>
          <div style="padding: 12px 0;">
            <a-input-search v-model:value="redeemCode" placeholder="请输入16位卡密（区分大小写）" enter-button="立即兑换"
              :loading="redeeming" size="large" @search="handleRedeem" />
            <p class="text-gray-400 text-xs mt-2">兑换成功后配额将立即到账，每张卡密只能兑换一次。</p>
          </div>
        </div>

        <!-- 福利卡 -->
        <div class="transactions-card">
          <div class="transactions-header">
            <h3>福利卡</h3>
            <a-button class="refresh-button" type="primary" @click="fetchWelfareCards">刷新</a-button>
          </div>
          <div class="transactions-list">
            <template v-if="welfareCards.length > 0">
              <div v-for="card in welfareCards" :key="card.id" class="transaction-item">
                <div class="transaction-info">
                  <div class="transaction-type font-mono font-bold text-sm">{{ card.code }}</div>
                  <div class="transaction-description text-gray-500">{{ card.label }} · {{ card.points }} 配额</div>
                  <div class="transaction-meta">获得于 {{ formatDate(card.created_at) }}</div>
                </div>
                <div class="transaction-amount">
                  <a-tag :color="card.status === 'used' ? 'default' : 'green'">
                    {{ card.status === 'used' ? '已兑换' : '未兑换' }}
                  </a-tag>
                </div>
              </div>
            </template>
            <div v-else class="no-transactions">暂无福利卡</div>
          </div>
        </div>



        <!-- 交易历史（与管理员查询共用分页组件） -->
        <PointTransactionHistory ref="transactionHistory" />

        <!-- 操作历史 -->
        <div class="transactions-card" style="margin-top:24px">
          <div class="transactions-header">
            <h3>操作历史</h3>
            <a-button class="refresh-button" type="primary" @click="fetchOperationLogs">
              刷新
            </a-button>
          </div>
          <div class="transactions-list">
            <template v-if="operationLogs.length > 0">
              <div
                v-for="log in operationLogs"
                :key="log.id"
                class="transaction-item"
              >
                <div class="transaction-info">
                  <div class="transaction-type" :style="{ color: log.operation_type === 'add' ? '#52c41a' : '#ff4d4f' }">
                    {{ log.operation_type === 'add' ? '添加角色' : '删除角色' }}
                  </div>
                  <div class="transaction-description">
                    {{ log.description || `${log.username}（${log.server_name}）` }}
                  </div>
                  <div class="transaction-meta" v-if="log.expire_time">
                    卡片到期：{{ formatDate(log.expire_time) }}
                  </div>
                  <div class="transaction-meta">
                    {{ formatDate(log.created_at) }}
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="no-transactions">暂无操作记录</div>
            <div v-if="operationLogs.length > 0" style="text-align:center;padding:12px 0">
              <a-button
                v-if="operationLogsHasMore"
                :loading="operationLogsLoading"
                @click="loadMoreOperationLogs"
                size="small"
              >加载更多</a-button>
              <span v-else style="color:#999;font-size:12px">共 {{ operationLogsTotal }} 条，已全部加载</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码模态框 -->
    <ForgotPasswordModal v-model:open="changePasswordModalVisible" :username="user?.username" title="修改密码"
      :hideUsername="true" @success="handleChangePasswordSuccess" />
  </div>
</template>

<script setup lang="ts">
import PointTransactionHistory from '../components/PointTransactionHistory.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { message, Modal } from 'ant-design-vue'
import { QuestionCircleOutlined, CopyOutlined, LockFilled, WechatOutlined } from '@ant-design/icons-vue'
import UserAvatar from '../components/UserAvatar.vue'
import TopNavBar from '../components/TopNavBar.vue'
import ForgotPasswordModal from '../components/ForgotPasswordModal.vue'
import axios from '../utils/axios'

interface User {
  id: number
  username: string
  email: string
  role: string
  points: number
  invite_code: string
  total_invites: number
  permissions?: any
}



interface InviteInfo {
  invite_code: string
  invite_url: string
  total_invites: number
  invited_users: Array<{
    id: number
    username: string
    email: string
    created_at: string
  }>
}

const router = useRouter()
const { copy, isSupported } = useClipboard()

// 用户状态管理
const user = ref<User | null>(null)
const token = ref<string>('')

// 响应式数据
const currentPoints = ref(0)
const transactionHistory = ref<InstanceType<typeof PointTransactionHistory> | null>(null)
const inviteInfo = ref<InviteInfo | null>(null)

// 福利卡 & 卡密兑换
const welfareCards = ref<any[]>([])
const redeemCode = ref('')
const redeeming = ref(false)

// 客服信息
const customerServiceInfo = ref<{
  qq_group_number: string | null
  qq_group_name: string | null
  enabled: boolean
} | null>(null)

// 模态框状态
const changePasswordModalVisible = ref(false)

// 初始化用户状态
const initUserState = () => {
  const savedToken = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')

  if (!savedToken || !savedUser) {
    console.log('未找到登录信息，重定向到登录页面')
    router.replace('/login')
    return false
  }

  try {
    const userData = JSON.parse(savedUser)
    user.value = userData
    token.value = savedToken
    currentPoints.value = userData?.points || 0

    console.log('Profile页面加载，用户数据:', userData)
    return true
  } catch (error) {
    console.error('解析用户数据失败:', error)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
    return false
  }
}

// 计算属性
const baseUrl = computed(() => window.location.origin)

// 返回主页
const handleBackToDashboard = () => {
  router.push('/')
}

// 获取点数余额
const fetchBalance = async () => {
  try {
    const response = await axios.get('/api/points/balance')
    currentPoints.value = response.data.points
  } catch (error) {
    console.error('获取余额失败:', error)
  }
}

// 获取交易历史
const fetchTransactions = () => transactionHistory.value?.refresh()

// 获取邀请信息
const fetchInviteInfo = async () => {
  try {
    console.log('开始获取邀请信息...')
    const response = await axios.get('/api/invite/info')
    console.log('邀请信息获取成功:', response.data)
    inviteInfo.value = response.data
  } catch (error) {
    console.error('获取邀请信息失败:', error)
  }
}

// 获取客服信息
const fetchCustomerServiceInfo = async () => {
  try {
    console.log('开始获取客服信息...')
    const response = await axios.get('/api/admin/customer-service-info')
    console.log('客服信息获取成功:', response.data)
    customerServiceInfo.value = response.data.data
  } catch (error) {
    console.error('获取客服信息失败:', error)
    customerServiceInfo.value = {
      qq_group_number: null,
      qq_group_name: null,
      enabled: false,
    }
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 安全格式化数字
const formatAmount = (amount: any): number => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0
  return num
}

// 显示帮助信息
const showHelpMessage = () => {
  message.info('邀请人成功充值后，您将获得额外配额奖励！')
}

// 复制邀请链接
const copyInviteLink = async () => {
  if (!inviteInfo.value) return

  const inviteLink = `${baseUrl.value}/login?invite=${inviteInfo.value.invite_code}`

  if (!isSupported) {
    message.error('您的浏览器不支持复制功能，请手动复制')
    return
  }

  try {
    await copy(inviteLink)
    message.success('邀请链接已复制到剪贴板！')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败，请手动复制')
  }
}

// 复制售后群号
const showCustomerService = async () => {
  // 检查客服信息是否可用
  if (
    !customerServiceInfo.value ||
    !customerServiceInfo.value.enabled ||
    !customerServiceInfo.value.qq_group_number
  ) {
    message.warning('暂未设置，请联系客服获取帮助')
    return
  }

  const groupNumber = customerServiceInfo.value.qq_group_number
  const groupName = customerServiceInfo.value.qq_group_name// || '售后群'

  if (!isSupported) {
    message.error(`您的浏览器不支持复制功能，请手动复制：${groupNumber}`)
    return
  }

  try {
    await copy(groupNumber)
    message.success(`"${groupName}" 已复制到剪贴板：${groupNumber}`)
  } catch (error) {
    console.error('复制失败:', error)
    message.error(`复制失败，请手动复制：${groupNumber}`)
  }
}

// 显示修改密码模态框
const showChangePasswordModal = () => {
  changePasswordModalVisible.value = true
}

// 处理修改密码成功
const handleChangePasswordSuccess = () => {
  message.success('密码修改成功！')
}

// 获取福利卡列表
const fetchWelfareCards = async () => {
  try {
    const resp = await axios.get('/api/card-key/user/welfare-cards')
    if (resp.data.success) welfareCards.value = resp.data.data
  } catch (err) {
    console.error('获取福利卡失败:', err)
  }
}

// 实际执行兑换
const doRedeem = async (code: string) => {
  try {
    const resp = await axios.post('/api/card-key/user/redeem', { code })
    if (resp.data.success) {
      message.success(resp.data.message)
      redeemCode.value = ''
      currentPoints.value = resp.data.data.balance_after
      fetchTransactions()
      fetchWelfareCards()
    } else {
      const errCode = resp.data.error_code
      if (errCode === 'POLICY_OWNER_ONLY' || errCode === 'POLICY_OTHERS_ONLY') {
        Modal.warning({ title: '该卡密您无法使用', content: resp.data.message, okText: '我知道了' })
      } else {
        message.error(resp.data.message || '兑换失败')
      }
    }
  } catch (err: any) {
    const errCode = err?.response?.data?.error_code
    const errMsg = err?.response?.data?.message || '兑换失败，请稍后重试'
    if (errCode === 'POLICY_OWNER_ONLY' || errCode === 'POLICY_OTHERS_ONLY') {
      Modal.warning({ title: '该卡密您无法使用', content: errMsg, okText: '我知道了' })
    } else {
      message.error(errMsg)
    }
  }
}

// 兑换卡密（先预览，统一弹确认弹窗）
const handleRedeem = async (code: string) => {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) { message.warning('请输入卡密'); return }
  redeeming.value = true
  try {
    // 第一步：预览卡密信息
    const preview = await axios.post('/api/card-key/user/preview', { code: trimmed })
    if (!preview.data.success) {
      const errCode = preview.data.error_code
      if (errCode === 'POLICY_OWNER_ONLY' || errCode === 'POLICY_OTHERS_ONLY') {
        Modal.warning({ title: '该卡密您无法使用', content: preview.data.message, okText: '我知道了' })
      } else {
        message.error(preview.data.message || '卡密无效')
      }
      return
    }

    const { fee, fee_reason, points, points_to_add } = preview.data.data

    // 统一弹确认弹窗
    const reasonText = fee > 0 && fee_reason ? `\n原因：${fee_reason}` : ''
    const feeDesc = fee > 0
      ? `需扣除 ${fee} 配额手续费${reasonText}，实际到账 ${points_to_add} 配额`
      : `将到账 ${points_to_add} 配额`
    Modal.confirm({
      title: '确认兑换',
      content: `该卡密面值 ${points} 配额，${feeDesc}。\n\n确认兑换？`,
      okText: '确认兑换',
      cancelText: '取消',
      onOk: async () => {
        redeeming.value = true
        try {
          await doRedeem(trimmed)
        } finally {
          redeeming.value = false
        }
      },
    })
  } catch (err: any) {
    const errCode = err?.response?.data?.error_code
    const errMsg = err?.response?.data?.message || '兑换失败，请稍后重试'
    if (errCode === 'POLICY_OWNER_ONLY' || errCode === 'POLICY_OTHERS_ONLY') {
      Modal.warning({ title: '该卡密您无法使用', content: errMsg, okText: '我知道了' })
    } else {
      message.error(errMsg)
    }
  } finally {
    redeeming.value = false
  }
}

// 组件挂载时初始化
onMounted(() => {
  if (!initUserState()) {
    return
  }

  // 获取个人中心数据
  fetchBalance()
  fetchTransactions()
  fetchInviteInfo()
  fetchCustomerServiceInfo()
  fetchWelfareCards()
  fetchOperationLogs()
})
// ===================== 操作历史 =====================
const operationLogs = ref<any[]>([])
const operationLogsLoading = ref(false)
const operationLogsPage = ref(1)
const operationLogsTotal = ref(0)
const operationLogsHasMore = ref(false)

const fetchOperationLogs = async () => {
  operationLogsLoading.value = true
  try {
    const response = await axios.get('/api/points/operation-logs?limit=20&page=1')
    operationLogs.value = response.data.list || []
    operationLogsPage.value = 1
    operationLogsTotal.value = response.data.pagination?.total || operationLogs.value.length
    operationLogsHasMore.value = response.data.pagination?.hasMore ?? false
  } catch (error) {
    console.error('获取操作历史失败:', error)
  } finally {
    operationLogsLoading.value = false
  }
}

const loadMoreOperationLogs = async () => {
  if (operationLogsLoading.value || !operationLogsHasMore.value) return
  operationLogsLoading.value = true
  try {
    const nextPage = operationLogsPage.value + 1
    const response = await axios.get(`/api/points/operation-logs?limit=20&page=${nextPage}`)
    operationLogs.value = [...operationLogs.value, ...(response.data.list || [])]
    operationLogsPage.value = nextPage
    operationLogsTotal.value = response.data.pagination?.total || operationLogsTotal.value
    operationLogsHasMore.value = response.data.pagination?.hasMore ?? false
  } catch (error) {
    console.error('加载更多操作历史失败:', error)
  } finally {
    operationLogsLoading.value = false
  }
}
</script>

<style scoped>
@import '../components/Dashboard.css';

.profile-wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  margin: 0;
}

.profile-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 服务中心面板样式 */
.service-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.service-content {
  width: 100%;
}

.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4f8 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 126, 234, 0.1);
  min-height: 100px;
}

.service-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  background: linear-gradient(135deg, #f0f4ff 0%, #e0f0f6 100%);
}

.service-icon {
  font-size: 32px;
  color: #667eea;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-text {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .service-item {
    padding: 16px;
    min-height: 80px;
  }

  .service-icon {
    font-size: 28px;
  }
}
</style>


<style scoped>
@import '../components/Dashboard.css';

.profile-wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  margin: 0;
}

.profile-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 服务中心面板样式 */
.service-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.service-content {
  width: 100%;
}

.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4f8 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 126, 234, 0.1);
  min-height: 100px;
}

.service-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  background: linear-gradient(135deg, #f0f4ff 0%, #e0f0f6 100%);
}

.service-icon {
  font-size: 32px;
  color: #667eea;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-text {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .service-item {
    padding: 16px;
    min-height: 80px;
  }

  .service-icon {
    font-size: 28px;
  }
}
</style>
