#!/usr/bin/env node

/**
 * 从 qhgy-assistant 的奇幻果园可读导出生成配置页静态选项。
 *
 * 用法：
 *   node scripts/generate-qhgy-game-config-options.mjs
 *   node scripts/generate-qhgy-game-config-options.mjs --source <export/qhgy-database>
 *   node scripts/generate-qhgy-game-config-options.mjs --only-elf-plants
 *   node scripts/generate-qhgy-game-config-options.mjs --only-elves
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const defaultSource = path.resolve(projectRoot, '..', '..', 'qhgy-assistant-master', 'export', 'qhgy-database');
const outputDir = path.join(projectRoot, 'src', 'pages', 'game-config');

function readArgs(argv) {
  let source = defaultSource;
  let onlyElfPlants = false;
  let onlyElves = false;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--source' && argv[index + 1]) source = path.resolve(argv[++index]);
    else if (argv[index] === '--only-elf-plants') onlyElfPlants = true;
    else if (argv[index] === '--only-elves') onlyElves = true;
    else throw new Error('用法：node scripts/generate-qhgy-game-config-options.mjs [--source <导出目录>] [--only-elves|--only-elf-plants]');
  }
  return { source, onlyElfPlants, onlyElves };
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
  if (args.onlyElfPlants && filename !== 'elfPlantOptions.ts') return;
  if (args.onlyElves && !['elfOptions.ts', 'elfPlantOptions.ts'].includes(filename)) return;
  fs.writeFileSync(path.join(outputDir, filename), content, 'utf8');
}

const args = readArgs(process.argv.slice(2));
const sourceDir = args.source;
const fruits = readJson(sourceDir, 'fruits.json');
const vases = readJson(sourceDir, 'vases.json');
const flowerArts = readJson(sourceDir, 'flower-arts.json');
const fruitElves = readJson(sourceDir, 'fruit-elves.json');
const exchangeItems = readJson(sourceDir, 'orchard-exchange-items.json');
const guildRaceTaskTypes = readJson(sourceDir, 'guild-race-task-types.json');

// title、ID 必须从同源导出保留到每个展示入口，不能退回仅名称造成同名误选。
for (const row of fruitElves) {
  if (!row.title || !row.displayName || row.displayName !== `【${row.title}】${row.name}（ID：${row.id}）`) {
    throw new Error(`果灵 ${row.id} 缺少完整 title/ID 展示身份，请先更新脚本数据库导出`);
  }
  for (const book of row.bookEntries ?? []) {
    if (!book.title || book.title !== book.mainFruitName) {
      throw new Error(`果灵 ${row.id} 图鉴 ${book.bookId} 缺少匹配主果的 title，请重新导出`);
    }
  }
}

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

const elfLines = fruitElves.map(row => `  ${quote(row.id)}: ${quote(row.displayName)},`);
const elfIdentities = Object.fromEntries(fruitElves.map(row => [row.id, {
  title: row.title, titleSource: row.titleSource,
  mainFruitName: row.bookEntries?.[0]?.mainFruitName || row.sourceNames?.[0] || '',
  secondaryFruitName: row.bookEntries?.[0]?.secondaryFruitName || row.sourceNames?.[1] || '',
}]));
writeFile('elfOptions.ts', [
  '// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从奇幻果园导出生成，请勿手工维护。',
  'export const ELVES: Record<string, string> = {',
  ...elfLines,
  '}',
  '',
  'export const ELF_IDENTITIES: Record<string, { title: string; titleSource: string; mainFruitName: string; secondaryFruitName: string }> =',
  JSON.stringify(elfIdentities, null, 2),
  '',
  'export const elfOptions = Object.entries(ELVES).map(([value, label]) => ({ value, label, title: label }))\n',
].join('\n'));

// 偷取可用物品目录保持完整；种植只能使用当前图鉴的非隐藏、完整主副果组合。
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const elfPlantRows = fruitElves.flatMap(row => (row.bookEntries ?? [])
  .filter(book => Number(book.hidden) !== 1
    && [row.id, book.bookId, book.mainFruitId, book.secondaryFruitId].every(positiveId))
  .map(book => ({
    value: String(row.id),
    name: String(row.name),
    seriesTitle: String(book.title),
    bookId: Number(book.bookId),
    mainFruitId: Number(book.mainFruitId),
    secondaryFruitId: Number(book.secondaryFruitId),
    label: `【${book.title}】${row.name}（ID：${row.id}；副果：${book.secondaryFruitName}）`,
    title: `【${book.title}】${row.name}（ID：${row.id}；主果：${book.mainFruitName}；副果：${book.secondaryFruitName}；图鉴ID：${book.bookId}）`,
  })))
  .sort((left, right) => left.bookId - right.bookId);
writeFile('elfPlantOptions.ts', [
  '// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从有效果灵图鉴生成，请勿手工维护。\n',
  'export const elfPlantOptions = ',
  JSON.stringify(elfPlantRows, null, 2),
  '\n',
].join(''));

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

console.log(args.onlyElfPlants || args.onlyElves
  ? `果灵选项生成完成：有效图鉴组合 ${elfPlantRows.length}；仅写入指定果灵目录`
  : `奇幻果园配置选项生成完成：水果 ${fruits.length}、花瓶 ${vases.length}、果艺 ${flowerArts.length}、果灵 ${fruitElves.length}、种植组合 ${elfPlantRows.length}、百果园 ${exchangeItems.length}、竞赛类型 ${guildRaceTaskTypes.length}`);
