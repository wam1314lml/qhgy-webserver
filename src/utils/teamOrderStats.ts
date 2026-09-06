const DAY_MS = 24 * 60 * 60 * 1000
const GAME_TIME_OFFSET_MS = 8 * 60 * 60 * 1000

// 游戏按北京时间日切，不受查看页面的设备时区影响。
export function getTeamOrderDay(now = Date.now()): string {
  return new Date(now + GAME_TIME_OFFSET_MS).toISOString().slice(0, 10)
}

export function getNextTeamOrderDayDelay(now = Date.now()): number {
  return DAY_MS - ((now + GAME_TIME_OFFSET_MS) % DAY_MS) + 50
}

export interface TeamOrderRecord {
  date?: string
  totalSubmit?: number
  totalExp?: number
}

export function getTodayTeamOrderStats(record: TeamOrderRecord | null | undefined, today: string) {
  // 缺日期的旧记录不能证明属于今天；不使用账号整体更新时间兜底。
  const isToday = record?.date === today
  return {
    teamOrderSubmit: isToday ? (record?.totalSubmit ?? 0) : 0,
    teamOrderExp: isToday ? (record?.totalExp ?? 0) : 0,
  }
}
