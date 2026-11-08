// “今日”统一按北京时间；独立于 token，退出登录不得清除此偏好。
const DAY_MS = 86400000
export const beijingDay = (now: number = Date.now()) => Math.floor((now + 8 * 3600000) / DAY_MS)
export function announcementOwner(value: unknown): string {
  try {
    const user = typeof value === 'string' ? JSON.parse(value) : value
    if (!user || typeof user !== 'object') return ''
    const u = user as { id?: unknown; username?: unknown }
    if (typeof u.id === 'number' || typeof u.id === 'string') return 'id:' + String(u.id)
    return typeof u.username === 'string' && u.username ? 'name:' + u.username : ''
  } catch { return '' }
}
export interface SnoozeStorage { getItem(key: string): unknown; setItem(key: string, value: string): void; removeItem(key: string): void }
export function createAnnouncementSnooze(storage: SnoozeStorage, project: string) {
  const key = (owner: string) => 'announcement-snooze:v1:' + project + ':' + encodeURIComponent(owner)
  return {
    isMuted(owner: string, now: number = Date.now()): boolean {
      if (!owner) return false
      try {
        const value = storage.getItem(key(owner))
        if (value === String(beijingDay(now))) return true
        if (value !== null && value !== undefined && value !== '') storage.removeItem(key(owner))
      } catch { /* 存储不可读时正常展示公告 */ }
      return false
    },
    setMuted(owner: string, checked: boolean, now: number = Date.now()): boolean {
      if (!owner) return false
      try {
        if (checked) storage.setItem(key(owner), String(beijingDay(now)))
        else storage.removeItem(key(owner))
        return true
      } catch { return false }
    },
  }
}
