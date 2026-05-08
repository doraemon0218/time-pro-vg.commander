'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { type AppSettings, type WeekdayDefault } from '@/types'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

interface Props {
  settings: AppSettings
  open: boolean
  onClose: () => void
  onSave: (settings: AppSettings) => Promise<void>
}

export function SettingsPanel({ settings, open, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function updateWeekday(idx: number, patch: Partial<WeekdayDefault>) {
    const next = [...draft.weekdayDefaults] as AppSettings['weekdayDefaults']
    next[idx] = { ...next[idx], ...patch }
    setDraft({ ...draft, weekdayDefaults: next })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(draft)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // settingsが変わったら draft をリセット
  function handleOpen(v: boolean) {
    if (v) setDraft(settings)
    if (!v) onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-xl font-bold text-gray-800 mb-5">⚙️ 設定</Dialog.Title>

          {/* Time Pro VG 接続設定 */}
          <section className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              Time Pro VG 接続
            </h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-600 mb-1 block">アクセスURL</span>
                <input
                  type="url"
                  value={draft.timeproUrl}
                  onChange={e => setDraft({ ...draft, timeproUrl: e.target.value })}
                  placeholder="https://your-company.tpvg.jp"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600 mb-1 block">職員番号</span>
                <input
                  type="text"
                  value={draft.username}
                  onChange={e => setDraft({ ...draft, username: e.target.value })}
                  placeholder="例: 12345"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600 mb-1 block">パスワード</span>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={draft.password}
                    onChange={e => setDraft({ ...draft, password: e.target.value })}
                    placeholder="••••••••"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="px-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 text-xs"
                  >
                    {showPassword ? '隠す' : '表示'}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="text-sm text-gray-600 mb-1 block">打刻修正申請 理由（テンプレート）</span>
                <input
                  type="text"
                  value={draft.correctionReason}
                  onChange={e => setDraft({ ...draft, correctionReason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600 mb-1 block">出張申請 理由（テンプレート）</span>
                <input
                  type="text"
                  value={draft.bizTripReason ?? ''}
                  onChange={e => setDraft({ ...draft, bizTripReason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.headless}
                  onChange={e => setDraft({ ...draft, headless: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">バックグラウンドで実行（画面非表示）</span>
              </label>
            </div>
          </section>

          {/* 曜日別デフォルト勤務設定 */}
          <section className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              曜日別デフォルト設定
            </h3>
            <div className="space-y-2">
              {WEEKDAY_LABELS.map((label, idx) => {
                const def = draft.weekdayDefaults[idx as 0|1|2|3|4|5|6]
                const isWeekend = idx === 0 || idx === 6
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 rounded-lg ${isWeekend ? 'bg-gray-50' : 'bg-blue-50'}`}
                  >
                    <span className={`w-6 text-center font-bold text-sm ${isWeekend ? 'text-rose-500' : 'text-blue-700'}`}>
                      {label}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={def.isWorking}
                        onChange={e => updateWeekday(idx, { isWorking: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-600">出勤</span>
                    </label>
                    <input
                      type="time"
                      value={def.clockIn}
                      onChange={e => updateWeekday(idx, { clockIn: e.target.value })}
                      disabled={!def.isWorking}
                      className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <span className="text-gray-400 text-sm">〜</span>
                    <input
                      type="time"
                      value={def.clockOut}
                      onChange={e => updateWeekday(idx, { clockOut: e.target.value })}
                      disabled={!def.isWorking}
                      className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                )
              })}
            </div>
          </section>

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
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
