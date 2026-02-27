<template>
  <div v-if="user" class="profile-wrapper">
    <!-- 顶部导航栏 -->
    <a-affix :offset-top="0">
      <TopNavBar
        title="个人中心"
        :showBackButton="true"
        @back="handleBackToDashboard"
        @personal-center="() => {}"
      />
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
                  <a-input
                    type="text"
                    :value="`${baseUrl}/register?invite=${inviteInfo.invite_code}`"
                    readonly
                    class="invite-link-input"
                    style="width: calc(100% - 64px)"
                  />
                  <a-button class="copy-button" type="primary" @click="copyInviteLink">
                    复制
                  </a-button>
                </a-input-group>
              </div>
            </div>

            <div v-if="inviteInfo.invited_users?.length > 0" class="invited-users">
              <h4>邀请的用户</h4>
              <div class="invited-list">
                <div
                  v-for="invitedUser in inviteInfo.invited_users.slice(0, 5)"
                  :key="invitedUser.id"
                  class="invited-user"
                >
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
                  <svg
                    t="1757828927592"
                    class="icon"
                    viewBox="0 0 1025 1024"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    p-id="4853"
                    width="28"
                    height="28"
                    fill="currentColor"
                  >
                    <path
                      d="M342.492501 832.853333c-13.653333 0-34.133333-6.826667-47.786666-44.373333-17.066667-44.373333-10.24-109.226667 17.066666-180.906667 10.24-27.306667 27.306667-58.026667 47.786667-85.333333-3.413333-10.24-3.413333-20.48-3.413333-30.72 0-23.893333 6.826667-58.026667 44.373333-92.16 10.24-71.68 40.96-136.533333 92.16-184.32 13.653333-20.48 34.133333-34.133333 54.613333-44.373333-47.786667-51.2-109.226667-81.92-180.906666-81.92-133.12 0-242.346667 109.226667-256 249.173333-23.893333 20.48-40.96 47.786667-40.96 75.093333 0 13.653333 3.413333 23.893333 10.24 37.546667-17.066667 20.48-40.96 54.613333-58.026667 92.16-23.893333 61.44-27.306667 119.466667-13.653333 157.013333 10.24 34.133333 30.72 30.72 47.786666 0 3.413333-6.826667 10.24-17.066667 17.066667-30.72 13.653333 40.96 34.133333 75.093333 61.44 105.813334-17.066667 3.413333-30.72 10.24-37.546667 17.066666-30.72 27.306667-30.72 58.026667-6.826666 81.92 34.133333 30.72 170.666667 47.786667 249.173333 0h27.306667c6.826667-10.24 13.653333-23.893333 27.306666-34.133333 3.413333-3.413333 6.826667-3.413333 6.826667-6.826667-3.413333-6.826667-10.24-13.653333-13.653333-23.893333-10.24 17.066667-23.893333 23.893333-44.373334 23.893333z"
                      p-id="4854"
                    ></path>
                    <path
                      d="M1004.679168 617.813333c-13.653333-37.546667-37.546667-68.266667-54.613333-88.746666 6.826667-10.24 10.24-23.893333 10.24-34.133334 0-23.893333-13.653333-47.786667-37.546667-68.266666-13.653333-129.706667-116.053333-235.52-238.933333-235.52s-225.28 102.4-238.933334 235.52c-23.893333 20.48-37.546667 44.373333-37.546666 68.266666 0 13.653333 3.413333 23.893333 10.24 34.133334-17.066667 20.48-40.96 51.2-54.613334 88.746666-20.48 58.026667-27.306667 112.64-13.653333 146.773334 10.24 30.72 30.72 27.306667 44.373333 0 3.413333-6.826667 10.24-17.066667 17.066667-27.306667 10.24 37.546667 30.72 71.68 54.613333 98.986667-17.066667 3.413333-30.72 10.24-37.546666 17.066666-27.306667 23.893333-30.72 54.613333-6.826667 78.506667 30.72 30.72 160.426667 44.373333 235.52 0h54.613333c75.093333 44.373333 201.386667 27.306667 235.52 0 23.893333-23.893333 23.893333-51.2-6.826666-78.506667-6.826667-6.826667-20.48-13.653333-37.546667-17.066666 23.893333-27.306667 44.373333-61.44 54.613333-98.986667 6.826667 10.24 13.653333 20.48 17.066667 27.306667 17.066667 27.306667 34.133333 30.72 44.373333 0 13.653333-37.546667 6.826667-88.746667-13.653333-146.773334z"
                      p-id="4855"
                    ></path>
                  </svg>
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

        <!-- 交易历史 -->
        <div class="transactions-card">
          <div class="transactions-header">
            <h3>交易历史</h3>
            <a-button class="refresh-button" type="primary" @click="fetchTransactions">
              刷新
            </a-button>
          </div>
          <div class="transactions-list">
            <template v-if="transactions.length > 0">
              <div
                v-for="transaction in transactions"
                :key="transaction.id"
                class="transaction-item"
              >
                <div class="transaction-info">
                  <div class="transaction-type">
                    {{ getTransactionTypeName(transaction.transaction_type) }}
                  </div>
                  <div class="transaction-description">
                    {{ transaction.description }}
                  </div>
                  <div class="transaction-meta">
                    {{ getPaymentMethodName(transaction.payment_method) }} •
                    {{ formatDate(transaction.created_at) }}
                  </div>
                </div>
                <div class="transaction-amount">
                  <span
                    class="amount"
                    :class="{
                      positive: ['recharge', 'bonus', 'refund'].includes(
                        transaction.transaction_type,
                      ),
                      negative: transaction.transaction_type === 'consume',
                    }"
                  >
                    {{ transaction.transaction_type === 'consume' ? '-' : '+' }}
                    {{ formatAmount(transaction.amount) }}
                  </span>
                  <div class="balance-after">
                    余额: {{ formatAmount(transaction.balance_after) }}
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="no-transactions">暂无交易记录</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码模态框 -->
    <ForgotPasswordModal
      v-model:open="changePasswordModalVisible"
      :username="user?.username"
      title="修改密码"
      :hideUsername="true"
      @success="handleChangePasswordSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { message } from 'ant-design-vue'
