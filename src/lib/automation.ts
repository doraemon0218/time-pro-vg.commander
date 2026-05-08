import { type DayEntry, type AppSettings, type SubmitResult } from '@/types'

export type AutomationLog = (msg: string) => void

type Page = import('playwright').Page

// ── ユーティリティ ──────────────────────────────────────────────────

function stripLeadingZero(hhmm: string): string {
  const [h, m] = hhmm.split(':')
  return `${parseInt(h, 10)}:${m}`
}

// calid1 ウィジェットで任意フィールドの日付を選択 → OK → POSTリロード
async function pickDate(page: Page, fieldId: string, date: string, log: AutomationLog) {
  const [year, month, day] = date.split('-').map(Number)

  await page.click(`#${fieldId}`)
  await page.waitForFunction(
    () => (document.getElementById('calid1')?.innerHTML?.length ?? 0) > 0,
    { timeout: 8000 },
  )

  const now = new Date()
  const monthDiff = (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1))
  if (monthDiff !== 0) {
    const btnId = monthDiff < 0 ? '#__calid1_btn_prev' : '#__calid1_btn_next'
    for (let i = 0; i < Math.abs(monthDiff); i++) {
      await page.click(btnId)
      await page.waitForTimeout(300)
    }
  }

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

  const okCoord = await page.evaluate(() => {
    const el = document.getElementById('__calid1btnCS')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  if (!okCoord) throw new Error('OKボタンが見つかりません')
  await page.mouse.click(okCoord.x, okCoord.y)

  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector(`#${fieldId}`, { timeout: 10000 })
  await page.waitForTimeout(500)
  log(`  → ${month}/${day} 選択完了`)
}

// チェックボックスを evaluate で on にする（calid1 残留時に pointer-events をブロックするため）
async function checkById(page: Page, id: string) {
  await page.evaluate((elId: string) => {
    const el = document.getElementById(elId) as HTMLInputElement | null
    if (el && !el.checked) el.click()
  }, id)
  await page.waitForTimeout(300)
}

// 「申請」リンクをクリックして POST → 確認ダイアログを処理
async function clickApplyButton(page: Page) {
  const coord = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const link = links.find(a => a.textContent?.trim() === '申請')
    if (!link) return null
    const r = link.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  if (!coord) throw new Error('申請ボタンが見つかりません')
  await page.mouse.click(coord.x, coord.y)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)

  const okBtn = page.locator('button:has-text("OK"), button:has-text("はい")').first()
  if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await okBtn.click()
    await page.waitForLoadState('domcontentloaded')
  }
}

// ログイン共通処理
async function loginToTimePro(page: Page, settings: AppSettings, log: AutomationLog) {
  log(`[LOGIN] ${settings.timeproUrl} へアクセス中...`)
  await page.goto(settings.timeproUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('#edtEmpCode', { timeout: 10000 })
  await page.fill('#edtEmpCode', settings.username)
  // m_BtnFlg = true にしないと GetReturnCode() が false を返してログインがブロックされる
  await page.evaluate(() => { (window as any).m_BtnFlg = true })
  await page.click('#btnLogin')
  await page.waitForURL('**/OVg00001L.aspx', { timeout: 15000 })
  log('[LOGIN] ログイン完了')
}

// フォームページから離れた場合にメニュー経由で復帰
async function recoverToForm(page: Page, menuKey: '9' | '23') {
  if (!page.url().includes('OVg04100LView01')) {
    await page.click('#ctlHeader_btnLeft').catch(() => {})
    await page.waitForURL('**/OVg00001L.aspx', { timeout: 8000 }).catch(() => {})
    const k = menuKey
    await page.evaluate((key: string) => { (window as any).SetClick('1', key) }, k)
    await page.waitForURL('**/OVg04100LView01.aspx', { timeout: 15000 })
  }
}

// ── 出張グループ化（連続日程を1件の申請にまとめる）───────────────

interface BizGroup {
  startDate: string // "YYYY-MM-DD"
  endDate: string   // "YYYY-MM-DD"
}

function groupConsecutiveDates(dates: string[]): BizGroup[] {
  if (dates.length === 0) return []
  const sorted = [...dates].sort()
  const groups: BizGroup[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(prev).getTime()) / 86400000
    if (diff <= 1) {
      prev = sorted[i]
    } else {
      groups.push({ startDate: start, endDate: prev })
      start = sorted[i]
      prev = sorted[i]
    }
  }
  groups.push({ startDate: start, endDate: prev })
  return groups
}

