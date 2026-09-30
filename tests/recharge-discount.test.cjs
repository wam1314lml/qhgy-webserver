const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Run the actual component calculations, without creating orders or calling payment APIs.
const source = fs.readFileSync(path.join(__dirname, '../src/components/RechargeModal.vue'), 'utf8')
function calculator(list) {
  const groups = source.slice(source.indexOf('const recommendedPackages ='), source.indexOf('// 设备检测'))
  const calculations = source.slice(source.indexOf('const getBaseUnitPrice ='), source.indexOf('const getLotteryTicketsText ='))
  const js = ts.transpileModule(groups + '\n' + calculations + '\nresult = { getDiscountPercentage, getDiscountBadge };', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  const context = { packages: { value: list }, computed: getter => ({ get value() { return getter() } }), result: null }
  vm.runInNewContext(js, context)
  return context.result
}

test('49元赠配额套餐不影响30元推荐套餐折扣与徽章', () => {
  const recommended = { price: 30, points: 30, gift_card_enabled: 0 }
  const gift = { price: 49, points: 30, gift_card_enabled: 1, gift_card_points: 30 }
  const calc = calculator([gift, recommended])
  assert.equal(calc.getDiscountPercentage(recommended), 100)
  assert.equal(calc.getDiscountBadge(recommended), '')
})

test('推荐套餐只比较同类最高单价，保留四舍五入和折扣徽章', () => {
  const base = { price: 30, points: 30 }
  const cheaper = { price: 49, points: 60, gift_card_enabled: '0' }
  const gift = { price: 999, points: 30, gift_card_enabled: '1' }
  const calc = calculator([gift, base, cheaper])
  assert.equal(calc.getDiscountPercentage(base), 100)
  assert.equal(calc.getDiscountPercentage(cheaper), 82)
  assert.equal(calc.getDiscountBadge(cheaper), '热门')
  assert.equal(calc.getDiscountPercentage(cheaper), calculator([base, cheaper]).getDiscountPercentage(cheaper))
})

test('接口显式折扣仍然优先，空值保护保持不变', () => {
  const pkg = { price: 30, points: 30 }
  const calc = calculator([pkg])
  assert.equal(calc.getDiscountPercentage({ ...pkg, discount_rate: 0.75 }), 75)
  assert.equal(calc.getDiscountPercentage({ ...pkg, discount: 88 }), 88)
  assert.equal(calc.getDiscountPercentage({ points: 0, price: 30 }), 100)
  assert.equal(calculator([]).getDiscountPercentage(pkg), 100)
})

test('赠配额套餐原有展示计算不变', () => {
  const gift = { price: 49, points: 30, gift_card_enabled: 1 }
  const calc = calculator([{ price: 60, points: 30 }, gift])
  assert.equal(calc.getDiscountPercentage(gift), 82)
})
