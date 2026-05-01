export type DayStatus =
  | 'regular'       // 通常出勤
  | 'non-working'   // 非勤務日
  | 'paid-leave'    // 有給休暇
  | 'business-trip' // 出張
  | 'holiday'       // 祝日

export interface TimeRange {
  clockIn: string   // "HH:MM"
  clockOut: string  // "HH:MM"
}

export interface DayEntry extends TimeRange {
  date: string      // "YYYY-MM-DD"
  status: DayStatus
  note?: string
}

export interface WeekdayDefault extends TimeRange {
  isWorking: boolean
}

// index 0=日曜, 1=月曜, ..., 6=土曜
export type WeekdayDefaults = [
  WeekdayDefault,
  WeekdayDefault,
  WeekdayDefault,
  WeekdayDefault,
  WeekdayDefault,
  WeekdayDefault,
  WeekdayDefault,
]

export interface MonthSchedule {
  year: number
  month: number    // 1-12
  entries: Record<string, DayEntry>  // key: "YYYY-MM-DD"
}

export interface AppSettings {
  timeproUrl: string
  username: string
  password: string
  correctionReason: string
  headless: boolean
  weekdayDefaults: WeekdayDefaults
}

export interface SubmitResult {
  date: string
  status: 'pending' | 'success' | 'error' | 'skipped'
  message?: string
}

export interface SubmitResponse {
  results: SubmitResult[]
  totalSuccess: number
  totalError: number
  totalSkipped: number
}
