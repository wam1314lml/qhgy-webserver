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

    <div v-else-if="currentView === 'welfare'" class="main-content">
      <WelfarePage />
    </div>

    <div v-else-if="currentView === 'agent'" class="main-content">
      <AgentManagement />
    </div>

    <div v-else-if="currentView === 'admin'" class="main-content">
      <AdminLogin v-if="!adminToken" @login-success="handleAdminLoginSuccess" />
      <AdminPanel v-else :token="adminToken" :user="user" @logout="handleAdminLogout" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import ScriptConfig from './ScriptConfig.vue'
import AdminPanel from './AdminPanel.vue'
import AdminLogin from './AdminLogin.vue'
import PerformanceManagement from './PerformanceManagement.vue'
import AgentManagement from './AgentManagement.vue'
import WelfarePage from '../pages/WelfarePage.vue'
import TopNavBar from './TopNavBar.vue'

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
const currentView = ref<'script' | 'admin' | 'performance' | 'agent' | 'welfare'>('script')
const adminToken = ref<string | null>(localStorage.getItem('adminToken'))
const adminInfo = ref<any>(null)
const selectedKeys = ref<string[]>(['script'])
const showExpiryBanner = ref(false)
const bannerHeight = ref(24)

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
  currentView.value = key as 'script' | 'admin' | 'performance' | 'agent' | 'welfare'
  selectedKeys.value = [key]
}

// 检查并清理过期的adminToken
onMounted(() => {
  updateBannerHeight()
  window.addEventListener('resize', updateBannerHeight)

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
