// 生成前端字段白名单；后端通用存储不再接收字段 schema 副本。
import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProjectSchema } from './config-share-schema.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2), serverIndex = args.indexOf('--server-root')
const serverRoot = serverIndex >= 0 ? args[serverIndex + 1] : undefined
if (serverIndex >= 0 && (!serverRoot || serverRoot.startsWith('--'))) throw new Error('--server-root 需要路径')
const check = args.includes('--check')
const corePath = resolve(root, 'src/features/config-share/core.ts')
const bundle = await build({ entryPoints: [corePath], bundle: true, write: false, platform: 'node', format: 'esm' })
const { sensitiveKey } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const metadata = JSON.parse(await readFile(resolve(root, 'src/features/config-share/project.json'), 'utf8'))
const project = await buildProjectSchema(root, metadata, sensitiveKey)
const files = [[resolve(root, 'src/features/config-share/project.schema.json'), JSON.stringify(project, null, 2) + '\n']]
if (serverRoot) {
  // 兼容原命令参数，但仅核对项目接线，不能覆盖后端 schema/core 或项目身份。
  const serverProject = JSON.parse(await readFile(resolve(serverRoot, 'server/src/features/config-share/project.json'), 'utf8'))
  for (const key of ['id', 'name', 'schemaVersion']) {
    if (serverProject[key] !== metadata[key]) throw new Error(`分享项目前后端不一致：${key}`)
  }
  if (Object.hasOwn(serverProject, 'schema')) throw new Error('后端应使用通用存储元信息，不能包含字段 schema')
  for (const path of metadata.excludePaths || []) {
    if (!serverProject.excludePaths?.includes(path)) throw new Error(`后端缺少隐私排除路径：${path}`)
  }
}
for (const [path, content] of files) {
  if (check) {
    if (await readFile(path, 'utf8') !== content) throw new Error(`分享模块未同步：${path}`)
  } else {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }
}
console.log(`${metadata.name}：前端分享 schema ${check ? '检查通过' : '已生成'}；后端通用存储无需同步字段${serverRoot ? '；后端项目接线一致（只读检查）' : ''}`)