// ── 打刻修正申請 (SetClick '1','9') ─────────────────────────────

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
    await loginToTimePro(page, settings, log)

    await page.evaluate(() => { (window as any).SetClick('1', '9') })
    await page.waitForURL('**/OVg04100LView01.aspx', { timeout: 15000 })
    await page.waitForSelector('#MainContentHolder_ucReport_txtStartYMD', { timeout: 10000 })
    log('[FORM] 打刻修正申請フォーム表示確認')

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      log(`\n[${i + 1}/${entries.length}] ${entry.date} 開始`)

      try {
        await pickDate(page, 'MainContentHolder_ucReport_txtStartYMD', entry.date, log)

        await checkById(page, 'MainContentHolder_ucReport_ctlRptData_AppliPch_0')
        const clockInField = page.locator('#MainContentHolder_ucReport_ctlRptData_control_In_1_1')
        await clockInField.fill('')
        await clockInField.fill(stripLeadingZero(entry.clockIn))
        log(`  → 出勤 ${stripLeadingZero(entry.clockIn)}`)

        await checkById(page, 'MainContentHolder_ucReport_ctlRptData_AppliPch_1')
        const clockOutField = page.locator('#MainContentHolder_ucReport_ctlRptData_control_Out_1_1')
        await clockOutField.fill('')
        await clockOutField.fill(stripLeadingZero(entry.clockOut))
        log(`  → 退勤 ${stripLeadingZero(entry.clockOut)}`)

        await page.fill('#MainContentHolder_ucReport_txtAppliRezn', settings.correctionReason)
        await clickApplyButton(page)
        await recoverToForm(page, '9')

        results[i].status = 'success'
        log(`  ✓ 完了`)
      } catch (err) {
        results[i].status = 'error'
        results[i].message = err instanceof Error ? err.message : String(err)
        log(`  ✗ エラー: ${results[i].message}`)

        try { await recoverToForm(page, '9') } catch { log('  ⚠️ フォーム復帰失敗') }
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

// ── 出張申請 (SetClick '1','23') ─────────────────────────────────

export async function runBizTripAutomation(
  bizTripDates: string[],
  settings: AppSettings,
  log: AutomationLog = console.log,
): Promise<SubmitResult[]> {
  const groups = groupConsecutiveDates(bizTripDates)
  const results: SubmitResult[] = groups.map(g => ({
    date: g.startDate === g.endDate ? g.startDate : `${g.startDate}〜${g.endDate}`,
    status: 'pending' as const,
  }))

  if (groups.length === 0) return results

  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: settings.headless })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await loginToTimePro(page, settings, log)

    await page.evaluate(() => { (window as any).SetClick('1', '23') })
    await page.waitForURL('**/OVg04100LView01.aspx', { timeout: 15000 })
    await page.waitForSelector('#MainContentHolder_ucReport_txtStartYMD', { timeout: 10000 })
    log('[FORM] 出張申請フォーム表示確認')

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]
      const label = g.startDate === g.endDate ? g.startDate : `${g.startDate}〜${g.endDate}`
      log(`\n[${i + 1}/${groups.length}] 出張 ${label} 開始`)

      try {
        // 開始日
        await pickDate(page, 'MainContentHolder_ucReport_txtStartYMD', g.startDate, log)

        // 終了日（複数日の場合のみ）
        if (g.startDate !== g.endDate) {
          await pickDate(page, 'MainContentHolder_ucReport_txtEndYMD', g.endDate, log)
        }

        // control_0(区分)・control_1(種別) はデフォルト（１日/出張）のまま

        await page.fill('#MainContentHolder_ucReport_txtAppliRezn', settings.bizTripReason || '学会出張のため')
        await clickApplyButton(page)
        await recoverToForm(page, '23')

        results[i].status = 'success'
        log(`  ✓ 完了`)
      } catch (err) {
        results[i].status = 'error'
        results[i].message = err instanceof Error ? err.message : String(err)
        log(`  ✗ エラー: ${results[i].message}`)

        try { await recoverToForm(page, '23') } catch { log('  ⚠️ フォーム復帰失敗') }
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
