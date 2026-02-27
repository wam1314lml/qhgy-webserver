// 标签页配置
export const tabs = ['基础', '种植', '订单', '公会', '活动']

export const bodyOptions = [
  { value: 0, label: '元体' },
  { value: 1, label: '阳神' },
  { value: 2, label: '阴身' },
]

export const magicOptions = [
  { value: 0, label: '预设1' },
  { value: 1, label: '预设2' },
]

export const spiritOptions = [
  { value: 1, label: '阵容1' },
  { value: 2, label: '阵容2' },
  { value: 3, label: '阵容3' },
]

export const towerSkillOptions = [
  { value: 1001, label: '攻击' },
  { value: 1011, label: '抵抗击晕' },
  { value: 1012, label: '抵抗暴击' },
  { value: 1013, label: '抵抗连击' },
  { value: 1014, label: '抵抗闪避' },
  { value: 1015, label: '抵抗反击' },
  { value: 1016, label: '抵抗吸血' },
  { value: 1017, label: '最终增伤' },
  { value: 1018, label: '最终减伤' },
  { value: 1021, label: '强化治疗' },
  { value: 1022, label: '弱化治疗' },
  { value: 1023, label: '强化灵兽' },
  { value: 1024, label: '弱化灵兽' },
]

export const MoveCityKeywords = [
  {
    value: '高战',
    label: '高战',
  },
  {
    value: '低战',
    label: '低战',
  },
]

export const petNames = ['应龙', '鸾鸟', '青龙', '白虎', '朱雀', '玄武', '麒麟']

export const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  label: `${i}点`,
  value: i,
}))

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

export const qualityOptions = [
  { label: '凡品', value: 1 },
  { label: '下品', value: 2 },
  { label: '中品', value: 3 },
  { label: '上品', value: 4 },
  { label: '极品', value: 5 },
  { label: '仙品', value: 6 },
  { label: '完美', value: 7 },
  { label: '先天', value: 8 },
  { label: '至宝', value: 9 },
  { label: '灵宝1星', value: 10 },
  { label: '灵宝2星', value: 11 },
  { label: '灵宝3星', value: 12 },
  { label: '灵宝4星', value: 13 },
  { label: '灵宝5星', value: 14 },
  { label: '真宝1星', value: 15 },
  { label: '真宝2星', value: 16 },
  { label: '真宝3星', value: 17 },
  { label: '真宝4星', value: 18 },
  { label: '真宝5星', value: 19 },
  { label: '灵器1星', value: 20 },
  { label: '灵器2星', value: 21 },
  { label: '灵器3星', value: 22 },
  { label: '灵器4星', value: 23 },
  { label: '灵器5星', value: 24 },
  { label: '神器1星', value: 25 },
  { label: '神器2星', value: 26 },
  { label: '神器3星', value: 27 },
  { label: '神器4星', value: 28 },
  { label: '神器5星', value: 29 },
  { label: '仙器1星', value: 30 },
  { label: '仙器2星', value: 31 },
  { label: '仙器3星', value: 32 },
  { label: '仙器4星', value: 33 },
  { label: '仙器5星', value: 34 },
  { label: '道器1星', value: 35 },
  { label: '道器2星', value: 36 },
  { label: '道器3星', value: 37 },
  { label: '道器4星', value: 38 },
  { label: '道器5星', value: 39 },
  { label: '九天1重', value: 40 },
  { label: '九天2重', value: 41 },
  { label: '九天3重', value: 42 },
  { label: '九天4重', value: 43 },
  { label: '九天5重', value: 44 },
  { label: '太乙1重', value: 45 },
  { label: '太乙2重', value: 46 },
  { label: '太乙3重', value: 47 },
  { label: '太乙4重', value: 48 },
  { label: '太乙5重', value: 49 },
  { label: '混元1重', value: 50 },
  { label: '混元2重', value: 51 },
  { label: '混元3重', value: 52 },
  { label: '混元4重', value: 53 },
  { label: '混元5重', value: 54 },
  { label: '大罗1重', value: 55 },
  { label: '大罗2重', value: 56 },
  { label: '大罗3重', value: 57 },
  { label: '大罗4重', value: 58 },
  { label: '大罗5重', value: 59 },
  { label: '造化1重', value: 60 },
  { label: '造化2重', value: 61 },
  { label: '造化3重', value: 62 },
  { label: '造化4重', value: 63 },
  { label: '造化5重', value: 64 },
  { label: '无量1重', value: 65 },
  { label: '无量2重', value: 66 },
  { label: '无量3重', value: 67 },
  { label: '无量4重', value: 68 },
  { label: '无量5重', value: 69 },
  { label: '天道1重', value: 70 },
  { label: '天道2重', value: 71 },
  { label: '天道3重', value: 72 },
  { label: '天道4重', value: 73 },
  { label: '天道5重', value: 74 },
  { label: '不灭1重', value: 75 },
  { label: '不灭2重', value: 76 },
  { label: '不灭3重', value: 77 },
  { label: '不灭4重', value: 78 },
  { label: '不灭5重', value: 79 },
  { label: '元始1重', value: 80 },
  { label: '元始2重', value: 81 },
  { label: '元始3重', value: 82 },
  { label: '元始4重', value: 83 },
  { label: '元始5重', value: 84 },
  { label: '混沌1重', value: 85 },
  { label: '混沌2重', value: 86 },
  { label: '混沌3重', value: 87 },
  { label: '混沌4重', value: 88 },
  { label: '混沌5重', value: 89 },
  { label: '祖炁1重', value: 90 },
  { label: '祖炁2重', value: 91 },
  { label: '祖炁3重', value: 92 },
  { label: '祖炁4重', value: 93 },
  { label: '祖炁5重', value: 94 },
  { label: '无极1重', value: 95 },
  { label: '无极2重', value: 96 },
  { label: '无极3重', value: 97 },
  { label: '无极4重', value: 98 },
  { label: '无极5重', value: 99 },
]

