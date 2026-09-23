import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({
  stdin: { contents: `export * from './src/utils/evtHistoryStorage.ts'; export * from './src/utils/evtClient.ts';`, resolveDir: root },
  bundle: true, write: false, format: 'esm', platform: 'node',
})
const { EvtHistoryStore, EvtClient, EVT_RETENTION_MS, EVT_IMPORTANT_MODULES, parseEvtLines, trimLogLines } =
  await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const now = Date.parse('2026-09-22T15:00:00+08:00')
const event = (id, module = '订单系统', ts = now, extra = {}) => ({ id: String(id), ts, module, title: `事件${id}`, status: 'success', ...extra })
const ok = data => ({ code: 200, data: { success: true, protocol: 2, ...data } })
const state = (extra = {}) => ok({ revision: 'r1', epoch: 'e1', online: true, updatedAt: now,
  modules: { 土地系统: { layout: { grid: { items: [{ id: 1, score: 8 }] } }, latest: null } }, ...extra })
const history = (events = [], extra = {}) => ok({ events, modules: [...new Set(events.map(item => item.module))].map(module => ({ module, count: events.filter(item => item.module === module).length })),
  nextCursor: null, liveCursor: 'live1', hasMore: false, retainedFrom: now - EVT_RETENTION_MS, retainedTo: now, availableFrom: now - 3600000, ...extra })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
let passed = 0
async function test(name, fn) { await fn(); passed++; console.log(`✓ ${name}`) }

await test('全部模块保留24h，没有300/2500条截断', () => {
  const store = new EvtHistoryStore()
  for (const module of EVT_IMPORTANT_MODULES) store.ingest(Array.from({ length: 600 }, (_, i) => event(`${module}-${i}`, module, now - i)), now)
  store.ingest(Array.from({ length: 6000 }, (_, i) => event(`data-${i}`, '数据管理', now - i)), now)
  store.ingest(Array.from({ length: 450 }, (_, i) => event(`misc-${i}`, '其他模块', now - i)), now)
  for (const view of store.snapshot()) assert.equal(view.events.length, EVT_IMPORTANT_MODULES.has(view.module) ? 600 : view.module === '数据管理' ? 6000 : 450)
  assert.equal(store.snapshot().reduce((count, view) => count + view.events.length, 0), 10050)
})
await test('保留滚动24小时跨零点，边界及无新增事件也会过期', () => {
  const store = new EvtHistoryStore()
  store.ingest([event('before', '订单系统', now - EVT_RETENTION_MS - 1), event('edge', '订单系统', now - EVT_RETENTION_MS), event('yesterday', '订单系统', now - 16 * 3600000)], now)
  assert.deepEqual(store.snapshot()[0].events.map(item => item.id), ['yesterday', 'edge'])
  store.prune(now + 1)
  assert.deepEqual(store.snapshot()[0].events.map(item => item.id), ['yesterday'])
})
await test('增量ID去重、倒序分页排序、计数正确且不突变已发布数组', () => {
  const store = new EvtHistoryStore()
  store.ingest([event(3), event(1, '订单系统', now - 2)], now)
  const old = store.snapshot()[0]
  store.ingest([event(2, '订单系统', now - 1, { status: 'failed' }), event(3)], now)
  assert.equal(old.events.length, 2)
  assert.deepEqual(store.snapshot()[0].events.map(item => item.id), ['3', '2', '1'])
  assert.equal(store.snapshot()[0].successCount, 2)
  assert.equal(store.snapshot()[0].failedCount, 1)
})
await test('历史layout不能回滚当前状态；历史kv和奖励仍保留', () => {
  const store = new EvtHistoryStore()
  store.replaceStates({ 土地系统: { layout: { grid: { items: [{ score: 88 }] } } } })
  store.ingest([event('old', '土地系统', now - 1000, { gains: [{ name: '玫瑰', count: 5 }], meta: { businessId: 7, layout: { grid: { items: [{ score: 1 }] }, kvList: [{ label: '数量', value: 5 }] } } })], now)
  const view = store.snapshot()[0]
  assert.equal(view.layout.grid.items[0].score, 88)
  assert.deepEqual(view.events[0].kv, [{ label: '数量', value: 5 }])
  assert.equal(view.events[0].meta.businessId, 7)
  assert.equal(view.events[0].meta.layout, undefined)
  assert.equal(view.events[0].gains[0].count, 5)
})
await test('旧版silent只更新分区，旧记录不覆盖新字段、混合消息仍有历史', () => {
  const store = new EvtHistoryStore()
  store.ingest([event('state', '土地系统', now, { silent: true, meta: { layout: { grid: { items: [2] } } } }),
    event('mixed', '土地系统', now - 100, { meta: { layout: { grid: { items: [1] }, tags: [{ label: '保留分区' }] } } })], now, true)
  const view = store.snapshot()[0]
  assert.deepEqual(view.layout.grid.items, [2])
  assert.equal(view.layout.tags[0].label, '保留分区')
  assert.equal(view.events.length, 1)
})
await test('旧解析只处理传入批次，忽略损坏行；普通文本仍2500', () => {
  assert.equal(parseEvtLines(['plain', '[[EVT]]{bad', `prefix [[EVT]]${JSON.stringify(event(1))}`]).length, 1)
  assert.equal(trimLogLines(Array.from({ length: 4000 }, (_, i) => String(i)).join('\n')).split('\n').length, 2500)
})

