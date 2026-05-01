import { type AppSettings, type MonthSchedule } from '@/types'

const SETTINGS_KEY = 'tpvg_settings'
const scheduleKey = (year: number, month: number) => `tpvg_schedule_${year}_${month}`

export function loadSettings(): AppSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as AppSettings) : null
  } catch { return null }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadSchedule(year: number, month: number): MonthSchedule | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(scheduleKey(year, month))
    return raw ? (JSON.parse(raw) as MonthSchedule) : null
  } catch { return null }
}

export function saveSchedule(schedule: MonthSchedule): void {
  localStorage.setItem(scheduleKey(schedule.year, schedule.month), JSON.stringify(schedule))
}
