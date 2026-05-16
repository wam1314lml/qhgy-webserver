import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '../router'
import { signRequest } from './hmac'
import { generateBrowserFingerprint } from './fingerprint'
import { d3 } from './enc'

// 防重复消息显示机制
const messageCache = new Map<string, number>()
const MESSAGE_THROTTLE_TIME = 3000 // 3秒内防重复

/**
 * 防重复显示错误消息
 * @param errorMessage 错误消息内容
 */
const throttledErrorMessage = (errorMessage: string) => {
  const now = Date.now()
  const lastShownTime = messageCache.get(errorMessage)

  // 如果3秒内没有显示过相同消息，则显示并记录时间
  if (!lastShownTime || now - lastShownTime > MESSAGE_THROTTLE_TIME) {
    message.error(errorMessage)
    messageCache.set(errorMessage, now)

    // 清理过期的缓存条目（可选的优化，避免内存泄漏）
    setTimeout(() => {
      messageCache.delete(errorMessage)
    }, MESSAGE_THROTTLE_TIME)
  }
}

// 创建axios实例
const axiosInstance = axios.create({
  timeout: 20000,
})

// 请求拦截器 - 自动添加token
axiosInstance.interceptors.request.use(
  async (config) => {
    // 优先使用用户token，如果没有则使用管理员token
    const userToken = localStorage.getItem('token')
    const adminToken = localStorage.getItem('adminToken')

    const token = userToken || adminToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 确保Content-Type
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }

    // HMAC 签名验证
    try {
      // 指纹验证：异步执行，不阻塞 challenge 获取
      if (!sessionStorage.getItem('browser-fingerprint-verified') && !sessionStorage.getItem('browser-fingerprint-pending')) {
        sessionStorage.setItem('browser-fingerprint-pending', 'true')
        generateBrowserFingerprint().then(fingerprint => {
          return axios.post('/api/challenge/verify-fingerprint', fingerprint)
        }).then(fpRes => {
          if (fpRes.data.success) {
            sessionStorage.setItem('browser-fingerprint-verified', 'true')
          }
        }).catch(() => {
          console.warn('⚠️ 指纹验证失败，使用快速模式')
        }).finally(() => {
          sessionStorage.removeItem('browser-fingerprint-pending')
        })
      }

      // 每次请求都获取新的挑战码（不缓存）
      let challengeRes = await axios.get('/api/challenge')
      if (!challengeRes.data?.data?.challenge) {
        await new Promise(resolve => setTimeout(resolve, 200))
        challengeRes = await axios.get('/api/challenge')
      }
      const { challenge } = challengeRes.data.data

      // 生成时间戳
      const timestamp = Date.now()

      // 构建完整 URL（包含 query 参数）
      let fullUrl = config.url || ''
      if (config.params) {
        const queryString = new URLSearchParams(config.params).toString()
        if (queryString) {
          fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
        }
      }

      // 计算签名
      const signature = await signRequest(fullUrl, config.data, timestamp, challenge)

      // 添加签名头
      const t = d3.d(
        'r7q1Dv[xEgpb3G-o*St-Abw=/k#Gv6v[xNlzGfV9mN?A3o(B=PfgQaumke<$xFRqkxF@Z=v]uovfk@BRx&3D(hC)HyzGfC/C1k8owjX^$pClM*A=Ma!C635wgD43$B1YgDfJp[7v}!XPw[i+=hF3(tfiJHclWgL4C4<@Mg+.EiCQ)loB4p7shebPXl0dOHxIg@#qd</Aph0HowOMfUrB^^D',
      )
      const t2 = d3.d(
        'z=Y[jm@p%}gH%rPwMIt)B4ymZxeqh:w&925k@hqSfK/uIv)+9Hk$jK?Aa-VKC@6ntCTMN%A.F!(Du}kVp?:Mkf>r40CY(8Fnk@J4xMMgNrA:5]wL3?{yhW(&woIPAC1C1[Cwq5oyge>+pJo0AzBNYsAZAt!Ack$[t6a{wy=uAJAXP7Bzei^7r=}nvfGq:6g/=ODpi5r=mqT?SrZYnyp*cBN',
      )
      const t3 = d3.d(
        'r8M[nmpO8Ox&mAkfFDajz+1}vn]E0+z-H%ms7Vh!d(R5%hd?bInMX/ar8NZMw{D{olU}6CoM0%Rm]R/-BtcD<C2REyxlO5EgFy>VrD8?hmK@ahw(IDlqb.9/m0yN<oMjPrz!9#Tt0#C4oI40LwOU)pf*P]0zC%W(C62YUh.W^CzD7m6xhQB3pfqTnrb1&>xgVVnhAaeZolK37D3sK2k$k=Q',
      )
      config.headers[t] = timestamp.toString()
      config.headers[t2] = challenge
      config.headers[t3] = signature
    } catch (error) {
      // console.error('❌ 生成签名失败:', error)
      // 签名失败也继续请求，由后端判断
    }

    return config
  },
  (error) => {
    console.error('❌ 请求拦截器错误:', error)
    return Promise.reject(error)
  },
)

