// 使用本项目真实配置模型、分享适配器和导入API，全部数据为离线合成配置。
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
async function bundle(contents, plugins = []) {
  const result = await build({ stdin: { contents, resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm', plugins })
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text + '\n//# sourceURL=share-missing-regression.mjs').toString('base64')}`)
}
import { loadSharePageModel } from './config-share-page-model.mjs'
const { current, adapter } = await loadSharePageModel(root)
const core = await bundle("export * from './src/features/config-share/core'; export * from './src/features/config-share/accountImport';")
const clone = value => JSON.parse(JSON.stringify(value))
const full = adapter.exportConfig(current)
const merge = (raw, payload) => adapter.mergeStored ? adapter.mergeStored(raw, payload) : adapter.preview(raw, payload).config
const payload = config => ({ ...full, config, code: 'TestMissing12345', createdAt: Date.now(), expiresAt: Date.now() + 60000 })
let passed = 0, failed = 0
async function test(name, fn) { try { await fn(); passed++; console.log('PASS ' + name) } catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message.slice(0, 500)) } }
await test('空配置可完整导入，未知和私有字段保留，读取对象不变', () => {
  for (const raw of [{}, { futureSetting: { keep: true }, password: 'synthetic-private' }]) {
    const before = clone(raw)
    assert.deepEqual(merge(raw, payload(full.config)), { ...raw, ...full.config })
    assert.deepEqual(raw, before)
  }
})
for (const [group, value] of Object.entries(full.config)) {
  await test('缺少父节点时导入 ' + group + '，其他未分享节点保持缺失', () => {
    const raw = { futureSetting: { keep: true } }
    assert.deepEqual(merge(raw, payload({ [group]: value })), { ...raw, [group]: value })
  })
}
function findLeaf(value, predicate, path = []) {
  if (predicate(value)) return { path, value }
  if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, child] of Object.entries(value)) {
    const result = findLeaf(child, predicate, [...path, key]); if (result) return result
  }
}
const examples = [
  ['false', value => value === false], ['0', value => value === 0],
  ['空数组', value => Array.isArray(value) && value.length === 0],
]
let sample
for (const [label, predicate] of examples) {
  const leaf = findLeaf(full.config, predicate)
  if (!leaf) continue
  const patch = leaf.path.reduceRight((child, key) => ({ [key]: child }), leaf.value)
  sample ||= patch
  await test('缺失字段可写入 ' + label + '，即使与页面默认值相同', () => {
    const raw = { futureSetting: { keep: true } }
    assert.deepEqual(merge(raw, payload(patch)), { ...raw, ...patch })
  })
}
assert.ok(sample, '配置模型应包含可导入开关')
const requests = []
let response = { status: 200, data: { success: true, data: {} } }
globalThis.__shareMissingHttpMock = {
  async get(url) { requests.push(['GET', url]); return response },
  async put(url, config) { requests.push(['PUT', url, clone(config)]); return { status: 200, data: { success: true, data: { updated: true } } } },
}
const { accountImportApi } = await bundle("export * from './src/features/config-share/accountImportApi';", [{ name: 'isolated-http', setup(build) {
  build.onResolve({ filter: /(?:utils|reference)\/axios$/ }, () => ({ path: 'http', namespace: 'isolated' }))
  build.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({ contents: 'export default globalThis.__shareMissingHttpMock', loader: 'js' }))
} }])
await test('API明确成功的空对象允许导入并实际保存到目标账号', async () => {
  const results = await core.importShareToAccounts({ ids: [1], accounts: [{ value: 1, label: '合成未配置账号' }], share: payload(sample), adapter, api: accountImportApi, isCurrent: () => true, onProgress() {} })
  assert.deepEqual(results.map(item => item.success), [true], JSON.stringify(results))
  assert.deepEqual(requests.find(row => row[0] === 'PUT'), ['PUT', '/api/game-accounts/1/setting/import', sample])
})
await test('读取失败或非对象配置仍拒绝，不能当空配置覆盖', async () => {
  for (const data of [null, [], 'bad', { error: '合成读取失败' }]) {
    response = { status: 200, data: { success: true, data } }
    await assert.rejects(() => accountImportApi.read(1))
  }
  for (const body of [{ success: false, data: {} }, { code: 500, data: {} }, { data: {} }]) {
    response = { status: 200, data: body }; await assert.rejects(() => accountImportApi.read(1))
  }
})
delete globalThis.__shareMissingHttpMock
console.log(`缺失配置导入：${passed} 项通过，${failed} 项失败`)
if (failed) process.exitCode = 1
