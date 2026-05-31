<template>
  <div class="navbar">
    <div class="navbar-left h-full flex-1">
      <!-- 返回按钮 -->
      <div
        v-if="props.showBackButton"
        class="back-button h-full flex items-center justify-center w-[55px]"
      >
        <a-button type="text" @click="emit('back')">
          <template #icon>
            <LeftOutlined class="text-4" />
          </template>
        </a-button>
      </div>

      <!-- Logo -->
      <div v-if="!props.title" class="logo" @click="$router.push('/')">
        <span class="logo-icon">🌸</span>
        <span class="logo-text">花园世界</span>
      </div>

      <!-- 标题 -->
      <div
        v-if="props.title"
        :class="{ 'pl-10': showBalance }"
        class="nav-title text-center flex-1"
      >
        {{ props.title }}
      </div>

      <!-- 菜单（只有没有标题时显示） -->
      <div v-if="!props.title" class="nav-tabs">
        <a-menu
          :selectedKeys="props.selectedKeys"
          mode="horizontal"
          class="nav-menu"
          @select="emit('menu-select', $event)"
        >
          <a-menu-item key="script" class="nav-tab"> 首页 </a-menu-item>
          <a-menu-item v-if="user?.permissions?.invite_system" key="performance" class="nav-tab">
            业绩管理
          </a-menu-item>
          <a-menu-item
            v-if="user?.role === 'vip1' || user?.role === 'vip2'"
            key="agent"
            class="nav-tab"
          >
            代理后台
          </a-menu-item>
          <a-menu-item v-if="user?.role === 'admin'" key="admin" class="nav-tab">
            管理面板
          </a-menu-item>
        </a-menu>
      </div>
    </div>

    <div class="navbar-right">
      <slot name="right-prefix" />
      <!-- 余额显示 -->
      <div v-if="props.showBalance" class="points-balance">
        <div class="balance-display" @click="openRechargeModal">
          <span class="balance-icon">💰</span>
          <span class="balance-text">余额：</span>
          <span class="balance-amount">{{ formatAmount(user?.points || 0) }}</span>
        </div>
      </div>

      <!-- 用户头像下拉菜单 -->
      <div class="user-avatar-container tour-1">
        <a-dropdown trigger="click" placement="bottomRight" :overlayStyle="{ minWidth: '120px' }">
          <UserAvatar :username="user?.username" size="small" />
          <template #overlay>
            <a-menu>
              <a-menu-item-group>
                <template #title>
                  <div class="user-info-item">
                    <div class="user-name">{{ user?.username }}</div>
                    <div class="user-role">
                      {{ user?.role }}
                    </div>
                  </div>
                </template>
              </a-menu-item-group>
              <a-menu-divider />
              <a-menu-item key="personal-center" @click="$router.push('/profile')">
                个人中心
              </a-menu-item>
              <a-menu-item key="logout" @click="handleLogout" class="logout-item">
                退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 充值弹窗 -->
    <RechargeModal :visible="showRechargeModal" :user="user" @close="showRechargeModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LeftOutlined } from '@ant-design/icons-vue'
import UserAvatar from './UserAvatar.vue'
import RechargeModal from './RechargeModal.vue'

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

interface Props {
  // 是否显示返回按钮，默认是
  showBackButton?: boolean
  // 是否显示余额，默认否
  showBalance?: boolean
  // 标题字符串，用于居中显示的标题，当有标题时隐藏菜单
  title?: string
  // 当前选中的菜单键
  selectedKeys?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  showBackButton: true,
  showBalance: false,
  title: '',
  selectedKeys: () => ['script'],
})

const emit = defineEmits<{
  back: []
  'menu-select': [event: { key: string }]
}>()

const router = useRouter()

// 用户信息状态
const user = ref<User | null>(null)

// 充值弹窗状态
const showRechargeModal = ref(false)

// 打开充值弹窗
const openRechargeModal = () => {
  showRechargeModal.value = true
}

// 从缓存中获取用户信息
const getUserFromCache = () => {
  try {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      user.value = JSON.parse(savedUser)
    }
  } catch (error) {
    console.error('解析缓存中的用户信息失败:', error)
    user.value = null
  }
}

// 监听localStorage变化（当用户信息更新时）
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'user') {
    getUserFromCache()
  }
}

// 监听自定义用户信息更新事件
const handleUserInfoUpdated = (e: CustomEvent) => {
  console.log('TopNavBar: 收到用户信息更新事件', e.detail)
  getUserFromCache()
}

// 处理退出登录
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminInfo')
  user.value = null
  router.replace('/login')
}

// 安全格式化数字
const formatAmount = (amount: any): number => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0
  return num
}