// 防重复退出登录标志
let isLoggingOut = false

// 统一的退出登录函数
export const handleLogout = (message?: string) => {
  // 如果正在执行退出登录，直接返回，避免重复执行
  if (isLoggingOut) {
    return
  }

  isLoggingOut = true
  // console.log('🔐 执行退出登录，清理所有登录信息')

  // 清理用户相关数据
  localStorage.removeItem('token')
  localStorage.removeItem('user')

  // 清理管理员相关数据
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminInfo')

  // 清理其他可能的登录相关数据
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('autoLogoutTimer')

  // 显示消息
  if (message) {
    // console.log('🔐 退出登录原因:', message)
  }

  // 如果当前不是登录页面，跳转到登录页面
  if (window.location.pathname !== '/login') {
    // console.log('🔀 跳转到登录页面')
    // console.log('🔀 跳转到登录页面', router)
    router.push('/login')
  }

  // 触发自定义事件，通知其他组件登录状态变化
  window.dispatchEvent(new CustomEvent('logout'))

  // 3秒后重置标志，允许下次退出登录
  setTimeout(() => {
    isLoggingOut = false
  }, 3000)
}

// 检查是否为令牌无效错误
const isTokenInvalidError = (data: any): boolean => {
  if (!data) return false

  // 检查特定的错误格式: {"success":false,"message":"访问令牌无效或已过期"}
  if (
    data.success === false &&
    typeof data.message === 'string' &&
    data.message.includes('访问令牌无效或已过期')
  ) {
    return true
  }

  // 检查其他可能的令牌无效提示
  if (typeof data.message === 'string') {
    const tokenInvalidMessages = [
      '访问令牌无效或已过期',
      'token无效',
      'token过期',
      '令牌无效',
      '令牌格式无效',
      '令牌缺失',
      '令牌过期',
      '重新登录',
      'invalid token',
      'token expired',
      'unauthorized',
    ]

    const message = data.message.toLowerCase()
    return tokenInvalidMessages.some((msg) => message.includes(msg.toLowerCase()))
  }

  return false
}

// 响应拦截器 - 处理token过期和错误
axiosInstance.interceptors.response.use(
  (response) => {
    // 检查成功响应中是否包含令牌无效信息
    if (response.data && isTokenInvalidError(response.data)) {
      // throttledErrorMessage('登录已过期，请重新登录')
      handleLogout('响应数据显示访问令牌无效或已过期')
      // 返回一个被拒绝的Promise，阻止后续处理
      return Promise.reject(new Error('Token invalid'))
    }

    return response
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      // 优先检查响应数据中的令牌无效信息
      if (isTokenInvalidError(data)) {
        // console.log('🔐 错误响应数据显示令牌无效，执行退出登录')
        // throttledErrorMessage('登录已过期，请重新登录')
        handleLogout('错误响应数据显示访问令牌无效或已过期')
        return Promise.reject(error)
      }

      // 优先尝试使用通用错误信息，如果没有再根据状态码处理
      const generalErrorMessage = data?.message || data?.error

      if (generalErrorMessage) {
        // 如果服务器返回了错误信息，直接使用
        throttledErrorMessage(generalErrorMessage)
      } else {
        // 如果没有通用错误信息，根据状态码给出特定错误
        switch (status) {
          case 401:
            // HTTP 401 状态码 - token过期或无效
            // console.log('🔐 HTTP 401错误，执行退出登录')
            throttledErrorMessage('登录已过期，请重新登录')
            handleLogout('HTTP 401 未授权错误')
            break

          case 403:
            throttledErrorMessage('权限不足')
            break

          case 429:
            throttledErrorMessage('请求过于频繁，请稍后再试')
            break

          case 500:
            throttledErrorMessage('服务器内部错误')
            break

          default:
            throttledErrorMessage('未知错误')
        }
      }
    } else if (error.request) {
      // 网络错误
      console.error('❌ 网络错误:', error.message)
      throttledErrorMessage('网络连接失败，请检查网络状态')
    } else {
      // 其他错误
      console.error('❌ 请求错误:', error.message)
      throttledErrorMessage('请求失败，请稍后重试')
    }

    return Promise.reject(error)
  },
)

// 检查token是否过期的工具函数
export const isTokenExpired = (token: string | null): boolean => {
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

// 清理过期token的函数
export const cleanupExpiredTokens = () => {
  const userToken = localStorage.getItem('token')
  const adminToken = localStorage.getItem('adminToken')

  if (userToken && isTokenExpired(userToken)) {
    // console.log('🧹 清理过期的用户token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (adminToken && isTokenExpired(adminToken)) {
    // console.log('🧹 清理过期的管理员token')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminInfo')
  }
}

// 获取当前有效token
export const getCurrentToken = (): string | null => {
  const userToken = localStorage.getItem('token')
  const adminToken = localStorage.getItem('adminToken')

  // 检查并清理过期token
  if (userToken && isTokenExpired(userToken)) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return null
  }

  if (adminToken && isTokenExpired(adminToken)) {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminInfo')
    return null
  }

  return userToken || adminToken
}

// 导出配置好的axios实例
export default axiosInstance
