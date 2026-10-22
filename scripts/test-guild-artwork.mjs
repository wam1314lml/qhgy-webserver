import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('src/data/guild-artwork.json', root), 'utf8'));
const bundled = await build({ entryPoints: [fileURLToPath(new URL('src/utils/accountGuild.ts', root))],
  bundle: true, write: false, platform: 'node', format: 'esm' });
const { accountGuild, guildArtwork } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const get = (icon, titleId = 0, status = 'joined') => guildArtwork(accountGuild({ status, icon, titleId }));
const separator = catalog.game === 'qhgy' ? '_' : '|';
const groups = [1, 2, 3].map(type => Object.entries(catalog.icons).filter(([, row]) => row.type === type).map(([id]) => id));
let combinations = 0;
for (const color of groups[0]) for (const frame of groups[1]) for (const logo of groups[2]) {
  const art = get([color, frame, logo].join(separator));
  assert.ok(art.avatar);
  for (const key of ['background', 'texture', 'icon', 'mask']) assert.ok(art.avatar[key].startsWith('/guild-overview/'));
  combinations++;
}
const first = groups.map(g => g[0]).join(separator);
for (const icon of ['', null, 'https://example.test/icon.png', '../../image', '1', '999_8_12', '1|999|201',
  groups.map(g => g[0]).reverse().join(separator), first.replace(separator, '/'), first + separator + '1']) assert.equal(get(icon).avatar, null);
for (const status of ['not_joined', 'unknown']) assert.deepEqual(get(first, 1, status), { avatar: null, title: null });
for (const [id, title] of Object.entries(catalog.titles)) {
  const art = get(first, Number(id));
  assert.equal(art.title.name, title.name);
  assert.equal(art.title.src, title.asset ? catalog.assets[title.asset] : undefined);
}
assert.equal(get(first, 999999).title, null);
if (catalog.game === 'qhgy') {
  const art = get('3_8_12', 2);
  assert.match(art.avatar.icon, /icon_1.png$/);
  assert.match(art.avatar.background, /di_3.png$/);
  assert.equal(art.title.name, '丙级公会');
  assert.ok(parseFloat(art.avatar.iconStyle.width) < parseFloat(art.avatar.textureStyle.width));
} else {
  assert.match(get('1|101|201', 10).avatar.icon, /logo_01.png$/);
  assert.equal(get(first, 10).title.name, '白银俱乐部');
  assert.equal(get(first, 3).title.src, undefined);
  assert.equal(get(first, 3).title.name, '十冠王');
}
const directory = Object.values(catalog.assets)[0].split('/').slice(0, -1).join('/');
const sources = JSON.parse(await readFile(new URL('public' + directory + '/sources.json', root), 'utf8'));
for (const entry of sources.assets) {
  const raw = await readFile(new URL('public' + directory + '/' + entry.file, root));
  assert.equal(createHash('sha256').update(raw).digest('hex'), entry.sha256);
  assert.equal(raw.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.deepEqual([raw.readUInt32BE(16), raw.readUInt32BE(20)], entry.size);
}
console.log(`${catalog.game}: ${combinations} native badge combinations, ${Object.keys(catalog.titles).length} titles, ${sources.assets.length} verified PNGs; invalid IDs and missing artwork fallback passed`);
