import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const filename = 'src/components/AddAccountModal.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'add-account-channel-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content,
  filename,
  id: 'add-account-channel-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])

const channels = source.match(/<a-radio-group[^>]*class="channel-options"[\s\S]*?<\/a-radio-group>/)[0]
assert.deepEqual([...channels.matchAll(/<a-radio\s+:value="(\d+)"/g)].map(match => Number(match[1])), [2, 3])
assert.match(channels, /<a-radio :value="2" disabled class="channel-option is-disabled"/)
assert.match(channels, /<a-radio :value="3" class="channel-option">/)
assert.match(source, /const selectedChannel = ref<number>\(3\)/)
assert.deepEqual([...source.matchAll(/selectedChannel\.value = (\d+)/g)].map(match => Number(match[1])), [3, 3])
assert.match(source, /case 'channel':\s*if \(selectedChannel\.value === 3\)/)
const styles = await readFile(new URL('../src/components/AddAccountModal.css', import.meta.url), 'utf8')
assert.match(styles, /\.channel-option\.is-disabled \.channel-content\s*\{[^}]*cursor: not-allowed;[^}]*transform: none;/)
console.log('添加账号渠道测试通过：仅显示抖音和微信、抖音禁用、微信默认、重置一致、下一步门禁、Vue编译。')
