'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  type AppSettings,
  type MonthSchedule,
  type DayEntry,
  type SubmitResult,
  type OvertimeEntry,
  type BusinessTripEntry,
  type PaidLeaveEntry,
} from '@/types'
import { generateDefaultSchedule, getSubmittableEntries } from '@/lib/schedule'
import {
  loadSettings, saveSettings,
  loadSchedule, saveSchedule,
  loadOvertimeEntries, saveOvertimeEntries,
  loadBusinessTripEntries, saveBusinessTripEntries,
  loadPaidLeaveEntries, savePaidLeaveEntries,
} from '@/lib/storage'
import { Calendar } from '@/components/Calendar'
import { DayEditDialog } from '@/components/DayEditDialog'
import { SettingsPanel } from '@/components/SettingsPanel'
import { SubmitDialog } from '@/components/SubmitDialog'

const DEFAULT_SETTINGS: AppSettings = {
  timeproUrl: 'https://rg0010306715vg.creo-hosting.com/TimePro-VG/page/OVg00010L.aspx',
  username: '',
  password: '',
  correctionReason: '打刻漏れのため修正申請いたします',
  headless: true,
  weekdayDefaults: [
    { isWorking: false, clockIn: '07:30', clockOut: '16:30' },
    { isWorking: true,  clockIn: '07:30', clockOut: '16:30' },
    { isWorking: true,  clockIn: '07:30', clockOut: '16:30' },
    { isWorking: true,  clockIn: '07:30', clockOut: '16:30' },
    { isWorking: true,  clockIn: '07:30', clockOut: '16:30' },
    { isWorking: true,  clockIn: '07:30', clockOut: '16:30' },
    { isWorking: false, clockIn: '07:30', clockOut: '16:30' },
  ],
}

