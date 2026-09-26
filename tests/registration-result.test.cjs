const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const vue = require('vue')
const ts = require('typescript')
const sfc = require('@vue/compiler-sfc')

// 执行实际注册组件的 setup；HTTP、表单校验和弹窗使用离线替身。
// 仅使用合成账号，不读取浏览器保存的凭据，不发送真实注册或邮件请求。
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function harness() {
  const response = deferred(), requested = deferred()
  const requests = [], modals = [], errors = [], events = []
  const filename = path.resolve(__dirname, '../src/components/RegisterForm.vue')
  const parsed = sfc.parse(fs.readFileSync(filename, 'utf8'), { filename })
  assert.deepEqual(parsed.errors, [])
  const script = sfc.compileScript(parsed.descriptor, { id: 'registration-test' })
  const template = sfc.compileTemplate({
    id: 'registration-test', filename, source: parsed.descriptor.template.content,
    compilerOptions: { bindingMetadata: script.bindings },
  })
  assert.deepEqual(template.errors, [])
  const modules = {
    vue: { ...vue, onMounted() {}, onUnmounted() {} },
    './RegisterSuccessContent.vue': { name: 'RegisterSuccessContent' },
    'vue-router': { useRoute: () => ({ query: {} }) },
    'ant-design-vue': { message: { error: text => errors.push(text) }, Modal: { success: options => modals.push(options) } },
    '@ant-design/icons-vue': { CheckCircleOutlined: {} },
    '../utils/axios': { post: async (url, body) => {
      requests.push({ url, body: { ...body } })
      requested.resolve()
      return response.promise
    } },
  }
  const module = { exports: {} }
  const code = ts.transpileModule(script.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (Object.hasOwn(modules, name)) return modules[name]
      throw new Error(`Unexpected import ${name}`)
    },
    console: { error() {} }, clearInterval() {},
  }, { filename })
  const setup = module.exports.default.setup({}, { expose() {}, emit: name => events.push(name) })
  Object.assign(setup.formData, {
    username: '246810', email: 'registered@example.com', password: 'test-original-password',
    confirmPassword: 'test-original-password', emailCode: '112233',
  })
  setup.formRef.value = { validate: async () => {} }
  setup.emailCodeSent.value = true
  const success = { data: { success: true, user: { id: 10, username: '246810', email: 'registered@example.com' } } }
  return { setup, response, requested, requests, modals, errors, events, success }
}

test('请求等待时表单值改变，成功弹窗仍显示后端确认账号和本次提交密码', async () => {
  const h = harness()
  const pending = h.setup.onSubmit()
  await h.requested.promise
  Object.assign(h.setup.formData, { username: '135790', email: 'changed@example.com', password: 'changed-password' })
  h.response.resolve(h.success)
  await pending
  assert.equal(h.requests[0].url, '/api/auth/register')
  assert.equal(h.requests[0].body.username, '246810')
  assert.equal(h.modals.length, 1)
  assert.equal(h.modals[0].content.props.username, '246810')
  assert.equal(h.modals[0].content.props.email, 'registered@example.com')
  assert.equal(h.modals[0].content.props.password, 'test-original-password')
  assert.equal(h.setup.isLoading.value, false)
  assert.deepEqual(h.events, [])
  h.modals[0].onOk()
  assert.deepEqual(h.events, ['switchToLogin'])
})

test('服务端规范化后的用户名以返回结果为准', async () => {
  const h = harness()
  h.setup.formData.username = ' 246810 '
  h.response.resolve(h.success)
  await h.setup.onSubmit()
  assert.equal(h.modals[0].content.props.username, '246810')
})

test('校验和请求期间重复提交只发起一次注册', async () => {
  const h = harness(), validation = deferred()
  h.setup.formRef.value.validate = () => validation.promise
  const first = h.setup.onSubmit()
  const second = h.setup.onSubmit()
  validation.resolve()
  await h.requested.promise
  const third = h.setup.onSubmit()
  h.response.resolve(h.success)
  await Promise.all([first, second, third])
  assert.equal(h.requests.length, 1)
  assert.equal(h.modals.length, 1)
})

for (const data of [
  { success: false, message: '用户名已存在' },
  { success: 'false', message: '用户名已存在' },
  { success: true },
  { success: true, user: { username: '', email: 'registered@example.com' } },
]) {
  test(`业务失败或缺少账号数据不能展示注册成功：${JSON.stringify(data)}`, async () => {
    const h = harness()
    h.response.resolve({ data })
    await h.setup.onSubmit()
    assert.equal(h.modals.length, 0)
    assert.equal(h.errors.length, 1)
    assert.equal(h.setup.isLoading.value, false)
  })
}

for (const status of [400, 409, 500]) {
  test(`HTTP ${status} 不能展示成功或切换登录，失败后可重新提交`, async () => {
    const h = harness()
    const pending = h.setup.onSubmit()
    await h.requested.promise
    h.response.reject({ response: { status, data: { success: false, message: '注册失败' } } })
    await pending
    assert.equal(h.modals.length, 0)
    assert.deepEqual(h.events, [])
    assert.equal(h.setup.isLoading.value, false)
  })
}

test('表单校验不通过时释放提交锁且不发起请求', async () => {
  const h = harness()
  h.setup.formRef.value.validate = async () => { throw { errorFields: [{ name: 'username' }] } }
  await h.setup.onSubmit()
  assert.equal(h.requests.length, 0)
  assert.equal(h.setup.isLoading.value, false)
})
