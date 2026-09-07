import { describe, expect, it } from 'vitest'
import { clampDayOfMonth, daysInMonth } from './dayOfMonth.js'

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
  })

  it('returns 30 for April', () => {
    expect(daysInMonth(2026, 4)).toBe(30)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
  })
})

describe('clampDayOfMonth', () => {
  it('returns the day unchanged when it needs no clamping', () => {
    expect(clampDayOfMonth(2026, 1, 15)).toBe(15)
  })

  it('clamps day 31 to 28 in February of a non-leap year', () => {
    expect(clampDayOfMonth(2026, 2, 31)).toBe(28)
  })

  it('clamps day 31 to 29 in February of a leap year', () => {
    expect(clampDayOfMonth(2024, 2, 31)).toBe(29)
  })

  it('clamps day 31 to 30 in April', () => {
    expect(clampDayOfMonth(2026, 4, 31)).toBe(30)
  })
})
