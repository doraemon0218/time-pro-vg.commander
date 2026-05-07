'use client'

import { type DayEntry, type DayStatus } from '@/types'
import { getDaysInMonth, formatDate, WEEKDAY_NAMES } from '@/lib/utils'

const STATUS_STYLE: Record<DayStatus, { cell: string; badge: string; label: string }> = {
  regular:          { cell: 'bg-blue-50 border-blue-200 hover:bg-blue-100',     badge: 'bg-blue-500',    label: '出勤' },
  'paid-leave':     { cell: 'bg-green-50 border-green-200 hover:bg-green-100',   badge: 'bg-green-500',   label: '有給' },
  'business-trip':  { cell: 'bg-amber-50 border-amber-200 hover:bg-amber-100',   badge: 'bg-amber-500',   label: '出張' },
  'non-working':    { cell: 'bg-gray-50 border-gray-200 hover:bg-gray-100',      badge: 'bg-gray-300',    label: '非勤務' },
  holiday:          { cell: 'bg-rose-50 border-rose-200 hover:bg-rose-100',      badge: 'bg-rose-500',    label: '祝日' },
  'on-call':        { cell: 'bg-violet-50 border-violet-200 hover:bg-violet-100', badge: 'bg-violet-500',  label: '当直' },
  'post-call-off':  { cell: 'bg-pink-50 border-pink-200 hover:bg-pink-100',      badge: 'bg-pink-400',    label: '明け休み' },
}

interface Props {
  year: number
  month: number
  entries: Record<string, DayEntry>
  onDayClick: (dateStr: string) => void
}

export function Calendar({ year, month, entries, onDayClick }: Props) {
  const days = getDaysInMonth(year, month)
  const today = formatDate(new Date())

  // 1日の曜日（0=日）
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  // グリッド用: 先頭に空白を埋める
  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...days,
  ]

  return (
    <div className="select-none">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_NAMES.map((w, i) => (
          <div
            key={w}
            className={`text-center text-xs font-bold py-1 rounded ${
              i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />

          const dateStr = formatDate(date)
          const entry = entries[dateStr]
          const weekday = date.getDay()
          const isToday = dateStr === today
          const style = entry ? STATUS_STYLE[entry.status] : STATUS_STYLE['non-working']

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`relative rounded-xl border-2 p-1.5 min-h-[72px] text-left transition-all cursor-pointer
                ${style.cell}
                ${isToday ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
              `}
            >
              {/* 日付番号 */}
              <div className={`text-sm font-bold mb-0.5 ${
                weekday === 0 ? 'text-rose-600'
                : weekday === 6 ? 'text-blue-600'
                : 'text-gray-700'
              }`}>
                {date.getDate()}
                {isToday && (
                  <span className="ml-1 text-[9px] font-bold bg-blue-500 text-white rounded px-1">今日</span>
                )}
              </div>

              {/* ステータスバッジ */}
              {entry && (
                <>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.badge}`} />
                    <span className="text-[10px] text-gray-500 truncate">{style.label}</span>
                    {entry.hasOvertime && (
                      <span className="text-[9px] ml-auto">⏰</span>
                    )}
                  </div>

                  {/* 時刻表示 */}
                  {(entry.status === 'regular' || entry.status === 'business-trip' || entry.status === 'on-call') && (
                    <div className="text-[9px] text-gray-500 leading-tight">
                      <div>{entry.clockIn}</div>
                      <div>{entry.clockOut}</div>
                    </div>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 px-1">
        {(Object.entries(STATUS_STYLE) as [DayStatus, typeof STATUS_STYLE[DayStatus]][]).map(([status, s]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${s.badge}`} />
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
