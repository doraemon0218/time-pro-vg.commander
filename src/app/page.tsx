'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { type AppSettings, type MonthSchedule, type DayEntry, type SubmitResult } from '@/types'
import { generateDefaultSchedule, getSubmittableEntries } from '@/lib/schedule'
import { loadSettings, saveSettings, loadSchedule, saveSchedule } from '@/lib/storage'
import { Calendar } from '@/components/Calendar'
import { DayEditDialog } from '@/components/DayEditDialog'
import { SettingsPanel } from '@/components/SettingsPanel'
import { SubmitDialog } from '@/components/SubmitDialog'

const DEFAULT_SETTINGS: AppSettings = {
  timeproUrl: 'https://your-company.tpvg.jp',
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

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [schedule, setSchedule] = useState<MonthSchedule | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitResults, setSubmitResults] = useState<SubmitResult[] | null>(null)
  const [submitLogs, setSubmitLogs] = useState<string[]>([])

  // ─── 初期データ読み込み ───
  useEffect(() => {
    const saved = loadSettings()
    if (saved) setSettings(saved)
    setLoading(false)
  }, [])

  // ─── 月変更時にスケジュール読み込み ───
  const loadMonthSchedule = useCallback((y: number, m: number, s: AppSettings) => {
    const saved = loadSchedule(y, m)
    setSchedule(saved ?? generateDefaultSchedule(y, m, s))
  }, [])

  useEffect(() => {
    if (!loading) loadMonthSchedule(year, month, settings)
  }, [year, month, loading, settings, loadMonthSchedule])

  // ─── 日付セルクリック ───
  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr)
  }

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

  // ─── 月ナビゲーション ───
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
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
                超過勤務・出張 →
              </Link>
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
                title="設定"
              >
                ⚙️
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

            <button
              onClick={() => { setSubmitResults(null); setShowSubmit(true) }}
              disabled={submittableCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              🚀 修正申請
              {submittableCount > 0 && (
                <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {submittableCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ─── カレンダー ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          {schedule ? (
            <Calendar
              year={year}
              month={month}
              entries={schedule.entries}
              onDayClick={handleDayClick}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              読み込み中...
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          日付をタップして編集 • ⚙️で曜日別デフォルト時刻を設定
        </p>
      </div>

      <DayEditDialog
        entry={selectedDate && schedule ? (schedule.entries[selectedDate] ?? null) : null}
        open={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        onSave={handleDaySave}
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
        submitting={submitting}
        results={submitResults}
        logs={submitLogs}
        onClose={() => { if (!submitting) setShowSubmit(false) }}
        onConfirm={handleSubmit}
      />
    </div>
  )
}
