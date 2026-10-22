import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse, compileTemplate } from '@vue/compiler-sfc';
const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({ stdin: { contents: `
export * from './src/pages/game-config/defaultConfig';
export * from './src/pages/game-config/normalizeConfigSelects';
export * from './src/features/config-share/projectAdapter';
`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'esm' });
const m = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const adapter = m.createProjectShareAdapter(c => { m.normalizeGameConfigSelects(c); return c; });
const fresh = () => { const c = m.createDefaultGameConfig(); m.normalizeGameConfigSelects(c); return c; };
let count = 0;
for (const mode of ['all', 'specific', 'quality', 'exclude', 'uncultivated']) {
  for (const state of [0, 1, 2]) {
    const c = fresh(); Object.assign(c.plant.market, { buyMode: mode, buyFriendEnabled: state === 1,
      excludeFriendEnabled: state === 2, buyFriendNames: ['甲', '乙'] });
    m.normalizeGameConfigSelects(c);
    const saved = JSON.parse(JSON.stringify(c)); m.normalizeGameConfigSelects(saved);
    const back = adapter.preview(fresh(), adapter.exportConfig(saved)).config.plant.market;
    for (const key of ['buyMode', 'buyFriendEnabled', 'excludeFriendEnabled', 'buyFriendNames']) assert.deepEqual(back[key], c.plant.market[key]);
    count++;
  }
}
for (const legacy of ['friend', 'excludeFriend']) {
  const c = fresh(); c.plant.market.buyMode = legacy; c.plant.market.buyFriendNames = ['甲']; m.normalizeGameConfigSelects(c);
  assert.equal(c.plant.market.buyMode, 'all'); assert.equal(c.plant.market.buyFriendEnabled, legacy === 'friend');
  assert.equal(c.plant.market.excludeFriendEnabled, legacy === 'excludeFriend');
  const base = fresh(); base.plant.market.buyMode = 'quality'; base.plant.market.buyFriendEnabled = true;
  const payload = adapter.exportConfig(fresh()); payload.config = { plant: { market: { buyMode: legacy, buyFriendNames: ['甲'] } } };
  const back = adapter.preview(base, payload).config;
  assert.equal(back.plant.market.buyMode, 'all'); assert.equal(back.plant.market.buyFriendEnabled, legacy === 'friend');
  assert.equal(back.plant.market.excludeFriendEnabled, legacy === 'excludeFriend'); count++;
}
const base = fresh(); base.plant.market.excludeFriendEnabled = true;
const empty = adapter.exportConfig(fresh()); empty.config = { plant: { market: { minPutTimeDiff: 30 } } };
assert.equal(adapter.preview(base, empty).config.plant.market.excludeFriendEnabled, true); count++;
const invalid = fresh(); invalid.plant.market.buyFriendEnabled = 'false'; invalid.plant.market.excludeFriendEnabled = 'false';
m.normalizeGameConfigSelects(invalid); assert.equal(invalid.plant.market.buyFriendEnabled, false); assert.equal(invalid.plant.market.excludeFriendEnabled, false);
const page = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8');
const parsed = parse(page); assert.deepEqual(parsed.errors, []);
assert.deepEqual(compileTemplate({ source: parsed.descriptor.template.content, filename: 'GameConfigPage.vue', id: 'filter-test' }).errors, []);
assert.equal(page.includes('<Radio value="friend">'), false); assert.equal(page.includes('<Radio value="excludeFriend">'), false);
assert.ok(page.includes('if (checked) config.plant.market.excludeFriendEnabled = false'));
assert.ok(page.includes('if (checked) config.plant.market.buyFriendEnabled = false'));
if ('harvestTaskAcceptOnly' in base.union.fmlRace) {
  base.union.fmlRace.harvestTaskAcceptOnly = true; base.union.fmlRace.smallAccountExclusiveEnabled = true;
  const back = adapter.preview(fresh(), adapter.exportConfig(base)).config;
  assert.equal(back.union.fmlRace.harvestTaskAcceptOnly, true);
  const old = adapter.exportConfig(fresh()); old.config = { union: { fmlRace: { deleteTask: false } } };
  assert.equal(adapter.preview(base, old).config.union.fmlRace.harvestTaskAcceptOnly, true); count++;
}
console.log(`PASS ${count}组：所有扫货策略、保存重载、分享、旧模式迁移、缺字段保值及Vue编译`);
