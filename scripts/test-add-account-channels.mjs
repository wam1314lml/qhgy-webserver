import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const filename = 'src/components/AddAccountModal.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const scriptConfigSource = await readFile(
  new URL('../src/components/ScriptConfig.vue', import.meta.url),
  'utf8',
)
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
assert.deepEqual([...channels.matchAll(/<a-radio\s+:value="(\d+)"/g)].map(match => Number(match[1])), [3, 2])
assert.match(channels, /<a-radio :value="2" class="channel-option">/)
assert.match(channels, /<a-radio :value="3" class="channel-option">/)
assert.match(source, /const selectedChannel = ref<number>\(3\)/)
assert.deepEqual([...source.matchAll(/selectedChannel\.value = (\d+)/g)].map(match => Number(match[1])), [3, 3])
assert.match(source, /case 'channel':\s*if \(selectedChannel\.value === 2 \|\| selectedChannel\.value === 3\)/)
const styles = await readFile(new URL('../src/components/AddAccountModal.css', import.meta.url), 'utf8')
assert.match(styles, /\.channel-options\s*\{[^}]*caret-color: transparent;[^}]*user-select: none;/)
assert.match(source, /class="sms-verify-input"/)
assert.match(source, /inputmode="numeric"/)
assert.match(source, /autocomplete="one-time-code"/)
assert.match(scriptConfigSource, /return \[1, 2, 3\]\.includes\(platform\) \? accountName : maskOfficialAccountName\(accountName\)/)
assert.match(styles, /\.sms-verify-input\s*\{[^}]*flex: 0 1 140px;[^}]*min-width: 0;/)
assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.sms-verify-input\s*\{[^}]*flex-basis: 130px;/)
console.log('添加账号渠道测试通过：微信优先且账号完整显示、抖音可用、无文本光标、验证码桌面及移动布局正常、微信默认、重置一致、下一步门禁、Vue编译。')
