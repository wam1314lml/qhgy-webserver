/**
 * 用户信息管理工具函数
 */

import axios from './axios'

export interface User {
  id: number
  username: string
  email: string
  role: string
  points: number
  invite_code: string
  total_invites: number
  permissions?: any
  role_level?: number
  permission_level?: number
}

/**
 * 更新 localStorage 中的用户信息
 * @param updates 要更新的用户信息字段
 */
export const updateUserInStorage = (updates: Partial<User>) => {
  try {
    const savedUser = localStorage.getItem('user')
    if (!savedUser) {
      console.warn('localStorage 中没有找到用户信息')
      return false
    }

    const currentUser = JSON.parse(savedUser) as User
    const updatedUser = { ...currentUser, ...updates }

    localStorage.setItem('user', JSON.stringify(updatedUser))

    // 触发一个自定义事件，通知其他组件用户信息已更新
    window.dispatchEvent(
      new CustomEvent('userInfoUpdated', {
        detail: updatedUser,
      }),
    )

    console.log('用户信息已更新到 localStorage:', updatedUser)
    return true
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return false
  }
}

let balanceRequestId = 0

/**
 * 更新用户余额 - 从接口获取最新余额并更新到本地存储
 * @returns Promise<boolean> 返回是否更新成功
 */
export const updateUserBalance = async (): Promise<boolean> => {
  const requestId = ++balanceRequestId
  const userId = getCurrentUser()?.id
  if (userId === undefined) return false

  try {
    const response = await axios.get('/api/points/balance')
    const rawBalance = response.data.points
    // 金额接口可能返回 decimal 字符串；空值不能当作 0 覆盖已有余额。
    const latestBalance =
      typeof rawBalance === 'number' ||
      (typeof rawBalance === 'string' && rawBalance.trim() !== '')
        ? Number(rawBalance)
        : NaN

    // 支付后的新查询优先，避免旧请求晚返回或切换账号后覆盖当前余额。
    if (requestId !== balanceRequestId || getCurrentUser()?.id !== userId) return false

    if (Number.isFinite(latestBalance)) {
      const success = updateUserInStorage({ points: latestBalance })
      console.log('用户余额已更新:', latestBalance)
      return success
    } else {
      console.error('接口返回的余额数据格式不正确:', response.data)
      return false
    }
  } catch (error) {
    console.error('获取用户余额失败:', error)
    return false
  }
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = (): User | null => {
  try {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}
