import { type DayEntry, type MonthSchedule, type AppSettings } from '@/types'
import { getDaysInMonth, formatDate } from './utils'
import { getJapaneseHolidays } from './holidays'

export function generateDefaultSchedule(
  year: number,
  month: number,
  settings: AppSettings,
): MonthSchedule {
  const days = getDaysInMonth(year, month)
  const holidays = getJapaneseHolidays(year)
  const entries: Record<string, DayEntry> = {}

  for (const day of days) {
    const dateStr = formatDate(day)
    const weekday = day.getDay() // 0=Sun, 6=Sat
    const def = settings.weekdayDefaults[weekday]
    const isHoliday = holidays.has(dateStr)

    let status: DayEntry['status']
    if (isHoliday) {
      status = 'holiday'
    } else if (!def.isWorking) {
      status = 'non-working'
    } else {
      status = 'regular'
    }

    entries[dateStr] = {
      date: dateStr,
      status,
      clockIn: def.clockIn,
      clockOut: def.clockOut,
    }
  }

  return { year, month, entries }
}

// 修正申請が必要な日（出勤・当直のみ。有給・出張は時刻申請不要）
export function getSubmittableEntries(schedule: MonthSchedule): DayEntry[] {
  return Object.values(schedule.entries)
    .filter(e => e.status === 'regular' || e.status === 'on-call')
    .sort((a, b) => a.date.localeCompare(b.date))
}
