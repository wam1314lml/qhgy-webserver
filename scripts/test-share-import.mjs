import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ entryPoints: [root + 'src/features/config-share/accountImport.ts'], bundle: true, write: false, platform: 'node', format: 'esm' })
const { importShareToAccounts } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const clone = value => JSON.parse(JSON.stringify(value))
const accounts = [1, 2, 3].map(value => ({ value, label: `测试角色${value}` }))
const share = { config: { enabled: false, list: [] }, expiresAt: Date.now() + 60000 }
const adapter = { preview(raw, payload) { return { config: { ...raw, ...payload.config } } } }
let writes = [], reads = [], valid = true, failureId = 0
const api = {
  async read(id) { reads.push(id); return { id, enabled: true, list: [id], ownSetting: id * 10, password: `synthetic-${id}` } },
  async save(id, config) { writes.push([id, clone(config)]); if (id === failureId) throw new Error('合成保存失败') },
}
const run = overrides => importShareToAccounts({ ids: [1, 2, 3], accounts, adapter, share, api, isCurrent: () => valid, onProgress() {}, ...overrides })
let result = await run({ ids: [1, 1, 2, 3] })
assert.equal(result.filter(row => row.success).length, 3)
assert.deepEqual(reads, [1, 2, 3])
for (const [id, value] of writes) { assert.equal(value.enabled, false); assert.deepEqual(value.list, []); assert.equal(value.ownSetting, id * 10); assert.equal(value.password, `synthetic-${id}`) }
writes = []; reads = []; failureId = 2
result = await run()
assert.deepEqual(result.filter(row => !row.success).map(row => row.id), [2]); assert.equal(writes.length, 3)
failureId = 0; writes = []; reads = []
await assert.rejects(run({ ids: [1, 99] }), /当前网页账号/)
assert.equal(reads.length, 0)
result = await run({ share: { ...share, expiresAt: Date.now() - 1 } })
assert.equal(writes.length, 0); assert.equal(result.filter(row => !row.success).length, 3)
valid = false; assert.deepEqual(await run(), []); assert.equal(reads.length, 0)
valid = true
await run({ api: { ...api, async read(id) { valid = false; return api.read(id) } } })
assert.equal(writes.length, 0, '切号/关闭后迟到读取不能保存')
valid = true; reads = []
result = await run({ api: { ...api, async save() { throw { response: { status: 403, data: { message: '权限失效' } } } } } })
assert.deepEqual(reads, [1]); assert.equal(result.filter(row => !row.success).length, 3)
writes = []; reads = []
await run({ ids: [1], adapter: { mergeStored(raw) { return { ...raw, converted: true } } } })
assert.equal(writes[0][1].converted, true)
console.log('PASS 分享批量导入：全选、去重、逐号保值、false/空数组、部分失败、越权目标、过期、切号、鉴权失败中止、特殊模型转换')
