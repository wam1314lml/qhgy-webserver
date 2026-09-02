export { flowerOptions } from './flowerOptions'
export { flowerArtOptions } from './flowerArtOptions'
export { specifiedArtsFullOptions } from './specifiedArtsFullOptions'
export { elfOptions } from './elfOptions'
export { defaultFmlRaceTaskTypePriority, fmlRaceTaskTypes } from './fmlRaceTaskTypes'
export { getFlowerPickerOptions } from './optionPickerUtils'
export { getSpecifiedArtsFullPickerOptions } from './optionPickerUtils'

// 标签页配置
export const tabs = ['基础', '种植', '订单', '公会', '活动']

// —— 单花占地数量（1/2/4/8/16/32/64） ——
export const landGroupSizeOptions = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
  { value: 8, label: '8' },
  { value: 16, label: '16' },
  { value: 32, label: '32' },
  { value: 64, label: '64' },
]

// —— 种植水果数量（1/2/4/8/16） ——
export const flowerCountOptions = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
  { value: 8, label: '8' },
  { value: 16, label: '16' },
]

// —— 种植模式 ——
export const plantingModeOptions = [
  { value: 'quality', label: '指定品质' },
  { value: 'count', label: '指定种类' },
  { value: 'specific', label: '指定水果' },
  { value: 'lowStock', label: '库存模式' },
  { value: 'freeStyle', label: '64块地模式' },
]

// —— 偷花模式 ——
export const stealModeOptions = [
  { value: 'quality', label: '指定品质' },
  { value: 'specific', label: '指定水果' },
  { value: 'exclude', label: '排除水果' },
  { value: 'excludeCultivating', label: '排除已有种子' },
]

// —— 花贸市场上架策略 ——
export const putModeOptions = [
  { value: 'inventory', label: '库存最多' },
  { value: 'specific', label: '指定水果' },
]

// —— 花贸市场上架价格 ——
export const priceIndexOptions = [
  { value: 0, label: '最低' },
  { value: 1, label: '中等' },
  { value: 2, label: '最高' },
]

// —— 花贸市场扫货策略 ——
export const buyModeOptions = [
  { value: 'all', label: '全部' },
  { value: 'specific', label: '指定水果' },
  { value: 'quality', label: '指定品质' },
  { value: 'exclude', label: '排除水果' },
  { value: 'friend', label: '指定好友' },
  { value: 'excludeFriend', label: '排除好友' },
  { value: 'uncultivated', label: '只扫没有的种子' },
]

// —— 果艺上架模式 ——
export const artSellModeOptions = [
  { value: 'vase', label: '指定花瓶' },
  { value: 'full', label: '指定果艺' },
]

// —— 公会土地种植策略 / 分享/摸花模式（只有品质、指定水果两种） ——
export const qualitySpecificModeOptions = [
  { value: 'quality', label: '指定品质' },
  { value: 'specific', label: '指定水果' },
]

// —— 公会土地种植策略（品质 / 指定水果 / 库存模式） ——
export const unionLandPlantModeOptions = [
  { value: 'quality', label: '指定品质' },
  { value: 'specific', label: '指定水果' },
  { value: 'lowStock', label: '库存模式' },
]

// —— 鱼乐无穷倍速 ——
export const fishFunSpeedOptions = [
  { value: 1, label: '1倍速' },
  { value: 4, label: '4倍速' },
  { value: 8, label: '8倍速' },
  { value: 16, label: '16倍速' },
]

// —— 花漾物语倍速 ——
export const actElimSpeedOptions = [
  { value: 1, label: '1倍速' },
  { value: 5, label: '5倍速' },
  { value: 10, label: '10倍速' },
  { value: 25, label: '25倍速' },
  { value: 100, label: '100倍速' },
]

// —— 香卉甜糕倍速 ——
export const actDessertSpeedOptions = [
  { value: 1, label: '普通' },
  { value: 2, label: '快速' },
  { value: 3, label: '高速' },
  { value: 4, label: '极速' },
  { value: 5, label: '神速' },
]

// —— 田园奇趣倍速 ——
export const actMerge2SpeedOptions = [
  { value: 1, label: '1x 普通' },
  { value: 2, label: '2x 快速' },
  { value: 4, label: '4x 高速' },
  { value: 8, label: '8x 极速' },
  { value: 16, label: '16x 神速' },
  { value: 32, label: '32x 超速' },
]

// —— 梳丝引线倍速 ——
export const actSpoolSpeedOptions = [
  { value: 1, label: '普通' },
  { value: 2, label: '快速' },
  { value: 3, label: '高速' },
  { value: 4, label: '极速' },
  { value: 5, label: '神速' },
]

// —— 种植任务优先级字段列表 ——
export const taskPriorityKeys: Array<{ key: string; defaultValue: number }> = [
  { key: '顾客订单', defaultValue: 1 },
  { key: '居民订单', defaultValue: 2 },
  { key: '花艺售卖', defaultValue: 6 },
  { key: '莳花纪闻', defaultValue: 3 },
  { key: '宫廷订单', defaultValue: 4 },
  { key: '公会竞赛', defaultValue: 3 },
]

export const flowerQualityOptions = [
  { label: '绿', value: 1 },
  { label: '蓝', value: 2 },
  { label: '紫', value: 3 },
  { label: '金', value: 4 },
  { label: '红', value: 5 },
]

export const defaultFateThresholds = {
  1017: 1.5, // 最终增伤
  1018: 2.5, // 最终减伤
  1021: 3.0, // 强化治疗
  1022: 4.0, // 弱化治疗
  1023: 5.0, // 强化灵兽
  1024: 6.0, // 弱化灵兽
}

export const createDefaultBodyAttributes = () => ({
  yuanti: { main: [9], sub: [16] }, // 反击, 抗吸血
  yangshen: { main: [6], sub: [13] }, // 暴击, 抗连击
  yinshen: { main: [8], sub: [14] }, // 闪避, 抗闪避
})
