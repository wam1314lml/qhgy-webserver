#!/usr/bin/env node

/**
 * 从 qhgy-assistant 的奇幻果园可读导出生成配置页静态选项。
 *
 * 用法：
 *   node scripts/generate-qhgy-game-config-options.mjs
 *   node scripts/generate-qhgy-game-config-options.mjs --source <export/qhgy-database>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const defaultSource = path.resolve(projectRoot, '..', '..', 'qhgy-assistant-master', 'export', 'qhgy-database');
const outputDir = path.join(projectRoot, 'src', 'pages', 'game-config');

function readSourceArg(argv) {
  if (argv.length === 0) return defaultSource;
  if (argv.length !== 2 || argv[0] !== '--source' || !argv[1]) {
    throw new Error('用法：node scripts/generate-qhgy-game-config-options.mjs [--source <导出目录>]');
  }
  return path.resolve(argv[1]);
}

function readJson(sourceDir, filename) {
  const filePath = path.join(sourceDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function quote(value) {
  return JSON.stringify(String(value));
}

function makeSimpleOptions(constName, rows, labelOf) {
  const lines = rows.map(row => `  { value: ${quote(row.id)}, label: ${quote(labelOf(row))} },`);
  return [
    '// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从奇幻果园导出生成，请勿手工维护。',
    `export const ${constName}: Array<{ value: string; label: string }> = [`,
    ...lines,
    ']\n',
  ].join('\n');
}

function writeFile(filename, content) {
  fs.writeFileSync(path.join(outputDir, filename), content, 'utf8');
}

const sourceDir = readSourceArg(process.argv.slice(2));
const fruits = readJson(sourceDir, 'fruits.json');
const vases = readJson(sourceDir, 'vases.json');
const flowerArts = readJson(sourceDir, 'flower-arts.json');
const fruitElves = readJson(sourceDir, 'fruit-elves.json');
const exchangeItems = readJson(sourceDir, 'orchard-exchange-items.json');
const guildRaceTaskTypes = readJson(sourceDir, 'guild-race-task-types.json');

writeFile('flowerOptions.ts', makeSimpleOptions('flowerOptions', fruits, row => row.name));
writeFile('flowerArtOptions.ts', makeSimpleOptions('flowerArtOptions', vases, row => row.name));
writeFile(
  'specifiedArtsFullOptions.ts',
  makeSimpleOptions('specifiedArtsFullOptions', flowerArts, row => {
    const rawName = String(row.name ?? '').trim();
    const baseName = !rawName || /^item_/i.test(rawName)
      ? `${String(row.vaseName || `果艺${row.vaseId}`)}果艺品`
      : rawName;
    const materials = Array.isArray(row.flowerNames) ? row.flowerNames.filter(Boolean).join(',') : '';
    return materials ? `${baseName}(${materials})` : baseName;
  }),
);

const elfLines = fruitElves.map(row => `  ${quote(row.id)}: ${quote(row.name)},`);
writeFile('elfOptions.ts', [
  '// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从奇幻果园导出生成，请勿手工维护。',
  'export const ELVES: Record<string, string> = {',
  ...elfLines,
  '}',
  '',
  'export const elfOptions = Object.entries(ELVES).map(([value, label]) => ({ value, label }))\n',
].join('\n'));

const makeShopRows = itemType => exchangeItems
  .filter(row => row.itemType === itemType)
  .map(row => `  { value: ${Number(row.id)}, label: ${quote(row.displayName)} },`);
writeFile('shopItem6Options.ts', [
  '// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从奇幻果园百果园导出生成，请勿手工维护。',
  'export interface ShopOption {',
  '  value: number',
  '  label: string',
  '}',
  '',
  'export const orchardFruitOptions: ShopOption[] = [',
  ...makeShopRows('fruit'),
  ']',
  '',
  'export const orchardCompanionOptions: ShopOption[] = [',
  ...makeShopRows('companion'),
  ']',
  '',
  'export const floralShopAllOptions = [',
  "  { label: '水果', options: orchardFruitOptions },",
  "  { label: '赏味拍档', options: orchardCompanionOptions },",
  ']\n',
].join('\n'));

const raceOptionLines = guildRaceTaskTypes.map(row =>
  `  { key: ${quote(row.type)}, label: ${quote(row.name)} },`);
const racePriorityLines = guildRaceTaskTypes.map(row =>
  `  ${quote(row.type)}: ${Number(row.type) === 20046 ? 1 : 0},`);
writeFile('fmlRaceTaskTypes.ts', [
  '// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从奇幻果园公会竞赛导出生成，请勿手工维护。',
  'export const fmlRaceTaskTypes: Array<{ key: string; label: string }> = [',
  ...raceOptionLines,
  ']',
  '',
  'export const defaultFmlRaceTaskTypePriority: Record<string, number> = {',
  ...racePriorityLines,
  '}\n',
].join('\n'));

console.log(`奇幻果园配置选项生成完成：水果 ${fruits.length}、花瓶 ${vases.length}、果艺 ${flowerArts.length}、果灵 ${fruitElves.length}、百果园 ${exchangeItems.length}、竞赛类型 ${guildRaceTaskTypes.length}`);
