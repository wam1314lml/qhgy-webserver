// 测试时只加载配置值及其纯依赖，避免挂载账号页面、网络请求或定时器。
import ts from 'typescript'
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'

export async function loadSharePageModel(root) {
  const file = resolve(root, 'src/pages/__share_test__.ts')
  const raw = await readFile(resolve(root, 'src/pages/GameConfigPage.vue'), 'utf8')
  const script = raw.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1]
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.NodeJs }
  const host = ts.createCompilerHost(options), read = host.readFile
  host.readFile = name => resolve(name) === file ? script : read(name)
  const program = ts.createProgram([file], options, host), source = program.getSourceFile(file), checker = program.getTypeChecker()
  const declarations = new Map(), byName = new Map()
  function register(name, node, text, walk = node) {
    const symbol = checker.getSymbolAtLocation(name)
    const entry = { node, text, walk }
    declarations.set(symbol, entry); byName.set(name.text, entry)
  }
  for (const node of source.statements) {
    if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) register(declaration.name, declaration, `const ${declaration.getText(source)};`, declaration.initializer)
    }
    if (ts.isFunctionDeclaration(node) && node.name) register(node.name, node, node.getText(source))
    if (ts.isImportDeclaration(node) && node.importClause) {
      if (node.importClause.name) register(node.importClause.name, node, node.getText(source), null)
      const bindings = node.importClause.namedBindings
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) register(element.name, node, node.getText(source), null)
      else if (bindings) register(bindings.name, node, node.getText(source), null)
    }
  }
  const selected = new Set()
  function include(entry) {
    if (!entry || selected.has(entry)) return
    selected.add(entry)
    function visit(node) {
      if (ts.isTypeNode(node)) return
      if (ts.isIdentifier(node)) include(declarations.get(checker.getSymbolAtLocation(node)))
      ts.forEachChild(node, visit)
    }
    if (entry.walk) visit(entry.walk)
  }
  include(byName.get('config')); include(byName.get('configShareAdapter'))
  const statements = [...new Set([...selected].sort((a,b)=>a.node.pos-b.node.pos).map(entry=>entry.text))]
  const bundle = await build({ stdin: { contents: statements.join('\n')+'\nexport { config, configShareAdapter };', resolveDir: dirname(file), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'] })
  const module = { exports: {} }
  new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(resolve(root,'package.json')),module,module.exports)
  return { current: JSON.parse(JSON.stringify(module.exports.config.value)), adapter: module.exports.configShareAdapter }
}
