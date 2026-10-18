import { describe, expect, it } from 'vitest'
import { convertMeasurementValues, validateMeasurementValues } from './measurementValidation'

const fields = [
  { key: 'chest', label: 'Chest', required: true, min: 10, max: 80 },
  { key: 'sleeve', label: 'Sleeve length', required: false, min: 1, max: 50 },
]

describe('validateMeasurementValues', () => {
  it('accepts valid required and optional values', () => {
    expect(validateMeasurementValues(fields, { chest: '38.5', sleeve: '24' })).toBeNull()
  })
  it('requires required measurements', () => {
    expect(validateMeasurementValues(fields, {})).toBe('Chest is required.')
  })
  it('rejects non-numeric, non-positive and out-of-range values', () => {
    expect(validateMeasurementValues(fields, { chest: 'abc' })).toContain('positive number')
    expect(validateMeasurementValues(fields, { chest: '0' })).toContain('positive number')
    expect(validateMeasurementValues(fields, { chest: '9' })).toContain('at least 10')
    expect(validateMeasurementValues(fields, { chest: '81' })).toContain('no more than 80')
  })
  it('allows blank optional fields', () => {
    expect(validateMeasurementValues(fields, { chest: '38', sleeve: '' })).toBeNull()
  })
})

describe('convertMeasurementValues', () => {
  it('converts inches to centimetres and keeps blanks', () => {
    expect(convertMeasurementValues({ chest: '38', sleeve: '' }, 'inches', 'cm')).toEqual({ chest: '96.52', sleeve: '' })
  })
  it('converts centimetres to inches', () => {
    expect(convertMeasurementValues({ chest: '96.52' }, 'cm', 'inches')).toEqual({ chest: '38' })
  })
  it('does not convert when the unit is unchanged', () => {
    const values = { chest: '38' }
    expect(convertMeasurementValues(values, 'inches', 'inches')).toBe(values)
  })
})
