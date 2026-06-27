export interface SelectDefaultOption {
  value: unknown
  disabled?: boolean
}

const SELECT_ALL_VALUE = '__SELECT_ALL__'

function getEnabledOptions(options: SelectDefaultOption[] = []) {
  return options.filter((opt) => !opt.disabled && opt.value !== SELECT_ALL_VALUE)
}

export function isEmptySelectValue(value: unknown, multiple: boolean): boolean {
  if (multiple) {
    return !Array.isArray(value) || value.length === 0
  }
  return value === null || value === undefined || value === ''
}

export function ensureMultiSelectValue<T>(
  value: T[] | null | undefined,
  options: SelectDefaultOption[],
): T[] {
  const enabled = getEnabledOptions(options)
  if (enabled.length === 0) {
    return Array.isArray(value) ? value : []
  }

  const current = Array.isArray(value) ? value : []
  if (current.length > 0) {
    return current
  }

  return [enabled[0].value as T]
}

export function ensureSingleSelectValue<T>(
  value: T | null | undefined,
  options: SelectDefaultOption[],
): T {
  const enabled = getEnabledOptions(options)
  if (enabled.length === 0) {
    return value as T
  }

  const validValues = enabled.map((opt) => opt.value)
  if (value !== null && value !== undefined && value !== '' && validValues.includes(value)) {
    return value
  }

  return enabled[0].value as T
}

export function normalizeSelectValue(
  value: unknown,
  options: SelectDefaultOption[] | undefined,
  multiple: boolean,
): unknown {
  const opts = options ?? []
  if (opts.length === 0) {
    return value
  }

  return multiple
    ? ensureMultiSelectValue(Array.isArray(value) ? value : [], opts)
    : ensureSingleSelectValue(value, opts)
}

export function isSameSelectValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
