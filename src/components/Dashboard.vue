<template>
  <div v-if="user" class="dashboard-wrapper">
    <div
      v-if="currentView === 'script' && showExpiryBanner"
      class="expiry-alert"
      role="status"
      aria-live="polite"
    >
      <div class="expiry-alert-track">
        <span class="expiry-alert-text"
          >账户内有即将到期的角色卡，请点击角色卡上的三个点及时续费</span
        >
      </div>
    </div>
    <!-- 顶部导航栏 -->
    <a-affix :offset-top="affixOffsetTop">
      <TopNavBar
        :show-back-button="false"
        :show-balance="true"
        :selected-keys="selectedKeys"
        @menu-select="handleMenuSelect"
      />
    </a-affix>

    <!-- 主内容区域 -->
    <div v-if="currentView === 'script'" class="main-content">
      <ScriptConfig
        :user="user"
        :token="token"
        @user-update="handleUserUpdate"
        @expiry-banner-change="handleExpiryBannerChange"
      />
    </div>

    <div v-else-if="currentView === 'performance'" class="main-content">
      <PerformanceManagement :user="user" :token="token" />
    </div>

    <div v-else-if="currentView === 'agent'" class="main-content">
      <AgentManagement />
    </div>

    <div v-else-if="currentView === 'admin'" class="main-content">
      <AdminLogin v-if="!adminToken" @login-success="handleAdminLoginSuccess" />
      <AdminPanel v-else :token="adminToken" :user="user" @logout="handleAdminLogout" />
    </div>
    
    <!-- 域名迁移提示模态框 -->
    <a-modal :open="shouldShowMigrationModal" :closable="false" :footer="null" :zIndex="10000">
      <div style="padding: 20px 0px">
        <div style="margin-bottom: 24px; font-size: 16px; line-height: 1.6">
          <p style="margin-bottom: 16px; color: rgb(255, 77, 79); font-weight: bold">
            网站已迁移至新地址，请使用原账号密码登录新网站
          </p>
          <p style="margin-bottom: 8px; margin-top: 16px; display: flex; align-items: center">
            <strong>新网址：</strong
            ><a
              :href="migrationUrl"
              target="_blank"
              rel="noopener noreferrer"
              style="color: rgb(24, 144, 255); margin-left: 8px"
              >{{ migrationDomain }}</a
            >
            <a-button
              type="text"
              size="small"
              aria-label="复制新网址"
              @click="copyToClipboard(migrationUrl, '新网址')"
            >
              <CopyOutlined />
            </a-button>
          </p>
        </div>
        <div style="margin-bottom: 16px">
          <div style="margin-bottom: 12px; color: rgb(102, 102, 102)">您的登录信息：</div>
          <div style="display: flex; flex-direction: column; gap: 12px">
            <div style="display: flex; align-items: center; gap: 12px">
              <div style="width: 72px; color: rgb(102, 102, 102)">账号</div>
              <div style="flex: 1; word-break: break-all; font-weight: 500">
                {{ migrationCredentials.username || '未保存' }}
              </div>
              <a-button
                type="text"
                size="small"
                :disabled="!migrationCredentials.username"
                aria-label="复制账号"
                @click="copyToClipboard(migrationCredentials.username, '账号')"
              >
                <CopyOutlined />
              </a-button>
            </div>
            <div style="display: flex; align-items: center; gap: 12px">
              <div style="width: 72px; color: rgb(102, 102, 102)">密码</div>
              <div style="flex: 1; word-break: break-all; font-weight: 500">
                {{ migrationCredentials.password || '未保存' }}
              </div>
              <a-button
                type="text"
                size="small"
                :disabled="!migrationCredentials.password"
                aria-label="复制密码"
                @click="copyToClipboard(migrationCredentials.password, '密码')"
              >
                <CopyOutlined />
              </a-button>
            </div>
          </div>
        </div>
        <div style="margin-top: 24px; text-align: center">
          <a-button type="primary" :href="migrationUrl" block>前往新网站</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { CopyOutlined } from '@ant-design/icons-vue'
import ScriptConfig from './ScriptConfig.vue'
import AdminPanel from './AdminPanel.vue'
import AdminLogin from './AdminLogin.vue'
import PerformanceManagement from './PerformanceManagement.vue'
import AgentManagement from './AgentManagement.vue'
import TopNavBar from './TopNavBar.vue'
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

const emit = defineEmits<{
  logout: []
  userUpdate: [user: User]
}>()

const router = useRouter()

// 用户状态管理
const user = ref<User | null>(null)
const token = ref<string>('')
const isLoggedIn = ref(false)

