'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { type DayEntry, type DayStatus } from '@/types'

const STATUS_OPTIONS: { value: DayStatus; label: string; color: string }[] = [
  { value: 'regular',        label: '通常出勤',  color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'on-call',        label: '当直',      color: 'bg-violet-100 text-violet-800 border-violet-300' },
  { value: 'post-call-off',  label: '明け休み',  color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'paid-leave',     label: '有給休暇',  color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'business-trip',  label: '出張',      color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'non-working',    label: '非勤務日',  color: 'bg-gray-100 text-gray-600 border-gray-300' },
  { value: 'holiday',        label: '祝日',      color: 'bg-rose-100 text-rose-800 border-rose-300' },
]

interface Props {
  entry: DayEntry | null
  open: boolean
  onClose: () => void
  onSave: (entry: DayEntry) => void
  hasOvertimeEntry?: boolean
  hasBizTripEntry?: boolean
  hasPaidLeaveEntry?: boolean
  onDeleteOvertime?: (date: string) => void
  onDeleteBizTrip?: (date: string) => void
  onDeletePaidLeave?: (date: string) => void
}

export function DayEditDialog({
  entry,
  open,
  onClose,
  onSave,
  hasOvertimeEntry,
  hasBizTripEntry,
  hasPaidLeaveEntry,
  onDeleteOvertime,
  onDeleteBizTrip,
  onDeletePaidLeave,
}: Props) {
  const [status, setStatus] = useState<DayStatus>('regular')
  const [clockIn, setClockIn] = useState('07:30')
  const [clockOut, setClockOut] = useState('16:30')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (entry) {
      setStatus(entry.status)
      setClockIn(entry.clockIn)
      setClockOut(entry.clockOut)
      setNote(entry.note ?? '')
    }
  }, [entry])

  if (!entry) return null

  const dateLabel = (() => {
    const d = new Date(entry.date + 'T00:00:00')
    const wday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return `${d.getMonth() + 1}月${d.getDate()}日（${wday}）`
  })()

  function handleSave() {
    if (!entry) return
    onSave({ ...entry, status, clockIn, clockOut, note })
    onClose()
  }

  const needsTimes = status === 'regular' || status === 'business-trip' || status === 'on-call'

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[320px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-bold text-gray-800 mb-4">
            {dateLabel}
          </Dialog.Title>

          {/* 詳細画面からの登録情報 */}
          {(hasOvertimeEntry || hasBizTripEntry || hasPaidLeaveEntry) && (
            <div className="mb-4 space-y-2">
              {hasOvertimeEntry && (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-orange-700">⏰ 超過勤務あり</span>
                  <button
                    onClick={() => {
                      if (onDeleteOvertime && confirm('この日の超過勤務記録を削除しますか？')) {
                        onDeleteOvertime(entry.date)
                        onClose()
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                  >
                    削除
                  </button>
                </div>
              )}
              {hasBizTripEntry && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-amber-700">✈️ 出張あり</span>
                  <button
                    onClick={() => {
                      if (onDeleteBizTrip && confirm('この日の出張記録を削除しますか？')) {
                        onDeleteBizTrip(entry.date)
                        onClose()
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                  >
                    削除
                  </button>
                </div>
              )}
              {hasPaidLeaveEntry && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-green-700">🌿 有給休暇あり</span>
                  <button
                    onClick={() => {
                      if (onDeletePaidLeave && confirm('この日の有給休暇記録を削除しますか？')) {
                        onDeletePaidLeave(entry.date)
                        onClose()
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ステータス選択 */}
          <div className="space-y-2 mb-4">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`w-full text-left px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  status === opt.value
                    ? `${opt.color} border-2`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
                {status === opt.value && <span className="float-right">✓</span>}
              </button>
            ))}
          </div>

          {/* 時刻入力 */}
          {needsTimes && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">出勤</span>
                <input
                  type="time"
                  value={clockIn}
                  onChange={e => setClockIn(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">退勤</span>
                <input
                  type="time"
                  value={clockOut}
                  onChange={e => setClockOut(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
            </div>
          )}

          {/* メモ */}
          <label className="block mb-4">
            <span className="text-xs text-gray-500 mb-1 block">メモ（任意）</span>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="例: 学会出張"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          {/* ボタン */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800"
            >
              保存
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
