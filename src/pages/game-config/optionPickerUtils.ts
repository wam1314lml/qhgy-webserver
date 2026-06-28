import { flowerOptions } from './flowerOptions'
import { specifiedArtsFullOptions } from './specifiedArtsFullOptions'

export type PickerOption = { value: string; label: string }

export function isPlaceholderLabel(label: unknown): boolean {
  const text = String(label ?? '').trim()
  return !text || text === '0'
}

export function normalizeOptionLabel(value: string | number, label: unknown): string {
  if (!isPlaceholderLabel(label)) return String(label)
  return `未命名 (${String(value)})`
}

export function getPickerOptions(
  options: Array<{ value: string | number; label: string }>,
  selectedIds?: Array<string | number> | null,
): PickerOption[] {
  const selectedMap = new Set((selectedIds ?? []).map((id) => String(id)))
  return options
    .filter((item) => !isPlaceholderLabel(item.label) || selectedMap.has(String(item.value)))
    .map((item) => ({
      value: String(item.value),
      label: normalizeOptionLabel(item.value, item.label),
    }))
}

export function getFlowerPickerOptions(
  selectedIds?: Array<string | number> | null,
): PickerOption[] {
  return getPickerOptions(flowerOptions, selectedIds)
}

export function getSpecifiedArtsFullPickerOptions(
  selectedIds?: Array<string | number> | null,
): PickerOption[] {
  return getPickerOptions(specifiedArtsFullOptions, selectedIds)
}