await test('新接口初始化、模块目录、unchanged快照不清状态、详情按模块分页', async () => {
  const requests = []
  let round = 0
  const client = new EvtClient(async (path, params) => {
    requests.push([path, params])
    if (path.endsWith('evt-state')) return round ? state({ unchanged: true, modules: {} }) : state()
    if (params.module) return history([event('module-old', params.module, now - 6000)], { nextCursor: 'older2', hasMore: true })
    return history([event(round ? 'new' : 'initial')], { modules: [{ module: '订单系统', count: 500 }, { module: '珍珠系统', count: 10 }], nextCursor: 'live2' })
  }, () => {}, () => now)
  client.reset(1); await client.poll()
  assert.equal(client.mode, 'v2')
  assert.ok(client.store.snapshot().some(view => view.module === '珍珠系统'))
  round++; await client.poll()
  assert.deepEqual(client.store.snapshot().find(view => view.module === '土地系统').layout.grid.items, [{ id: 1, score: 8 }])
  assert.equal(requests[3][1].cursor, 'live1')
  await client.loadOlder('订单系统')
  assert.equal(client.pages['订单系统'].cursor, 'older2')
  assert.equal(client.pages['订单系统'].loading, false)
  assert.match(client.notice, /现存记录最早/)
})
await test('同时触发轮询/同模块分页只发一组请求', async () => {
  const pending = deferred(); let calls = 0; let pageMode = false
  const client = new EvtClient(async path => { calls++; if (pageMode) return pending.promise; return path.endsWith('evt-state') ? state() : history() }, () => {}, () => now)
  client.reset(1); await Promise.all([client.poll(), client.poll()])
  assert.equal(calls, 2)
  pageMode = true
  const first = client.loadOlder('订单系统'); const second = client.loadOlder('订单系统')
  assert.equal(calls, 3)
  pending.resolve(history([event(1)])); await Promise.all([first, second])
})
await test('切账号/关闭丢弃旧响应，新账号不会串事件/状态/加载锁', async () => {
  const old = deferred()
  const client = new EvtClient(async (path, params) => params.id === 1 ? old.promise : path.endsWith('evt-state') ? state() : history([event('account2')]), () => {}, () => now)
  client.reset(1); const first = client.poll()
  client.reset(2); await client.poll()
  old.resolve(history([event('account1')])); await first
  assert.deepEqual(client.store.snapshot().flatMap(view => view.events.map(item => item.id)), ['account2'])
  const stopped = deferred()
  const other = new EvtClient(async () => stopped.promise, () => {}, () => now)
  other.reset(1); const pending = other.poll(); other.stop(); stopped.resolve(history([event('late')])); await pending
  assert.equal(other.store.snapshot().length, 0)
})
await test('404回退旧EVT并明确不足24h；服务端500保持新接口重试', async () => {
  const legacy = new EvtClient(async path => path.endsWith('evt-stream-poll') ? ok({ logs: [`[[EVT]]${JSON.stringify(event('old'))}`], lastLine: 1, streamId: 's' }) : { code: 404 }, () => {}, () => now)
  legacy.reset(1); await legacy.poll()
  assert.equal(legacy.mode, 'legacy'); assert.match(legacy.notice, /无法保证覆盖24小时/)
  assert.equal(legacy.store.snapshot()[0].events.length, 1)
  const failed = new EvtClient(async () => ({ code: 500, msg: '暂时失败' }), () => {}, () => now)
  failed.reset(1); await failed.poll()
  assert.equal(failed.mode, 'probing'); assert.match(failed.notice, /暂时失败/)
})
await test('旧EVT接口也不存在时普通日志回退，不丢混合事件', async () => {
  const client = new EvtClient(async () => ({ code: 404 }), () => {}, () => now)
  client.reset(1); await client.poll()
  assert.equal(client.mode, 'fallback')
  client.ingestFallback([`[[EVT]]${JSON.stringify(event(1))}`])
  assert.equal(client.store.snapshot()[0].events.length, 1)
})
await test('Axios HTTP400展示服务端具体原因和出错接口，修复后自动恢复', async () => {
  let failed = true
  const client = new EvtClient(async path => {
    if (path.endsWith('evt-state')) {
      if (failed) throw Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { code: 400, msg: '脚本账号ID格式无效' } },
      })
      return state()
    }
    return history([event('kept')])
  }, () => {}, () => now)
  client.reset(42); await client.poll()
  assert.match(client.notice, /当前状态（HTTP 400）：脚本账号ID格式无效/)
  assert.equal(client.mode, 'v2')
  assert.equal(client.store.snapshot().find(view => view.module === '订单系统').events.length, 1)
  failed = false; await client.poll()
  assert.equal(client.error, '')
  assert.ok(client.store.snapshot().find(view => view.module === '土地系统').layout)
})

