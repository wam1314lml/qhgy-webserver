import { computed, nextTick, shallowRef, watch, type Ref } from 'vue'
import { configValueAt, findMissingConfigFields, createMissingConfigMarkers, type ConfigFieldRow, type MissingConfigField } from './configMissing'

// UI-only state: read the raw server response, never the default-filled editor.
// Tokens prevent a late load/save/copy from acknowledging another account.
export function useConfigMissing(config: Ref<any>, defaults: unknown, rows: ConfigFieldRow[], account: () => unknown, busy: () => boolean) {
  const fields = shallowRef<MissingConfigField[]>([])
  let revision = 0
  const capture = () => ({ account: String(account()), revision })
  const current = (token: ReturnType<typeof capture>) => token.account === String(account()) && token.revision === revision
  const begin = () => { revision++; fields.value = []; return capture() }
  const record = (raw: unknown, token = capture()) => {
    if (current(token)) fields.value = findMissingConfigFields(raw, defaults, rows)
  }
  watch(account, () => { revision++; fields.value = [] }, { flush: 'sync' })
  watch(() => ({ config: config.value, fields: fields.value,
    values: fields.value.map(f => JSON.stringify(configValueAt(config.value, f.path))) }), (next, prev) => {
    // Applying a share/import is not a user acknowledgement or a successful save.
    if (busy() || next.config !== prev.config || next.fields !== prev.fields) return
    const remaining = next.fields.filter((_, i) => next.values[i] === prev.values[i])
    if (remaining.length !== next.fields.length) fields.value = remaining
  }, { flush: 'sync' })
  const markers = computed(() => createMissingConfigMarkers(fields.value, rows))
  const tabCounts = computed(() => {
    const result: Record<string, number> = {}
    for (const f of fields.value) result[f.tab] = (result[f.tab] || 0) + 1
    return result
  })
  async function locate(activeTab: Ref<string>, tab?: string, reveal?: () => void) {
    if (busy()) return
    const field = fields.value.find(f => !tab || f.tab === tab)
    if (!field) return
    activeTab.value = field.tab
    reveal?.()
    await nextTick()
    if (!fields.value.includes(field)) return
    const root = document.querySelector('.game-config-page')
    const elements = [...(root?.querySelectorAll<HTMLElement>('[data-config-missing-target]') || [])]
    const target = elements.find(e => e.dataset.configMissingTarget === field.row && e.getClientRects().length)
      || elements.find(e => e.dataset.configMissingTarget === field.section && e.getClientRects().length)
    if (!target) return
    elements.forEach(e => delete e.dataset.configMissingHighlight)
    target.dataset.configMissingHighlight = ''
    target.tabIndex = -1
    target.focus({ preventScroll: true })
    const top = 56 + (root?.querySelector('.tabs-container')?.getBoundingClientRect().height || 48)
    window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - top - 12),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return { fields, markers, tabCounts, capture, current, begin, record, locate }
}
