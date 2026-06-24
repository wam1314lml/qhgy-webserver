const IP_BAN_MARKER = 'IP封禁'
const EVT_MARKER    = '[[EVT]]'

export function shouldHideLogLine(line: string): boolean {
  const s = String(line || '')
  // 含 IP 封禁标记 或 EVT 事件行 均不在普通日志中显示
  return s.includes(IP_BAN_MARKER) || s.includes(EVT_MARKER)
}

export function filterLogLines(lines: string[]): string[] {
  return (lines || []).filter((line) => !shouldHideLogLine(line))
}

export function filterLogText(text: string): string {
  return String(text || '')
    .split('\n')
    .filter((line) => line.trim() && !shouldHideLogLine(line))
    .join('\n')
}
