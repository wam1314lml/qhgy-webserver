// 执行真实组件导出函数；仅使用合成认证、报表和下载环境，不请求生产接口。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref } from 'vue'

const component = readFileSync(new URL('../src/components/AdminPanel.vue', import.meta.url), 'utf8')
const source = component.slice(component.indexOf('const doExportReport ='), component.indexOf('// 处理编辑充值配置'))
const code = ts.transpileModule(source + '\nglobalThis.exportReport = doExportReport', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
const csv = new Blob(['\uFEFF结算报表\r\n三级代理,本次扣款(元)\r\n合成代理,283.09'], { type: 'text/csv;charset=utf-8' })
const csvReply = (filename = '结算报表_合成代理_全部历史.csv') => ({
  status: 200,
  data: csv,
  headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${encodeURIComponent(filename)}"` },
})
const failure = (status, message) => ({ response: {
  status, data: new Blob([JSON.stringify({ success: false, message })], { type: 'application/json' }),
} })
const deferred = () => {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

function setup(reply = () => csvReply()) {
  const calls = [], downloads = [], errors = [], timers = [], revoked = [], blobs = []
  const context = {
    props: { token: 'synthetic-admin-token', user: { id: 123 } },
    reportTarget: ref({ id: 456, username: '合成代理' }),
    reportSelectedKeys: ref(['2026-10-31T01:00:00.000Z']),
    reportModalOpen: ref(true), reportExporting: ref(false),
    axios: { get: async (url, config) => { calls.push({ url, config }); return reply(url, config) } },
    document: {
      createElement: () => ({ style: {}, click() { downloads.push({ href: this.href, filename: this.download }) } }),
      body: { appendChild() {}, removeChild() {} },
    },
    URL: { createObjectURL: blob => { blobs.push(blob); return `blob:synthetic-${blobs.length}` }, revokeObjectURL: url => revoked.push(url) },
    Blob, setTimeout: fn => timers.push(fn), message: { error: text => errors.push(text) },
  }
  vm.createContext(context)
  vm.runInContext(code, context)
  return { context, calls, downloads, errors, timers, revoked, blobs, run: context.exportReport }
}

let count = 0
async function test(name, run) {
  await run()
  count++
  console.log('PASS', name)
}

await test('全部历史使用认证头，URL无凭据，CSV原字节及中文文件名保留，临时URL释放', async () => {
  const s = setup()
  await s.run(true)
  assert.equal(s.calls.length, 1)
  assert.equal(s.calls[0].url, '/api/admin/commission-report')
  assert.equal(s.calls[0].config.headers.Authorization, 'Bearer synthetic-admin-token')
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls[0].config.params)), { agentId: 456, batchTime: 'all' })
  assert.equal(s.calls[0].config.responseType, 'blob')
  assert.equal(s.calls[0].config.handleErrorLocally, true)
  assert.equal(s.downloads[0].filename, '结算报表_合成代理_全部历史.csv')
  assert.match(s.downloads[0].href, /^blob:/)
  assert.equal(s.blobs[0], csv)
  assert.deepEqual([...new Uint8Array(await s.blobs[0].arrayBuffer())].slice(0, 3), [239, 187, 191])
  assert.equal(s.context.reportModalOpen.value, false)
  assert.equal(s.context.reportExporting.value, false)
  s.timers.forEach(fn => fn())
  assert.deepEqual(s.revoked, [s.downloads[0].href])
})

await test('选中批次串行逐个导出，不转成全部历史', async () => {
  const s = setup()
  const selected = ['2026-10-30T00:00:00.000Z', '2026-10-31T00:00:00.000Z']
  s.context.reportSelectedKeys.value = selected
  await s.run(false)
  assert.deepEqual(s.calls.map(c => c.config.params.batchTime), selected)
  assert.equal(s.downloads.length, 2)
})

for (const status of [401, 403, 404, 500]) {
  await test(`HTTP ${status} JSON错误只提示，不下载伪报表且保留弹窗`, async () => {
    const s = setup(() => { throw failure(status, '合成服务端错误') })
    await s.run(false)
    assert.deepEqual(s.errors, ['报表导出失败：合成服务端错误'])
    assert.equal(s.downloads.length, 0)
    assert.equal(s.context.reportModalOpen.value, true)
    assert.equal(s.context.reportExporting.value, false)
  })
}

await test('502 HTML及网络异常可读提示，不生成文件', async () => {
  for (const [error, expected] of [
    [{ response: { status: 502, data: new Blob(['<html>Bad Gateway</html>']) } }, 'HTTP 502'],
    [new TypeError('Failed to fetch'), '网络异常'],
  ]) {
    const s = setup(() => { throw error })
    await s.run(true)
    assert.ok(s.errors[0].includes(expected))
    assert.equal(s.downloads.length, 0)
  }
})

await test('200 JSON/HTML不是CSV，不伪报成功', async () => {
  for (const contentType of ['application/json', 'text/html']) {
    const s = setup(() => ({ status: 200, headers: { 'content-type': contentType }, data: new Blob(['{}']) }))
    await s.run(true)
    assert.equal(s.downloads.length, 0)
    assert.equal(s.context.reportModalOpen.value, true)
    assert.match(s.errors[0], /未返回 CSV/)
  }
})

await test('下载进行中重复点击只发一次请求', async () => {
  const pending = deferred()
  const s = setup(() => pending.promise)
  const first = s.run(true)
  await s.run(true)
  assert.equal(s.calls.length, 1)
  pending.resolve(csvReply())
  await first
  assert.equal(s.downloads.length, 1)
})

await test('关闭/换代理/换身份后丢弃迟到文件，并停止后续批次', async () => {
  for (const change of [
    c => { c.reportModalOpen.value = false },
    c => { c.reportTarget.value = { id: 789 } },
    c => { c.props.user = { id: 789 } },
  ]) {
    const pending = deferred()
    const s = setup(() => pending.promise)
    s.context.reportSelectedKeys.value = ['first', 'second']
    const run = s.run(false)
    change(s.context)
    pending.resolve(csvReply())
    await run
    assert.equal(s.calls.length, 1)
    assert.equal(s.downloads.length, 0)
    assert.equal(s.errors.length, 0)
  }
})

await test('无批次不请求，下载中第二批失败不继续后续批次', async () => {
  const empty = setup()
  empty.context.reportSelectedKeys.value = []
  await empty.run(false)
  assert.equal(empty.calls.length, 0)
  let n = 0
  const s = setup(() => { if (++n === 2) throw failure(403, '权限已撤销'); return csvReply() })
  s.context.reportSelectedKeys.value = ['first', 'second', 'third']
  await s.run(false)
  assert.equal(s.calls.length, 2)
  assert.equal(s.downloads.length, 1)
  assert.equal(s.context.reportModalOpen.value, true)
  assert.match(s.errors[0], /权限已撤销/)
})

await test('支持filename*，缺失或损坏的文件名使用CSV默认名', async () => {
  for (const [disposition, expected] of [
    ["attachment; filename*=UTF-8''" + encodeURIComponent('结算报表.csv'), '结算报表.csv'],
    ['', '结算报表.csv'],
    ['attachment; filename="%INVALID"', '结算报表.csv'],
  ]) {
    const s = setup(() => ({ ...csvReply(), headers: { 'content-type': 'text/csv', 'content-disposition': disposition } }))
    await s.run(true)
    assert.equal(s.downloads[0].filename, expected)
  }
})
console.log(`${count} 项报表下载回归通过；无真实提现或外部请求。`)
