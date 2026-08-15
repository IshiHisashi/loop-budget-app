import { Expense } from './api/expenses.ts'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface DayTotal {
  count: number
  total: number
}

interface ExpenseCalendarProps {
  month: string
  expenses: Expense[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}

function daysInMonth(year: number, monthNumber: number): number {
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
}

function firstWeekday(year: number, monthNumber: number): number {
  return new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function aggregateByDay(expenses: Expense[]): Map<string, DayTotal> {
  const byDay = new Map<string, DayTotal>()
  for (const expense of expenses) {
    const day = expense.date.slice(0, 10)
    const existing = byDay.get(day)
    if (existing) {
      existing.count += 1
      existing.total += expense.amount
    } else {
      byDay.set(day, { count: 1, total: expense.amount })
    }
  }
  return byDay
}

function ExpenseCalendar({ month, expenses, selectedDay, onSelectDay }: ExpenseCalendarProps) {
  const [year, monthNumber] = month.split('-').map(Number)
  const totalDays = daysInMonth(year, monthNumber)
  const leadingBlanks = firstWeekday(year, monthNumber)
  const dayTotals = aggregateByDay(expenses)

  const cellClassName =
    'flex h-16 flex-col items-center justify-center rounded border border-transparent text-sm'
  const dayButtonClassName =
    'flex h-16 flex-col items-center justify-center rounded border border-neutral-300 bg-neutral-50 text-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-rose-900/30'
  const selectedDayButtonClassName =
    'flex h-16 flex-col items-center justify-center rounded border border-rose-500 bg-rose-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-rose-400 dark:bg-rose-900/50'

  return (
    <div className="mb-6">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            {label}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} className={cellClassName} />
        ))}

        {Array.from({ length: totalDays }, (_, index) => {
          const dayOfMonth = index + 1
          const day = `${month}-${pad2(dayOfMonth)}`
          const dayTotal = dayTotals.get(day)

          if (!dayTotal) {
            return (
              <div key={day} className={cellClassName}>
                <span className="text-neutral-700 dark:text-neutral-300">{dayOfMonth}</span>
              </div>
            )
          }

          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={isSelected ? selectedDayButtonClassName : dayButtonClassName}
            >
              <span className="text-neutral-900 dark:text-neutral-100">{dayOfMonth}</span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                ${dayTotal.total.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ExpenseCalendar
