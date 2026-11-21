// Derive navigation from the actual template. Hidden children are indexed too.
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
const virtualId = 'virtual:game-config-fields'
const resolvedId = '\0' + virtualId
const attr = (node, name) => node.props?.find(p => p.type === 6 && p.name === name)?.value?.content
const bind = (node, name) => node.props?.find(p => p.type === 7 && p.name === 'bind' && p.arg?.content === name)?.exp?.content
const formTags = ['CustomFormItem', 'Form.Item', 'a-form-item']
export function indexConfigFields(source) {
  const { descriptor } = parse(source)
  const rows = [], sections = [], edits = []
  const mark = (node, id) => edits.push({ at: node.loc.start.offset + node.tag.length + 1,
    text: ` v-config-missing="missingConfigMarkers['${id}']"` })
  function pathsOf(node, direct = false) {
    const paths = new Set()
    if (attr(node, 'data-config-paths')) return attr(node, 'data-config-paths').split(',').map(p => p.trim())
    function collect(child) {
      if (child.type !== 1) return
      for (const prop of child.props) {
        if (prop.type !== 7 || !['model','for','bind'].includes(prop.name)) continue
        if (prop.name === 'bind' && !['value','checked','config','modelValue'].includes(prop.arg?.content)) continue
        for (const m of (prop.exp?.content || '').matchAll(/\bconfig\.([\w$]+(?:\.[\w$]+)*)/g)) paths.add(m[1])
      }
      if (!direct) for (const nested of child.children || []) collect(nested)
    }
    collect(node)
    const name = attr(node, 'name')
    if (name && !paths.size) paths.add(name.replace(/^config\./, '').replace(/\.\d+(?:\..*)?$/, ''))
    return [...paths]
  }
  function visit(node, context) {
    if (node.type !== 1) return
    const tab = node.props.find(p => p.type === 7 && ['if','show','else-if'].includes(p.name))?.exp?.content.match(/^activeTab === '([^']+)'$/)?.[1]
    if (tab) {
      context = { tab, section: `config-sec-${sections.length}` }
      sections.push({ id: context.section, tab }); mark(node, context.section)
    }
    if (context.tab && ['Divider','a-divider'].includes(node.tag)) {
      context.section = `config-sec-${sections.length}`
      sections.push({ id: context.section, tab: context.tab }); mark(node, context.section)
    }
    if (context.tab && context.section) {
      const isRow = formTags.includes(node.tag) || attr(node, 'data-config-paths')
      // Dedicated model-bound editors (shops/routes/etc.) are a single navigation row.
      const isEditor = /^[A-Z]/.test(node.tag) && !['Form','Divider'].includes(node.tag) && pathsOf(node, true).length
      if (isRow || isEditor) {
        const paths = pathsOf(node, !isRow)
        if (paths.length) {
          const id = `config-field-${rows.length}`
          rows.push({ id, section: context.section, tab: context.tab, paths }); mark(node,id)
          return
        }
      }
    }
    for (const child of node.children || []) visit(child, context)
  }
  for (const child of descriptor.template.ast.children) visit(child, {})
  let code = source
  for (const e of edits.sort((a,b) => b.at-a.at)) code = code.slice(0,e.at)+e.text+code.slice(e.at)
  return { rows, sections, code }
}
export function configMissingPlugin(pageFile) {
  const normalized = pageFile.replaceAll('\\','/')
  return {
    name:'game-config-missing-fields', enforce:'pre',
    resolveId(id) { if(id===virtualId)return resolvedId },
    load(id) {
      if(id!==resolvedId)return
      this.addWatchFile(pageFile)
      const {rows,sections}=indexConfigFields(readFileSync(pageFile,'utf8'))
      return `export const configFieldRows=${JSON.stringify(rows)};export const configFieldSections=${JSON.stringify(sections)};`
    },
    transform(code,id) { if(id.replaceAll('\\','/')===normalized)return {code:indexConfigFields(code).code,map:null} },
    handleHotUpdate(ctx) {
      if(ctx.file.replaceAll('\\','/')!==normalized)return
      const mod=ctx.server.moduleGraph.getModuleById(resolvedId)
      if(mod){ctx.server.moduleGraph.invalidateModule(mod);return [...ctx.modules,mod]}
    },
  }
}
