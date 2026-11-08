import { defineComponent, h, ref } from 'vue'
import { Checkbox, message, notification } from 'ant-design-vue'
import axios from './axios'
import { sanitizeHtml } from './sanitize'
import { announcementOwner, createAnnouncementSnooze } from './announcementSnooze'

const snooze = createAnnouncementSnooze({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: key => localStorage.removeItem(key),
}, 'qhgy')
const timers = new Set<ReturnType<typeof setTimeout>>()
const notices = new Set<string>()
let generation = 0
function clearAnnouncements() {
  generation++
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
  notices.forEach(key => notification.close(key))
  notices.clear()
}
window.addEventListener('logout', clearAnnouncements)
function session() {
  try { return { owner: announcementOwner(localStorage.getItem('user')), token: localStorage.getItem('token') } }
  catch { return { owner: '', token: null } }
}
export async function showLoginAnnouncements() {
  clearAnnouncements()
  const start = session(), version = generation
  const active = () => { const next = session(); return version === generation && !!start.token && next.token === start.token && next.owner === start.owner }
  if (!active() || snooze.isMuted(start.owner)) return
  try {
    const response = await axios.get('/api/admin/announcements/active')
    const result = response.data
    if (!active() || snooze.isMuted(start.owner) || response.status !== 200 || !result?.success || !Array.isArray(result.data)) return
    const muted = ref(false)
    result.data.forEach((announcement: { title: string; content: string; display_duration: number }, index: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        if (!active() || snooze.isMuted(start.owner)) return
        const key = `login-announcement-${version}-${index}`
        const Content = defineComponent({
          setup: () => () => h('div', [
            h('div', { innerHTML: sanitizeHtml(announcement.content), style: { maxHeight: '200px', overflow: 'auto', overflowWrap: 'anywhere' } }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '12px' } }, [
              h(Checkbox, { checked: muted.value, onChange: (event: { target: { checked: boolean } }) => {
                if (!active()) { clearAnnouncements(); return }
                if (snooze.setMuted(start.owner, event.target.checked)) muted.value = event.target.checked
                else message.warning('未能保存免提示设置，请检查浏览器存储权限')
              } }, { default: () => '今日不再提示' }),
            ]),
          ]),
        })
        notices.add(key)
        notification.open({ key, message: `📢 ${announcement.title}`, description: h(Content),
          duration: announcement.display_duration, placement: 'top', top: '40px',
          style: { width: '400px', maxWidth: 'calc(100vw - 32px)', marginLeft: 'auto', marginRight: 'auto' },
          onClose: () => { notices.delete(key) },
        })
      }, index * 1000)
      timers.add(timer)
    })
  } catch { /* 公告读取失败不阻止登录 */ }
}
