import {
  type AppSettings,
  type MonthSchedule,
  type OvertimeEntry,
  type BusinessTripEntry,
} from '@/types'

// ── キー ─────────────────────────────────────────────────────────
const SETTINGS_KEY = 'tpvg_settings'
const scheduleKey   = (y: number, m: number) => `tpvg_schedule_${y}_${m}`
const overtimeKey   = (y: number, m: number) => `tpvg_overtime_${y}_${m}`
const bizTripKey    = (y: number, m: number) => `tpvg_biztrip_${y}_${m}`

function get<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function set(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── 設定 ─────────────────────────────────────────────────────────
export function loadSettings(): AppSettings | null {
  return get<AppSettings>(SETTINGS_KEY)
}
export function saveSettings(settings: AppSettings): void {
  set(SETTINGS_KEY, settings)
}

// ── 月間スケジュール ─────────────────────────────────────────────
export function loadSchedule(year: number, month: number): MonthSchedule | null {
  return get<MonthSchedule>(scheduleKey(year, month))
}
export function saveSchedule(schedule: MonthSchedule): void {
  set(scheduleKey(schedule.year, schedule.month), schedule)
}

// ── 超過勤務 ─────────────────────────────────────────────────────
export function loadOvertimeEntries(year: number, month: number): OvertimeEntry[] {
  return get<OvertimeEntry[]>(overtimeKey(year, month)) ?? []
}
export function saveOvertimeEntries(year: number, month: number, entries: OvertimeEntry[]): void {
  set(overtimeKey(year, month), entries)
}

// ── 出張 ─────────────────────────────────────────────────────────
export function loadBusinessTripEntries(year: number, month: number): BusinessTripEntry[] {
  return get<BusinessTripEntry[]>(bizTripKey(year, month)) ?? []
}
export function saveBusinessTripEntries(
  year: number,
  month: number,
  entries: BusinessTripEntry[],
): void {
  set(bizTripKey(year, month), entries)
}
