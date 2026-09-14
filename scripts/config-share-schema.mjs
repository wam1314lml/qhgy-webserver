// 适配内联/独立 GameConfig 类型；不执行页面、不维护第二份默认值。
import ts from 'typescript'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function buildProjectSchema(root, metadata, sensitiveKey) {
  const page = await readFile(resolve(root, 'src/pages/GameConfigPage.vue'), 'utf8')
  const script = page.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)?.[1]
  if (!script) throw new Error('未找到配置页 script setup')
  const file = resolve(root, 'src/pages/__config_share_schema__.ts')
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs, strictNullChecks: true, skipLibCheck: true }
  const host = ts.createCompilerHost(options), originalRead = host.readFile
  host.readFile = name => resolve(name) === file ? script : originalRead(name)
  const program = ts.createProgram([file], options, host)
  const source = program.getSourceFile(file), checker = program.getTypeChecker()
  let configType
  source.forEachChild(statement => {
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) === 'config') configType = declaration.initializer?.typeArguments?.[0]
    }
  })
  if (!configType) throw new Error('配置页需声明 ref<GameConfig>')
  function schema(type, path = '', depth = 0) {
    if (metadata.overrides[path]) return metadata.overrides[path]
    const unsupported = () => { throw new Error(`请在 project.json 声明分享类型：${path} (${checker.typeToString(type)})`) }
    if (depth > 12) return unsupported()
    if (type.isUnion()) {
      const types = type.types.filter(item => !(item.flags & ts.TypeFlags.Undefined))
      if (types.length === 1) return schema(types[0], path, depth)
      for (const [flag, name] of [[ts.TypeFlags.BooleanLike, 'boolean'], [ts.TypeFlags.StringLike, 'string'], [ts.TypeFlags.NumberLike, 'number']]) {
        if (types.every(item => item.flags & flag)) return { type: name }
      }
      if (types.every(item => item.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike))) return { type: 'scalar' }
      return unsupported()
    }
    for (const [flag, name] of [[ts.TypeFlags.BooleanLike, 'boolean'], [ts.TypeFlags.StringLike, 'string'], [ts.TypeFlags.NumberLike, 'number']]) {
      if (type.flags & flag) return { type: name }
    }
    if (checker.isArrayType(type) || checker.isTupleType(type)) {
      const items = checker.getTypeArguments(type).map(item => schema(item, `${path}[]`, depth + 1))
      if (!items.length || items.some(item => JSON.stringify(item) !== JSON.stringify(items[0]))) return unsupported()
      return { type: 'array', item: items[0] }
    }
    const properties = type.getProperties()
    if (properties.length) return { type: 'object', properties: Object.fromEntries(properties
      .filter(property => !metadata.excludePaths?.includes(path ? `${path}.${property.name}` : property.name) && !sensitiveKey.test(property.name) && !['__proto__', 'prototype', 'constructor'].includes(property.name))
      .map(property => [property.name, schema(checker.getTypeOfSymbolAtLocation(property,
        property.valueDeclaration || property.declarations?.[0] || source), path ? `${path}.${property.name}` : property.name, depth + 1)])) }
    const stringIndex = checker.getIndexTypeOfType(type, ts.IndexKind.String)
    const numberIndex = checker.getIndexTypeOfType(type, ts.IndexKind.Number)
    if (stringIndex || numberIndex) return { type: 'record', keyPattern: stringIndex ? '^.{1,80}$' : '^\\d{1,15}$',
      value: schema(stringIndex || numberIndex, `${path}{}`, depth + 1) }
    return unsupported()
  }
  return { id: metadata.id, name: metadata.name, schemaVersion: metadata.schemaVersion,
    schema: schema(checker.getTypeFromTypeNode(configType)) }
}