export default function HomePage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  // details ページと月を共有：mount 時に localStorage から読み込む
  useEffect(() => {
    const saved = localStorage.getItem('tpvg_current_ym')
    if (saved) {
      const [y, m] = saved.split('-').map(Number)
      if (y && m) { setYear(y); setMonth(m) }
    }
  }, [])

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [schedule, setSchedule] = useState<MonthSchedule | null>(null)
  const [loading, setLoading] = useState(true)

  // 詳細画面で登録された超過勤務・出張・有給
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([])
  const [bizEntries, setBizEntries] = useState<BusinessTripEntry[]>([])
  const [paidLeaveEntries, setPaidLeaveEntries] = useState<PaidLeaveEntry[]>([])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitResults, setSubmitResults] = useState<SubmitResult[] | null>(null)
  const [submitLogs, setSubmitLogs] = useState<string[]>([])

  // ─── 初期設定読み込み ───
  useEffect(() => {
    const saved = loadSettings()
    if (saved) setSettings(saved)
    setLoading(false)
  }, [])

  // ─── 月変更時にスケジュール・詳細データ読み込み ───
  const loadMonthSchedule = useCallback((y: number, m: number, s: AppSettings) => {
    const saved = loadSchedule(y, m)
    setSchedule(saved ?? generateDefaultSchedule(y, m, s))
  }, [])

  const loadDetailEntries = useCallback((y: number, m: number) => {
    setOvertimeEntries(loadOvertimeEntries(y, m))
    setBizEntries(loadBusinessTripEntries(y, m))
    setPaidLeaveEntries(loadPaidLeaveEntries(y, m))
  }, [])

  useEffect(() => {
    if (!loading) {
      loadMonthSchedule(year, month, settings)
      loadDetailEntries(year, month)
    }
  }, [year, month, loading, settings, loadMonthSchedule, loadDetailEntries])

  // /details から戻ってきた際にデータを再読み込み
  useEffect(() => {
    function onVisible() {
      if (!document.hidden) {
        loadMonthSchedule(year, month, settings)
        loadDetailEntries(year, month)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [year, month, settings, loadMonthSchedule, loadDetailEntries])

  // ─── 日付編集保存 ───
  function handleDaySave(entry: DayEntry) {
    if (!schedule) return
    const next: MonthSchedule = {
      ...schedule,
      entries: { ...schedule.entries, [entry.date]: entry },
    }
    setSchedule(next)
    saveSchedule(next)
  }

  // ─── カレンダーから超過勤務を削除 ───
  function handleDeleteOvertimeForDate(date: string) {
    const next = overtimeEntries.filter(e => e.date !== date)
    setOvertimeEntries(next)
    saveOvertimeEntries(year, month, next)
    // カレンダーの hasOvertime フラグを解除
    if (schedule?.entries[date]) {
      const nextSchedule: MonthSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: { ...schedule.entries[date], hasOvertime: false },
        },
      }
      setSchedule(nextSchedule)
      saveSchedule(nextSchedule)
    }
  }

  // ─── カレンダーから出張を削除 ───
  function handleDeleteBizTripForDate(date: string) {
    const next = bizEntries.filter(e => e.date !== date)
    setBizEntries(next)
    saveBusinessTripEntries(year, month, next)
    // カレンダーの日付ステータスを週デフォルトに戻す
    if (schedule?.entries[date]) {
      const d = new Date(date + 'T00:00:00')
      const weekday = d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
      const def = settings.weekdayDefaults[weekday]
      const revertStatus = def.isWorking ? 'regular' : 'non-working'
      const nextSchedule: MonthSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: { ...schedule.entries[date], status: revertStatus },
        },
      }
      setSchedule(nextSchedule)
      saveSchedule(nextSchedule)
    }
  }

  // ─── カレンダーから有給を削除 ───
  function handleDeletePaidLeaveForDate(date: string) {
    const next = paidLeaveEntries.filter(e => e.date !== date)
    setPaidLeaveEntries(next)
    savePaidLeaveEntries(year, month, next)
    if (schedule?.entries[date]) {
      const d = new Date(date + 'T00:00:00')
      const weekday = d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
      const def = settings.weekdayDefaults[weekday]
      const revertStatus = def.isWorking ? 'regular' : 'non-working'
      const nextSchedule: MonthSchedule = {
        ...schedule,
        entries: { ...schedule.entries, [date]: { ...schedule.entries[date], status: revertStatus } },
      }
      setSchedule(nextSchedule)
      saveSchedule(nextSchedule)
    }
  }

  // ─── 月ナビゲーション ───
  function prevMonth() {
    const newY = month === 1 ? year - 1 : year
    const newM = month === 1 ? 12 : month - 1
    setYear(newY); setMonth(newM)
    localStorage.setItem('tpvg_current_ym', `${newY}-${newM}`)
  }
  function nextMonth() {
    const newY = month === 12 ? year + 1 : year
    const newM = month === 12 ? 1 : month + 1
    setYear(newY); setMonth(newM)
    localStorage.setItem('tpvg_current_ym', `${newY}-${newM}`)
  }

  // ─── 設定保存 ───
  function handleSettingsSave(s: AppSettings) {
    setSettings(s)
    saveSettings(s)
    return Promise.resolve()
  }

  // ─── 修正申請実行 ───
  async function handleSubmit() {
    if (!schedule) return
    const entries = getSubmittableEntries(schedule)
    if (entries.length === 0) return

    setSubmitting(true)
    setSubmitResults(null)
    setSubmitLogs([])

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, settings }),
      })
      const data = await res.json()
      if (data.isVercelEnvironment) {
        setSubmitLogs([data.error])
        setSubmitResults([])
      } else {
        setSubmitResults(data.results ?? [])
        setSubmitLogs(data.logs ?? [])
      }
    } catch (err) {
      setSubmitLogs([`エラー: ${String(err)}`])
      setSubmitResults([])
    } finally {
      setSubmitting(false)
    }
  }

  const submittableCount = schedule ? getSubmittableEntries(schedule).length : 0

  // 選択中の日付に関連する詳細エントリ
  const selectedOtCount   = selectedDate ? overtimeEntries.filter(e => e.date === selectedDate).length : 0
  const selectedBizCount  = selectedDate ? bizEntries.filter(e => e.date === selectedDate).length : 0
  const selectedPLCount   = selectedDate ? paidLeaveEntries.filter(e => e.date === selectedDate).length : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ─── ヘッダー ─── */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-gray-500 tracking-wide">
              Time Pro VG Commander
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/details"
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                超過勤務・出張・有給 →
              </Link>
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                勤務設定
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm text-xl font-light"
            >
              ‹
            </button>
            <h2 className="flex-1 text-center text-2xl font-bold text-gray-800">
              {year}年{month}月
            </h2>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm text-xl font-light"
            >
              ›
            </button>
          </div>
        </header>

        {/* ─── カレンダー ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          {schedule ? (
            <Calendar
              year={year}
              month={month}
              entries={schedule.entries}
              onDayClick={d => setSelectedDate(d)}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              読み込み中...
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mb-6">
          日付をタップして編集 • ⏰ = 超過勤務あり
        </p>

        {/* ─── 修正申請ボタン（大） ─── */}
        <button
          onClick={() => { setSubmitResults(null); setShowSubmit(true) }}
          disabled={submittableCount === 0}
          className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg
                     hover:bg-indigo-700 active:bg-indigo-800
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all text-xl tracking-wide"
        >
          これで修正申請する！
          {submittableCount > 0 && (
            <span className="ml-2 text-sm font-normal opacity-80">
              （{submittableCount}日分）
            </span>
          )}
        </button>
      </div>

      <DayEditDialog
        entry={selectedDate && schedule ? (schedule.entries[selectedDate] ?? null) : null}
        open={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        onSave={handleDaySave}
        hasOvertimeEntry={selectedOtCount > 0}
        hasBizTripEntry={selectedBizCount > 0}
        hasPaidLeaveEntry={selectedPLCount > 0}
        onDeleteOvertime={handleDeleteOvertimeForDate}
        onDeleteBizTrip={handleDeleteBizTripForDate}
        onDeletePaidLeave={handleDeletePaidLeaveForDate}
      />

      <SettingsPanel
        settings={settings}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />

      <SubmitDialog
        open={showSubmit}
        entries={schedule ? getSubmittableEntries(schedule) : []}
        overtimeEntries={overtimeEntries}
        bizEntries={bizEntries}
        paidLeaveEntries={paidLeaveEntries}
        submitting={submitting}
        results={submitResults}
        logs={submitLogs}
        onClose={() => { if (!submitting) setShowSubmit(false) }}
        onConfirm={handleSubmit}
      />
    </div>
  )
}