// 响应式数据
const currentView = ref<'script' | 'admin' | 'performance' | 'agent'>('script')
const adminToken = ref<string | null>(localStorage.getItem('adminToken'))
const adminInfo = ref<any>(null)
const selectedKeys = ref<string[]>(['script'])
const showExpiryBanner = ref(false)
const bannerHeight = ref(24)

// 域名迁移相关
const shouldShowMigrationModal = ref(false)
const migrationDomain = ref('')
const migrationUrl = ref('')
const migrationCredentials = ref({
  username: '',
  password: '',
})

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success(`${label}已复制到剪贴板`)
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      message.success(`${label}已复制到剪贴板`)
    } catch (copyErr) {
      message.error('复制失败，请手动选择复制')
    }
    document.body.removeChild(textArea)
  }
}

const checkDomain = async () => {
  try {
    const response = await axios.get('/api/domain-redirect/status')
    const result = response.data

    if (result.success && result.data.enabled) {
      const currentHostname = window.location.hostname
      const sourceDomain = result.data.sourceDomain
      const targetDomain = result.data.targetDomain

      // 如果当前域名是源域名，则显示迁移模态框
      if (currentHostname === sourceDomain) {
        shouldShowMigrationModal.value = true
        migrationDomain.value = targetDomain
        migrationUrl.value = `https://${targetDomain}`

        // 尝试从 localStorage 获取保存的账号信息
        try {
          const savedCredentials = localStorage.getItem('savedCredentials')
          if (savedCredentials) {
            const { username, password } = JSON.parse(savedCredentials)
            migrationCredentials.value = { username, password }
          }
        } catch (e) {
          console.warn('获取保存的账号信息失败:', e)
        }

        console.log('检测到需要迁移的域名，显示迁移提示')
      } else {
        shouldShowMigrationModal.value = false
      }
    } else {
      console.log('域名跳转未启用')
      shouldShowMigrationModal.value = false
    }
  } catch (error) {
    console.error('获取域名跳转状态失败:', error)
    // 如果接口调用失败，不影响正常使用
    shouldShowMigrationModal.value = false
  }
}

const updateBannerHeight = () => {
  if (typeof window === 'undefined') {
    bannerHeight.value = 24
    return
  }
  bannerHeight.value = window.matchMedia('(max-width: 768px)').matches ? 22 : 24
}

const affixOffsetTop = computed(() => {
  if (currentView.value !== 'script' || !showExpiryBanner.value) {
    return 0
  }
  return bannerHeight.value
})

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
    isLoggedIn.value = true

    console.log('Dashboard渲染，用户数据:', userData)
    console.log('用户角色:', userData?.role)
    console.log('用户权限:', userData?.permissions)
    console.log('是否为管理员:', userData?.role === 'admin')

    return true
  } catch (error) {
    console.error('解析用户数据失败:', error)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
    return false
  }
}

// 检查token是否过期
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true

  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join(''),
    )

    const decoded = JSON.parse(jsonPayload)
    const currentTime = Date.now() / 1000

    return decoded.exp < currentTime
  } catch (error) {
    console.error('Token解码失败:', error)
    return true
  }
}

// 管理员登录成功处理
const handleAdminLoginSuccess = (token: string, admin: any) => {
  adminToken.value = token
  adminInfo.value = admin
  currentView.value = 'admin'
}

// 管理员登出
const handleAdminLogout = () => {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminInfo')
  adminToken.value = null
  adminInfo.value = null
  currentView.value = 'script'
}

// 处理用户更新
const handleUserUpdate = (updatedUser: User) => {
  user.value = updatedUser
  localStorage.setItem('user', JSON.stringify(updatedUser))
  emit('userUpdate', updatedUser)
}

const handleExpiryBannerChange = (visible: boolean) => {
  showExpiryBanner.value = visible
}

// 处理菜单选择
const handleMenuSelect = ({ key }: { key: string }) => {
  currentView.value = key as 'script' | 'admin' | 'performance' | 'agent'
  selectedKeys.value = [key]
}

// 检查并清理过期的adminToken
onMounted(() => {
  updateBannerHeight()
  window.addEventListener('resize', updateBannerHeight)
  checkDomain()

  // 首先初始化用户状态
  if (!initUserState()) {
    return // 如果初始化失败，已经重定向到登录页面
  }

  // 检查并清理过期的adminToken
  const savedAdminToken = localStorage.getItem('adminToken')
  if (savedAdminToken && isTokenExpired(savedAdminToken)) {
    console.log('管理员token已过期，清理localStorage')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminInfo')
    adminToken.value = null
    adminInfo.value = null
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateBannerHeight)
  }
})

// 监听当前视图变化
watch(currentView, (newView) => {
  // 同步菜单选中状态
  selectedKeys.value = [newView]
})
</script>

<style scoped>
@import './Dashboard.css';
</style>
