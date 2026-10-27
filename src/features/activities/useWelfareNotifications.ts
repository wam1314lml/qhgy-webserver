import { computed, onMounted, onUnmounted, ref } from 'vue'
import axios from '@/utils/axios'
import { getCurrentUser } from '@/utils/userUtils'
import { activitiesApi, clearActivityRequests } from './api'
import type { ActivityType } from './types'

const activitiesPending = ref(false)
const activeActivityTypes = ref<ActivityType[]>([])
const activityLoadFailed = ref(false)
const hasActiveActivities = computed(() => activeActivityTypes.value.length > 0)
const rechargePending = ref(false)
const hasPending = computed(() => activitiesPending.value || rechargePending.value)
let consumers = 0
let identity = ''
let generation = 0
let poll: ReturnType<typeof setInterval> | undefined
let midnight: ReturnType<typeof setTimeout> | undefined
let inFlight: Promise<void> | undefined
let refreshQueued = false

function currentIdentity() {
  const user = getCurrentUser()
  return localStorage.getItem('token') && user && (user.role === 'admin' || user.permissions?.welfare_panel) ? String(user.id) : ''
}
export function clearWelfareNotifications() {
  generation++
  identity = ''
  activitiesPending.value = false
  activeActivityTypes.value = []
  activityLoadFailed.value = false
  rechargePending.value = false
  inFlight = undefined
  refreshQueued = false
  clearActivityRequests()
}
export async function refreshWelfareNotifications() {
  const nextIdentity = currentIdentity()
  if (nextIdentity !== identity) {
    clearWelfareNotifications()
    identity = nextIdentity
  }
  if (!identity) return
  if (inFlight) { refreshQueued = true; return inFlight }
  const version = generation
  const account = identity
  const task = (async () => {
    do {
      refreshQueued = false
      const [activity, lottery] = await Promise.allSettled([
        activitiesApi.summary(),
        axios.get('/api/lottery/info', { handleErrorLocally: true }),
      ])
      if (version !== generation || account !== currentIdentity()) return
      activityLoadFailed.value = activity.status === 'rejected'
      if (activity.status === 'fulfilled') {
        activitiesPending.value = activity.value.hasPending
        activeActivityTypes.value = activity.value.activeTypes
      } else if (activity.reason?.response?.status === 401 || activity.reason?.response?.status === 403) {
        activitiesPending.value = false
        activeActivityTypes.value = []
      }
      if (lottery.status === 'fulfilled') {
        const info = lottery.value.data
        rechargePending.value = !!info.rechargeEnabled && Number(info.rechargeLotteryCount) > 0
      }
    } while (refreshQueued && version === generation)
  })()
  inFlight = task
  try { await task } finally { if (inFlight === task) inFlight = undefined }
}
export function notifyWelfareChanged() {
  window.dispatchEvent(new CustomEvent('activitiesChanged'))
}
function refreshVisible() {
  if (document.visibilityState === 'visible') void refreshWelfareNotifications()
}
function scheduleMidnight() {
  if (midnight) clearTimeout(midnight)
  // 北京时间零点，不随客户端系统时区变化。
  const shifted = Date.now() + 8 * 60 * 60 * 1000
  const delay = 86_400_000 - shifted % 86_400_000 + 100
  midnight = setTimeout(() => {
    notifyWelfareChanged()
    scheduleMidnight()
  }, delay)
}
function changed() { void refreshWelfareNotifications() }
function storage(event: StorageEvent) {
  if (!event.key || event.key === 'user' || event.key === 'token') changed()
}
export function useWelfareNotifications() {
  onMounted(() => {
    if (++consumers === 1) {
      window.addEventListener('focus', refreshVisible)
      window.addEventListener('pageshow', refreshVisible)
      document.addEventListener('visibilitychange', refreshVisible)
      window.addEventListener('activitiesChanged', changed)
      window.addEventListener('userInfoUpdated', changed)
      window.addEventListener('logout', clearWelfareNotifications)
      window.addEventListener('storage', storage)
      poll = setInterval(refreshVisible, 60_000)
      scheduleMidnight()
    }
    changed()
  })
  onUnmounted(() => {
    if (--consumers > 0) return
    clearInterval(poll)
    clearTimeout(midnight)
    window.removeEventListener('focus', refreshVisible)
    window.removeEventListener('pageshow', refreshVisible)
    document.removeEventListener('visibilitychange', refreshVisible)
    window.removeEventListener('activitiesChanged', changed)
    window.removeEventListener('userInfoUpdated', changed)
    window.removeEventListener('logout', clearWelfareNotifications)
    window.removeEventListener('storage', storage)
    clearWelfareNotifications()
  })
  return { hasPending, activitiesPending, rechargePending, activeActivityTypes, hasActiveActivities, activityLoadFailed, refresh: refreshWelfareNotifications }
}
