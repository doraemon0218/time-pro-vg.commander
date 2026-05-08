export type DayStatus =
  | 'regular'       // 通常出勤
  | 'non-working'   // 非勤務日
  | 'paid-leave'    // 有給休暇
  | 'business-trip' // 出張
  | 'holiday'       // 祝日
  | 'on-call'       // 当直
  | 'post-call-off' // 明け休み

export interface TimeRange {
  clockIn: string   // "HH:MM"
  clockOut: string  // "HH:MM"
}

export interface DayEntry extends TimeRange {
  date: string      // "YYYY-MM-DD"
  status: DayStatus
  note?: string
  hasOvertime?: boolean  // 詳細画面で登録された超過勤務がある
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
  bizTripReason: string
  headless: boolean
  weekdayDefaults: WeekdayDefaults
}

// ── 超過勤務 ─────────────────────────────────────────────────────
export type OvertimeReason = '診療業務の延長' | '会議の出席' | 'その他'

export interface OvertimeEntry {
  id: string
  date: string       // "YYYY-MM-DD"
  startTime: string  // "HH:MM" (定時退勤後の開始)
  endTime: string    // "HH:MM"
  reason: OvertimeReason
  note?: string      // 「その他」の場合の補足
}

// ── 出張 ─────────────────────────────────────────────────────────
export interface BusinessTripEntry {
  id: string
  date: string
  destination: string  // 行先
  purpose?: string     // 目的
  departTime?: string  // 出発時刻
  returnTime?: string  // 帰着時刻
}

// ── 有給休暇 ──────────────────────────────────────────────────────
export interface PaidLeaveEntry {
  id: string
  date: string   // "YYYY-MM-DD"
  note?: string  // 任意メモ
}

// ── 申請 ─────────────────────────────────────────────────────────
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