// 组件挂载时获取用户信息
onMounted(() => {
  getUserFromCache()
  // 监听localStorage变化
  window.addEventListener('storage', handleStorageChange)
  // 监听自定义用户信息更新事件
  window.addEventListener('userInfoUpdated', handleUserInfoUpdated as EventListener)
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('userInfoUpdated', handleUserInfoUpdated as EventListener)
})

// 监听用户信息变化（用于实时更新余额等信息）
watch(
  () => localStorage.getItem('user'),
  () => {
    getUserFromCache()
  },
  { flush: 'sync' }
)
</script>

<style scoped>
/* 顶部导航栏 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 24px;
  height: 56px;
  background: var(--theme-nav-bg, rgba(220, 252, 231, 0.88));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--theme-nav-border, rgba(34, 197, 94, 0.25));
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  transition: background 0.5s ease, border-color 0.5s ease;
  position: relative;
}

/* 导航栏顶部主题色彩条 */
.navbar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--theme-btn-gradient, linear-gradient(135deg, #22c55e, #059669));
  opacity: 0.9;
}

.navbar-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  padding-left: 20px;
  padding-right: 32px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  background: var(--theme-logo-gradient, linear-gradient(135deg, #22c55e, #059669));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-title {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  background: var(--theme-logo-gradient, linear-gradient(135deg, #22c55e, #059669));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* Menu 组件样式 */
.nav-menu {
  border-bottom: none !important;
  background: transparent !important;
  flex: 1;
  min-width: 0;
}

/* 菜单选中项/hover用主题色 */
.nav-menu :deep(.ant-menu-item-selected),
.nav-menu :deep(.ant-menu-item-selected a) {
  color: var(--theme-primary, #22c55e) !important;
}
.nav-menu :deep(.ant-menu-item-selected::after) {
  border-bottom-color: var(--theme-primary, #22c55e) !important;
}
.nav-menu :deep(.ant-menu-item:hover),
.nav-menu :deep(.ant-menu-item:hover a) {
  color: var(--theme-primary, #22c55e) !important;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 点数余额显示 */
.points-balance {
  display: flex;
  align-items: center;
}

.balance-display {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(var(--theme-primary-rgb, 34,197,94), 0.08);
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid rgba(var(--theme-primary-rgb, 34,197,94), 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.balance-display:hover {
  background: rgba(var(--theme-primary-rgb, 34,197,94), 0.15);
  border-color: rgba(var(--theme-primary-rgb, 34,197,94), 0.3);
}

.balance-icon {
  font-size: 14px;
  cursor: pointer;
}

.balance-text {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.balance-amount {
  font-size: 16px;
  font-weight: bold;
  color: var(--theme-primary-dark, #16a34a);
}

.user-avatar-container {
  position: relative;
}

.user-name {
  font-weight: bold;
  color: #2c3e50;
}

.user-role {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.logout-item {
  color: #e74c3c;
}

.logout-item:hover {
  background: rgba(231, 76, 60, 0.1);
}

/* 移动端优化 */
@media (max-width: 768px) {
  /* 确保导航栏不会遮挡下拉菜单 */
  .navbar {
    position: relative !important;
    z-index: 999 !important;
    overflow-x: hidden; /* 防止水平滚动 */
    padding-right: 12px;
  }

  /* 导航栏左侧布局优化 */
  .navbar-left {
    flex: 1;
    min-width: 0; /* 允许flex项目收缩 */
  }

  /* 菜单容器优化 */
  .nav-tabs {
    flex: 1;
    min-width: 0; /* 允许收缩 */
    overflow: hidden;
  }

  /* Menu 组件移动端优化 */
  .nav-menu {
    border-bottom: none !important;
    background: transparent !important;
    overflow-x: auto; /* 允许菜单水平滚动 */
    scrollbar-width: none; /* Firefox 隐藏滚动条 */
    -ms-overflow-style: none; /* IE 隐藏滚动条 */
  }

  /* 隐藏菜单滚动条 */
  .nav-menu::-webkit-scrollbar {
    display: none;
  }

  /* 菜单项移动端样式 */
  .nav-menu :deep(.ant-menu-item) {
    padding: 0 8px !important; /* 减小菜单项内边距 */
    margin: 0 2px !important; /* 减小菜单项间距 */
    font-size: 13px !important; /* 减小字体大小 */
    white-space: nowrap; /* 防止换行 */
    flex-shrink: 0; /* 防止收缩 */
  }

  /* 确保用户头像容器在移动端有正确的定位 */
  .user-avatar-container {
    position: relative !important;
    z-index: 9999998 !important;
    flex-shrink: 0; /* 防止头像被压缩 */
  }

  .navbar-right {
    gap: 8px;
  }

  .logo {
    padding-left: 12px;
    padding-right: 12px;
  }

  .logo-text {
    display: none;
  }

  .balance-display {
    padding: 2px 6px;
    gap: 0px;
  }

  .balance-text {
    display: none;
  }

  .balance-amount {
    font-size: 14px;
  }
}
</style>
