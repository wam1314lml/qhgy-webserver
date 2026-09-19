import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
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
const visibleChannels = [...channels.matchAll(/<a-radio\s+:value="(\d+)"/g)].map(match => Number(match[1]))
assert.deepEqual(visibleChannels, [3, 1, 2, 0])
assert.match(channels, /<a-radio :value="2" class="channel-option">/)
assert.match(channels, /<a-radio :value="3" class="channel-option">/)
assert.match(channels, /<a-radio :value="0" class="channel-option">/)
assert.match(source, /const selectedChannel = ref<number>\(3\)/)
assert.match(source, /axios\.post\('\/api\/douyin\/scan\/bind_confirm', bindPayload, \{ timeout: 240_000 \}\)/)
assert.ok(!source.includes("console.log('📦 抖音绑定请求数据:', bindPayload)"))
assert.match(source, /message\.error\(errorBody\?\.message \|\| errorBody\?\.msg \|\| errorBody\?\.err \|\| '绑定失败，请重试'\)/)
assert.deepEqual([...source.matchAll(/selectedChannel\.value = (\d+)/g)].map(match => Number(match[1])), [3, 3])
// Run the component's actual navigation and QR request functions. A visible radio must
// pass the next-step guard; compilation alone cannot detect a hidden-channel guard.
const transpile = text => ts.transpileModule(text, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const utilities = vm.createContext({ exports: {} })
vm.runInContext(transpile(await readFile(new URL('../src/utils/accountPasswordLogin.ts', import.meta.url), 'utf8')), utilities)
const names = new Set(['handleMainButton', 'handleNextStep', 'handleLogin', 'handleAlipayLogin'])
const ast = ts.createSourceFile('modal.ts', parsed.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const declarations = ast.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration => names.has(declaration.name.getText())))
  .map(statement => statement.getText()).join('\n')
assert.equal(declarations.match(/const handle/g).length, names.size)
function createPage(success = true) {
  const calls = [], warnings = [], errors = [], qrEvents = []
  const page = vm.createContext({
    currentStep: { value: 'channel' }, selectedChannel: { value: 1 },
    loading: { value: false }, alipayLoginData: { value: null },
    qrcodeUrl: { value: '' }, qrcodeImage: { value: '' },
    isAccountPasswordPlatform: utilities.exports.isAccountPasswordPlatform,
    console: { log() {}, error() {} },
    message: { warning: text => warnings.push(text), error: text => errors.push(text), success() {} },
    startAlipayQrLoading: () => qrEvents.push('loading'),
    finishAlipayQrLoading: reveal => { reveal(); qrEvents.push('shown') },
    resetAlipayQrLoading: () => qrEvents.push('reset'),
    startAlipayPolling: () => qrEvents.push('polling'),
    axios: { post: async (url, body) => {
      calls.push({ url, body })
      return { data: { success, message: '扫码服务暂时不可用', data: { qrcodeUrl: 'https://example.invalid/offline-qr' } } }
    } },
  })
  vm.runInContext(transpile(`${declarations}\nglobalThis.api = { ${[...names].join(',')} };`), page)
  return { page, calls, warnings, errors, qrEvents }
}
for (const channel of visibleChannels) {
  const { page, calls, warnings } = createPage()
  page.selectedChannel.value = channel
  page.api.handleMainButton()
  assert.equal(page.currentStep.value, 'login', `可见渠道 ${channel} 必须能进入登录页`)
  assert.equal(warnings.length, 0)
  assert.equal(calls.length, 0)
}
for (const channel of [-1, 4, null, undefined]) {
  const { page, warnings } = createPage()
  page.selectedChannel.value = channel
  await page.api.handleNextStep()
  assert.equal(page.currentStep.value, 'channel')
  assert.equal(warnings.length, 1)
}
for (const success of [true, false]) {
  const { page, calls, errors, qrEvents } = createPage(success)
  await page.api.handleNextStep()
  await page.api.handleNextStep()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/game-accounts/alipay_get_qrcode2')
  assert.equal(page.loading.value, false)
  assert.deepEqual(qrEvents, success ? ['loading', 'shown', 'polling'] : ['loading', 'reset'])
  assert.equal(errors.length, success ? 0 : 1)
  if (success) {
    assert.equal(page.qrcodeImage.value, 'https://example.invalid/offline-qr')
    page.alipayLoginData.value = { servers: [{ serverId: '7' }] }
    await page.api.handleNextStep()
    assert.equal(page.currentStep.value, 'server')
    assert.equal(calls.length, 1, '扫码完成后不重复请求二维码')
  }
}
const styles = await readFile(new URL('../src/components/AddAccountModal.css', import.meta.url), 'utf8')
assert.match(styles, /\.channel-options\s*\{[^}]*caret-color: transparent;[^}]*user-select: none;/)
assert.match(source, /class="sms-verify-input"/)
assert.match(source, /inputmode="numeric"/)
assert.match(source, /autocomplete="one-time-code"/)
assert.match(scriptConfigSource, /return \[1, 2, 3\]\.includes\(platform\) \? accountName : maskOfficialAccountName\(accountName\)/)
assert.match(styles, /\.sms-verify-input\s*\{[^}]*flex: 0 1 140px;[^}]*min-width: 0;/)
assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.sms-verify-input\s*\{[^}]*flex-basis: 130px;/)
console.log('添加账号渠道测试通过：四渠道下一步、非法渠道门禁、支付宝二维码请求及失败恢复/已扫码选服、Vue编译。HTTP为内存替身。')