// 灵脉专用品质选项
export const talentQualityOptions = [
  { value: 1, label: '凡品' },
  { value: 2, label: '下品' },
  { value: 3, label: '中品' },
  { value: 4, label: '上品' },
  { value: 5, label: '极品' },
  { value: 6, label: '仙品' },
  { value: 7, label: '完美' },
  { value: 8, label: '先天' },
  { value: 9, label: '至宝' },
]

// 灵脉属性选项
export const talentAttributeOptions = [
  { id: 4, name: '敏捷' },
  { id: 11, name: '抗击晕' },
  { id: 12, name: '抗暴击' },
  { id: 13, name: '抗连击' },
  { id: 14, name: '抗闪避' },
  { id: 15, name: '抗反击' },
  { id: 16, name: '抗吸血' },
]

// 灵脉技能选项
export const talentSkillOptions = [
  { id: 50001, name: '玄武' },
  { id: 50002, name: '白虎' },
  { id: 50003, name: '螣蛇' },
  { id: 50004, name: '勾陈' },
  { id: 50005, name: '青龙' },
  { id: 50006, name: '朱雀' },
]

// 周日选项
export const weekDayOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

// 弟子品质选项
export const pupilQualityOptions = [
  { value: 1, label: '平平无奇' },
  { value: 2, label: '灵心慧性' },
  { value: 3, label: '天纵之资' },
  { value: 4, label: '神骨天生' },
  { value: 5, label: '造化圣体' },
  { value: 6, label: '成帝之姿' },
]

// 弟子属性类型选项
export const pupilTypeOptions = [
  { value: 1017, label: '最终增伤' },
  { value: 1018, label: '最终减伤' },
  { value: 1021, label: '强化治疗' },
  { value: 1022, label: '弱化治疗' },
  { value: 1023, label: '强化灵兽' },
  { value: 1024, label: '弱化灵兽' },
]

// 仙玉活动选项
export const xianyuActivityOptions = [
  { value: 25, label: '运势' },
  { value: 50, label: '蛮荒妖域' },
  { value: 53, label: '妖盟乱斗' },
  { value: 60, label: '妖盟攻城战' },
  { value: 61, label: '问道盛会' },
  { value: 64, label: '妖市觅宝' },
  { value: 68, label: '蓬莱仙岛' },
  { value: 71, label: '仙兔开宝' },
  { value: 95, label: '九幽争霸' },
  { value: 108, label: '龙窟秘境' },
  { value: 116, label: '妖灵宝塔' },
  { value: 119, label: '炼器大会' },
  { value: 130, label: '召唤神龙' },
  { value: 131, label: '四圣宝域' },
  { value: 134, label: '炼化法宝' },
  { value: 150, label: '仙域商途' },
  { value: 155, label: '哪吒降妖' },
  { value: 163, label: '黄山仙径' },
  { value: 171, label: '飞剑夺宝' },
  { value: 172, label: '轮回秘境' },
  { value: 173, label: '守卫仙树' },
  // { value: 174, label: '玄尘忆梦' },
  { value: 186, label: '未央仙境' },
  { value: 189, label: '法象盛会' },
  { value: 196, label: '仙团聚惠' },
  { value: 199, label: '昆仑争霸' },
  { value: 300, label: '巅峰妖盟战' },
  { value: 301, label: '小妖卫道' },
  { value: 304, label: '弟子试炼' },
  { value: 305, label: '大闹天宫' },
  { value: 311, label: '西游伏魔' },
  { value: 314, label: '神躯盛会' },
  { value: 320, label: '灵池探宝' },
  { value: 321, label: '御傀争锋' },
  { value: 332, label: '北冥之巅' },
  { value: 333, label: '天魔古域' },
  { value: 343, label: '璇珠宝境' },
  { value: 344, label: '须弥魔塔' },
]

// 属性映射
export const attributeMap = {
  main: [
    { id: 5, name: '击晕' },
    { id: 6, name: '暴击' },
    { id: 7, name: '连击' },
    { id: 8, name: '闪避' },
    { id: 9, name: '反击' },
    { id: 10, name: '吸血' },
  ],
  sub: [
    { id: 11, name: '抗击晕' },
    { id: 12, name: '抗暴击' },
    { id: 13, name: '抗连击' },
    { id: 14, name: '抗闪避' },
    { id: 15, name: '抗反击' },
    { id: 16, name: '抗吸血' },
  ],
}
