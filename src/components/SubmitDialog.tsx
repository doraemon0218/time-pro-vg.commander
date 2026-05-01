'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { type DayEntry, type SubmitResult } from '@/types'

const STATUS_LABEL: Record<DayEntry['status'], string> = {
  regular:        '出勤',
  'paid-leave':   '有給',
  'business-trip':'出張',
  'non-working':  '非勤務',
  holiday:        '祝日',
}

interface Props {
  open: boolean
  entries: DayEntry[]
  submitting: boolean
  results: SubmitResult[] | null
  logs: string[]
  onClose: () => void
  onConfirm: () => void
}

export function SubmitDialog({
  open, entries, submitting, results, logs, onClose, onConfirm,
}: Props) {
  const isDone = results !== null && !submitting
  const successCount = results?.filter(r => r.status === 'success').length ?? 0
  const errorCount   = results?.filter(r => r.status === 'error').length ?? 0

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[520px] max-w-[95vw] max-h-[85vh] flex flex-col"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-xl font-bold text-gray-800 mb-4">
            {isDone ? '申請完了' : '修正申請の確認'}
          </Dialog.Title>

          {/* 申請前: エントリ一覧 */}
          {!submitting && !isDone && (
            <>
              <p className="text-sm text-gray-500 mb-3">
                以下 <strong>{entries.length}日分</strong> をTime Pro VGに一括申請します。
              </p>
              <div className="overflow-y-auto flex-1 border border-gray-200 rounded-xl mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">日付</th>
                      <th className="text-center px-3 py-2 text-gray-500 font-medium">種別</th>
                      <th className="text-center px-3 py-2 text-gray-500 font-medium">出勤</th>
                      <th className="text-center px-3 py-2 text-gray-500 font-medium">退勤</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map(e => {
                      const d = new Date(e.date + 'T00:00:00')
                      const wday = ['日','月','火','水','木','金','土'][d.getDay()]
                      return (
                        <tr key={e.date} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-700">
                            {d.getMonth() + 1}/{d.getDate()}（{wday}）
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              e.status === 'regular' ? 'bg-blue-100 text-blue-700'
                              : e.status === 'paid-leave' ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                              {STATUS_LABEL[e.status]}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-600">
                            {e.status !== 'paid-leave' ? e.clockIn : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-600">
                            {e.status !== 'paid-leave' ? e.clockOut : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:bg-indigo-800"
                >
                  🚀 まとめて修正申請！！
                </button>
              </div>
            </>
          )}

          {/* 申請中: プログレス */}
          {submitting && (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium mb-4">申請処理中...</p>
              <div className="w-full bg-gray-100 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-gray-500 font-mono">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}

          {/* 完了: 結果表示 */}
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
