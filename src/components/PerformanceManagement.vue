<template>
  <div class="performance-management">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载邀请统计中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <a-button class="retry-button" @click="fetchAllData"> 重试 </a-button>
      </div>
    </div>

    <!-- 主内容 -->
    <div v-else>
      <div class="performance-header">
        <h1>业绩管理</h1>
        <p class="performance-subtitle">查看您的邀请业绩和团队发展情况</p>
      </div>

      <div class="performance-content">
        <!-- 代理身份卡片 -->
        <div
          v-if="inviteStats?.agentInfo?.isThirdLevelAgent"
          class="performance-card agent-identity-card"
        >
          <div class="agent-identity-content">
            <div>
              <h2>代理身份</h2>
              <p class="agent-identity-title">我是三级代理</p>
              <p class="agent-identity-desc">
                上级是
                <strong>{{ inviteStats.agentInfo.parentAgentName || '未绑定上级' }}</strong>
              </p>
              <p class="agent-identity-desc" v-if="inviteStats.agentInfo.commissionRate != null">
                我的抽成比例：
                <strong class="commission-rate-value">
                  {{ (inviteStats.agentInfo.commissionRate * 100).toFixed(0) }}%
                </strong>
              </p>
            </div>
            <span class="agent-role-badge">
              {{ getRoleDisplayName(inviteStats.agentInfo.role) }}
            </span>
          </div>
        </div>

        <!-- 邀请工具卡片 -->
        <div class="performance-card invite-tools-card">
          <h2>邀请工具</h2>
          <div class="invite-tools">
            <div class="invite-tool">
              <label>我的邀请码:</label>
              <div class="invite-code-container">
                <span class="invite-code">{{ inviteInfo?.invite_code || 'N/A' }}</span>
                <a-button class="copy-btn" type="primary" @click="copyInviteCode"> 复制 </a-button>
              </div>
            </div>

            <div class="invite-tool">
              <label>邀请链接:</label>
              <div class="invite-link-container">
                <span class="invite-link">
                  {{ inviteLink }}
                </span>
                <a-button class="copy-btn" type="primary" @click="copyInviteLink">
                  复制链接
                </a-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 统计概览卡片 -->
        <div class="performance-card stats-overview-card">
          <h2>邀请统计</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">{{ inviteStats?.totalInvites || 0 }}</div>
              <div class="stat-label">总邀请人数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ inviteStats?.todayInvites || 0 }}</div>
              <div class="stat-label">今日邀请</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ inviteStats?.thisMonthInvites || 0 }}</div>
              <div class="stat-label">本月邀请</div>
            </div>
          </div>
        </div>

        <!-- 提成统计卡片 -->
        <div v-if="commissionStats" class="performance-card commission-stats-card">
          <div class="card-header">
            <h2>提成统计</h2>
            <a-button class="refresh-btn" type="primary" @click="fetchCommissionStats">
              刷新
            </a-button>
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <div
                class="stat-number"
                style="color: #1890ff; font-weight: bold; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)"
              >
                ¥{{ (parseFloat(String(commissionStats.today_recharge_amount)) || 0).toFixed(2) }}
              </div>
              <div class="stat-label">今日充值金额</div>
            </div>
            <div class="stat-item">
              <div
                class="stat-number"
                style="color: #13c2c2; font-weight: bold; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)"
              >
                ¥{{ (parseFloat(String(commissionStats.total_recharge_amount)) || 0).toFixed(2) }}
              </div>
              <div class="stat-label">累计充值金额</div>
            </div>
            <div class="stat-item">
              <div
                class="stat-number"
                style="color: #52c41a; font-weight: bold; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)"
              >
                ¥{{ (parseFloat(String(commissionStats.available_commission)) || 0).toFixed(2) }}
              </div>
              <div class="stat-label">可提现金额</div>
            </div>
            <div class="stat-item">
              <div
                class="stat-number"
                style="color: #fa8c16; font-weight: bold; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)"
              >
                ¥{{ (parseFloat(String(commissionStats.total_commission)) || 0).toFixed(2) }}
              </div>
              <div class="stat-label">累计提成</div>
            </div>
          </div>
        </div>

        <!-- 邀请用户列表 -->
        <div class="performance-card invited-users-card">
          <div class="card-header invited-users-header">
            <h2>邀请用户列表</h2>
            <div class="card-actions">
              <a-input-search
                v-model:value="inviteSearchQuery"
                class="invite-search-input"
                placeholder="搜索账号或邮箱"
                allow-clear
              />
              <a-button class="refresh-btn" type="primary" @click="fetchAllData"> 刷新 </a-button>
            </div>
          </div>

          <div
            v-if="filteredInvitedUsers.length > 0"
            class="invited-users-table"
          >
            <div class="table-header">
              <div class="table-cell">用户名</div>
              <div class="table-cell">邮箱</div>
              <div class="table-cell">角色</div>
              <div class="table-cell">点数</div>
              <div class="table-cell">充值金额</div>
              <div class="table-cell">充值笔数</div>
              <div class="table-cell">最后充值</div>
              <div class="table-cell">注册时间</div>
            </div>
            <div class="table-body">
              <div
                v-for="invitedUser in filteredInvitedUsers"
                :key="invitedUser.id"
                class="table-row"
              >
                <div class="table-cell">
                  <div class="user-info">
                    <div class="user-avatar">
                      {{ invitedUser.username.charAt(0).toUpperCase() }}
                    </div>
                    <span class="username">{{ invitedUser.username }}</span>
                  </div>
                </div>
                <div class="table-cell">{{ invitedUser.email }}</div>
                <div class="table-cell">
                  <span :class="`role-badge role-${invitedUser.role}`">
                    {{ getRoleDisplayName(invitedUser.role) }}
                  </span>
                </div>
                <div class="table-cell">
                  <span class="points">{{ invitedUser.points }}</span>
                </div>
                <div class="table-cell">
                  <span class="recharge-amount">
                    ¥{{ (parseFloat(String(invitedUser.total_recharge_amount)) || 0).toFixed(2) }}
                  </span>
                </div>
                <div class="table-cell">
                  <span class="recharge-count"> {{ invitedUser.recharge_count || 0 }}笔 </span>
                </div>
                <div class="table-cell">
                  <span class="last-recharge">
                    {{
                      invitedUser.last_recharge_time
                        ? formatDate(invitedUser.last_recharge_time)
                        : '未充值'
                    }}
                  </span>
                </div>
                <div class="table-cell">
                  <span class="date">{{ formatDate(invitedUser.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-data">
            <div class="no-data-icon">👥</div>
            <template v-if="inviteStats?.invitedUsers && inviteStats.invitedUsers.length > 0">
              <p>未找到匹配用户</p>
              <p class="no-data-subtitle">尝试搜索用户名或邮箱</p>
            </template>
            <template v-else>
              <p>暂无邀请用户</p>
              <p class="no-data-subtitle">分享您的邀请码，开始建立您的团队吧！</p>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from '../utils/axios'
import { message } from 'ant-design-vue'

interface User {
  id: number
  username: string
  email: string
  role: string
  points: number
  invite_code: string
  total_invites: number
}

interface InviteStats {
  totalInvites: number
  todayInvites: number
  thisMonthInvites: number
  agentInfo?: {
    role: string
    role_level: number
    isThirdLevelAgent: boolean
    parentAgentId: number | null
    parentAgentName: string | null
    commissionRate: number | null
  }
  invitedUsers: Array<{
    id: number
    username: string
    email: string
    role: string
    created_at: string
    points: number
    total_recharge_amount?: number | string
    recharge_count?: number
    last_recharge_time?: string | null
  }>
}

interface CommissionStats {
  user_id: number
  username: string
  role: string
  total_invites: number
  today_recharge_amount: number | string
  total_recharge_amount: number | string
  available_commission: number | string
  withdrawn_commission: number | string
  total_commission: number | string
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

interface Props {
  user: User
  token: string
}

const props = defineProps<Props>()

// 状态管理
const inviteStats = ref<InviteStats | null>(null)
const commissionStats = ref<CommissionStats | null>(null)
const inviteInfo = ref<InviteInfo | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const inviteSearchQuery = ref('')

// 计算属性
const inviteLink = computed(() => {
  const inviteCode = inviteInfo.value?.invite_code
  return inviteCode ? `${window.location.origin}/login?invite=${inviteCode}` : ''
})

const filteredInvitedUsers = computed(() => {
  const users = inviteStats.value?.invitedUsers ?? []
  const query = inviteSearchQuery.value.trim().toLowerCase()
  if (!query) {
    return users
  }

  return users.filter((user) => {
    const username = String(user.username || '').toLowerCase()
    const email = String(user.email || '').toLowerCase()
    return username.includes(query) || email.includes(query)
  })
})

// 获取邀请统计数据
const fetchInviteStats = async () => {
  try {
    const response = await axios.get('/api/invite/stats', {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data.success) {
      inviteStats.value = response.data.data
    } else {
      error.value = response.data.message || '获取邀请统计失败'
    }
  } catch (err: any) {
    console.error('获取邀请统计失败:', err)
    error.value = err.response?.data?.message || '获取邀请统计失败'
  }
}

// 获取提成统计数据
const fetchCommissionStats = async () => {
  try {
    const response = await axios.get('/api/commission/stats', {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data.success) {
      commissionStats.value = response.data.data
    }
  } catch (err: any) {
    console.error('获取提成统计失败:', err)
    // 提成统计失败不影响页面显示，只是不显示提成信息
  }
}

// 获取邀请信息
const fetchInviteInfo = async () => {
  try {
    const response = await axios.get('/api/invite/info', {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data) {
      inviteInfo.value = response.data
    }
  } catch (err: any) {
    console.error('获取邀请信息失败:', err)
    // 邀请信息获取失败不影响主要功能，使用 props 中的备用数据
  }
}

// 获取所有数据
const fetchAllData = async () => {
  try {
    loading.value = true
    error.value = null

    await Promise.all([fetchInviteStats(), fetchCommissionStats(), fetchInviteInfo()])
  } catch (err: any) {
    console.error('获取数据失败:', err)
    error.value = '获取数据失败'
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取角色显示名称
const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'subadmin':
      return '总代'
    case 'vip2':
      return '二级代理'
    case 'vip1':
      return '二级代理'
    case 'vip':
      return 'VIP用户'
    case 'agent3':
      return '三级代理'
    case 'user':
      return '普通用户'
    default:
      return role
  }
}

// 复制到剪贴板的通用函数
const copyToClipboard = async (text: string, successMessage: string) => {
  try {
    // 优先使用现代的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      message.success(successMessage)
      return
    }

    // 降级方案：使用传统的 document.execCommand
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      message.success(successMessage)
    } else {
      throw new Error('execCommand failed')
    }
  } catch (err) {
    console.error('复制失败:', err)
    message.error('复制失败，请手动复制')

    // 最后的降级方案：显示文本供用户手动复制
    const fallbackMessage = `复制失败，请手动复制以下内容：
${text}`
    alert(fallbackMessage)
  }
}

// 复制邀请码
const copyInviteCode = async () => {
  const inviteCode = inviteInfo.value?.invite_code
  if (inviteCode) {
    await copyToClipboard(inviteCode, '邀请码已复制到剪贴板！')
  } else {
    message.error('无法获取邀请码')
  }
}

// 复制邀请链接
const copyInviteLink = async () => {
  await copyToClipboard(inviteLink.value, '邀请链接已复制到剪贴板！')
}

// 组件挂载时获取数据
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
@import './PerformanceManagement.css';
</style>
