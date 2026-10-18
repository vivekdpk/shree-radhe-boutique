export type MeasurementField = {
  key: string
  label: string
  required: boolean
  min?: number
  max?: number
}

export function validateMeasurementValues(
  fields: MeasurementField[],
  values: Record<string, string>,
): string | null {
  for (const field of fields) {
    const raw = values[field.key]?.trim() ?? ''
    if (!raw) {
      if (field.required) return `${field.label} is required.`
      continue
    }

    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      return `${field.label} must be a positive number.`
    }
    if (field.min !== undefined && value < field.min) {
      return `${field.label} must be at least ${field.min}.`
    }
    if (field.max !== undefined && value > field.max) {
      return `${field.label} must be no more than ${field.max}.`
    }
  }
  return null
}

export function convertMeasurementValues(
  values: Record<string, string>,
  from: 'inches' | 'cm',
  to: 'inches' | 'cm',
): Record<string, string> {
  if (from === to) return values
  const factor = from === 'inches' ? 2.54 : 1 / 2.54
  return Object.fromEntries(
    Object.entries(values).map(([key, raw]) => {
      if (!raw.trim()) return [key, raw]
      const numeric = Number(raw)
      return [key, Number.isFinite(numeric) ? String(Math.round(numeric * factor * 100) / 100) : raw]
    }),
  )
}