import { QuestionCircleOutlined, CopyOutlined, LockFilled } from '@ant-design/icons-vue'
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

interface Transaction {
  id: number
  transaction_type: 'recharge' | 'consume' | 'refund' | 'bonus'
  amount: number
  balance_after: number
  description: string
  payment_method?: string
  created_at: string
  status: string
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
const transactions = ref<Transaction[]>([])
const inviteInfo = ref<InviteInfo | null>(null)

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
const fetchTransactions = async () => {
  try {
    const response = await axios.get('/api/points/transactions?limit=10')
    transactions.value = response.data.transactions
  } catch (error) {
    console.error('获取交易历史失败:', error)
  }
}

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

// 获取交易类型的中文名称
const getTransactionTypeName = (type: string) => {
  switch (type) {
    case 'recharge':
      return '充值'
    case 'consume':
      return '消费'
    case 'refund':
      return '退款'
    case 'bonus':
      return '赠送'
    default:
      return type
  }
}

// 获取支付方式的中文名称
const getPaymentMethodName = (method?: string) => {
  switch (method) {
    case 'alipay':
      return '支付宝'
    case 'wechat':
      return '微信支付'
    case 'bank':
      return '银行卡'
    case 'admin':
      return '管理员'
    default:
      return method || '-'
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

  const inviteLink = `${baseUrl.value}/register?invite=${inviteInfo.value.invite_code}`

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
    message.warning('暂未设置售后群，请联系客服获取帮助')
    return
  }

  const groupNumber = customerServiceInfo.value.qq_group_number
  const groupName = customerServiceInfo.value.qq_group_name || '售后群'

  if (!isSupported) {
    message.error(`您的浏览器不支持复制功能，请手动复制群号：${groupNumber}`)
    return
  }

  try {
    await copy(groupNumber)
    message.success(`"${groupName}" 群号已复制到剪贴板：${groupNumber}`)
  } catch (error) {
    console.error('复制失败:', error)
    message.error(`复制失败，请手动复制群号：${groupNumber}`)
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
})
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
