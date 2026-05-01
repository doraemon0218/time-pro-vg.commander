import { NextRequest } from 'next/server'
import { type DayEntry, type AppSettings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { entries, settings }: { entries: DayEntry[]; settings: AppSettings } =
      await request.json()

    if (!entries || entries.length === 0) {
      return Response.json({ error: '申請対象がありません' }, { status: 400 })
    }

    if (!settings.timeproUrl || !settings.username) {
      return Response.json(
        { error: 'Time Pro VG の URL・ユーザー名を設定してください' },
        { status: 400 },
      )
    }

    const logs: string[] = []
    const log = (msg: string) => {
      logs.push(msg)
      console.log(msg)
    }

    const { runAutomation } = await import('@/lib/automation')
    const results = await runAutomation(entries, settings, log)

    const totalSuccess = results.filter(r => r.status === 'success').length
    const totalError   = results.filter(r => r.status === 'error').length
    const totalSkipped = results.filter(r => r.status === 'skipped').length

    return Response.json({ results, totalSuccess, totalError, totalSkipped, logs })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
