const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export interface MonthRange {
  start: Date
  end: Date
}

export function parseMonthRange(month: string): MonthRange | null {
  if (!MONTH_PATTERN.test(month)) return null

  const [year, monthNumber] = month.split('-').map(Number)
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  }
}
