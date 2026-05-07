'use client'

import * as Dialog from '@radix-ui/react-dialog'
import {
  type DayEntry,
  type SubmitResult,
  type OvertimeEntry,
  type BusinessTripEntry,
  type PaidLeaveEntry,
} from '@/types'

const STATUS_LABEL: Record<DayEntry['status'], string> = {
  regular:          '出勤',
  'paid-leave':     '有給',
  'business-trip':  '出張',
  'non-working':    '非勤務',
  holiday:          '祝日',
  'on-call':        '当直',
  'post-call-off':  '明け休み',
}

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY[d.getDay()]}）`
}

function calcDuration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) return null
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`
}

// データ品質チェック
interface ValidationIssue {
  date: string
  message: string
}

function validateEntries(entries: DayEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const e of entries) {
    const [ih, im] = e.clockIn.split(':').map(Number)
    const [oh, om] = e.clockOut.split(':').map(Number)
    const inMins  = ih * 60 + im
    const outMins = oh * 60 + om
    if (!e.clockIn || !e.clockOut) {
      issues.push({ date: e.date, message: '出退勤時刻が未入力です' })
    } else if (outMins <= inMins) {
      issues.push({ date: e.date, message: `退勤(${e.clockOut})が出勤(${e.clockIn})以前になっています` })
    }
  }
  return issues
}

interface Props {
  open: boolean
  entries: DayEntry[]
  overtimeEntries: OvertimeEntry[]
  bizEntries: BusinessTripEntry[]
  paidLeaveEntries: PaidLeaveEntry[]
  submitting: boolean
  results: SubmitResult[] | null
  logs: string[]
  onClose: () => void
  onConfirm: () => void
}

