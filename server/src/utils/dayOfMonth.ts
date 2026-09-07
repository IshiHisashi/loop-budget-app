export function daysInMonth(year: number, monthNumber: number): number {
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
}

export function clampDayOfMonth(year: number, monthNumber: number, dayOfMonth: number): number {
  return Math.min(dayOfMonth, daysInMonth(year, monthNumber))
}
