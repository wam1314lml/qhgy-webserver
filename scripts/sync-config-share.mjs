// 沿用花园同步流程；只替换各项目的 schema 来源。
import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProjectSchema } from './config-share-schema.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2), serverIndex = args.indexOf('--server-root')
const serverRoot = serverIndex >= 0 ? args[serverIndex + 1] : undefined
if (serverIndex >= 0 && !serverRoot) throw new Error('--server-root 需要路径')
const check = args.includes('--check')
const corePath = resolve(root, 'src/features/config-share/core.ts')
const bundle = await build({ entryPoints: [corePath], bundle: true, write: false, platform: 'node', format: 'esm' })
const { sensitiveKey } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const metadata = JSON.parse(await readFile(resolve(root, 'src/features/config-share/project.json'), 'utf8'))
const project = await buildProjectSchema(root, metadata, sensitiveKey)
const files = [[resolve(root, 'src/features/config-share/project.schema.json'), JSON.stringify(project, null, 2) + '\n']]
if (serverRoot) {
  files.push([resolve(serverRoot, 'server/src/features/config-share/project.schema.json'), files[0][1]])
  files.push([resolve(serverRoot, 'server/src/features/config-share/core.ts'), await readFile(corePath, 'utf8')])
}
for (const [path, content] of files) {
  if (check) {
    if (await readFile(path, 'utf8') !== content) throw new Error(`分享模块未同步：${path}`)
  } else {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }
}
console.log(`${metadata.name}：分享协议/schema ${check ? '一致性检查通过' : '已生成；发布时需同步 Web API 副本'}`)
