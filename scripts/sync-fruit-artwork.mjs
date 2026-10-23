// 从 MCP 读取的 Cocos bundle 资源索引导出果园原生图标，不读取账号数据。
// node scripts/sync-fruit-artwork.mjs --database <qhgy-database.json> --assets <bundle-index.json>
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const arg = name => process.argv[process.argv.indexOf(name) + 1]
assert.ok(process.argv.includes('--database') && process.argv.includes('--assets'), '需要静态数据库和 MCP bundle 索引')
const db = JSON.parse(await readFile(arg('--database'), 'utf8'))
const snapshot = JSON.parse(await readFile(arg('--assets'), 'utf8'))
const bundle = snapshot.bundles.find(bundle => bundle.name === 'subAsync')
assert.equal(bundle?.base, 'https://qihuan.jinzewenhua.com/mini/res/remote/subAsync/')
const paths = new Map(bundle.paths.map(asset => [asset.path, asset]))
const ids = [...new Set([...Object.values(db.item).filter(row => row.type === 11).map(row => row.id),
  ...Object.keys(db.flower_foster).map(Number)])].sort((a, b) => a - b)
const output = path.join(root, 'public/fruit-icons')
await mkdir(output, { recursive: true })
const files = {}, sources = [], missing = []
// 串行导出，避免对游戏 CDN 产生突发请求。
for (const id of ids) {
  const icon = db.item[id]?.icon ?? db.flower_foster[id]?.icon
  const asset = paths.get(`item/${icon}`)
  if (!asset?.nativeVer) { missing.push({ id, icon }); continue }
  assert.match(asset.uuid, /^[a-f0-9-]{36}$/i)
  assert.match(asset.nativeVer, /^[a-f0-9]+$/i)
  const url = `${bundle.base}native/${asset.uuid.slice(0, 2)}/${asset.uuid}.${asset.nativeVer}.png`
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  assert.ok(response.ok, `图标 ${id}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const file = `${id}.${sha256.slice(0, 12)}.png`
  await writeFile(path.join(output, file), bytes)
  files[id] = file
  sources.push({ id, icon, file, path: asset.path, source: url, sha256, bytes: bytes.length,
    size: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] })
}
const json = value => JSON.stringify(value, null, 2) + '\n'
await writeFile(path.join(root, 'src/data/fruit-artwork.json'), json(files))
await writeFile(path.join(output, 'sources.json'), json({ game: '奇幻果园', sources, missing }))
console.log(`导出 ${sources.length} 张原生水果图标，${missing.length} 项资源缺失（前端使用占位）。`)
