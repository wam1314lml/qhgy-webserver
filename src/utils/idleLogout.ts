/** Website idle logout: human input only; API polling and focus never renew it. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const EVENTS = ['pointerdown', 'pointermove', 'mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'input', 'change', 'wheel']
interface Options {
  project: string
  onTimeout: () => void
  window?: Window
  document?: Document
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  now?: () => number
}
export function createIdleLogout(options: Options) {
  const win = options.window || window
  const doc = options.document || document
  const storage = options.storage || win.localStorage
  const now = options.now || Date.now
  let owner = '', key = '', lastActive = 0, lastWrite = 0
  let timer: number | undefined
  let listening = false
  function currentOwner(): string {
    try {
      if (!storage.getItem('token')) return ''
      const user = JSON.parse(storage.getItem('user') || 'null')
      if (!user || typeof user !== 'object') return ''
      if (typeof user.id === 'number' || typeof user.id === 'string') return 'id:' + user.id
      return typeof user.username === 'string' && user.username ? 'name:' + user.username : ''
    } catch { return '' }
  }
  function read(): number {
    try {
      const value = Number(storage.getItem(key))
      return Number.isFinite(value) && value > 0 && value <= now() ? value : 0
    } catch { return 0 }
  }
  function persist(force = false) {
    if (!key || (!force && now() - lastWrite < 1000)) return
    try { storage.setItem(key, String(lastActive)); lastWrite = now() } catch { /* Memory-only idle tracking still works. */ }
  }
  function schedule() {
    if (timer !== undefined) win.clearTimeout(timer)
    timer = win.setTimeout(check, Math.max(1, IDLE_TIMEOUT_MS - (now() - lastActive)))
  }
  function stop(clear = false) {
    if (timer !== undefined) win.clearTimeout(timer)
    timer = undefined
    if (listening) {
      EVENTS.forEach(name => doc.removeEventListener(name, activity, true))
      doc.removeEventListener('visibilitychange', wake)
      win.removeEventListener('focus', wake)
      win.removeEventListener('pageshow', wake)
      win.removeEventListener('pagehide', flush)
      win.removeEventListener('storage', sync)
    }
    if (clear && key) { try { storage.removeItem(key) } catch { /* best effort */ } }
    listening = false
    owner = key = ''
  }
  function check(): boolean {
    if (!owner) return false
    const next = currentOwner()
    if (!next) { stop(); return false }
    if (next !== owner) { start(true); return false }
    lastActive = Math.max(lastActive, read())
    // A backwards clock adjustment cannot disable the timeout indefinitely.
    if (lastActive > now()) { lastActive = now(); persist(true) }
    if (now() - lastActive >= IDLE_TIMEOUT_MS) {
      stop(true)
      options.onTimeout()
      return false
    }
    schedule()
    return true
  }
  function activity(event: Event) {
    // dispatchEvent(), automated refreshes and background activity are not user input.
    if (!event.isTrusted || doc.visibilityState === 'hidden') return
    if (!check()) return
    lastActive = now()
    persist()
    schedule()
  }
  function wake() { if (doc.visibilityState !== 'hidden') check() }
  function flush() { if (owner && currentOwner() === owner) persist(true) }
  function sync(event: StorageEvent) {
    if (event.key === key || event.key === 'token' || event.key === 'user' || event.key === null) check()
  }
  function start(reset = false) {
    const next = currentOwner()
    if (!next) { stop(); return }
    if (owner === next && !reset) { check(); return }
    stop()
    owner = next
    key = 'user-idle:v1:' + options.project + ':' + encodeURIComponent(owner)
    lastWrite = 0
    lastActive = reset ? now() : (read() || now())
    if (!check()) return
    persist(true)
    EVENTS.forEach(name => doc.addEventListener(name, activity, { capture: true, passive: true }))
    doc.addEventListener('visibilitychange', wake)
    win.addEventListener('focus', wake)
    win.addEventListener('pageshow', wake)
    win.addEventListener('pagehide', flush)
    win.addEventListener('storage', sync)
    listening = true
  }
  return { start, stop }
}