await test('Axios格式的游标400/410仍能从最新页恢复', async () => {
  for (const status of [400, 410]) {
    const client = new EvtClient(async (path, params) => {
      if (path.endsWith('evt-state')) return state()
      if (params.cursor) throw Object.assign(new Error('Request failed'), {
        response: { status, data: { msg: '日志游标无效，请重新加载' } },
      })
      return history([event('recovered')], { nextCursor: 'older', hasMore: true })
    }, () => {}, () => now)
    client.reset(42); await client.poll(); await client.poll()
    await client.loadOlder('订单系统'); await client.loadOlder('订单系统')
    assert.equal(client.error, '')
    assert.equal(client.pages['订单系统'].error, '')
  }
})

await test('状态服务暂时失败时仍展示已取得的历史，下轮独立恢复状态', async () => {
  let fail = true
  const client = new EvtClient(async path => path.endsWith('evt-state') ? fail ? { code: 503, msg: '状态暂不可用' } : state() : history([event('visible')]), () => {}, () => now)
  client.reset(1); await client.poll()
  assert.equal(client.mode, 'v2')
  assert.equal(client.store.snapshot()[0].events[0].id, 'visible')
  assert.match(client.notice, /状态暂不可用/)
  fail = false; await client.poll()
  assert.ok(client.store.snapshot().find(view => view.module === '土地系统').layout)
})
await test('失效游标400/410重取本模块最新页，缓存历史和最新状态保留', async () => {
  let phase = 0; const requests = []
  const client = new EvtClient(async (path, params) => {
    requests.push(params)
    if (path.endsWith('evt-state')) return state()
    if (params.cursor && phase > 0) return { code: phase === 1 ? 400 : 410, msg: '游标到期' }
    return history([event(phase)], { nextCursor: 'old', hasMore: true })
  }, () => {}, () => now)
  client.reset(1); await client.poll(); await client.loadOlder('订单系统')
  phase = 1; await client.loadOlder('订单系统')
  assert.equal(requests.at(-1).module, '订单系统'); assert.equal(requests.at(-1).cursor, undefined)
  phase = 2; await client.poll()
  assert.ok(client.store.snapshot().find(view => view.module === '订单系统').events.length >= 3)
  assert.deepEqual(client.store.snapshot().find(view => view.module === '土地系统').layout.grid.items, [{ id: 1, score: 8 }])
})
await test('进程epoch切换替换状态但保留24h业务记录', async () => {
  let phase = 0
  const client = new EvtClient(async path => path.endsWith('evt-state') ? state(phase ? { epoch: 'new', revision: 'r2', modules: { 珍珠系统: { layout: { tags: [{ label: 'new' }] }, latest: null } } } : {}) : history([event(phase)]), () => {}, () => now)
  client.reset(1); await client.poll(); phase++; await client.poll()
  assert.equal(client.store.snapshot().find(view => view.module === '土地系统').layout, null)
  assert.equal(client.store.snapshot().find(view => view.module === '订单系统').events.length, 2)
})
await test('状态limited/stale明确提示，unchanged也更新标志；恢复后自动消失且历史独立增量', async () => {
  for (const flag of ['limited', 'stale']) {
    let phase = 0
    const client = new EvtClient(async path => path.endsWith('evt-state')
      ? state(phase ? { unchanged: true, modules: {}, [flag]: phase === 1 } : {})
      : history([event(`${flag}-${phase}`)]), () => {}, () => now)
    client.reset(1); await client.poll()
    phase = 1; await client.poll()
    assert.equal(client[flag], true)
    assert.match(client.notice, /状态暂未更新/)
    assert.match(client.notice, /历史记录仍可独立查看/)
    assert.doesNotMatch(client.notice, /IPC|broker|共享内存/)
    assert.deepEqual(client.store.snapshot().find(view => view.module === '土地系统').layout.grid.items, [{ id: 1, score: 8 }])
    assert.equal(client.store.snapshot().find(view => view.module === '订单系统').events.length, 2)
    phase = 2; await client.poll()
    assert.equal(client[flag], false)
    assert.doesNotMatch(client.notice, /状态暂未更新/)
    assert.equal(client.store.snapshot().find(view => view.module === '订单系统').events.length, 3)
    phase = 1; await client.poll(); client.reset(2)
    assert.equal(client.limited, false); assert.equal(client.stale, false)
  }
})

