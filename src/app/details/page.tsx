'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import {
  type OvertimeEntry,
  type BusinessTripEntry,
  type OvertimeReason,
} from '@/types'
import {
  loadOvertimeEntries,
  saveOvertimeEntries,
  loadBusinessTripEntries,
  saveBusinessTripEntries,
} from '@/lib/storage'

type Tab = 'overtime' | 'business-trip'

const OVERTIME_REASONS: OvertimeReason[] = ['診療業務の延長', '会議の出席', 'その他']

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

function dateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY[d.getDay()]}）`
}

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) return '—'
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`
}

// ── 超過勤務ダイアログ ────────────────────────────────────────────
interface OvertimeDialogProps {
  open: boolean
  entry: OvertimeEntry | null
  onClose: () => void
  onSave: (entry: OvertimeEntry) => void
}

function OvertimeDialog({ open, entry, onClose, onSave }: OvertimeDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('17:30')
  const [endTime, setEndTime] = useState('19:00')
  const [reason, setReason] = useState<OvertimeReason>('診療業務の延長')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (entry) {
      setDate(entry.date)
      setStartTime(entry.startTime)
      setEndTime(entry.endTime)
      setReason(entry.reason)
      setNote(entry.note ?? '')
    } else {
      setDate(today)
      setStartTime('17:30')
      setEndTime('19:00')
      setReason('診療業務の延長')
      setNote('')
    }
  }, [entry, today, open])

  function handleSave() {
    onSave({
      id: entry?.id ?? genId(),
      date,
      startTime,
      endTime,
      reason,
      note: (reason === 'その他' && note) ? note : undefined,
    })
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-w-[92vw]"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-bold text-gray-800 mb-4">
            {entry ? '超過勤務を編集' : '超過勤務を追加'}
          </Dialog.Title>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">日付</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">開始時刻</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">終了時刻</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>
            </div>

            {/* 理由 — ラジオで排反選択 */}
            <fieldset>
              <legend className="text-xs text-gray-500 mb-2">超過勤務の理由</legend>
              <div className="space-y-2.5">
                {OVERTIME_REASONS.map(r => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border-2 transition-all ${
                      reason === r
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="overtimeReason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">{r}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {reason === 'その他' && (
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">補足内容</span>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="具体的な理由を入力"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!date || !startTime || !endTime}
              className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── 出張ダイアログ ────────────────────────────────────────────────
interface BusinessTripDialogProps {
  open: boolean
  entry: BusinessTripEntry | null
  onClose: () => void
  onSave: (entry: BusinessTripEntry) => void
}

function BusinessTripDialog({ open, entry, onClose, onSave }: BusinessTripDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [destination, setDestination] = useState('')
  const [purpose, setPurpose] = useState('')
  const [departTime, setDepartTime] = useState('')
  const [returnTime, setReturnTime] = useState('')

  useEffect(() => {
    if (entry) {
      setDate(entry.date)
      setDestination(entry.destination)
      setPurpose(entry.purpose ?? '')
      setDepartTime(entry.departTime ?? '')
      setReturnTime(entry.returnTime ?? '')
    } else {
      setDate(today)
      setDestination('')
      setPurpose('')
      setDepartTime('')
      setReturnTime('')
    }
  }, [entry, today, open])

  function handleSave() {
    if (!destination) return
    onSave({
      id: entry?.id ?? genId(),
      date,
      destination,
      purpose: purpose || undefined,
      departTime: departTime || undefined,
      returnTime: returnTime || undefined,
    })
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-w-[92vw]"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-bold text-gray-800 mb-4">
            {entry ? '出張を編集' : '出張を追加'}
          </Dialog.Title>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">日付</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">行先 <span className="text-rose-400">*</span></span>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="例: 東京・学会会場"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">目的</span>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="例: 学会参加、研修"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">出発</span>
                <input
                  type="time"
                  value={departTime}
                  onChange={e => setDepartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">帰着</span>
                <input
                  type="time"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!date || !destination}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── メインページ ──────────────────────────────────────────────────
export default function DetailsPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [tab, setTab] = useState<Tab>('overtime')

  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([])
  const [editingOvertime, setEditingOvertime] = useState<OvertimeEntry | null>(null)
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false)

  const [bizEntries, setBizEntries] = useState<BusinessTripEntry[]>([])
  const [editingBiz, setEditingBiz] = useState<BusinessTripEntry | null>(null)
  const [showBizDialog, setShowBizDialog] = useState(false)

  useEffect(() => {
    setOvertimeEntries(loadOvertimeEntries(year, month))
    setBizEntries(loadBusinessTripEntries(year, month))
  }, [year, month])

  // ─── 超過勤務 CRUD ───
  function handleOvertimeSave(entry: OvertimeEntry) {
    const next = editingOvertime
      ? overtimeEntries.map(e => (e.id === entry.id ? entry : e))
      : [...overtimeEntries, entry].sort((a, b) => a.date.localeCompare(b.date))
    setOvertimeEntries(next)
    saveOvertimeEntries(year, month, next)
    setEditingOvertime(null)
  }

  function handleOvertimeDelete(id: string) {
    const next = overtimeEntries.filter(e => e.id !== id)
    setOvertimeEntries(next)
    saveOvertimeEntries(year, month, next)
  }

  // ─── 出張 CRUD ───
  function handleBizSave(entry: BusinessTripEntry) {
    const next = editingBiz
      ? bizEntries.map(e => (e.id === entry.id ? entry : e))
      : [...bizEntries, entry].sort((a, b) => a.date.localeCompare(b.date))
    setBizEntries(next)
    saveBusinessTripEntries(year, month, next)
    setEditingBiz(null)
  }

  function handleBizDelete(id: string) {
    const next = bizEntries.filter(e => e.id !== id)
    setBizEntries(next)
    saveBusinessTripEntries(year, month, next)
  }

  // ─── 超過勤務の月合計 ───
  const totalOvertimeMins = overtimeEntries.reduce((acc, e) => {
    const [sh, sm] = e.startTime.split(':').map(Number)
    const [eh, em] = e.endTime.split(':').map(Number)
    const mins = eh * 60 + em - (sh * 60 + sm)
    return acc + (mins > 0 ? mins : 0)
  }, 0)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ─── ヘッダー ─── */}
        <header className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors text-sm flex items-center gap-1"
            >
              ← カレンダー
            </Link>
            <span className="text-gray-200">|</span>
            <h1 className="text-base font-bold text-gray-500">詳細入力</h1>
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

        {/* ─── タブ ─── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
          <button
            onClick={() => setTab('overtime')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === 'overtime'
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⏰ 超過勤務
            {overtimeEntries.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                {overtimeEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('business-trip')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === 'business-trip'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✈️ 出張
            {bizEntries.length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                {bizEntries.length}
              </span>
            )}
          </button>
        </div>

        {/* ─── 超過勤務タブ ─── */}
        {tab === 'overtime' && (
          <div>
            <button
              onClick={() => { setEditingOvertime(null); setShowOvertimeDialog(true) }}
              className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-orange-300 text-orange-500 text-sm font-medium hover:bg-orange-50 transition-colors"
            >
              + 超過勤務を追加
            </button>

            {overtimeEntries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">⏰</div>
                <div className="text-sm">この月の超過勤務はありません</div>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {overtimeEntries.map(e => (
                    <div
                      key={e.id}
                      className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold text-gray-700">
                              {dateLabel(e.date)}
                            </span>
                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              {e.startTime}〜{e.endTime}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({calcDuration(e.startTime, e.endTime)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                              {e.reason}
                            </span>
                            {e.note && (
                              <span className="text-xs text-gray-500 truncate">{e.note}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingOvertime(e)
                              setShowOvertimeDialog(true)
                            }}
                            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleOvertimeDelete(e.id)}
                            className="px-3 py-1.5 text-xs text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 月合計 */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="text-xs text-orange-500 mb-1">月合計超過時間</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {Math.floor(totalOvertimeMins / 60)}時間
                    {totalOvertimeMins % 60 > 0 && ` ${totalOvertimeMins % 60}分`}
                  </div>
                  <div className="text-xs text-orange-400 mt-1">
                    {overtimeEntries.length}件の超過勤務
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── 出張タブ ─── */}
        {tab === 'business-trip' && (
          <div>
            <button
              onClick={() => { setEditingBiz(null); setShowBizDialog(true) }}
              className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              + 出張を追加
            </button>

            {bizEntries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">✈️</div>
                <div className="text-sm">この月の出張はありません</div>
              </div>
            ) : (
              <div className="space-y-2">
                {bizEntries.map(e => (
                  <div
                    key={e.id}
                    className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-gray-700">
                            {dateLabel(e.date)}
                          </span>
                          <span className="text-sm font-semibold text-amber-700">
                            {e.destination}
                          </span>
                        </div>
                        {e.purpose && (
                          <div className="text-xs text-gray-500 mb-0.5">{e.purpose}</div>
                        )}
                        {(e.departTime || e.returnTime) && (
                          <div className="text-xs text-gray-400">
                            {e.departTime && `出発 ${e.departTime}`}
                            {e.departTime && e.returnTime && ' 〜 '}
                            {e.returnTime && `帰着 ${e.returnTime}`}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingBiz(e)
                            setShowBizDialog(true)
                          }}
                          className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleBizDelete(e.id)}
                          className="px-3 py-1.5 text-xs text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <OvertimeDialog
        open={showOvertimeDialog}
        entry={editingOvertime}
        onClose={() => { setShowOvertimeDialog(false); setEditingOvertime(null) }}
        onSave={handleOvertimeSave}
      />

      <BusinessTripDialog
        open={showBizDialog}
        entry={editingBiz}
        onClose={() => { setShowBizDialog(false); setEditingBiz(null) }}
        onSave={handleBizSave}
      />
    </div>
  )
}
