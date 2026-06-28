const specifiedArtsFullNameMap: Record<string, string> = {}

export const specifiedArtsFullOptions = Object.entries(specifiedArtsFullNameMap).map(
  ([value, label]) => ({
    value,
    label,
  }),
)