await test('真实Vue文件均可编译，时间线使用虚拟组件且不再全量v-for/localStorage', async () => {
  for (const name of ['EventCardView', 'EvtTimeline', 'LogViewModal']) {
    const source = await readFile(new URL(`../src/components/${name}.vue`, import.meta.url), 'utf8')
    const parsed = parse(source, { filename: `${name}.vue` })
    assert.deepEqual(parsed.errors, [])
    const script = compileScript(parsed.descriptor, { id: name })
    const template = compileTemplate({ id: name, source: parsed.descriptor.template.content, filename: `${name}.vue`, compilerOptions: { bindingMetadata: script.bindings } })
    assert.deepEqual(template.errors, [])
    assert.doesNotMatch(source, /localStorage\.setItem|scheduleMidnightEvtClear|\[\.\.\.card\.events\]\.reverse/)
    if (name === 'EvtTimeline') { assert.match(source, /<DynamicScroller\b/); assert.match(source, /key-field="id"/); assert.match(source, /item\.kv/); assert.doesNotMatch(source, /v-for=".*\bin events\b/) }
    if (name === 'EventCardView') { assert.match(source, /<EvtTimeline/); assert.doesNotMatch(source, /MAX_LOG_HISTORY/) }
  }
})
await test('实际EvtTimeline与虚拟滚动库预渲染10000条时仅生成8个事件节点，kv可见', async () => {
  const source = await readFile(new URL('../src/components/EvtTimeline.vue', import.meta.url), 'utf8')
  const descriptor = parse(source, { filename: 'EvtTimeline.vue' }).descriptor
  const compiled = compileScript(descriptor, { id: 'evt-timeline-test', inlineTemplate: true })
  const output = await build({ stdin: { contents: compiled.content, loader: 'ts', resolveDir: `${root}/src/components` },
    bundle: true, write: false, format: 'cjs', platform: 'node', external: ['vue', 'vue-virtual-scroller'] })
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports)
  const html = await renderToString(createSSRApp(mod.exports.default, {
    events: Array.from({ length: 10000 }, (_, i) => event(i, '土地系统', now - i, { kv: [{ label: '数量', value: 18 }], desc: '采收完成' })),
  }))
  assert.equal((html.match(/<article /g) ?? []).length, 8)
  assert.match(html, /数量/); assert.match(html, /18/); assert.doesNotMatch(html, /事件9999/)
})
console.log(`\n${passed} EVT checks passed (no live accounts, no persisted test data).`)
