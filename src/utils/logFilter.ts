const IP_BAN_MARKER = 'IP封禁'

export function shouldHideLogLine(line: string): boolean {
  return String(line || '').includes(IP_BAN_MARKER)
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
