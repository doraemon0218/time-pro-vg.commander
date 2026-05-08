import { NextRequest } from 'next/server'
import { type DayEntry, type AppSettings } from '@/types'

// Vercel serverless 環境では Playwright は動作しない
// このAPIはローカル環境（npm run dev）でのみ機能します
const IS_VERCEL = process.env.VERCEL === '1'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return Response.json(
      {
        error:
          'Vercel環境では自動申請は実行できません。\n' +
          'ローカルPC（院内ネットワーク）で npm run dev を起動し、\n' +
          'そちらから申請してください。',
        isVercelEnvironment: true,
      },
      { status: 501 },
    )
  }

  try {
    const {
      entries,
      bizTripDates,
      settings,
    }: { entries: DayEntry[]; bizTripDates: string[]; settings: AppSettings } =
      await request.json()

    if ((!entries || entries.length === 0) && (!bizTripDates || bizTripDates.length === 0)) {
      return Response.json({ error: '申請対象がありません' }, { status: 400 })
    }

    if (!settings.timeproUrl || !settings.username) {
      return Response.json(
        { error: 'Time Pro VG の URL・職員番号を設定してください' },
        { status: 400 },
      )
    }

    const logs: string[] = []
    const log = (msg: string) => {
      logs.push(msg)
      console.log(msg)
    }

    const { runAutomation, runBizTripAutomation } = await import('@/lib/automation')
    type R = import('@/types').SubmitResult

    // ── 打刻修正申請 ──
    let correctionResults: R[] = []
    if (entries && entries.length > 0) {
      log('\n=== 打刻修正申請 ===')
      correctionResults = await runAutomation(entries, settings, log)
    }

    // ── 出張申請 ──
    let bizTripResults: R[] = []
    if (bizTripDates && bizTripDates.length > 0) {
      log('\n=== 出張申請 ===')
      bizTripResults = await runBizTripAutomation(bizTripDates, settings, log)
    }

    const allResults = [...correctionResults, ...bizTripResults]
    const totalSuccess = allResults.filter(r => r.status === 'success').length
    const totalError   = allResults.filter(r => r.status === 'error').length

    return Response.json({
      results: correctionResults,
      bizTripResults,
      totalSuccess,
      totalError,
      logs,
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
