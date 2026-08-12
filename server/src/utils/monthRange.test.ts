import { describe, expect, it } from 'vitest'
import { parseMonthRange } from './monthRange.js'

describe('parseMonthRange', () => {
  it('returns the UTC month boundaries for a valid month', () => {
    const range = parseMonthRange('2026-01')

    expect(range).not.toBeNull()
    expect(range!.start.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(range!.end.toISOString()).toBe('2026-02-01T00:00:00.000Z')
  })

  it('handles the December boundary by rolling into the next year', () => {
    const range = parseMonthRange('2026-12')

    expect(range).not.toBeNull()
    expect(range!.start.toISOString()).toBe('2026-12-01T00:00:00.000Z')
    expect(range!.end.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })

  it('returns null for a malformed month number', () => {
    expect(parseMonthRange('2026-13')).toBeNull()
    expect(parseMonthRange('2026-00')).toBeNull()
  })

  it('returns null for a non-YYYY-MM string', () => {
    expect(parseMonthRange('January')).toBeNull()
    expect(parseMonthRange('2026/01')).toBeNull()
    expect(parseMonthRange('')).toBeNull()
  })
})
