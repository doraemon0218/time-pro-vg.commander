import { type DayEntry, type AppSettings, type SubmitResult } from '@/types'

export type AutomationLog = (msg: string) => void

type Page = import('playwright').Page

// "07:30" → "7:30"
function stripLeadingZero(hhmm: string): string {
  const [h, m] = hhmm.split(':')
  return `${parseInt(h, 10)}:${m}`
}

// カレンダーウィジェット操作: 日付選択 → OK → POSTリロード
async function selectDateInCalendar(page: Page, date: string, log: AutomationLog) {
  const [year, month, day] = date.split('-').map(Number)

  // カレンダーを開く
  await page.click('#MainContentHolder_ucReport_txtStartYMD')
  await page.waitForFunction(
    () => (document.getElementById('calid1')?.innerHTML?.length ?? 0) > 0,
    { timeout: 8000 },
  )

  // 現在月 → 目標月への移動（カレンダーが今月を基準に表示するため）
  const now = new Date()
  const monthDiff = (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1))
  if (monthDiff !== 0) {
    const btnId = monthDiff < 0 ? '#__calid1_btn_prev' : '#__calid1_btn_next'
    for (let i = 0; i < Math.abs(monthDiff); i++) {
      await page.click(btnId)
      await page.waitForTimeout(300)
    }
  }

  // 日付セルをマウスクリック（IDに / を含むため CSS selector は使えない）
  const cellId = `__calid1_td_${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
  const cellCoord = await page.evaluate((id: string) => {
    const el = document.getElementById(id)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, cellId)
  if (!cellCoord) throw new Error(`日付セル ${date} が見つかりません`)
  await page.mouse.click(cellCoord.x, cellCoord.y)
  await page.waitForTimeout(300)

  // OKボタン (#__calid1btnCS) をマウスクリック
  const okCoord = await page.evaluate(() => {
    const el = document.getElementById('__calid1btnCS')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  if (!okCoord) throw new Error('OKボタンが見つかりません')
  await page.mouse.click(okCoord.x, okCoord.y)

  // POSTリロード完了を待つ
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('#MainContentHolder_ucReport_txtStartYMD', { timeout: 10000 })
  await page.waitForTimeout(500)

  log(`  → ${month}/${day} 選択完了`)
}

// チェックボックスを evaluate で on にする（calid1 が残っていると pointer-events をブロックするため）
async function checkById(page: Page, id: string) {
  await page.evaluate((elId: string) => {
    const el = document.getElementById(elId) as HTMLInputElement | null
    if (el && !el.checked) el.click()
  }, id)
  await page.waitForTimeout(300)
}

export async function runAutomation(
  entries: DayEntry[],
  settings: AppSettings,
  log: AutomationLog = console.log,
): Promise<SubmitResult[]> {
  const { chromium } = await import('playwright')

  const results: SubmitResult[] = entries.map(e => ({
    date: e.date,
    status: 'pending' as const,
  }))

  const browser = await chromium.launch({ headless: settings.headless })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // ─── ログイン ───
    log(`[LOGIN] ${settings.timeproUrl} へアクセス中...`)
    await page.goto(settings.timeproUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForSelector('#edtEmpCode', { timeout: 10000 })
    await page.fill('#edtEmpCode', settings.username)
    // m_BtnFlg = true にしないと GetReturnCode() が false を返してログインがブロックされる
    await page.evaluate(() => { (window as any).m_BtnFlg = true })
    await page.click('#btnLogin')
    await page.waitForURL('**/OVg00001L.aspx', { timeout: 15000 })
    log('[LOGIN] ログイン完了')

    // ─── フォームへ（SetClick経由が必須）───
    await page.evaluate(() => { (window as any).SetClick('1', '9') })
    await page.waitForURL('**/OVg04100LView01.aspx', { timeout: 15000 })
    await page.waitForSelector('#MainContentHolder_ucReport_txtStartYMD', { timeout: 10000 })
    log('[FORM] 打刻修正申請フォーム表示確認')

    // ─── 各日の申請（フォームに留まったまま処理）───
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      log(`\n[${i + 1}/${entries.length}] ${entry.date} 開始`)

      try {
        // ① カレンダーで日付選択
        await selectDateInCalendar(page, entry.date, log)

        // ② 出勤チェック + 時刻入力
        await checkById(page, 'MainContentHolder_ucReport_ctlRptData_AppliPch_0')
        const clockInField = page.locator('#MainContentHolder_ucReport_ctlRptData_control_In_1_1')
        await clockInField.fill('')
        await clockInField.fill(stripLeadingZero(entry.clockIn))
        log(`  → 出勤 ${stripLeadingZero(entry.clockIn)}`)

        // ③ 退勤チェック + 時刻入力
        await checkById(page, 'MainContentHolder_ucReport_ctlRptData_AppliPch_1')
        const clockOutField = page.locator('#MainContentHolder_ucReport_ctlRptData_control_Out_1_1')
        await clockOutField.fill('')
        await clockOutField.fill(stripLeadingZero(entry.clockOut))
        log(`  → 退勤 ${stripLeadingZero(entry.clockOut)}`)

        // ④ 申請理由
        await page.fill('#MainContentHolder_ucReport_txtAppliRezn', settings.correctionReason)

        // ⑤ 申請ボタンをマウスクリック
        const applyCoord = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'))
          const link = links.find(a => a.textContent?.trim() === '申請')
          if (!link) return null
          const r = link.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        })
        if (!applyCoord) throw new Error('申請ボタンが見つかりません')
        await page.mouse.click(applyCoord.x, applyCoord.y)
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(800)

        // ⑥ 確認ダイアログ（出た場合のみ）
        const okBtn = page.locator('button:has-text("OK"), button:has-text("はい")').first()
        if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await okBtn.click()
          await page.waitForLoadState('domcontentloaded')
        }

        // フォームから離れてしまった場合は復帰
        if (!page.url().includes('OVg04100LView01')) {
          if (page.url().includes('OVg00001L')) {
            await page.evaluate(() => { (window as any).SetClick('1', '9') })
            await page.waitForURL('**/OVg04100LView01.aspx', { timeout: 15000 })
          }
        }

        results[i].status = 'success'
        log(`  ✓ 完了`)
      } catch (err) {
        results[i].status = 'error'
        results[i].message = err instanceof Error ? err.message : String(err)
        log(`  ✗ エラー: ${results[i].message}`)

        // エラー後のフォーム復帰を試みる
        try {
          if (!page.url().includes('OVg04100LView01')) {
            if (page.url().includes('OVg00001L')) {
              await page.evaluate(() => { (window as any).SetClick('1', '9') })
              await page.waitForURL('**/OVg04100LView01.aspx', { timeout: 10000 })
            }
          }
        } catch {
          log('  ⚠️ フォーム復帰失敗')
        }
      }

      await page.waitForTimeout(500)
    }
  } catch (err) {
    log(`\n[ERROR] ${err instanceof Error ? err.message : String(err)}`)
    for (const r of results) {
      if (r.status === 'pending') {
        r.status = 'error'
        r.message = '処理前にエラーが発生しました'
      }
    }
  } finally {
    await browser.close()
  }

  return results
}
