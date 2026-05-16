import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.scss'
import 'virtual:uno.css'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
// 引入axios配置，设置全局拦截器
import './utils/axios'
import { message } from 'ant-design-vue'
import { initDevToolsProtection } from './hooks/useDevToolsDetection'
// 引入 vue-virtual-scroller
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import VueVirtualScroller from 'vue-virtual-scroller'
import './utils/enc'
// 引入 vConsole
// import VConsole from 'vconsole'

// 初始化 vConsole（仅在开发环境或需要调试时启用）
// if (import.meta.env.DEV || localStorage.getItem('enableVConsole') === 'true') {
// new VConsole()
// }

// 定义账号数据接口
interface SavedAccount {
  username: string
  password: string
}

// 检查URL参数中是否有saved_accounts，如果有则与本地数据合并
const urlParams = new URLSearchParams(window.location.search)
const savedAccountsParam = urlParams.get('saved_accounts')
if (savedAccountsParam) {
  try {
    // 解码URL参数中的账号数据
    const decodedAccounts = decodeURIComponent(savedAccountsParam)
    const urlAccounts: SavedAccount[] = JSON.parse(decodedAccounts)

    // 获取本地已有的账号数据
    const localAccountsStr = localStorage.getItem('saved_accounts')
    let localAccounts: SavedAccount[] = []
    if (localAccountsStr) {
      try {
        localAccounts = JSON.parse(localAccountsStr)
      } catch (error) {
        // 忽略解析错误
      }
    }

    // 以username为key进行合并，本地数据优先
    const accountMap = new Map<string, SavedAccount>()

    // 先添加URL中的账号
    urlAccounts.forEach((account) => {
      if (account.username) {
        accountMap.set(account.username, account)
      }
    })

    // 再添加本地账号，如果username相同则覆盖（本地优先）
    localAccounts.forEach((account) => {
      if (account.username) {
        accountMap.set(account.username, account)
      }
    })

    // 转换回数组并保存
    const mergedAccounts = Array.from(accountMap.values())
    localStorage.setItem('saved_accounts', JSON.stringify(mergedAccounts))

    // 清除URL中的saved_accounts参数，避免刷新时重复处理
    urlParams.delete('saved_accounts')
    const newSearch = urlParams.toString()
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '')
    window.history.replaceState({}, '', newUrl)
  } catch (error) {
    // 忽略处理错误
  }
}

// 检查是否需要跳转，如果需要则不创建Vue应用
declare global {
  interface Window {
    __SHOULD_REDIRECT__?: boolean
  }
}

if (window.__SHOULD_REDIRECT__) {
  // 需要跳转，不创建Vue应用
} else {
  // 正常初始化Vue应用
  if (import.meta.env.PROD && __ENABLE_SECURITY__) {
    initDevToolsProtection()
  }

  const app = createApp(App)

  app.use(router)
  app.use(Antd)
  app.use(VueVirtualScroller)

  app.mount('#app')
}

// 全局自动登出相关变量
let globalAutoLogoutTimer: ReturnType<typeof setInterval> | null = null
let isUserActivityListenerActive = false
let lastActiveTimestamp = Date.now() // 最后活动时间戳
const AUTO_LOGOUT_DURATION = 15 * 60 * 1000 // 15分钟 (毫秒)
const CHECK_INTERVAL = 5 * 1000 // 每5秒检查一次

// 执行登出操作
const performLogout = () => {
  message.error('登录已超时，请重新登录')

  // 清理所有登录相关数据
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminInfo')
  localStorage.removeItem('isLoggedIn')

  // 移除用户活动监听器
  removeUserActivityListeners()

  // 清理定时器
  clearGlobalAutoLogoutTimer()

  // 触发全局退出登录事件
  window.dispatchEvent(new CustomEvent('logout'))

  // 跳转到登录页面
  if (window.location.pathname !== '/login') {
    router.push('/login')
  }
}

// 启动全局自动超时计时器（每5秒检查时间戳）
const startGlobalAutoLogoutTimer = () => {
  if (globalAutoLogoutTimer) {
    clearInterval(globalAutoLogoutTimer)
    globalAutoLogoutTimer = null
  }

  // 检查是否已登录
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')

  if (!token || !user) {
    return // 未登录，不启动定时器
  }

  // 重置最后活动时间戳
  lastActiveTimestamp = Date.now()

  // 每5秒检查一次是否超时
  globalAutoLogoutTimer = setInterval(() => {
    const currentTime = Date.now()
    const timeSinceLastActivity = currentTime - lastActiveTimestamp

    // 检查是否还在登录状态（防止已经手动登出但定时器还在运行）
    const currentToken = localStorage.getItem('token')
    const currentUser = localStorage.getItem('user')

    if (!currentToken || !currentUser) {
      clearGlobalAutoLogoutTimer()
      return
    }

    // 如果超过15分钟，执行登出
    if (timeSinceLastActivity >= AUTO_LOGOUT_DURATION) {
      performLogout()
    }
  }, CHECK_INTERVAL)

  // 启动用户活动监听
  startUserActivityListeners()
}

// 用户活动处理函数
const handleUserActivity = () => {
  // 更新最后活动时间戳
  lastActiveTimestamp = Date.now()
}

// 启动用户活动监听器
const startUserActivityListeners = () => {
  if (isUserActivityListenerActive) {
    return // 避免重复添加监听器
  }

  // 监听触摸和鼠标事件
  document.addEventListener('touchstart', handleUserActivity, { passive: true })
  document.addEventListener('mousedown', handleUserActivity, { passive: true })

  isUserActivityListenerActive = true
}

// 移除用户活动监听器
const removeUserActivityListeners = () => {
  if (!isUserActivityListenerActive) {
    return
  }

  document.removeEventListener('touchstart', handleUserActivity)
  document.removeEventListener('mousedown', handleUserActivity)

  isUserActivityListenerActive = false
}

// 清理全局自动登出定时器
const clearGlobalAutoLogoutTimer = () => {
  if (globalAutoLogoutTimer) {
    clearInterval(globalAutoLogoutTimer)
    globalAutoLogoutTimer = null
  }

  // 同时移除用户活动监听器
  removeUserActivityListeners()
}

// 导出函数供其他地方使用
declare global {
  interface Window {
    startGlobalAutoLogoutTimer: () => void
    clearGlobalAutoLogoutTimer: () => void
    startUserActivityListeners: () => void
    removeUserActivityListeners: () => void
  }
}

// 监听登录成功事件
window.addEventListener('loginSuccess', () => {
  startGlobalAutoLogoutTimer()
})

// 监听退出登录事件
window.addEventListener('logout', () => {
  clearGlobalAutoLogoutTimer()
})

// 应用启动时检查登录状态并启动定时器
const token = localStorage.getItem('token')
const user = localStorage.getItem('user')

if (token && user) {
  startGlobalAutoLogoutTimer()
}

// 导出函数供其他地方使用
window.startGlobalAutoLogoutTimer = startGlobalAutoLogoutTimer
window.clearGlobalAutoLogoutTimer = clearGlobalAutoLogoutTimer
window.startUserActivityListeners = startUserActivityListeners
window.removeUserActivityListeners = removeUserActivityListeners