export function SubmitDialog({
  open, entries, overtimeEntries, bizEntries, paidLeaveEntries,
  submitting, results, logs, onClose, onConfirm,
}: Props) {
  const isDone = results !== null && !submitting
  const successCount = results?.filter(r => r.status === 'success').length ?? 0
  const errorCount   = results?.filter(r => r.status === 'error').length ?? 0

  const issues = validateEntries(entries)
  const hasIssues = issues.length > 0

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[540px] max-w-[95vw] max-h-[88vh] flex flex-col"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-xl font-bold text-gray-800 mb-3">
            {isDone ? '申請完了' : 'Time Pro VGに更新しますがよろしいですか？'}
          </Dialog.Title>

          {/* ── 申請前: 確認リスト ── */}
          {!submitting && !isDone && (
            <>
              {/* データ品質警告 */}
              {hasIssues && (
                <div className="mb-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <div className="text-xs font-bold text-rose-700 mb-1">⚠️ 入力内容に問題があります</div>
                  {issues.map((iss, i) => (
                    <div key={i} className="text-xs text-rose-600">
                      {fmtDate(iss.date)}：{iss.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-y-auto flex-1 space-y-4">

                {/* 打刻修正申請 */}
                <section>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    打刻修正申請 — {entries.length}日分
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-xs text-gray-400 px-2">対象なし</div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-1.5 text-gray-500 font-medium text-xs">日付</th>
                            <th className="text-center px-2 py-1.5 text-gray-500 font-medium text-xs">種別</th>
                            <th className="text-center px-2 py-1.5 text-gray-500 font-medium text-xs">出勤</th>
                            <th className="text-center px-2 py-1.5 text-gray-500 font-medium text-xs">退勤</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {entries.map(e => {
                            const [ih, im] = e.clockIn.split(':').map(Number)
                            const [oh, om] = e.clockOut.split(':').map(Number)
                            const invalid = (oh * 60 + om) <= (ih * 60 + im)
                            return (
                              <tr key={e.date} className={invalid ? 'bg-rose-50' : 'hover:bg-gray-50'}>
                                <td className="px-3 py-1.5 text-gray-700 text-xs">{fmtDate(e.date)}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                    e.status === 'regular'  ? 'bg-blue-100 text-blue-700'
                                    : e.status === 'on-call' ? 'bg-violet-100 text-violet-700'
                                    : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {STATUS_LABEL[e.status]}
                                  </span>
                                </td>
                                <td className={`px-2 py-1.5 text-center text-xs ${invalid ? 'text-rose-600 font-bold' : 'text-gray-600'}`}>
                                  {e.clockIn}
                                </td>
                                <td className={`px-2 py-1.5 text-center text-xs ${invalid ? 'text-rose-600 font-bold' : 'text-gray-600'}`}>
                                  {e.clockOut}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* 超過勤務 */}
                {overtimeEntries.length > 0 && (
                  <section>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                      超過勤務 — {overtimeEntries.length}件
                    </div>
                    <div className="border border-orange-100 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-orange-50">
                          <tr>
                            <th className="text-left px-3 py-1.5 text-orange-500 font-medium">日付</th>
                            <th className="text-center px-2 py-1.5 text-orange-500 font-medium">時間</th>
                            <th className="text-left px-2 py-1.5 text-orange-500 font-medium">理由</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-50">
                          {overtimeEntries.map(e => (
                            <tr key={e.id} className="hover:bg-orange-50">
                              <td className="px-3 py-1.5 text-gray-700">{fmtDate(e.date)}</td>
                              <td className="px-2 py-1.5 text-center text-orange-700 font-semibold">
                                {e.startTime}〜{e.endTime}
                                {calcDuration(e.startTime, e.endTime) && (
                                  <span className="text-gray-400 font-normal ml-1">
                                    ({calcDuration(e.startTime, e.endTime)})
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-gray-600">
                                {e.reason}{e.note ? `（${e.note}）` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* 有給 */}
                {paidLeaveEntries.length > 0 && (
                  <section>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                      有給休暇 — {paidLeaveEntries.length}日
                    </div>
                    <div className="border border-green-100 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="text-left px-3 py-1.5 text-green-600 font-medium">日付</th>
                            <th className="text-left px-2 py-1.5 text-green-600 font-medium">メモ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-50">
                          {paidLeaveEntries.map(e => (
                            <tr key={e.id} className="hover:bg-green-50">
                              <td className="px-3 py-1.5 text-gray-700">{fmtDate(e.date)}</td>
                              <td className="px-2 py-1.5 text-gray-500">{e.note ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* 出張 */}
                {bizEntries.length > 0 && (
                  <section>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                      出張 — {bizEntries.length}件
                    </div>
                    <div className="border border-amber-100 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-50">
                          <tr>
                            <th className="text-left px-3 py-1.5 text-amber-600 font-medium">日付</th>
                            <th className="text-left px-2 py-1.5 text-amber-600 font-medium">行先</th>
                            <th className="text-left px-2 py-1.5 text-amber-600 font-medium">目的</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {bizEntries.map(e => (
                            <tr key={e.id} className="hover:bg-amber-50">
                              <td className="px-3 py-1.5 text-gray-700">{fmtDate(e.date)}</td>
                              <td className="px-2 py-1.5 text-amber-700 font-semibold">{e.destination}</td>
                              <td className="px-2 py-1.5 text-gray-500">{e.purpose ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={onConfirm}
                  disabled={hasIssues || entries.length === 0}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {hasIssues ? '⚠️ 入力エラーを修正してください' : 'はい、申請する'}
                </button>
              </div>
            </>
          )}

          {/* ── 申請中 ── */}
          {submitting && (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium mb-4">申請処理中...</p>
              <div className="w-full bg-gray-100 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-gray-500 font-mono">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}

          {/* ── 完了 ── */}
          {isDone && results && (
            <>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{successCount}</div>
                  <div className="text-xs text-green-600">成功</div>
                </div>
                <div className="flex-1 bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-rose-700">{errorCount}</div>
                  <div className="text-xs text-rose-600">エラー</div>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 border border-gray-200 rounded-xl mb-4 text-sm">
                {results.map(r => (
                  <div key={r.date} className={`flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 ${
                    r.status === 'success' ? 'bg-green-50'
                    : r.status === 'error' ? 'bg-rose-50'
                    : ''
                  }`}>
                    <span className="text-base">
                      {r.status === 'success' ? '✅' : r.status === 'error' ? '❌' : '⏭️'}
                    </span>
                    <span className="text-gray-700">{r.date}</span>
                    {r.message && <span className="text-xs text-gray-500 ml-auto truncate max-w-[180px]">{r.message}</span>}
                  </div>
                ))}
              </div>

              {logs.length > 0 && (
                <details className="mb-4">
                  <summary className="text-xs text-gray-400 cursor-pointer">実行ログ</summary>
                  <div className="mt-2 bg-gray-100 rounded-xl p-2 max-h-32 overflow-y-auto text-xs text-gray-500 font-mono">
                    {logs.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                </details>
              )}

              <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900"
              >
                閉じる
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
